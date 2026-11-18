# Resolution Checklist

Use this checklist as the acceptance record. A checked item has reproducible evidence in the repository, local database, emulator, or production deployment. Aggregate counts alone do not prove per-document or decrypted payload equality.

## A. Local Schema and Sync Error Safety

- [x] Identify the active SQLite database using the configured Tauri app identifier; exclude older copies from the active database decision.
- [x] Create and integrity-check a rollback snapshot outside the repository before changing the active database.
- [x] Apply the current migration to a temporary SQLite backup of the canonical database; preserve all 55 existing tables, 5,044 rows, and existing column values, with `quick_check=ok` and zero FK violations.
- [x] Back up the canonical database outside the repository, apply schema version 1 to the inactive database, and compare all pre-existing table values to the backup; confirm one metadata row was added and repeated initialization is idempotent.
- [x] Exercise legacy fixtures; verify legacy session rows and quiz answers survive the intended transformations.
- [x] Create the missing `shared_page_keys`, `culture_disliked_items`, and `culture_ignored_items` tables in the active database.
- [x] Verify post-migration table presence, SQLite integrity, foreign keys, and unchanged pre-existing values.
- [x] Hold push/pull checkpoints on failed rows and reject incomplete sync passes.
- [x] Preserve cloud rows during legacy-key re-encryption and encode Firestore-invalid local IDs.
- [x] Reject unknown sync columns and surface row/blob conversion failures in Tauri sync commands.
- [x] Split pull orchestration from document decrypt/upsert/rekey processing and divide tests into focused files.
- [x] Compare the 50 client sync tables across Web, Firestore rules, Rust, IndexedDB, and active SQLite; handle optional timestamps without inventing unsupported columns.
- [x] Propagate local IndexedDB read/store failures instead of treating failed reads as missing records.
- [x] Remove the unused unscoped cloud reset helper and deprecated no-op timestamp restore call.
- [x] Verify all 50 sync tables exist in the migrated active database and have no blank IDs; SQLite integrity is `ok` with zero FK violations.
- [x] Centralize SQLite schema initialization in `synapse-core`; Tauri delegates to it and the duplicate `db_migrations.rs` source was removed.
- [x] Add schema migration versioning and execute schema, data, and index changes in one transaction; return contextual errors and record the version only after success.
- [x] Verify an injected schema failure rolls back version metadata and partial schema changes; verify repeated initialization is idempotent.
- [x] Preserve any legacy `sessions` table and rows instead of dropping it; add a regression test.
- [x] Propagate Tauri database initialization and legacy-directory copy errors instead of continuing with an unavailable database.
- [x] Verify interrupted legacy-directory copies resume, retain progress on errors, preserve the canonical database, and include committed SQLite WAL data through online backup.
- [x] Compare the Web sync allowlist to the shared core schema in a focused test; all 50 tables are present.
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
- [x] Sign in through the deployed React Web cloud-account UI and complete one full authenticated pull/sync: 5,030 app-recorded reads, 5 writes, completion and success events, no sync error or emergency stop. The temporary browser profile and Auth export were removed.
- [x] Re-run aggregate and ID comparison after quota recovery; confirm all 5,005 owned local sync rows have scoped documents and no unexpected remote-only rows remain.

## C. Firestore Access and Production Client

- [x] Remove the public Firestore catch-all and scope personal and workspace data paths.
- [x] Restrict user-profile reads and prevent self-enrollment into unrelated workspaces.
- [x] Require owner-scoped/versioned public shares and protect new share keys.
- [x] Add Emulator rules tests for anonymous isolation, cross-user denial, workspace roles, invitations, and versioned shares.
- [x] Deploy Email/Password and Anonymous Auth providers and authorize the four configured Hosting domains.
- [x] Deploy reviewed Firestore rules and verify anonymous production root reads are denied; retain rules rollback version `4dbee571-c0f9-4add-9f32-f6a1faa53e6f`.
- [x] Build and publish the latest Web client to all four configured Hosting sites, including optional timestamp mapping and JSON-array normalization fixes.
- [x] Verify cloud-account sign-in, key loading, and scoped sync through the deployed React Web UI; CLI Auth validation alone was not treated as the UX check.
- [ ] Verify installed Tauri and Mobile WebView builds load the scoped client and complete an authenticated UI pull. The checked-in Qt and Android clients do not implement Firestore sync directly.
- [ ] Reissue any required version 1 public shares and verify replacement links before retiring the old shares.

## D. Legacy Removal and Final Acceptance

- [x] Inventory legacy data, code paths, rollback copies, and non-configured Hosting sites in [legacy cleanup inventory](./legacy-cleanup-inventory.md).
- [x] Remove the unscoped `hardResetCloud()` and no-op `restoreLastSyncTimesFromDb()` source paths.
- [x] Replace the ignored-error Tauri migration copy with versioned, transactional core migrations and migration regression coverage.
- [x] Reconcile Tauri and core schema ownership: the core is canonical and the Tauri adapter delegates initialization to it.
- [x] Complete the cloud readback before considering source-root removal; scoped document and payload parity now pass.
- [x] Restore the rollback snapshot from an exact-SHA-256 copy into a temporary isolated database; `integrity_check=ok`, zero foreign-key violations, and the temporary copy was removed after verification. All 32 merge-baseline tables are present; 31 counts match, and the extra `config` row is the documented local-only transient row excluded from cloud sync.
- [x] Unlock the React Web app and verify a full authenticated UI pull before considering source-root cleanup; installed Tauri/WebView clients remain separate acceptance gates.
- [x] Mark the scoped React Web reconciliation audit complete after local rows, scoped cloud documents, decrypted content, tombstones, and authorization checks passed. This does not delete or retire preserved source data.
