# Native Desktop Encryption Audit

**Status: partial coverage; do not claim repository-wide encryption at rest. Last reviewed 2026-11-20.** This audit records Qt desktop encryption and the shared React/Tauri key-envelope flow. React Web, Tauri, and the React-hosted WebView now authenticate with the Firebase account password and can rewrap their existing key envelopes. Qt still uses its separate local credential, and native Android has no equivalent account flow. Android Finance now uses typed core-backed local SQLite persistence, but those Finance fields are plaintext and do not sync to Firebase. Native vault setup protects selected content fields and referenced media in managed directories, but it does not encrypt every user-data table or migrate every existing asset.

## Verified Protection and Recent Fixes

| Data or flow | Current Qt behavior | Status |
| --- | --- | --- |
| Application access gate | Qt still requires its separate local vault credential before the native shell is instantiated. React Web/Tauri use Firebase account sign-in before loading the shell. Native Android has no Firebase gate; Finance persists locally through UniFFI without account-key migration. These are UI/session gates; none encrypts every business table or metadata field. | Implemented for React/Tauri; Qt and Android migration remain open; broader at-rest coverage remains partial. |
| Master key | PBKDF2-HMAC-SHA256 with 600,000 iterations and the existing fixed local salt. The raw key is not stored in SQLite. | Implemented; salt format is compatibility-bound. |
| Module key envelopes | Random 32-byte module keys are wrapped with AES-GCM and stored in `keychain`. Password change re-wraps envelopes in a transaction. | Implemented for the current keychain format. |
| Note body and revision body | Setup migrates plaintext `pages.content` and `page_history.content`; saves encrypt them while unlocked. Locked writes fail. Native rich-editor image data is stored inline in `pages.content` and follows that body-column behavior; it does not create a separately managed image asset. `pages.cover_image` remains plaintext metadata and may contain an embedded image data URL. | Implemented for body columns only; titles, descriptions, icons, cover images, and other page metadata remain plaintext. |
| Diagram body | Setup and saves encrypt `diagrams.content`; locked writes fail. Qt currently uses the notes module key, matching the current keychain shape. | Implemented for the body; there is no separate diagrams key column. |
| Vault credentials | Setup migrates credential fields, custom fields, group name/icon/color, and password history; vault reads decrypt them and locked writes fail. | Implemented for these fields. Other vault metadata remains plaintext. |
| File references and media | New file/video/book imports encrypt payloads. First-time setup now stages and migrates every existing readable asset referenced inside the managed `files/`, `library/`, and `videos/` directories, including subtitles and soft-deleted rows. File attachments' local paths are also encrypted. | Implemented for managed local assets with a persistent recovery journal; setup fails closed on unreadable assets or paths outside managed folders. Library/video metadata paths and external files are still not encrypted or migrated; `library_books.cover_image` can contain a generated PDF first-page cover or embedded EPUB package cover and remains plaintext. |
| Interrupted media setup | Staged ENC1 assets are registered in `vault_asset_migrations` in the same SQLite transaction as the keychain. Replacing each source is atomic; unlock finishes pending records before exposing decrypted data and keeps the vault locked on recovery failure. | Implemented and covered by native recovery tests; concurrent clients are not yet required to honor the Qt recovery journal. |
| ENC1 media format | AES-256-GCM uses 1 MiB chunks and fresh 12-byte nonces. Readers now reject unsupported chunk sizes and lengths that disagree with the container header. | Implemented for structure and authenticated chunks; the header itself is not authenticated. |
| Native string/key handoff | The bridge now offers a zeroing free function for secret C strings. Qt wipes local UTF-8 key buffers and clears its unlocked-key map on lock/database switch. SQLite connections enable `secure_delete`; setup checkpoints and vacuums after migrating covered fields. | Improved; copies held by Qt strings, QML, or active readers cannot be proven zeroized. |
| Android Rust bridge and Finance | Gradle builds the UniFFI bridge for `arm64-v8a`, `x86_64`, and `armeabi-v7a`, generates matching Kotlin bindings, and packages the bridge. Finance CRUD and linked loan/wishlist operations use `synapse-core` and local SQLite; an emulator instrumentation test exercises the generated Finance API. | Typed local Finance persistence is implemented; Firebase account/key migration, Finance field encryption, other module repositories, and encrypted-video playback remain open. |

Cryptographic regression coverage includes round trips, fresh nonce checks, malformed payload lengths, malformed/truncated ENC1 containers, password change, lock rejection, setup/removal migration for notes, history, diagrams, vault fields, groups, and password history, plus managed file/book/video/subtitle migration and recovery from a pending asset journal.

## Confirmed Coverage Gaps

Open Library metadata lookup is user-triggered and sends the entered book title over HTTPS to Open Library; it does not upload the local book file or extracted document text. Reader search extracts text only from an unlocked temporary book copy, returns snippets to the active Qt session, and does not persist a search index. Cover URLs are stored in plaintext metadata.

| Priority | Open item |
| --- | --- |
| Critical | Sensitive records in finance, calendar, habits, culture, Anki, questions, focus, notifications, tutor data, and library annotations/caches remain plaintext in SQLite. |
| High | Files outside managed folders are not migrated; library/video paths and module metadata remain visible. Qt recovers pending asset journals, but React/Tauri do not yet block access while a Qt journal is pending. |
| High | Video, library, and other module metadata remains visible; some metadata also contains local paths or user-created text. This includes generated or uploaded `library_books.cover_image` values. |
| High | The Qt bridge still retains a fast SHA-256 verifier for legacy local credential compatibility. React/Tauri no longer accept that verifier as an unlock path. |
| High | Native Qt account authentication and native Android account/keychain migration are not implemented; do not remove their existing local crypto flows. |
| High | Qt/React string copies, QML state, WAL snapshots, and temporary files do not yet have a complete, interruption-safe zeroization proof. |
| Medium | The local KDF salt is fixed for cross-client compatibility; there is no per-vault random salt/version migration yet. |
| Medium | Missing module envelopes can still alias to a fallback key for legacy keychain compatibility. |

1. **Not every SQLite table is encrypted.** Finance, calendar, habits, culture catalog, flashcards, questions, focus sessions, notifications, tutor data, and several library annotation/cache fields still contain plaintext columns. Their keychain entries do not mean those records are encrypted. Android Finance uses a typed core repository but remains plaintext; other Android module records do not yet use typed core repositories.
2. **Metadata remains visible.** Examples include page and diagram titles, video titles/progress and paths, subtitle labels and paths in `subtitles_json`, video vocabulary words/context, library metadata, and many relationship fields.
3. **Unmanaged pre-existing media is not migrated.** Setup aborts if a referenced file exists outside its managed directory rather than modifying a user's external file. A separate copy-and-relink flow is needed to migrate those assets without altering the source.
4. **SQLite residuals are not fully eliminated.** Setup now attempts a WAL checkpoint and `VACUUM`, and reports a warning if that operation fails. Concurrent React/Tauri connections can prevent cleanup; filesystem deletion and query-buffer lifetimes also cannot promise physical-sector erasure or zero plaintext memory copies.
5. **Legacy authentication verifiers remain weak in Qt.** New Qt and Tauri setups store `v2:` verifiers derived from the PBKDF2 root, and successful envelope unlocks upgrade the stored verifier. React/Tauri now require successful envelope decryption and no longer accept Tauri's old deterministic SHA-256 password-plus-suffix verifier. Qt still has a legacy SHA-256 compatibility path that remains a cheap offline password-guess target.
6. **The KDF salt is fixed across local vaults.** This is the current cross-client compatibility format; a per-vault random salt requires a versioned keychain migration across Qt, Tauri, and web clients.
7. **Unlock compatibility still aliases missing module envelopes.** Legacy keychains may reuse a fallback module key. New keychains create independent keys, but the fallback prevents a universal key-separation guarantee for older records.
8. **Plaintext buffers remain in process memory where UI/API contracts require strings.** The bridge and selected buffers are wiped, but JSON query buffers, Qt implicit-shared `QString` copies, and QML view-model values are not comprehensively zeroized.

## Required Completion Gates

- Define a cross-client entity/column encryption schema and encrypt every sensitive field that the product promises to protect.
- Extend the transactional setup migration to every plaintext business-data field and to external assets through a copy-and-relink flow; abort if any decrypt/encrypt step fails.
- Version the key-derivation salt across React/Tauri and Qt. Complete Qt account authentication and Android key ownership before removing their local credential paths; retain old-format reads only until each client has a verified migration.
- Validate every decrypt result before displaying or saving it; never substitute plaintext or ciphertext after a cryptographic error.
- Close UI readers and invalidate decrypted caches on lock; test these transitions per module.
- Verify database WAL/checkpoint behavior and temporary-file cleanup under interruption before claiming there are no plaintext residuals.
- Compare each client on its supported database, including vault setup, account/local unlock, envelope migration, lock, removal, backup, and recovery. React/Tauri account migration coverage and remaining Qt/Android gaps are tracked in [`cloud-account-encryption-migration.md`](./cloud-account-encryption-migration.md).

## Targeted Verification

- `cargo test -p synapse-core crypto::tests --lib`
- `cargo test -p synapse-core crypto::stream::tests --lib`
- `cargo test -p synapse-bridge-qt test_crypto_ffi_roundtrips --lib`
- `cargo check --manifest-path apps/web-react/src-tauri/Cargo.toml --lib`
- `cmake --build apps/desktop-qt/build --config Release`
- `ctest --test-dir apps/desktop-qt/build -R native-priority-modules --output-on-failure`

These checks validate the covered formats and flows. They do **not** close the coverage gaps above or prove complete E2EE across all modules.
