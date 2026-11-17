# Firebase Sync Integrity Audit

**Audit date:** 2026-11-17
**Status:** Scoped access, code fixes, backup, reconciliation writes, and local merge are complete. Final per-document cloud verification is blocked by a Firestore `429 Quota exceeded` response after the verifier reported one missing destination document. Keep source roots and rollback snapshots until that verification and restore checks pass.

## Executive Summary

The sync client and Firestore rules were hardened and deployed. A Firebase account was created and its credentials were validated without recording secrets in this repository. All 4,873 original root documents were archived and integrity-checked outside the repository. The 4,870 eligible source documents (4,867 sync records and 3 protected config documents) were copied to account-scoped paths; 3 transient system config documents were kept only in the protected archive. Original flat-root documents remain intact.

The authenticated reconciliation evaluated decrypted content and used the application's timestamp and page-history conflict rules. It updated existing scoped documents, created local-only scoped documents, and wrote 9 oversized records using encrypted chunks. The scoped collection count was 5,005 sync documents, plus 3 protected config documents. The final per-document verifier still reported a missing document. A subsequent targeted `batchGet` received HTTP 429, so the missing path could not be isolated or repaired safely.

The active SQLite database now passes `quick_check` and `foreign_key_check`. Across the 50 canonical sync tables it contains 5,006 rows: 5,005 syncable rows plus one transient config row intentionally excluded from cloud sync. Every one of the 4,867 non-transient source document IDs is now represented locally; there are 138 additional local sync rows and no source-only IDs. The count and ID checks do not prove that every destination document decrypts to identical content.

## Audit Artifacts

- [Findings and evidence](./findings.md)
- [Resolution checklist](./resolution-checklist.md)
- [Legacy cleanup inventory](./legacy-cleanup-inventory.md)

## Verification

- Firestore rules were deployed. Emulator rules tests passed (4 tests).
- Email/password and anonymous providers are enabled. Authenticated CLI sign-in to the primary account succeeded.
- Current web code was built with `npm run build:web` and deployed to all four sites configured in `firebase.json`.
- `npm run typecheck` passed. Targeted sync tests passed (41 tests across 4 files).
- The active local database passed SQLite integrity and foreign-key checks. The canonical sync table inventory matches across Web, Firestore rules, Rust, IndexedDB, and local schema.
- The secure reconciliation archive and SQLite rollback snapshots remain outside the repository. Their paths, document IDs, payloads, account identifiers, and hashes are kept out of this report.

## Remaining Acceptance Gates

1. Retry destination verification after Firestore quota recovers, identify and resolve the reported missing document, then verify all expected scoped paths and encrypted payloads.
2. Run a full authenticated app pull after unlocking the local vault and verify data and tombstones across all 50 sync tables.
3. Verify a database restore from the protected SQLite snapshot and retain the production rules rollback version until acceptance passes.
4. Keep the old root documents, legacy shares, unused Hosting sites, and legacy storage copies listed in the cleanup inventory until their individual gates pass.

A matching aggregate count is not a per-document or decrypted-content parity guarantee. This audit remains open until the gates above have reproducible evidence.
