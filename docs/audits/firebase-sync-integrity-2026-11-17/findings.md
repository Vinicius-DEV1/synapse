# Findings and Evidence

## Severity Summary

| Priority | Finding | State |
| --- | --- | --- |
| P0 | The former Firestore rules allowed anonymous root access. | Scoped rules deployed; live anonymous root read returns `403 PERMISSION_DENIED` |
| P1 | Local rows lack matching root-document IDs, and root-only IDs need a scoped destination. | User confirmed sole ownership; Firebase Auth currently has zero users, so UID-based reconciliation remains open |
| P1 | Default sync previously used flat root collections when no workspace ID was active. | Scoped client deployed to the four configured web Hosting sites; local account sign-in and data reconciliation remain open |
| P1 | Previous push/pull error paths could advance checkpoints or continue after incomplete pulls. | Fixed in local source; tests added |
| P1 | Tauri upsert could discard unknown columns, and sync row readers could silently skip rows or convert blobs to null. | Fixed in local source; tests added |
| P1 | Invalid Firestore document IDs could fail writes for local IDs containing `/`. | Fixed for new writes with versioned reversible encoding |
| P2 | Three sync tables were absent from the active local database. | Fixed; created empty after verified snapshot |
| P2 | Migrations suppress many SQLite errors instead of reporting failure. | Open; listed for cleanup/refactor |
| P1 | Public shares previously stored their raw AES share key in Firestore for direct links. | New share version protects keys; legacy shares must be reissued |

## Firestore ID Reconciliation

The comparison checks document IDs only. “Root-only” means present in a flat Firestore collection but absent from this local database; it does not mean that the document belongs to this account.

| Collection | Local rows | Local IDs found in root | Root documents | Local IDs absent in root | Root-only IDs |
| --- | ---: | ---: | ---: | ---: | ---: |
| `page_history` | 4,204 | 4,141 | 4,148 | 63 | 7 |
| `wishlist` | 22 | 21 | 21 | 1 | 0 |
| `library_highlights` | 14 | 14 | 15 | 0 | 1 |
| `library_bookmarks` | 24 | 23 | 25 | 1 | 2 |
| `library_book_collections` | 2 | 1 | 1 | 1 | 0 |
| `library_reading_sessions` | 64 | 63 | 63 | 1 | 0 |
| `youtube_summaries` | 12 | 0 | 0 | 12 | 0 |
| `tutor_messages` | 46 | 36 | 36 | 10 | 0 |
| `lofis` | 3 | 2 | 2 | 1 | 0 |
| `activity_logs` | 96 | 73 | 74 | 23 | 1 |
| `anki_decks` | 10 | 1 | 1 | 9 | 0 |
| `notifications` | 4 | 0 | 0 | 4 | 0 |
| **Total across listed differences** |  |  |  | **126** | **11** |

The 50 client-side sync collections contained 4,995 local rows in aggregate. Firestore aggregate counts totaled 4,873 root documents, including system documents in `config`; these totals are not directly comparable. `config` was not included in ID matching because local IDs may contain `/`.

## Security and Ownership

### Public rules

At audit time, live rules had `match /{document=**} { allow read, write: if true; }`. Anonymous aggregate reads against live root collections succeeded. The [`firestore.rules`](../../../firestore.rules) replacement removes the catch-all, scopes user and workspace sync paths, prevents self-enrollment into unrelated workspaces, and narrows share operations. It is deployed, and an anonymous production read of `page_history` now returns `403 PERMISSION_DENIED`. Previous ruleset `4dbee571-c0f9-4add-9f32-f6a1faa53e6f` is retained by Firebase for rollback.

The local `/users/{userId}` rule permits reads only by that user. Membership creation requires an owner-created workspace or an accepted invitation. The old user-self membership rule allowed an authenticated user to self-add to arbitrary workspace membership documents.

### Unscoped root sync

The local sync client now requires a non-anonymous Firebase UID or an active workspace. No-workspace data uses `/users/{uid}/sync/data/{table}/{documentId}`; workspace data uses `/workspaces/{workspaceId}/{table}/{documentId}`. Manifest and signal checkpoints are scoped to the same identity. The account-evolution migrator reads local rows and pushes them into the authenticated user's workspace; it does not read or copy unscoped root documents. It now receives the actual master key retained by the auth flow, instead of incorrectly using a module key to create the workspace key envelope.

These changes prevent new clients from mixing data across accounts, but they do not copy old root documents. The owner confirmed that all legacy records belong to the sole account. Firebase Auth currently has zero users, so no UID is available for writing scoped records. The 126 local IDs absent from the audited root paths and 11 root-only IDs still need an authenticated, unlocked reconciliation. The static PBKDF2 salt also means successful decryption alone is not sufficient proof of document ownership.

### Public share key exposure

The previous direct-share config stored `wrappedShareKey` as raw Base64 unless owner approval was enabled. Since share metadata was publicly readable, anyone could fetch that key and decrypt the content even when a password gate was shown. New shares require an owner Firebase account and master key; Firestore stores only a master-wrapped key, a password-wrapped key where configured, and version 2 metadata. Direct unprotected links carry the key in the URL fragment, which browsers do not send in HTTP requests. The local rules deny public reads of old shares without version 2 metadata; existing shares must be recreated after the rules are deployed.

## Local Schema and Database

- Before migration, the active database had 52 tables and lacked `shared_page_keys`, `culture_disliked_items`, and `culture_ignored_items`, all present in the current `MODULE_TABLES` inventory and current Tauri migration source.
- The missing tables had zero corresponding root documents at audit time. They were created empty with the current schema.
- A rollback snapshot was verified outside the repository before applying the migration.
- `quick_check` and `foreign_key_check` passed after migration. Fingerprints over all pre-existing table columns found no changed row values.
- A separate stale database copy exists outside the active app data location. It was not migrated or used as the source of truth.
- Matching IDs do not establish column-level or decrypted field parity. Full field compatibility still needs authenticated end-to-end verification for every table and client adapter.

## Sync Bugs Fixed in Local Source

- Missing per-table checkpoints now trigger a full table scan rather than reusing a global timestamp.
- Push errors and oversized skipped payloads hold that table's checkpoint; incomplete pushes now reject the operation.
- Pull/decrypt/upsert failures hold checkpoints and reject the pull, preventing the full-sync flow from pushing stale local data afterward.
- A legacy-key re-encryption path now upserts or retains the winning local row before rewriting the cloud ciphertext; it no longer deletes the cloud row first.
- Firestore-invalid local IDs use a versioned base64url document ID and are decoded before local lookup/upsert.
- Tauri sync readers now report row/blob conversion errors. Upserts reject unknown columns rather than silently dropping fields, and ID-based reads enforce the sync-table allowlist.
- A missing local sync API now rejects the pull instead of reporting a successful no-op.
- Firestore metadata, sync adapter rows, and decrypted JSON objects now pass runtime shape checks before they affect IDs, checkpoints, or SQLite upserts.
- The document decrypt/upsert/rekey path was extracted into [`sync-pull-documents.ts`](../../../apps/web-react/src/services/sync/sync-pull-documents.ts), leaving the table query/checkpoint loop in `sync-pull.ts`.
- IndexedDB sync reads now fail visibly if a required store or row operation is unavailable; local read failures are no longer mistaken for absent data and then overwritten by cloud rows.
- Compared the 50 client sync table names and active SQLite schema against the Firestore rule table allowlist, Rust allowlist, and IndexedDB stores. The names are aligned. Three SQLite tables legitimately lack optional timestamp columns (`config.deleted_at`, `quiz_attempts.updated_at/deleted_at`, `quiz_page_links.updated_at`); payload mapping now omits absent optional metadata instead of synthesizing columns that Tauri rejects.

## Migration Reliability

[`db_migrations.rs`](../../../apps/web-react/src-tauri/src/db_migrations.rs) ignores many `execute` errors. A partial migration can therefore appear successful. The migration source also combines table creation, column changes, defaults, and data updates in one routine. Refactor it into explicit versioned migrations that return errors and run transactionally where SQLite permits, with separate tests for upgrades from supported schema versions.

## Current Local Verification

- Targeted sync, sharing, migration, and viewer tests: 122 passing across 21 files.
- `npm run typecheck`: passed.
- `npm run test:firestore-rules`: 4 passing against the local Firestore Emulator.
- Rust sync-command tests passed earlier in this remediation pass.
- `npm run build:web`: passed; Vite emitted large-chunk and dependency `eval` warnings.
- Production: the rules source hash matches the active ruleset; anonymous root read is denied. The 4 configured Hosting sites serve the built `index.html` and `share-viewer.html`.
- Production Auth: email/password and anonymous providers are enabled; the five expected domains are authorized; Auth user count is zero.
- No Firestore document data was changed, copied, deleted, or decrypted by the deployment.
