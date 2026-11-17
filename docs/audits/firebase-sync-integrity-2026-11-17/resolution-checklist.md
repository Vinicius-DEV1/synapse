# Resolution Checklist

Use this checklist as the acceptance record. A checked item has evidence in this audit or the repository; do not check an item based only on a plan or an old completion note.

## A. Local Schema and Sync Error Safety

- [x] Identify the active SQLite database using the configured Tauri app identifier; exclude older copies from the active database decision.
- [x] Create and integrity-check a rollback snapshot outside the repository before changing the active database.
- [x] Run the current migration against an isolated database copy first and verify no existing row/column values change.
- [x] Create the missing `shared_page_keys`, `culture_disliked_items`, and `culture_ignored_items` tables in the active database.
- [x] Verify post-migration table presence, SQLite integrity, foreign keys, and unchanged pre-existing values.
- [x] Hold push/pull table checkpoints on failed rows, and reject incomplete sync passes.
- [x] Preserve cloud rows during legacy-key re-encryption and encode Firestore-invalid local IDs.
- [x] Reject unknown sync columns and surface row/blob conversion failures in Tauri sync commands.
- [x] Separate per-table pull orchestration from document decrypt/upsert/rekey processing, and split pull tests into focused files.
- [x] Compare all 50 client sync collection names across Web, Firestore rules, Rust, IndexedDB, and active SQLite; handle optional timestamp-column differences without inventing unsupported local columns.
- [x] Propagate local IndexedDB read/store failures instead of treating failed reads as missing records.
- [x] Remove the unused unscoped cloud reset helper and deprecated no-op timestamp restore call.
- [x] Run targeted sync and migration tests plus `npm run typecheck`; Firebase Emulator validation is tracked separately below.

## B. Scope Data Before Backfill

- [ ] Define the authoritative owner for every existing root collection and document type.
- [ ] Enumerate account memberships and workspace IDs through an authenticated session, then audit every owned workspace collection as well as the flat root collections.
- [ ] Inspect ownership fields only through the authenticated app after key unlock; do not infer ownership from root-only IDs.
- [ ] Design and test an authenticated, ownership-aware reconciliation for old root documents. Reject ambiguous documents and preserve an export/rollback copy.
- [x] Replace the unsafe root-copy migrator with an authenticated local-to-workspace migration that fails on local read or cloud push errors and never reads the shared roots.
- [x] Change default single-account sync to `/users/{uid}/sync/data/{table}/{id}` and keep workspace sync under member-controlled workspace paths.
- [x] Add Firebase Emulator tests proving anonymous isolation and cross-user query/read/write/delete denial.
- [ ] Deploy the scoped client and rules, then re-audit every sync collection and run a controlled full reconciliation. Scope-specific checkpoints now force a first full pass for each new user/workspace.
- [ ] Pull remote data before pushing local data. Preserve newer local edits and page history; do not bulk overwrite by document count alone.
- [ ] Republish locally present rows only after they are confirmed to belong to the signed-in account. The current audit found 126 local IDs absent from queried root collections across the 11 tables listed in [findings](./findings.md); re-run the audit immediately before backfill.
- [ ] Classify the 11 root-only IDs from the audit only after ownership is proven. Do not merge them into this account based on collection membership.
- [ ] Unlock the app and verify decrypted field equality, tombstones, timestamps, and conflict behavior across all 50 sync collections and each supported storage adapter.
- [ ] Re-run aggregate and ID comparison until all owned rows reconcile, then perform content-level verification on representative and boundary cases.

## C. Firestore Rule Hardening

- [x] Remove the repository's public catch-all grant and make unmatched root collections deny by default.
- [x] Restrict `/users/{userId}` reads to that user and prevent users from self-adding as members of arbitrary workspaces.
- [x] Review public share rules; require owner UID for writes, active versioned shares for public reads, and owner/visitor scoping for access requests and trusted-device records.
- [x] Stop storing new public share keys in plaintext Firestore fields; protect owner keys with the master key and visitor keys with a password or URL fragment.
- [x] Add Firebase Emulator Suite tests for anonymous, cross-user, workspace-member, editor, admin, owner, invitation acceptance, and versioned public-share scenarios.
- [ ] Confirm all clients are compatible with the local rules; stage deployment and retain a rollback ruleset.
- [ ] Deploy rules, verify anonymous root reads fail, verify valid account/workspace sync succeeds, and confirm forbidden writes/deletes fail.
- [ ] Reissue legacy public shares created before key protection version 2; the rules deny public access to those old records after deployment.

## D. Legacy Removal and Final Acceptance

- [ ] Complete the prerequisites in [legacy cleanup inventory](./legacy-cleanup-inventory.md) before removing any migration path, data directory, or generated database copy.
- [x] Remove the unscoped `hardResetCloud()` and no-op `restoreLastSyncTimesFromDb()` source paths.
- [ ] Refactor `db_migrations.rs` so schema failures are returned, migrations have explicit versions, and supported upgrade paths are covered.
- [ ] Reconcile duplicate schema ownership between the Rust core and Tauri database layer before deleting either source.
- [ ] Update the sync architecture inventory and this status page only after reproducible end-to-end evidence supports the claims.
- [ ] Keep the external rollback snapshot until cloud reconciliation, security verification, and restore procedure have passed.
- [ ] Mark the audit complete only when owned local rows, scoped cloud documents, decrypted content, tombstones, and authorization checks all pass.
