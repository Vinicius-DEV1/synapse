# Firebase Sync Integrity: Consolidated Status

This document records stable, verified outcomes for the scoped Firestore reconciliation and identifies the boundaries that remain open. It is the consolidated product documentation; detailed working evidence and unresolved cleanup tasks remain in the repository-root `audits/firebase-sync-integrity-2026-11-17/` artifact until those gates are completed.

**Last verified:** 2026-11-18
**Status:** Scoped reconciliation and React Web app-mediated pull verified; installed-client compatibility and legacy cleanup remain open.

## Verified reconciliation

- Firestore rules were changed to deny anonymous access to unscoped root records and scope user data. Emulator rules tests passed, and production anonymous root reads were denied.
- The authenticated readback inspected only the 50 user-scoped sync collections and three protected configuration paths. It verified 5,005 expected sync documents, 41 encrypted chunk documents, and three protected configuration documents. No expected scoped document was missing and no unexpected remote-only document was found.
- Encrypted payloads decrypted and matched their local records. Sixteen documents had 28 representation-only differences because SQLite stores selected arrays as JSON text while Firestore stores arrays; parsing the SQLite values produced exact semantic matches.
- Ten metadata timestamps were normalized with update-time preconditions. Encrypted payloads were not changed. The sync publisher now normalizes known SQLite JSON-array columns before encryption.
- The authenticated verification used 9,398 Firestore document reads and did not scan unscoped roots.
- A fresh React Web account sign-in and full pull completed after deployment, with 5,030 app-recorded reads, five writes, completion/success events, and no sync error or emergency stop.
- The active SQLite database passed integrity and foreign-key checks. All 4,867 eligible source IDs were present locally, with 138 local-only rows and one transient config row excluded from sync.
- A separately preserved exact-hash SQLite snapshot opened in an isolated temporary database and passed structural integrity checks. This did not compare every restored row with the post-merge database.

## Client and data boundaries

The React Web UI is the only installed product flow verified for account sign-in and a full authenticated pull in this work. Installed Tauri and Expo WebView acceptance remains open. Native Qt and native Android do not implement this Firebase account/sync flow. This verification does not establish cross-client sync parity, full local at-rest encryption, or content equality for every rollback snapshot row.

Original unscoped root records, legacy shares, rollback snapshots, legacy storage copies and unused Hosting sites remain preserved until separate retention and removal gates pass. The reconciliation does not authorize deleting them.

## Maintenance

When a new sync migration changes rules, schema, payload encoding, or client behavior, update this consolidated status only with current reproducible evidence. Keep unresolved cleanup or client acceptance as active work until verified; do not convert a planned step or historical count into a completion claim.
