# Findings and Evidence

## Severity Summary

| Priority | Finding | State |
| --- | --- | --- |
| P0 | Former Firestore rules allowed anonymous root access. | Fixed; scoped rules deployed and anonymous root reads are denied. |
| P1 | Local and root records differed, and sync scopes were not isolated. | Scoped reconciliation and authenticated decrypted readback completed; all expected documents match. Original roots are preserved pending restore and app-pull acceptance. |
| P1 | Push/pull failures could advance checkpoints or hide incomplete work. | Fixed in source; targeted tests pass. |
| P1 | Tauri sync upserts could silently discard unsupported columns or fail whole rows on optional timestamps. | Fixed in source; regression coverage added. |
| P1 | Legacy share metadata could expose raw share keys. | New versioned share flow protects keys; old shares remain blocked pending reissue. |
| P2 | Three expected sync tables were absent from the active local database. | Created from current migration source after a verified snapshot. |
| P2 | SQLite migration errors are suppressed in many paths. | Still open; tracked in the cleanup inventory. |

## Original Root ID Comparison

The initial ID-only comparison did not establish ownership or content equality. The owner later confirmed that this project has one account and authorized associating all pending root records with it.

| Collection | Local rows at initial audit | Local IDs found in root | Root documents | Local IDs absent in root | Root-only IDs |
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
| **Totals across listed differences** |  |  |  | **126** | **11** |

`config` was not part of the initial ID-only comparison because some local IDs contain `/`. Current sync code encodes such IDs reversibly.

## Reconciliation Results

- The protected archive contains 4,873 root documents and passed its document-count and hash checks.
- The archived source contained 4,867 non-transient sync documents, 3 protected account config documents, and 3 transient system config documents. The eligible 4,870 documents were copied with create-only writes into the authenticated account scope. The three transient system records were not copied. Original root documents were not deleted or changed by the copy process.
- The pre-write decrypted comparison covered 4,856 matching local/root IDs. It found 3,165 exact payloads and 1,691 payload differences. These included 99 cases where local non-null fields were absent remotely, 40 cases with differing shared values, and 1,565 cases where the difference was only a local null omitted remotely; these categories overlap.
- The application's conflict resolver classified 4,837 rows as equal timestamp, 3 as local newer, 15 as root newer, and 1 as lacking comparable timestamps. Local-newer rows were preserved, root-newer rows were applied, and the Yjs page-history path was used where applicable.
- Reconciliation submitted 1,766 parent updates, skipped 3,090 already-resolved matches, created 138 local-only records, and wrote 9 oversized records through encrypted chunks. Nine regular write batches completed; no delete writes were submitted.
- The local merge applied 4,853 row updates and created the 11 records that had existed only in root. The original local-only records were preserved.
- The initial post-write verifier returned 5,005 scoped sync documents and 3 protected config documents, then reported one missing document before Firestore reads hit HTTP 429. The complete quota-reset pass on 2026-11-18 rechecked all expected paths and found no missing document; the earlier result was not reproducible.
- Independent local comparison now finds all 4,867 non-transient source IDs present in SQLite, 138 local-only sync rows, and zero root-only source IDs. SQLite has 5,006 rows across 50 canonical tables; one transient config row is excluded from sync, leaving 5,005 syncable rows. Integrity check is `ok`; foreign-key violations are zero.
- On 2026-11-18, a quota-reset authenticated pass enumerated all 50 scoped sync collections: 5,005 expected documents were present, with zero missing and zero remote-only IDs. All 5,005 payloads were decrypted and compared; there were no decryption errors and no legacy-key decryptions. The previous single-missing-document signal did not reproduce.
- The pass also verified 9 chunked parent documents and all 41 encrypted chunk children, plus the 3 protected config documents. Sixteen documents had 28 type-shape differences because SQLite stores known array fields as JSON text; parsing the local values yielded exact semantic equality with Firestore arrays.
- Ten `updatedAt` metadata values were normalized to canonical RFC3339 strings with Firestore `updateTime` preconditions. Nine represented the same instant with different types; one local value was newer and was retained. A follow-up read verified all ten updates; encrypted payloads were not rewritten.
- This verification pass used 9,398 Firestore document reads, below the 50,000 free-tier daily read quota, and did not read unscoped root collections. No additional full scan is necessary.

## Security and Account Scope

The former rules included a public catch-all. The deployed [`firestore.rules`](../../../firestore.rules) now scopes personal data to `/users/{uid}/sync/data/...`, restricts workspace data by membership role, narrows share operations, and denies unmatched roots. The prior production ruleset `4dbee571-c0f9-4add-9f32-f6a1faa53e6f` remains available for rollback. Anonymous production root reads were verified as denied.

The primary Firebase Auth account was created and validated using the provided local credential file. Email/password and anonymous providers are enabled, and the four Hosting sites in [`firebase.json`](../../../firebase.json) are authorized. Account identifiers and secrets are intentionally omitted from repository documentation.

The client's previous default-to-root path was removed. Personal sync requires a non-anonymous UID; workspace sync remains role-scoped. Manifest and signal checkpoints are scoped to the same identity. The account-evolution migrator now uses the master key retained by the auth flow and fails on local-read or cloud-push errors.

## Public Share Key Exposure

Older direct-share config could store a raw share key in publicly readable metadata. New shares require an owner account and master key; version 2 metadata stores a master-wrapped owner key and, where configured, a password-wrapped visitor key. Unprotected direct links carry the key in the URL fragment. Public rules deny old version 1 shares. Recreate any needed old shares from the unlocked app before retiring their records.

## Local Schema and Column Coverage

- The active database initially lacked `shared_page_keys`, `culture_disliked_items`, and `culture_ignored_items`; all were created empty from the current migration source after an integrity-checked rollback snapshot.
- The current 50-table Web sync allowlist aligns with Firestore rules, Rust sync commands, IndexedDB, and the active SQLite schema. All 50 tables exist and contain an `id` column; no sync row has a blank ID.
- The separate Rust-only `link_metadata_cache` table is not part of the canonical Web sync allowlist.
- Local `config` contains one transient row excluded by design. It is not part of the 5,005 syncable-row count.
- Three tables legitimately omit optional timestamp columns: `config.deleted_at`, `quiz_attempts.updated_at/deleted_at`, and `quiz_page_links.updated_at`. The sync payload mapper now omits unavailable optional metadata instead of synthesizing columns rejected by Tauri upsert.
- `quick_check=ok`; `foreign_key_check` returned zero violations.

## Sync Bugs Fixed in Source

- Missing table checkpoints now trigger a full table scan; failed or incomplete pushes and pulls do not advance checkpoints.
- Pull/decrypt/upsert failures reject the pull so a later push cannot silently publish stale local state.
- Legacy-key re-encryption preserves the winning row and does not delete cloud data first.
- Invalid Firestore document IDs use reversible versioned encoding.
- Tauri sync readers surface row/blob conversion failures. Upserts reject unknown columns rather than silently dropping them.
- Local IndexedDB read failures are no longer mistaken for missing records.
- External Firestore metadata, adapter rows, and decrypted JSON are validated before affecting IDs, checkpoints, or SQLite.
- Large encrypted payloads use gzip and authenticated AES-GCM chunk envelopes. The parent pointer is written only after chunk writes; rules constrain chunks to the same owner or workspace role.
- The publisher converts SQLite JSON-text values in `library_books.collections` and `calendar_events.reminders` / `notified_reminders` to structured arrays before encryption. Other fields and malformed legacy values remain untouched.
- Optional timestamp mapping no longer rejects otherwise valid records when the local schema omits those columns.
- The document decrypt/upsert/rekey path is extracted into [`sync-pull-documents.ts`](../../../apps/web-react/src/services/sync/sync-pull-documents.ts).
- The unused unscoped `hardResetCloud()` helper and deprecated no-op `restoreLastSyncTimesFromDb()` path were removed.

## Verification Evidence and Limits

- Targeted sync tests: 45 passing across 5 files, including JSON-array normalization, chunked payload, push, pull recovery, and pull merge cases.
- `npm run typecheck`: passed.
- `npm run test:firestore-rules`: 4 emulator tests passed.
- `npm run build:web`: passed. Vite reports large-chunk warnings and a direct `eval` warning from `onnxruntime-web`.
- The latest web build was deployed to `https://synapse-dev.web.app`, `https://synapsedev.web.app`, `https://synapse-web.web.app`, and `https://fourth-cirrus-468923-h7.web.app`.
- Authenticated item-by-item scoped readback and decrypted payload parity are complete. A full authenticated app UI pull remains open because browser automation was unavailable; an isolated backup restore is also still required.
- Legacy public shares, native client updates, migration reliability refactoring, and safe retirement of preserved data/site copies remain open.
