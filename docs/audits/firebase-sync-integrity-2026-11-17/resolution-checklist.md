# Resolution Checklist

Use this checklist as the acceptance record. A checked item has reproducible evidence in the repository, local database, emulator, or production deployment. Aggregate counts alone do not prove per-document or decrypted payload equality.

## A. Local Schema and Sync Error Safety

- [x] Identify the active SQLite database using the configured Tauri app identifier; exclude older copies from the active database decision.
- [x] Create and integrity-check a rollback snapshot outside the repository before changing the active database.
- [x] Run the current migration against an isolated database copy and verify no existing row/column values change.
- [x] Create the missing `shared_page_keys`, `culture_disliked_items`, and `culture_ignored_items` tables in the active database.
- [x] Verify post-migration table presence, SQLite integrity, foreign keys, and unchanged pre-existing values.
- [x] Hold push/pull checkpoints on failed rows and reject incomplete sync passes.
- [x] Preserve cloud rows during legacy-key re-encryption and encode Firestore-invalid local IDs.
- [x] Reject unknown sync columns and surface row/blob conversion failures in Tauri sync commands.
- [x] Split pull orchestration from document decrypt/upsert/rekey processing and divide tests into focused files.
- [x] Compare the 50 client sync tables across Web, Firestore rules, Rust, IndexedDB, and active SQLite; handle optional timestamps without inventing unsupported columns.
- [x] Propagate local IndexedDB read/store failures instead of treating failed reads as missing records.
- [x] Remove the unused unscoped cloud reset helper and deprecated no-op timestamp restore call.
- [x] Verify all 50 sync tables exist and have no blank IDs; active SQLite integrity is `ok` with zero FK violations.
- [x] Run focused sync tests, `npm run typecheck`, Firestore Emulator rules tests, and a production Web build.

## B. Scope and Reconcile Data

- [x] Record the owner's confirmation that all audited legacy-root records belong to the project's sole account.
- [x] Create/sign in to the primary Firebase Auth account and validate the provided master password against the encrypted legacy validator.
- [x] Archive all 4,873 root documents outside the repository and verify archive count/hash before writes.
- [x] Copy 4,867 eligible sync documents and 3 protected config documents to authenticated user scope with create-only writes; preserve 3 transient system config documents in the archive only.
- [x] Preserve the original unscoped root documents; submit no delete writes.
- [x] Compare decrypted root/local payloads and apply the application conflict resolver; preserve newer local edits and merge remote-only records into SQLite.
- [x] Create 138 local-only scoped records and write 9 oversized records with encrypted chunks.
- [x] Verify SQLite after merge: 5,005 syncable rows across 50 tables, 1 transient config excluded, `quick_check=ok`, zero FK violations.
- [x] Recheck local IDs against the protected source archive: all 4,867 non-transient source IDs are local, 138 local-only rows remain, and no source-only IDs remain.
- [x] Recheck the earlier single-missing-document signal; a complete quota-reset scan found all expected paths and zero missing or remote-only documents.
- [x] Read every expected scoped path and verify decrypted payloads, tombstones, metadata, chunks, and conflicts across all 50 tables: 5,005 payloads decrypted and compared, 9 chunk parents / 41 encrypted chunk children verified, and 3 protected config documents verified.
- [x] Resolve 16 documents with 28 representation-only array-field differences; parsed SQLite JSON text matched the structured Firestore values exactly.
- [x] Normalize and read back 10 metadata timestamps using update-time preconditions without changing encrypted payloads.
- [x] Record the verification-pass Firestore read budget: 9,398 document reads, below the 50,000/day free-tier quota; no unscoped root collection reads were made.
- [ ] Unlock the app and run a full authenticated application pull to verify the deployed client end to end. Browser automation was unavailable in this environment.
- [x] Re-run aggregate and ID comparison after quota recovery; confirm all 5,005 owned local sync rows have scoped documents and no unexpected remote-only rows remain.

## C. Firestore Access and Production Client

- [x] Remove the public Firestore catch-all and scope personal and workspace data paths.
- [x] Restrict user-profile reads and prevent self-enrollment into unrelated workspaces.
- [x] Require owner-scoped/versioned public shares and protect new share keys.
- [x] Add Emulator rules tests for anonymous isolation, cross-user denial, workspace roles, invitations, and versioned shares.
- [x] Deploy Email/Password and Anonymous Auth providers and authorize the four configured Hosting domains.
- [x] Deploy reviewed Firestore rules and verify anonymous production root reads are denied; retain rules rollback version `4dbee571-c0f9-4add-9f32-f6a1faa53e6f`.
- [x] Build and publish the latest Web client to all four configured Hosting sites, including optional timestamp mapping and JSON-array normalization fixes.
- [ ] Verify full sign-in and scoped sync through the app UI after local master-key unlock; CLI Auth validation alone is not the complete UX check.
- [ ] Update/rebuild installed native clients and verify compatibility with scoped rules.
- [ ] Reissue any required version 1 public shares and verify replacement links before retiring the old shares.

## D. Legacy Removal and Final Acceptance

- [x] Inventory legacy data, code paths, rollback copies, and non-configured Hosting sites in [legacy cleanup inventory](./legacy-cleanup-inventory.md).
- [x] Remove the unscoped `hardResetCloud()` and no-op `restoreLastSyncTimesFromDb()` source paths.
- [ ] Refactor `db_migrations.rs` so schema failures propagate, migrations have explicit versions, and supported upgrades are tested.
- [ ] Reconcile duplicate schema ownership between the Rust core and Tauri database layer before deleting either source.
- [x] Complete the cloud readback before considering source-root removal; scoped document and payload parity now pass.
- [ ] Complete the app-pull and isolated backup restore checks before removing source-root documents or rollback snapshots.
- [ ] Mark this audit complete only after local rows, scoped cloud documents, decrypted content, tombstones, and authorization checks all pass.
