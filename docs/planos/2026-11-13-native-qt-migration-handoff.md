# Native Qt Migration Handoff

**Snapshot date:** 2026-11-13
**Purpose:** Give the next agent a verified pickup point for continuing native Qt parity work.

This is an operational handoff, not a completion report. The [native desktop parity matrix](../native-desktop-parity.md) remains the source of truth for Qt feature status and open gaps. The [native encryption audit](../security/native-encryption-audit.md) remains the source of truth for encryption coverage. The [migration roadmap](./2026-11-09-migracao-ecossistema-nativo-synapse.md) remains the source of truth for the accepted module order.

## Repository State at Handoff

- The worktree was clean when this snapshot was prepared. Recheck `git status --short` before editing and preserve any changes that appear afterward.
- The latest Notes commits are `e2306cee feat(notes): add table scope selection controls` and `0fbe2724 feat(notes): support table edits across merged cells`.
- A targeted scan found no obvious temporary or backup debris (`*.tmp`, `*.bak`, `*.orig`, `*.rej`, editor swap files, `*.pyc`, `__pycache__`, `.DS_Store`, or `Thumbs.db`). Keep the ignored `apps/desktop-qt/build/` directory; it is generated build state used for focused verification, not disposable project debris.

## Product and Architecture Boundaries

- Keep both products: `apps/web-react/` remains the Web/Tauri implementation and the reference for behavior; `apps/desktop-qt/` remains a native Qt Quick/QML and C++ desktop application.
- Do not embed React or a WebView in the Qt application. Do not remove, replace, or downgrade the Web/Tauri implementation.
- Shared Rust capabilities exist only for selected domain and platform operations. Product rules and persistence are still distributed among TypeScript, C++/QML, Kotlin, and Rust; do not describe the whole product as centralized in Rust.
- Use real application data and persistence. Do not add demo, sample, or mock content to user flows.
- Use `SYNAPSE_DATABASE_PATH` with a disposable database for UI validation. Never validate UI flows against a personal database.
- Do not claim complete parity, total encryption, or performance parity without comparable evidence. Keep unsupported structures and unverified visual comparisons explicit.
- Both React and Qt must support sequential and simultaneous editing without silent lost updates. Treat cross-client Notes consistency as a data-integrity release blocker; prove it with reproducible tests rather than promising a bug-free system without evidence.

## Sources to Read Before Product Changes

1. [Root instructions](../../AGENTS.md), [apps instructions](../../apps/AGENTS.md), and [Qt instructions](../../apps/desktop-qt/AGENTS.md). Read `apps/web-react/AGENTS.md` when comparing or changing the React reference.
2. [Documentation status index](../documentation-status.md), [native desktop parity matrix](../native-desktop-parity.md), and [migration roadmap](./2026-11-09-migracao-ecossistema-nativo-synapse.md).
3. The in-app guide for the target module. Update it in the same work item as any feature or behavior change.
4. The applicable playbook from the [engineering skills index](../../.agents/skills/README.md). For Notes editor work, read `code-quality-refactoring/SKILL.md` when restructuring and `design-system/SKILL.md` when changing presentation. Read other module-specific skills when their scope applies.

Technical documentation and code comments must be in English. Use repository-relative links. Keep new implementation files focused and below 300 lines where practical. Preserve existing work; never use `git reset` or `git checkout` to clean files. Do not make a commit until the change is scoped, reviewed, and its relevant verification has passed. The user has authorized commits; keep them atomic and descriptive.

## Accepted Module Order

1. Notes/editor
2. Library/reader
3. Video/media
4. Anki, Questions, Finance, Habits, Calendar, Culture, Focus, Files, Vault, Notifications, Trash, Settings, and Home
5. Diagrams and Practice last

Complete and document the active module's concrete work item, then continue to the next open item in this order without waiting for confirmation between tasks. The Qt matrix remains the acceptance checklist; a screen existing does not mean its module is complete.

## Recently Completed Notes Work

- Added accessible current row, current column, and whole-table selection controls. Selections expand to cover full cells across supported merged spans.
- Added row/column insertion and deletion around merged cells and selected ranges. The operations preserve spans, supported content and formatting, header semantics, and one-step undo. Deletion of the final table row or column is refused.
- Extracted table structure range and merged-cell action policy helpers; kept the main structural operation file under 300 lines.
- Added native model and QML integration coverage. Updated the in-app Notes guide, parity matrix, roadmap status, and documentation status.
- Movement across merged spans is explicitly not supported yet. Same-viewport React/Qt visual comparison remains open. Notes is still Partial.

## Previous Questions Follow-up

The earlier request to validate signal wiring and the summary/review cycle after extracting `QuizExplorerOverlays.qml` is recorded in the [parity matrix](../native-desktop-parity.md) and covered by `apps/desktop-qt/tests/questions/qml/tst_quiz_session.qml`. The documented `qmltestrunner` check exercises signal forwarding, review navigation, restart, and return to the battery explorer with a controller test double. It does not establish real SQLite persistence or visual parity; keep the remaining Questions gaps in the matrix open.

## Highest-Priority Notes Work Item: Cross-Client Save and Sync Safety

The release blocker is recorded in the [parity matrix](../native-desktop-parity.md) as **“Notes work item: cross-client save, sync, and conflict safety.”** Keep that item and the authentication/cloud-sync row synchronized with code and reproducible evidence.

### Current data paths and concrete risk

- React sync includes `pages` and `page_history`, encrypts serialized database rows before Firestore writes, and merges Yjs state on pull. It does not merge arbitrary native HTML edits into a Yjs document.
- `apps/desktop-qt/src/controllers/notes/notes_controller.cpp::savePage` updates HTML/encrypted HTML and `updated_at`, but does not update `crdt_state`.
- React initializes a Yjs document from meaningful `crdt_state`; it seeds from HTML only when CRDT state is absent. A React save writes both HTML and CRDT state. Thus a Qt-edited page with stale nonempty CRDT can reopen as old content in React and later overwrite the Qt HTML.
- Qt has no direct Firebase sync. On Linux it may select the canonical Tauri SQLite file, but a shared file does not synchronize an editor already open in memory. Browser IndexedDB, portable Tauri mode, and other platform data paths can be separate stores.

### Required behavior and investigation

- Compare React `apps/web-react/src/components/notes/hooks/useEditorSync.ts`, `useEditorSave.ts`, `Editor.tsx`, `apps/web-react/src/services/sync/sync-pull-merge.ts`, `sync-push.ts`, and `sync-utils.ts` with Qt's `notes_controller.cpp`, database selection in `synapse_controller.cpp`, and the `pages`/`page_history` schema.
- Define and implement a lossless contract for HTML, Yjs state, history, encryption, dirty timestamps, and stale-write detection. Integrate Qt with the shared CRDT/sync mechanism or implement a proven, versioned, lossless reconciliation strategy; do not merely leave stale `crdt_state` alongside newer HTML.
- Cover both clients sharing one SQLite database and clients with separate local databases that converge through Firebase. Include offline/reconnect, CRDT-backed and non-CRDT notes, supported rich formatting, encrypted notes, history, two open editors, simultaneous edits to separate regions, and concurrent edits to the same region.
- Preserve both clients' accepted edits deterministically. Prevent stale saves from silently overwriting newer content. Define how incompatible edits resolve and retain enough revision history to recover them.
- Use independent client instances and a reproducible persistence/sync integration environment. A mocked merge unit test alone is not acceptance evidence. Do not claim conflict-free operation until same-note sequential and concurrent flows pass.

### Acceptance evidence and fallback

- Record actual commands and outcomes in the matrix and relevant guides. The item remains a release blocker until it is demonstrated across both local shared-database and separate-database Firebase paths.
- If a scenario cannot yet be made safe, explicitly prevent or warn about the unsafe edit path and document the limitation. Do not present it as supported or silently discard either version.

## Next Notes Editor Work After the Data-Integrity Gate: Merged-Cell Movement

The next visual editor item is recorded in the [parity matrix](../native-desktop-parity.md) as **“Notes work item: move rows and columns across merged cells.”**

- React reference: `apps/web-react/src/components/notes/components/TableToolbar.tsx` and `apps/web-react/src/components/notes/components/table/tableSelectionUtils.ts` derive selection bounds and dispatch ProseMirror `moveTableRow` / `moveTableColumn`.
- Qt starting point: `apps/desktop-qt/src/controllers/notes/notes_rich_table_operations.cpp`, `notes_rich_table_structure_range.cpp`, headers, and native model/QML tests. Current policy refuses movement in tables with merged spans because unit-cell snapshot/replacement is unsafe for spans.
- Before changing code, inspect the installed ProseMirror implementation and tests. Preserve content, formatting, spans, backgrounds, header semantics, selection, serialization, bounds, and one-step undo. Keep malformed, resized, cross-section, and custom-metadata structures safely disabled unless fully supported.
- Verify row/column moves around intersecting spans, header movement, boundaries, reload, undo/redo, and QML routing. Update `NotesHelpDialog.qml` if behavior changes; record commands and remaining gaps in the matrix.

## Current Notes Gaps Beyond the Next Item

The parity matrix is authoritative; this condensed list helps the next agent resume the editor work without treating recent progress as completion:

- Non-task list items with non-list block children beyond paragraphs; task items with unsupported non-list block children beyond paragraphs.
- Full Lowlight grammar/theme parity and source preservation for syntax-token markup; React code-card presentation.
- AI controls and movement across unsupported sibling-node types.
- Cross-section or malformed table spans, resized tables, and custom table metadata remain unsupported by the visual editor.
- Link previews still lack full editing, network metadata loading, reload, confirmed deletion with undo, snapshots, and playlist workflows; action-menu viewport parity remains unverified.
- Page references still have visual border/hover/selection and file-icon differences; live title announcements and editing inside floating previews remain open.
- Animated spoiler effect and Yjs collaboration remain open.
- Unsupported React slash actions (including pages, media, files, AI, columns, toggles, and other widgets), embedded files, diff rendering, and schema-aware context actions remain open.
- Same-viewport visual comparison remains open across the module.

## Most Recent Notes Verification

The latest merged-cell structural edit was verified with:

```bash
cmake --build apps/desktop-qt/build --target synapse-desktop-tests synapse-notes-table-qml-tests synapse-desktop -j 2
ctest --test-dir apps/desktop-qt/build -R '^(native-priority-modules|native-notes-table-qml)$' --output-on-failure --parallel 2
/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml \
  apps/desktop-qt/qml/notes/NotesRichTableEditorActions.qml \
  apps/desktop-qt/qml/notes/NotesHelpDialog.qml \
  apps/desktop-qt/tests/notes/NotesRichTableHarness.qml
git diff --check
```

All commands exited successfully; CTest passed 2/2 tests. `qmllint` reported no syntax errors. Existing unqualified-access warnings may still be present in the Notes QML surface. These commands document the previous verification; rerun the focused checks appropriate to the next change rather than treating past results as evidence for new code.

## Efficient Verification Rules

- QML-only change: run `qmllint` on the changed QML files. Use an isolated-database app run or screenshot only when behavior or visual comparison requires it. Do not rebuild CMake by habit.
- Documentation-only change: validate links, paths, and wording; do not run a build or tests.
- C++/SQLite change: group the module edits, build `synapse-desktop-tests` and the relevant native QML test target incrementally, then run the focused CTest (`native-priority-modules` and the relevant module integration test). Build `synapse-desktop` at the module integration milestone or when executable behavior needs verification.
- Rust-core change: run the directed Rust test or `cargo check`. If Qt consumes the changed bridge, rebuild `cargo build --release -p synapse-bridge-qt` before CTest because CMake prefers the release bridge when present.
- Reconfigure CMake only when CMake files or build configuration change. Do not run React tests unless React code changed. Do not run the full React suite unless explicitly requested or a release gate requires it.
- Run `git diff --check` for code/documentation changes. Inspect `git status`, the full diff, and the exact staged paths before each commit.

## Cleanup Scope

The handoff scan found no obvious editor backups, patch rejects, Python bytecode/cache directories, or OS metadata debris matching the patterns above. Delete files only after confirming they are actual disposable artifacts and not user data, source, or required generated build state. Keep ignored build outputs needed for incremental checks.
