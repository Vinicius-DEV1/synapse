# Active Audit Work

This directory stores active comparison work, unresolved findings, evidence logs and acceptance checklists. Durable project architecture and verified status belong in `docs/`, not here.

## Current work areas

| Area | Working material | Status |
| --- | --- | --- |
| Desktop Qt parity | [`desktop-qt-parity/`](./desktop-qt-parity/README.md) | Active. Current implementation focus is Notes/Caderno; older cross-module material is retained as working history and is outside the present feature scope. |
| Firebase sync integrity | [`firebase-sync-integrity-2026-11-17/`](./firebase-sync-integrity-2026-11-17/README.md) | Scoped reconciliation is verified; installed-client acceptance and legacy-retention gates remain open. Consolidated results are in [`docs/security/firebase-sync-integrity.md`](../docs/security/firebase-sync-integrity.md). |
| Native Android parity | [`mobile-android-parity/`](./mobile-android-parity/README.md) | Existing feature comparison and acceptance work; it is not part of the current Notes-only parity implementation scope. |

## Completion rule

When an audit is complete, copy only durable conclusions and reproducible evidence into the correct `docs/` sources, update the documentation index and links, and remove the completed working artifact. Do not remove active work while acceptance gates remain open. Never treat unchecked items, historical totals, or source inspection alone as completion evidence.
