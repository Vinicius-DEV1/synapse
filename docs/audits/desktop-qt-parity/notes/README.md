# Caderno (Notes) React-to-Qt Parity Audit

**Scope:** React Web Caderno module compared with the native Desktop Qt Caderno module. No other product module is in scope.

**Status:** Partial. Source fixes have been applied for several confirmed defects, but the implementation has not passed the focused build, interaction, persistence, accessibility, performance, and same-viewport visual acceptance gates described here. `Partial`, `Missing`, and `Unverified` are evidence labels, not estimates of completion.

## Audit documents

| Document | Contents |
| --- | --- |
| [01-source-map.md](01-source-map.md) | React, Qt, Core, bridge, and documentation ownership map |
| [02-parity-matrix.md](02-parity-matrix.md) | Feature-by-feature comparison and current gaps |
| [03-interaction-inventory.md](03-interaction-inventory.md) | Slash commands, editor blocks, widgets, page flows, and interaction states |
| [04-bug-register.md](04-bug-register.md) | Reproducible Qt defects, causes, fixes, and acceptance criteria |
| [05-architecture-performance.md](05-architecture-performance.md) | Native design, Core SSOT, persistence, collaboration, and responsiveness |
| [06-checklist.md](06-checklist.md) | Detailed implementation and parity completion checklist |
| [07-verification.md](07-verification.md) | Focused verification plan and evidence rules |

## Evidence rules

- React Web is the behavior and visual reference. The Qt application is the implementation target.
- The audit and follow-up review inspected source and existing documentation. No test suite, `qmllint`, screen-reader review, or visual capture has been run; build verification status is recorded in [07-verification.md](07-verification.md).
- Existing checked boxes and historical test totals in other documents are not evidence for the current worktree.
- Features visible in QML are marked `Unverified` until their complete action, error, persistence, and recovery paths are reviewed. Similar-looking controls do not establish parity.
- The active working tree contains a broad Qt Notes refactor. Its modified and untracked files were treated as current implementation evidence; unrelated modules were not audited.
- Do not change React layout or behavior to make the comparison easier. Shared behavior belongs in `core/synapse-core/` and typed bridges when it is truly platform-neutral.

## Current high-priority defects

1. **Filtered tables need runtime data-integrity verification.** Qt now uses a read-only filtered projection and an indexed Core function that changes only the selected table. Verify autosave, explicit save, page change, and reload with filters active. Details: [QT-NOTES-001](04-bug-register.md#qt-notes-001-filtering-can-save-a-filtered-table-projection) and [QT-NOTES-005](04-bug-register.md#qt-notes-005-table-filtering-targets-the-first-table-but-strips-rows-from-every-table).
2. **Dropped-file import needs runtime verification.** Local non-image drops now use encrypted import, request correlation, a serial queue, and canonical file IDs. Verify ordering, failure, vault lock, page switch, reopen, and preview. Details: [QT-NOTES-002](04-bug-register.md#qt-notes-002-dropped-files-create-unresolvable-attachments).
3. **Rich-text insertion offset mapping remains incomplete.** Core now counts supplementary Unicode as UTF-16 code units and handles numeric entity widths, but paragraph separators, breaks, and the full entity mapping still need attention. Details: [QT-NOTES-003](04-bug-register.md#qt-notes-003-rich-html-split-uses-a-different-character-unit-than-qt).
4. **Color/highlight marks and table/group metadata have source fixes awaiting cross-client acceptance.** Details: [QT-NOTES-004](04-bug-register.md#qt-notes-004-block-colors-are-not-round-trip-safe), [QT-NOTES-006](04-bug-register.md#qt-notes-006-column-changes-can-discard-group-or-child-metadata), and [QT-NOTES-009](04-bug-register.md#qt-notes-009-table-column-movement-rewrites-row-markup).

## Completion rule

Do not change the status to `Complete` until every required item in [06-checklist.md](06-checklist.md) is checked with current evidence, including same-size screenshots and focused interaction tests. If a React capability is deliberately unsupported in Qt, keep the status `Partial` and record an approved product decision; do not silently discard content.
