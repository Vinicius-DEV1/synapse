# Caderno Verification Plan

## Current pass boundary

The current source audit, event-widget changes, Core cursor/entity fix, and native page-reference object/clipboard/serialization changes were built and QML-linted as noted below. Desktop and focused test binaries were compiled, but no tests were executed. No screenshots, accessibility checks or benchmarks were run. Do not treat prior test counts or earlier parity-document entries as verification for this worktree. The scenarios below remain the implementation acceptance plan; source/build checks do not establish runtime or visual parity.

## Checks completed in this pass

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cargo check --manifest-path core/synapse-core/Cargo.toml` | Passed after cursor/entity fixes | Core library compiles in the dev profile; this does not verify Qt `QTextDocument` offset equivalence or runtime round-trips. |
| `cargo build --release --manifest-path bridges/bridge-qt/Cargo.toml` | Passed after cursor/entity fixes | Release bridge compiles the HTML5 character-reference decoder and shared splitter through Core. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop synapse-desktop-tests synapse-notes-rich-qml-tests synapse-notes-table-qml-tests -j2` | Passed | Compiles the native page-reference object and per-character serializer into the desktop and focused Qt test binaries. This only builds targets; it does not execute tests or instantiate the editor UI. |
| `rustfmt --edition 2021 --config skip_children=true --check core/synapse-core/src/domain/calendar/events/mutations.rs bridges/bridge-qt/src/domain/calendar.rs` | Passed | The changed Rust Core/bridge files are formatted. |
| `rustfmt --edition 2021 --check core/synapse-core/src/domain/notes/block_ast/{cursor_split.rs,entities.rs,helpers.rs,mod.rs,serializer.rs}` | Passed | The QT-NOTES-003 splitter and shared QT-NOTES-007 character-reference decoder compile and follow Rust formatting. |
| Focused changed-file QML lint | Passed with warnings | The exact command is below. Changed event, setup, deletion, move, nested-navigation, editor, and PageView QML parses. No warning points to the new event action or its forwarding connections. Existing warnings remain for dynamic `Loader.item` access, untyped `Repeater.itemAt()`/`Loader.item`, dynamic delegate APIs, layout sizing, unqualified globals, and unused imports across the edited QML. Qt minimum remains 6.2. |
| Cursor/drop QML lint: `qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/BlockListEditor.qml apps/desktop-qt/qml/notes/Editor.qml` | Passed with existing warnings | Both changed files parse. Warnings are existing dynamic `Repeater.itemAt()`/`Loader.item` and unqualified-global/import warnings; this change added no new warning category. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/NotesRichTextEditor.qml apps/desktop-qt/qml/notes/NotesRichTextInput.qml apps/desktop-qt/qml/notes/NotesRichPageReferenceActions.qml` | Passed with existing warnings | The page-reference object preparation, tap selection, keyboard actions and clipboard routing parse. Existing unqualified `notesTextOperations` and unused-import warnings remain; no new warning category was introduced. |
| `git diff --check` | Passed | No whitespace errors in the current diff. |
| Tests, runtime interaction, screenshots, accessibility and performance checks | Not run | QML lint and linking do not instantiate the popup, exercise event persistence, compare React/Qt visuals, or validate keyboard/screen-reader behavior. Parity remains `Partial`. |

## Continuation checks (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed after live page-reference and dropped-file metadata changes | Confirms the native application target compiles with the new page snapshot/presentation and additive file-import result fields. This is not a runtime or cross-client check. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/Editor.qml apps/desktop-qt/qml/notes/NotesRichTextEditor.qml apps/desktop-qt/qml/notes/NotesTableExcelGrips.qml apps/desktop-qt/qml/page-view/PageView.qml` | Passed with existing warnings/info | QML parses; warnings are existing unqualified context access, unused imports, and nested component bindings. |
| `git diff --check` | Passed after each atomic change | No whitespace errors in the reviewed Notes changes. |
| Runtime filter failure recovery, dropped-file cross-client viewer, page-reference state/cursor/undo behavior | Not run | These acceptance scenarios remain open and must not be inferred from compilation or lint. |

| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/LinkGroupBlock.qml` | Passed with existing layout and dynamic `Button.hovered` warnings | The fallback parser and invalid-metadata state parse. This does not execute JavaScript against real legacy payloads or verify the warning/disabled-control behavior at runtime. |
| `git diff --check` | Passed after QT-NOTES-037 | No whitespace errors in the link-group parser, checklist or bug-register edits. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/DocumentBundleWidget.qml apps/desktop-qt/qml/notes/LinkGroupBlock.qml` | Passed with existing layout, `Button.hovered`, and context-access warnings | Both metadata consumers parse with the shared Notes-local JSON attribute helper. No runtime payload, modal, or cross-client behavior was exercised. |
| `git diff --check` | Passed after QT-NOTES-038 | No whitespace errors in the shared parser, metadata consumers, or audit/checklist updates. |

Exact QML lint command for this pass:

```bash
/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml \
  apps/desktop-qt/qml/notes/BlockDelegateRouter.qml \
  apps/desktop-qt/qml/notes/BlockListEditor.qml \
  apps/desktop-qt/qml/notes/CalendarEventWidget.qml \
  apps/desktop-qt/qml/notes/CalendarEventWidgetState.qml \
  apps/desktop-qt/qml/notes/CalendarEventWidgetPopover.qml \
  apps/desktop-qt/qml/notes/NotesCalendarDateTimeFields.qml \
  apps/desktop-qt/qml/notes/NotesCalendarEventForm.qml \
  apps/desktop-qt/qml/notes/NotesCalendarEventOptions.qml \
  apps/desktop-qt/qml/notes/NotesCalendarWidgetColorPicker.qml \
  apps/desktop-qt/qml/notes/NotesSetupWidgetPickerPanel.qml \
  apps/desktop-qt/qml/notes/NotesSetupWidgetsModal.qml \
  apps/desktop-qt/qml/notes/NotesEditorModalsHost.qml \
  apps/desktop-qt/qml/notes/NotesColumnLayout.qml \
  apps/desktop-qt/qml/notes/NotesToggleBlock.qml \
  apps/desktop-qt/qml/notes/CollectionBlock.qml \
  apps/desktop-qt/qml/notes/Editor.qml \
  apps/desktop-qt/qml/page-view/PageView.qml \
  apps/desktop-qt/qml/notes/NotesHelpDialog.qml
```

Exact focused command for the cursor and asynchronous drop changes:

```bash
/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml \
  apps/desktop-qt/qml/notes/BlockListEditor.qml \
  apps/desktop-qt/qml/notes/Editor.qml
```

## Focused source and Core checks

1. Review the current `core/synapse-core` Notes module and run the focused Notes Core tests from the active Cargo workspace; capture the exact command and result.
2. Build the Qt Notes bridge and desktop targets with the repository's documented `cmake` configuration.
3. Run the focused Qt Notes native/QML test targets only; do not run the global application test sweep for iteration.
4. Keep `qmllint` clean for changed Notes QML; resolve the remaining dynamic `Loader.item` warnings with a typed component contract if that file is next modified.
5. Run `git diff --check` and inspect changed paths for accidental React layout/behavior modifications or unrelated modules.

Use `docs/guides/setup-and-build.md`, `docs/guides/testing-and-quality.md`, and the active CMake targets as the authoritative current commands. Names of test targets can change; verify them from `apps/desktop-qt/CMakeLists.txt` instead of copying historical totals.

## Required interaction scenarios

- Open, edit, save, close, reopen and cross-client round-trip a note containing every block type.
- Insert every slash command at start/middle/end of text and inside nested toggle, collection, blockquote-toggle and column content; verify query handling, cursor, undo and error behavior.
- Edit one of several blocks while changing another; verify the active cursor/selection remains stable and only intended content changes.
- Create two tables in one slice, filter each independently, save while filtering, clear filters, and confirm all hidden rows and the inactive table remain unchanged.
- Apply a valid filter, make the next Core projection call return empty, and verify the canonical source is restored, `readOnly` becomes false, the failure does not dirty the note, and a later filter can still run.
- Drop one and multiple non-image files, including paths with spaces and non-ASCII characters; verify encrypted import, canonical IDs, order, failure, lock and cancellation. While import is pending, edit the target block and confirm the file is not inserted at the stale saved offset.
- Place BMP text, supplementary Unicode, combining marks, named/numeric/semicolonless entities, nested marks, `<br>`, images, and adjacent paragraphs/headings/list items before widget insertion boundaries; compare each UTF-16 offset with the actual Qt cursor and verify no lost, duplicated, or malformed HTML.
- Repeat insertion inside table cells, between cells, and between rows; verify whether QTextDocument contributes tab, block, or object positions and adjust the Core mapping from observed Qt behavior before closing QT-NOTES-003.
- Insert before, inside, and after active/deleted page-reference objects, including adjacent identical and different references; verify each object consumes one Qt UTF-16 position and preparation leaves no word joiner in content.
- Select a page-reference object and verify typing replaces the entire object; test Backspace/Delete confirmation, Keep, confirmed removal, undo and save/reload. Verify clicks select exactly one object, active targets open the preview, and deleted targets show Keep/Remove.
- Keep a note open while renaming, trashing, restoring from Trash, and renaming again a referenced page. Verify top-level and nested chips update title, color, click action, keyboard confirmation, and copied plain text without dirtying note content or changing cursor, selection, undo history, or canonical HTML.
- Navigate to active and deleted page-reference atoms with Orca or another Qt screen reader. Confirm the editor accessibility description announces the live target title/state, and inspect object role, focus order, selection, and activation separately.
- Compare deleted reference text at the same viewport: Qt must show React's ` (Excluída)` suffix, size the native inline object for the complete label, and remove the suffix after restoration.
- Drag file types from the OS into a rich block, wait for encrypted import, then save/reopen in Qt and React. Check `data-file-type`, file-size metadata, viewer routing, multiple-file order, and failure behavior when the target block changes during import.
- Copy, cut and paste page references between Qt and React in both directions; verify canonical HTML/custom MIME handling and title fidelity for quotes, ampersands, emoji and combining characters.
- Verify that when Qt coalesces adjacent identical objects into one `QTextFragment`, serialization emits a separate canonical span for each reference and reopen preserves their count, order, IDs and titles.
- Apply/clear text and background block colors, save, reload and round-trip through React.
- Resize existing columns, drop a block into the column group, undo and confirm widths/attributes/content.
- Exercise image import, clipboard, batch drop, resize, caption, alignment, crop, undo, locked key and unsupported format paths.
- Exercise history, restore, save conflict, autosave failure, page/tab switch, app close, encrypted page lock/unlock and recovered backup.
- Link multiple event widgets, update/create/delete events in the Qt Agenda, confirm every visible linked widget refreshes, and resolve one event outside the 300-row list limit.

## Visual and accessibility comparison

Capture React and Qt at identical viewport dimensions, device pixel ratio, font installation, zoom, theme, page data and editor state. Compare page width (React desktop reading column is 928 px), cover offset, typography, line height, colors, icon shape, border radius, spacing, selection, hover, focus, menus, toolbars, widget heights and modal placement. Keep screenshots with scenario names and viewport metadata in the review record; do not add screenshots to the product unless the repo’s artifact convention calls for it.

Run keyboard-only and screen-reader review for the slash menu, page references, task lists, table controls, image actions, dialogs, delete confirmation, link preview and each widget whose controls are not ordinary text fields. Verify accessible label, role, current value/state, focus order, Escape behavior and focus restoration.

## Performance review

Record cold start, editor-ready, keystroke latency, frame pacing while scrolling, Core parse/serialize time, autosave time and peak memory for a defined set of small/medium/large notes. Include block count, table rows/columns, image dimensions, Qt/build version and hardware. Profile before introducing virtualization or incremental editing, then repeat the same workload.

## Evidence record template

For every checklist group, record:

- Source commit and worktree state.
- Exact command or manual scenario.
- Platform, tool versions, viewport and test data.
- Pass/fail result and relevant logs/screenshots.
- Known limitation and linked bug ID.
- Reviewer and date.
