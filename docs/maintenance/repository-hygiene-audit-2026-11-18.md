# Repository Hygiene Audit

**Reviewed:** 2026-11-18
**Status:** Safe generated-file cleanup completed; React Web account sign-in/full sync now passes. Data-bearing and active compatibility paths remain protected by their existing removal gates.

## Scope and Findings

- The repository had 2,341 tracked files and no untracked files at review time.
- No build outputs, local SQLite databases, debug logs, temporary files, or editor swap files are tracked in Git.
- Four ignored Firebase CLI debug logs were present: `firebase-debug.log` and `firestore-debug.log` at the repository root and under `apps/web-react/`. No process had them open. They were generated during previous CLI work and have been removed.
- No loose SQLite files, temporary files, or other debug logs were found outside recognized generated directories.
- Firebase Storage was initialized and exported without any source consumer. The unused SDK initialization and `VITE_FIREBASE_STORAGE_BUCKET` configuration were removed. Firestore and Firebase Authentication remain initialized.
- The documentation index now reflects one primary account and 5,005 scoped documents verified with no missing or remote-only IDs. A later fresh React Web sign-in/full sync passed with 5,030 app-recorded reads and 5 writes; installed Tauri/WebView checks and Qt/Android migration remain open.
- Historical architecture analyses and workspace proposals are explicitly labeled as snapshots/proposals. Stale present-tense claims about account setup, Firebase Storage, and Authentication certification were corrected and linked to current sources of truth.

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
- [x] Label historical authentication/storage findings and workspace proposals so they cannot be mistaken for current status.
- [x] Keep data-bearing backups and active compatibility code behind explicit gates.
- [x] Complete the React Web authenticated app sign-in and sync-pull acceptance before considering Firebase source-archive cleanup.
- [ ] Verify installed Tauri and Expo WebView account sign-in/pull; React Web evidence does not cover those installed clients.
- [ ] Complete Qt and Android account/key migrations before removing their local credential and crypto paths.

This audit does not treat every filename containing `legacy`, `backup`, or `session` as dead code. Several such paths still preserve user data or serve active callers; their removal requires the evidence listed above.
