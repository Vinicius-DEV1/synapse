# Repository Hygiene Audit

**Reviewed:** 2026-11-18
**Status:** Safe generated-file cleanup completed; data-bearing and active compatibility paths remain protected by their existing removal gates.

## Scope and Findings

- The repository had 2,341 tracked files and no untracked files at review time.
- No build outputs, local SQLite databases, debug logs, temporary files, or editor swap files are tracked in Git.
- Four ignored Firebase CLI debug logs were present: `firebase-debug.log` and `firestore-debug.log` at the repository root and under `apps/web-react/`. No process had them open. They were generated during previous CLI work and have been removed.
- No loose SQLite files, temporary files, or other debug logs were found outside recognized generated directories.
- Firebase Storage was initialized and exported without any source consumer. The unused SDK initialization and `VITE_FIREBASE_STORAGE_BUCKET` configuration were removed. Firestore and Firebase Authentication remain initialized.
- The current documentation index incorrectly described Firebase Auth as having zero users and the scoped reconciliation as incomplete. It now reflects the later audit evidence: one primary account, 5,005 scoped documents verified, no missing or remote-only IDs, and 9,398 reads. Full application sign-in and sync pull remain open.
- Historical architecture analyses are explicitly labeled as snapshots. They remain available as historical context and are not treated as current implementation evidence.

## Deliberately Retained Files

| Item | Reason it remains | Removal gate |
| --- | --- | --- |
| `apps/web-react/src/services/migration/legacy-migrator.ts` | `AccountEvolutionModal` still calls this compatibility migration. | Trace all callers and deployed-client compatibility, then remove in a separate migration change. |
| `apps/web-react/src-tauri/src/legacy_data_migration.rs` | Tauri startup uses it to preserve and relocate older user data directories. | Compare candidate databases and media, verify a restorable backup, and prove all supported installs have migrated. |
| Web `masterHash` detection/deletion and vault-field SHA fallback | These paths protect older IndexedDB keychains and vault ciphertext while account migration is incomplete. | Complete account sign-in migration, inventory old vault ciphertext, and pass recovery tests before deleting the compatibility code. |
| Qt local Master Password setup, unlock, change, removal, and key envelopes | The separate Qt client still uses this key to open its local SQLite data and managed media. | Implement and test Qt account authentication and transactional key rewrap before removing the gate or its crypto paths. |
| Native Android crypto bindings | Android has no equivalent account/key migration contract yet. | Define and test the Android account and key lifecycle before removing or renaming bindings. |
| Firestore source archives, root documents, SQLite rollback snapshots, and legacy shares | They contain user data or recovery material; the app-mediated sync acceptance gate remains open. | Follow the per-item gates in the [Firebase legacy cleanup inventory](../audits/firebase-sync-integrity-2026-11-17/legacy-cleanup-inventory.md). |
| `target/`, `dist-web/`, `apps/desktop-qt/build/`, and dependency caches | These are ignored generated outputs. The built `.deb` is a requested release artifact. | Regenerate as needed; remove only when the release artifact is no longer required. |

## Checklist

- [x] Confirm the worktree had no untracked files.
- [x] Confirm no generated build, database, log, or temporary files are tracked.
- [x] Remove four closed Firebase CLI debug logs.
- [x] Remove Firebase Storage initialization with no callers and its unused environment setting.
- [x] Correct the current documentation status using the later audit report.
- [x] Keep data-bearing backups and active compatibility code behind explicit gates.
- [ ] Complete the full authenticated app sign-in and sync-pull acceptance before retiring Firebase source archives or rollback copies.
- [ ] Complete Qt and Android account/key migrations before removing their local credential and crypto paths.

This audit does not treat every filename containing `legacy`, `backup`, or `session` as dead code. Several such paths still preserve user data or serve active callers; their removal requires the evidence listed above.
