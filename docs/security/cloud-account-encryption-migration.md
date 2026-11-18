# Cloud Account Encryption Migration

**Status: implemented for React Web, Tauri, and the Expo WebView client; native Qt and native Android remain open.** The account migration is performed by the client after Firebase Authentication succeeds. This document describes the checked-in flow, not a claim that every installed client or stored account has already completed it.

## Client Coverage

| Client | Account sign-in | Local key migration | Status |
| --- | --- | --- | --- |
| React Web | Firebase email and password | IndexedDB keychain envelope is created or rewrapped atomically | Implemented; runs at the next successful sign-in |
| Tauri desktop | Firebase email and password through the shared React client | Rust core verifies and transactionally rewraps SQLite module-key envelopes and the versioned verifier | Implemented; runs at the next successful sign-in |
| Expo WebView | Uses the hosted React client | Same IndexedDB flow as React Web | Implemented when it loads this React client version |
| Qt desktop | No Firebase authentication in the native shell | Separate local vault setup and credential-change flow still exists | Not migrated; legacy gate must remain until a verified account flow is implemented |
| Native Android | No Firebase account gate or synced native keychain flow | No account-key migration is implemented | Not migrated; do not remove crypto bindings or infer that the web flow covers it |

## React, Tauri, and WebView Flow

1. Firebase Authentication checks the account email and password. The password is held only for the active sign-in/migration operation and is cleared from the form afterward.
2. The client derives the existing Web encryption root using PBKDF2-HMAC-SHA256 with 600,000 iterations and the existing Web salt. It does not send the derived key or module keys to Firebase.
3. The client verifies the user's encrypted `auth_validator` configuration document and reads the encrypted `module_keys` document. The migration does not read or rewrite application data documents.
4. If a previous key credential is needed, the user enters it once. The client decrypts the prior local/cloud envelopes and compares overlapping module keys before changing an envelope. A disagreement stops the migration.
5. Firestore changes to `users/<uid>/config/auth_validator` and `users/<uid>/config/module_keys` are committed in one transaction. Transaction retries may add reads; application data collections are not part of this transaction.
6. IndexedDB writes the new encrypted keychain and removes the legacy `masterHash` record in one transaction. Tauri delegates local key replacement to `synapse-core`, which verifies all eleven supported module keys and updates the key envelopes and versioned verifier in a SQLite `BEGIN IMMEDIATE` transaction.
7. The new local keychain is reopened with the account password before the app enters the signed-in state. If the cloud transaction commits but the local step fails, retrying is safe: the cloud envelopes can be read with the account key while the previous local envelope remains available.

Password reset is not encryption-key recovery. The sign-in screen warns users before it sends a Firebase reset email. If the previous encryption credential is no longer known, the client cannot decrypt the old key envelopes; do not create replacement keys over that state.

## Firestore Read Budget

An ordinary online unlock reads the verifier and module-key configuration documents. A one-time cloud rewrap reads those documents before migration and reads them again inside the transaction; a transaction retry can increase the count. It writes only the two configuration documents. Failed-attempt lock records and normal app synchronization are separate operations.

No production Firebase reads, writes, deployments, or account-data reconciliation were performed while implementing this code. The normal read count is therefore determined by Firestore at runtime, not by local build output. Keep the existing daily quota limit in mind when validating with a real account.

## Safe Legacy Removal Checklist

- [x] Remove the Master Password tab from the React sign-in screen.
- [x] Remove the React security-settings Master Password panel and its obsolete component.
- [x] Replace account-unlock copy in the React vault guide and warn about password-reset limits.
- [x] Remove the weak Web `masterHash` as an authentication fallback; retain only one-time status detection and transactional deletion during migration.
- [x] Stop Tauri from accepting the legacy fast SHA-256 password verifier as an unlock path; successful envelope unlock upgrades the stored verifier.
- [x] Require key-envelope verification and matching module keys before local Web/Tauri key replacement.
- [x] Keep the vault-field SHA-256 fallback only as a documented compatibility path while old encrypted vault fields are inventoried and migrated.
- [ ] Run the migration with the real account on Web/Tauri, then verify the account's two encrypted configuration documents and decrypted module-key equality without scanning application collections.
- [ ] Verify the installed Expo WebView loads the migrated React build.
- [ ] Implement and verify Firebase account authentication and safe local key rewrap for Qt before deleting its master-password gate, QML modal, controller methods, and compatibility tests.
- [ ] Define and verify the native Android account/keychain flow before removing or renaming any crypto binding used by that client.
- [ ] After every supported local database is migrated and backed up, remove the remaining legacy `masterHash` detection/deletion path and old-version compatibility code.

## Legacy Code Inventory

| Legacy item | Location | Why it remains | Safe deletion gate |
| --- | --- | --- | --- |
| SHA-256 password-derived key fallback for old vault fields | `apps/web-react/src/services/vault-crypto.ts`, `apps/web-react/src/components/auth/useAuthScreenController.ts` | Some existing vault field ciphertext may have been encrypted before dedicated module keys existed; the fallback now receives the signed-in account password and is not a separate login credential | Inventory and migrate every legacy vault field with a verified old key, then remove the fallback and confirm existing vault data remains readable on Web, Tauri, and WebView |
| `masterHash` record detection/deletion | `apps/web-react/src/api/web/auth.ts` | Finds old browser databases and deletes the record atomically after the account keychain is established | Remove only after a versioned database migration can safely handle all supported old installs |
| Old auth verifier column and version upgrade | `apps/web-react/src-tauri/src/cmd_auth.rs`, SQLite `keychain.auth_hash` | Existing rows need a verifier upgrade after their envelope is successfully opened | Remove after local databases are version-migrated and backup/restore is verified |
| Qt Master Password setup/unlock/change/removal | `apps/desktop-qt/qml/vault/`, `apps/desktop-qt/qml/settings/`, `apps/desktop-qt/src/controllers/vault/` | Qt still depends on this credential to open its separate local keychain and selected encrypted fields | Keep until Qt Firebase auth, key rewrap, recovery, lockout, and old-database tests all pass |
| Qt password-based bridge compatibility | `core/synapse-core/src/crypto/`, `bridges/bridge-qt/` | The current Qt client still calls it; removing it now can lock users out of local data | Remove only in the same verified Qt account-key migration release |
| Android password-to-key binding | `apps/mobile-android/app/src/main/java/com/synapse/core/SynapseCoreBindings.kt`, `bridges/bridge-uniffi/` | Native Android has no replacement account flow yet | Remove or rename after Android authentication and keychain ownership are implemented and tested |

## Verification Evidence

- `npm run typecheck` — passed on 2026-11-18.
- `npm run test -- src/services/auth/account-vault.test.ts src/services/sync/sync-auth.test.ts src/api/web/auth.test.ts src/api/tauri/auth.test.ts src/components/AuthScreen.test.tsx` — 5 files and 14 tests passed.
- `npm run test -- src/components/settings/tabs/security/SecuritySections.test.tsx` — 1 file and 4 tests passed.
- `cargo test -p synapse-core keychain::tests --lib` — 3 migration transaction tests passed.
- `npm run tauri -- build --bundles deb` — passed, including the production React build and optimized Tauri Rust build; produced `target/release/bundle/deb/Caderno_1.0.0_amd64.deb` (about 94 MB).
- `dpkg-deb --info target/release/bundle/deb/Caderno_1.0.0_amd64.deb` — package metadata and `amd64` architecture verified.
- `git diff --check` and `rustfmt --check --edition 2021 apps/web-react/src-tauri/src/cmd_auth.rs core/synapse-core/src/db/keychain.rs` — passed.

A passing test or local build does not prove a production user's account has completed migration. No Firebase account was read, written, or deployed during this work; Web/Tauri migration runs when the user signs into the released client. Qt and native Android still require their own account/key migration before their legacy credential flows can be removed.
