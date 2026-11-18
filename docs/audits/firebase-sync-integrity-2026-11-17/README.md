# Firebase Sync Integrity Audit

**Audit started:** 2026-11-17

**Last verified:** 2026-11-18

**Status:** Scoped Firestore reconciliation, authenticated decrypted readback, and an isolated SQLite restore integrity check are complete. The full app UI pull remains open. Original root documents and rollback snapshots remain preserved until the app-pull gate and cleanup review pass.

## Executive Summary

The sync client and Firestore rules were hardened and deployed. A Firebase account was created and its credentials were validated without recording secrets in this repository. All 4,873 original root documents were archived and integrity-checked outside the repository. The 4,870 eligible source documents (4,867 sync records and 3 protected config documents) were copied to account-scoped paths; 3 transient system config documents were kept only in the protected archive. Original flat-root documents remain intact.

On 2026-11-18, an authenticated readback scanned only the 50 user-scoped sync collections and the three protected config paths. It read all 5,005 expected sync documents, found no missing or remote-only documents, and decrypted and compared every payload. All 9 chunked parents and their 41 encrypted chunk documents were verified. The three protected config documents also matched. No payload required the legacy core-key decrypt fallback.

The readback found representation-only differences in 16 documents (28 fields): SQLite stores specific array columns as JSON text while Firestore stores arrays as structured values. Parsing the local JSON text produced exact semantic matches. Ten metadata timestamps were then normalized to canonical RFC3339 strings using update-time preconditions and verified by readback; encrypted payloads were not changed. The sync publisher now normalizes the known SQLite JSON-array columns before encryption.

The authenticated parity pass used 9,398 Firestore document reads, below the 50,000 daily free-tier read quota. It did not read the unscoped root collections. No further Firestore scan is needed for this audit.

The active SQLite database passes `quick_check` and `foreign_key_check`. Across the 50 canonical sync tables it contains 5,006 rows: 5,005 syncable rows plus one transient config row intentionally excluded from cloud sync. Every one of the 4,867 non-transient source document IDs is represented locally; there are 138 additional local sync rows and no source-only IDs.

The recorded rollback file was missing from its original path, but a copy with the exact recorded SHA-256 was found. A temporary isolated restore passed SQLite `integrity_check` with zero foreign-key violations across 55 tables and 5,033 rows. The merge baseline records 32 selected tables: all 32 exist in the restore, 31 row counts match, and `config` has one additional row. That row is the documented local-only transient config entry excluded from the 5,005-document cloud sync set; it is not a missing cloud document. The check validated database readability and integrity; it did not compare every row's content against the post-merge active database. The exact-hash snapshot copy remains preserved outside the repository.

## Audit Artifacts

- [Findings and evidence](./findings.md)
- [Resolution checklist](./resolution-checklist.md)
- [Legacy cleanup inventory](./legacy-cleanup-inventory.md)

## Verification

- Firestore rules were deployed. Emulator rules tests passed (4 tests).
- Email/password and anonymous providers are enabled. Authenticated CLI sign-in to the primary account succeeded.
- Current web code passed focused sync tests (45 tests across 5 files), `npm run typecheck`, and `npm run build:web`; the latest build was deployed to all four sites configured in `firebase.json`.
- Scoped production readback covered all 5,005 sync documents, 41 encrypted chunk documents, and 3 protected config documents. All encrypted payloads decrypted and matched; no missing or remote-only sync IDs were found.
- SQLite integrity is `ok`; foreign-key violations are zero. The exact-hash rollback snapshot copy was restored in a temporary isolated database and passed structural integrity checks. The secure reconciliation archive and SQLite rollback snapshots remain outside the repository. Their paths, document IDs, payloads, account identifiers, and hashes are kept out of this report.

## Remaining Acceptance Gates

1. Unlock the app and run a full authenticated UI pull to verify the deployed client end to end. Browser automation remains unavailable; production data was verified through authenticated Firestore reads and the application decryption path instead.
2. Keep old root documents, legacy shares, unused Hosting sites, and legacy storage copies listed in the cleanup inventory until their individual gates pass. No data or legacy copy was deleted during reconciliation.
3. Continue the separate native-client, migration reliability, duplicate schema ownership, and legacy-share review items in the checklist.

The scoped cloud data and decrypted payloads now have item-by-item evidence, and the protected snapshot opens cleanly in isolation. This does not certify the full app UI flow, exact content parity of the restored snapshot, other client targets, or authorize removal of preserved source data.
