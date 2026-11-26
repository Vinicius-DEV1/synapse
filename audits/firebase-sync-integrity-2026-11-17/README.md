# Firebase Sync Integrity Audit

**Audit started:** 2026-11-17

**Last verified:** 2026-11-18

**Status:** Scoped Firestore reconciliation, authenticated decrypted readback, isolated SQLite restore integrity, and a fresh React Web account sign-in/full sync pull are complete. Installed Tauri/WebView acceptance, native-client migration, and legacy-data cleanup gates remain open. Original root documents and rollback snapshots remain preserved.

## Executive Summary

The sync client and Firestore rules were hardened and deployed. A Firebase account was created and its credentials were validated without recording secrets in this repository. All 4,873 original root documents were archived and integrity-checked outside the repository. The 4,870 eligible source documents (4,867 sync records and 3 protected config documents) were copied to account-scoped paths; 3 transient system config documents were kept only in the protected archive. Original flat-root documents remain intact.

On 2026-11-18, an authenticated readback scanned only the 50 user-scoped sync collections and the three protected config paths. It read all 5,005 expected sync documents, found no missing or remote-only documents, and decrypted and compared every payload. All 9 chunked parents and their 41 encrypted chunk documents were verified. The three protected config documents also matched. No payload required the legacy core-key decrypt fallback.

The readback found representation-only differences in 16 documents (28 fields): SQLite stores specific array columns as JSON text while Firestore stores arrays as structured values. Parsing the local JSON text produced exact semantic matches. Ten metadata timestamps were then normalized to canonical RFC3339 strings using update-time preconditions and verified by readback; encrypted payloads were not changed. The sync publisher now normalizes the known SQLite JSON-array columns before encryption.

The authenticated parity pass used 9,398 Firestore document reads, below the 50,000 daily free-tier read quota. It did not read the unscoped root collections. No further Firestore scan is needed for this audit.

After the latest Hosting release, a fresh headless browser profile signed into the deployed React Web app and completed its initial pull and full sync. App telemetry recorded 5,030 reads and 5 writes; both `caderno-sync-complete` and `caderno-sync-success` fired, with no sync error or emergency stop. The browser profile and temporary Auth export were removed after verification. This run used the normal authenticated app flow; it was not another full parity scan.

The active SQLite database passes `quick_check` and `foreign_key_check`. Across the 50 canonical sync tables it contains 5,006 rows: 5,005 syncable rows plus one transient config row intentionally excluded from cloud sync. Every one of the 4,867 non-transient source document IDs is represented locally; there are 138 additional local sync rows and no source-only IDs.

The recorded rollback file was missing from its original path, but a copy with the exact recorded SHA-256 was found. A temporary isolated restore passed SQLite `integrity_check` with zero foreign-key violations across 55 tables and 5,033 rows. The merge baseline records 32 selected tables: all 32 exist in the restore, 31 row counts match, and `config` has one additional row. That row is the documented local-only transient config entry excluded from the 5,005-document cloud sync set; it is not a missing cloud document. The check validated database readability and integrity; it did not compare every row's content against the post-merge active database. The exact-hash snapshot copy remains preserved outside the repository.

## Audit Artifacts

- [Findings and evidence](./findings.md)
- [Resolution checklist](./resolution-checklist.md)
- [Legacy cleanup inventory](./legacy-cleanup-inventory.md)

## Verification

- Firestore rules were deployed. Emulator rules tests passed (4 tests).
- Email/password and anonymous providers are enabled. Authenticated CLI sign-in to the primary account succeeded.
- The latest sync fix passed 77 focused tests across 11 files, `npm run typecheck`, and targeted ESLint. `npm run build`, `npm run build:web`, and `npm run tauri -- build --bundles deb` passed; the performance budget gate passed all seven checks. The newest React Web bundle was published to all four configured Hosting sites without changing Firestore rules.
- Rust database migration checks passed (7 focused tests), and `cargo check` passed for the Tauri library. Tauri and the core now use one versioned core schema initializer; all 50 Web sync tables are present, migration failures roll back and propagate, and legacy `sessions` rows are preserved.
- Four focused Tauri tests verify interrupted legacy-directory copy recovery, error-marker retention and retry, protection of an existing canonical database, and committed data read from a live SQLite WAL. The legacy database is copied with SQLite's online backup API; other files use temporary copies and atomic renames.
- The checked-in [SQLite migration-copy verifier](./verify_migration_copy.py) applied the migration only to a temporary SQLite backup of the canonical app database. All 55 pre-existing tables, 5,044 rows, and existing column values were preserved; `schema_migrations` was the only new table, `quick_check=ok`, and foreign-key violations were zero. No transaction-account backfill or default finance account seed was needed. Re-run with `python3 audits/firebase-sync-integrity-2026-11-17/verify_migration_copy.py --database <sqlite-path>`.
- After a fresh permission-restricted online backup was verified, schema version 1 was applied to the canonical local database with the app closed. A value-level comparison confirmed all 55 pre-existing tables and 5,044 rows were unchanged; `schema_migrations` added one version row. The active database now has 56 tables, 5,045 total rows, and all 50 sync tables with 5,006 rows and zero blank IDs. A second verifier pass confirmed idempotency (`added_tables=none`), `quick_check=ok`, and zero FK violations.
- Scoped production readback covered all 5,005 sync documents, 41 encrypted chunk documents, and 3 protected config documents. All encrypted payloads decrypted and matched; no missing or remote-only sync IDs were found.
- The deployed React Web app then completed one fresh authenticated full sync pull (5,030 app-recorded reads, 5 writes, no error/emergency stop). This verified account sign-in, key loading, and the application pull path for React Web.
- SQLite integrity is `ok`; foreign-key violations are zero. The exact-hash rollback snapshot copy was restored in a temporary isolated database and passed structural integrity checks. The secure reconciliation archive and SQLite rollback snapshots remain outside the repository. Their paths, document IDs, payloads, account identifiers, and hashes are kept out of this report.

## Remaining Acceptance Gates

1. Verify account unlock and scoped sync in the installed Tauri and Expo WebView clients. React Web passed; native Qt and Android do not implement this Firebase flow yet.
2. Keep old root documents, legacy shares, unused Hosting sites, rollback archives, and legacy storage copies listed in the cleanup inventory until their individual retention and removal gates pass. No original root or backup data was deleted.
3. Continue the separate Qt/Android credential migration, legacy-share review, and safe cleanup items in the checklist.

The scoped cloud data and decrypted payloads have item-by-item evidence, the protected snapshot opens cleanly in isolation, and the React Web app-mediated sign-in/pull passed. This does not certify exact content parity of the restored snapshot or installed/native clients, and it does not authorize removal of preserved source data by implication.
