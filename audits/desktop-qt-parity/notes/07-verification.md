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

### Linked file/media action dialog iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_linked_item_actions.qml -import apps/desktop-qt/qml` | Passed: 6 passed, 0 failed. Verified file quick preview/current/new reader actions, book/video current/new actions, media hides the file-only preview option, payload identity and Escape dismissal. | Qt 6.10.2, offscreen. This mounts the actual dialog and exercises button clicks; it does not instantiate the application tab coordinator or real Library/Video/Files modules. |
| Focused `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml` for the new dialog and its Notes/PageView/application routing chain | Passed, exit code 0; existing dynamic-loader, unqualified-context and module-wide warnings remain | QML parses. Lint does not instantiate the real Notes page or prove linked item resolution, visual parity or focus restoration. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed | Native target links successfully. Runtime startup, actual same/new tab routes, pinned tabs, file types and video restore remain open. |
| 8-second offscreen `synapse-desktop` startup with isolated temporary HOME/XDG directories | Passed: the application opened the local database and loaded the native interface, then remained alive for the full smoke window | This catches root QML/component load failures but does not click Notes widgets or prove dialog/tab behavior. The temporary data and logs are under `/tmp/synapse-notes-modal-smoke`. |
| Audit Markdown relative-link check and `git diff --check` | Passed | Changed audit links resolve; no trailing whitespace or patch formatting errors. |
| Same-viewport React/Qt capture; real app flow for standalone, nested, floating and bundle file previews; target failure and tab switching | Not run | Keep QT-NOTES-058 and the relevant checklist items open until live application behavior and visuals are checked. |

### Typed table-column selector iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_table_column_type_popover.qml -import apps/desktop-qt/qml` | Passed: 6 passed, 0 failed. Verified the 240 px selector, changing to Number without closing, explicit close action, removing only the selected column's filter, and re-projecting an unrelated filter after a mock schema write. | Qt 6.10.2, offscreen. The persistent harness mounts the real selector and table-grip component with mock Core/editor boundaries. It does not run a real Core schema mutation, persist/reload a note, or test real table row contents. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_linked_item_actions.qml -import apps/desktop-qt/qml` | Passed: 6 passed, 0 failed | Regression check for the previously added linked file/media action dialog; it does not cover app-level tab routing. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed | Confirms the native QML application target links after the filter lifecycle change; runtime table persistence is not established. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/NotesTableColumnTypePopover.qml` | Passed, exit code 0, with nested-component context-binding warnings | QML parses. The remaining warnings concern the existing outer-popup/delegate scope pattern; lint does not check screen-edge placement, keyboard focus or visual matching. |
| Real table with multiple active filters, schema persistence/reload, React round-trip, edge placement and matched-viewport capture | Not run | Keep QT-NOTES-059 and its related [table checklist items](06-checklist.md#f-tables) open until these scenarios have application evidence. |

### Table filter draft/apply iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_table_column_type_popover.qml -import apps/desktop-qt/qml` | Passed: 10 passed, 0 failed. Covers 240 px type grid, keyboard focus policy, filter section collapsed by default, draft not emitted until Apply, Clear and text reset, select/checkbox/date range controls, per-column filter removal, canonical schema update with unrelated filter re-projection, and repositioning after expanding the filter section. | Qt 6.10.2, offscreen. The persistent harness mounts actual Notes QML with mock Core/editor boundaries. It does not verify real row filtering, actual Core schema writes, note save/reload, native date picker equivalence, full keyboard traversal or same-viewport rendering. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed | Confirms native target links with the filter controls and shared operator-choice helper. Runtime table data behavior is not established. |
| Focused `qmllint` on `TableColumnFilterSection.qml`, `TableFilterComboBox.qml`, `TableFilterOptions.js`, and `NotesTableColumnTypePopover.qml` | Passed, exit code 0, with nested-component context-binding warnings in the ComboBox and type-selector delegates | All files parse. Warnings do not test or prove popup position, keyboard flow or visual parity. |
| Real table Apply/Clear, row visibility, multi-filter save/reload, date-picker comparison, keyboard-only path and matched-viewport capture | Not run | Keep QT-NOTES-059/060 and the related [table checklist items](06-checklist.md#f-tables) open until these cases have running-app evidence. |

Exact focused QML lint command for this iteration:

```bash
/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml \
  apps/desktop-qt/qml/notes/NotesLinkedItemActionDialog.qml \
  apps/desktop-qt/qml/notes/NotesEditorModalsHost.qml \
  apps/desktop-qt/qml/notes/MediaWidget.qml \
  apps/desktop-qt/qml/notes/FileAttachmentWidget.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidget.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidgetBody.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidgetDialogs.qml \
  apps/desktop-qt/qml/notes/BlockDelegateRouter.qml \
  apps/desktop-qt/qml/notes/BlockListEditor.qml \
  apps/desktop-qt/qml/notes/NotesColumnLayout.qml \
  apps/desktop-qt/qml/notes/NotesToggleBlock.qml \
  apps/desktop-qt/qml/notes/CollectionBlock.qml \
  apps/desktop-qt/qml/notes/Editor.qml \
  apps/desktop-qt/qml/page-view/PageViewModalsHost.qml \
  apps/desktop-qt/qml/page-view/PageView.qml \
  apps/desktop-qt/qml/modals/FloatingPageModal.qml \
  apps/desktop-qt/qml/video/VideoPlayerView.qml \
  apps/desktop-qt/qml/AuthenticatedApplication.qml
```

| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/LinkGroupBlock.qml` | Passed with existing layout and dynamic `Button.hovered` warnings | The fallback parser and invalid-metadata state parse. This does not execute JavaScript against real legacy payloads or verify the warning/disabled-control behavior at runtime. |
| `git diff --check` | Passed after QT-NOTES-037 | No whitespace errors in the link-group parser, checklist or bug-register edits. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/DocumentBundleWidget.qml apps/desktop-qt/qml/notes/LinkGroupBlock.qml` | Passed with existing layout, `Button.hovered`, and context-access warnings | Both metadata consumers parse with the shared Notes-local JSON attribute helper. No runtime payload, modal, or cross-client behavior was exercised. |
| `git diff --check` | Passed after QT-NOTES-038 | No whitespace errors in the shared parser, metadata consumers, or audit/checklist updates. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/DocumentBundleDeleteDialog.qml apps/desktop-qt/qml/notes/DocumentBundleWidget.qml apps/desktop-qt/qml/notes/BlockDelegateRouter.qml apps/desktop-qt/qml/notes/BlockListEditor.qml apps/desktop-qt/qml/notes/DocumentBundleOperations.js` | Passed with existing Notes layout, hover, context-access and dynamic-delegate warnings | The confirmation dialog, router forwarding, source flush and Core-parsed ungroup path parse. This does not instantiate the dialog, confirm AST round-trip, test cancellation, or verify file/Drive deletion. |
| `git diff --check` | Passed after QT-NOTES-039 | No whitespace errors in the bundle action flow or its audit records. |

### Document-bundle manager iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Focused document-bundle `qmllint` command below | Passed, exit code 0, with existing dynamic-object and context-access warnings in `BlockDelegateRouter.qml` and `BlockListEditor.qml` | The new manager, header, row, removal dialog and extracted widget components produced no lint diagnostics. This parses QML/JS but does not load the overlay or exercise focus, bindings, autosave or file operations. |
| Core file-Trash source inspection: `files/items/mutations.rs`, `trash/repository.rs`, `files_items_controller.cpp`, and `trash_controller.cpp` | Confirmed `deleteFile` sets `deleted_at`; Trash lists file records and restores `item_type="file"` | Source inspection only. No Qt interaction was run. The file restore wrapper does not emit `filesChanged`; verify the visible library refresh after restoring. |
| `git diff --check` | Passed | No whitespace errors in the manager implementation and audit updates. |
| Runtime UI, keyboard/focus, note autosave failure, Trash restore refresh, Drive, and React round-trip | Not run | These remain required acceptance scenarios. The Qt flow only soft-deletes the local file row and leaves any Drive copy intact. |

Exact focused QML lint command for the document-bundle manager iteration:

```bash
/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml \
  apps/desktop-qt/qml/notes/BlockDelegateRouter.qml \
  apps/desktop-qt/qml/notes/BlockListEditor.qml \
  apps/desktop-qt/qml/notes/DocumentBundleModal.qml \
  apps/desktop-qt/qml/notes/DocumentBundleDeleteDialog.qml \
  apps/desktop-qt/qml/notes/DocumentBundleItemRemovalDialog.qml \
  apps/desktop-qt/qml/notes/DocumentBundleItemsPreview.qml \
  apps/desktop-qt/qml/notes/DocumentBundleManagerDialog.qml \
  apps/desktop-qt/qml/notes/DocumentBundleManagerHeader.qml \
  apps/desktop-qt/qml/notes/DocumentBundleManagerItem.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidget.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidgetActions.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidgetBody.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidgetDialogs.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidgetHeader.qml \
  apps/desktop-qt/qml/notes/NotesWidgetColorPalette.qml \
  apps/desktop-qt/qml/notes/DocumentBundleOperations.js
```

### Loose-file absorption iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Focused document-bundle `qmllint` command below | Passed, exit code 0, with 25 existing dynamic-object/context warnings in `BlockDelegateRouter.qml` and `BlockListEditor.qml` | No warning points to the loose-file row, manager, bundle widget or metadata helper. This parses QML/JS only. |
| Source review of React `DocumentBundleModal.tsx::handleAbsorbLooseFile`, Qt `BlockListEditor.qml`, `DocumentBundleOperations.js`, and the Notes `NoteBlock` projection | At this earlier pass, Qt listed live top-level `fileWidget` blocks, copied their metadata into one bundle item, removed the exact source block and serialized both changes together | Source review only. This pass preceded recursive nested-container paths; see the follow-up record below. |
| `git diff --check` | Passed | No whitespace errors in the loose-file absorption and crosswalk updates. |
| Runtime item absorption, note undo/autosave, stale-index response and React round-trip | Not run | These remain open acceptance scenarios. No tests or runtime UI were run in this iteration. |

Exact focused QML lint command for the loose-file absorption iteration:

```bash
/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml \
  apps/desktop-qt/qml/notes/BlockDelegateRouter.qml \
  apps/desktop-qt/qml/notes/BlockListEditor.qml \
  apps/desktop-qt/qml/notes/DocumentBundleModal.qml \
  apps/desktop-qt/qml/notes/DocumentBundleDeleteDialog.qml \
  apps/desktop-qt/qml/notes/DocumentBundleItemRemovalDialog.qml \
  apps/desktop-qt/qml/notes/DocumentBundleItemsPreview.qml \
  apps/desktop-qt/qml/notes/DocumentBundleLooseFileItem.qml \
  apps/desktop-qt/qml/notes/DocumentBundleManagerDialog.qml \
  apps/desktop-qt/qml/notes/DocumentBundleManagerHeader.qml \
  apps/desktop-qt/qml/notes/DocumentBundleManagerItem.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidget.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidgetActions.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidgetBody.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidgetDialogs.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidgetHeader.qml \
  apps/desktop-qt/qml/notes/NotesWidgetColorPalette.qml \
  apps/desktop-qt/qml/notes/DocumentBundleOperations.js
```

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

### Native bundle drag-reorder iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/DocumentBundleManagerDialog.qml apps/desktop-qt/qml/notes/DocumentBundleManagerItem.qml` | Passed, exit code 0, no diagnostics | The native drag handle, matching drop targets, source-index MIME payload, arrow fallback and reorder signal parse. This does not exercise pointer movement, the drop target, delegate recreation, note autosave or persisted ordering. |
| `git diff --check` | Passed | No whitespace errors in the drag-reorder implementation or parity documents. |
| Runtime drag/drop, first/last boundaries, keyboard alternatives, order after save/reload and React round-trip | Not run | Keep manager acceptance unchecked until these interactions and same-viewport feedback are reviewed. |

### Nested loose-file absorption iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Focused document-bundle `qmllint` command below | Passed, exit code 0, with existing dynamic-object and context-access diagnostics in `BlockDelegateRouter.qml` and `BlockListEditor.qml` | No diagnostic points to the recursive collection/removal helpers or the updated manager signal chain. QML/JS parsing does not prove nested HTML round-trip behavior. |
| Source review of React descendant traversal and Qt `NoteBlock` parsing/serialization | Added bounded recursive discovery and path-based removal for toggle, blockquote-toggle, collection, blockquote, link-group, column-group and column-block containers; source ID is revalidated before changing a copy of the AST | Core now parses and serializes `columnBlock` as a structural wrapper, preserving its attributes and nested HTML while recursive removal targets its exact child. The bundle update remains in the same page serialization. Runtime markup comparison was not run. |
| `cargo test -p synapse-core parses_and_roundtrips_column_wrappers_with_nested_file_widgets --lib` | Passed, 1 test | Confirms Core exposes the file widget beneath parsed column wrappers, removes that exact child, and preserves both column levels plus surrounding rich-text HTML. It does not exercise Qt absorption, saving, or React round-trip. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/BlockListEditor.qml` | Passed, exit code 0, with existing dynamic-object and context-access warnings | The warnings concern existing delegate/router/context typing at lines 18, 67, 81, 348, 392, 404, 527, 571 and 572; no new diagnostic is reported at the nested container logic. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed | Rebuilt the Qt desktop executable with the Core and nested-file changes. |
| `git diff --check` | Passed | No whitespace errors in the recursive path flow or parity records. |
| Qt runtime absorption inside columns, stale-path rejection, page save/reload, undo and React round-trip | Not run | Check these manually before marking QT-NOTES-040 or the manager checklist complete. Core parser/serializer column preservation is covered by the focused regression above. |

Exact focused QML lint command for the nested loose-file iteration:

```bash
/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml \
  apps/desktop-qt/qml/notes/BlockDelegateRouter.qml \
  apps/desktop-qt/qml/notes/BlockListEditor.qml \
  apps/desktop-qt/qml/notes/DocumentBundleLooseFileItem.qml \
  apps/desktop-qt/qml/notes/DocumentBundleManagerDialog.qml \
  apps/desktop-qt/qml/notes/DocumentBundleModal.qml \
  apps/desktop-qt/qml/notes/DocumentBundleOperations.js \
  apps/desktop-qt/qml/notes/DocumentBundleWidget.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidgetDialogs.qml
```

### Local Trash save-order iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Focused Notes/PageView `qmllint` command below | Passed, exit code 0, with existing dynamic-object, context-access and unused-import diagnostics in `BlockDelegateRouter.qml`, `BlockListEditor.qml` and `Editor.qml` | No diagnostic points to the new save-order queue or document-bundle signal path. This does not execute a save conflict, Core soft-delete, retry, undo or page switch. |
| `git diff --check` | Passed | No whitespace errors in the deferred local-Trash flow or audit updates. |
| Save failure/conflict, successful save then soft-delete, restored/relinked references, delete failure/retry and page switching | Not run | The queue is in memory. An interruption can leave an unlinked file active; it cannot soft-delete a file before a successful page save. |

Exact focused QML lint command for the local-Trash save-order iteration:

```bash
/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml \
  apps/desktop-qt/qml/notes/BlockDelegateRouter.qml \
  apps/desktop-qt/qml/notes/BlockListEditor.qml \
  apps/desktop-qt/qml/notes/DocumentBundleOperations.js \
  apps/desktop-qt/qml/notes/DocumentBundleWidget.qml \
  apps/desktop-qt/qml/notes/Editor.qml \
  apps/desktop-qt/qml/page-view/PageConflictDialog.qml \
  apps/desktop-qt/qml/page-view/PageView.qml
```

### Failed-save page-navigation iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `selectPage` caller and save result flow | Source review: changed so a dirty page remains selected if `saveActiveNote()` fails | Preserves visible editor content and page-scoped queued file-Trash requests. A post-save `deleteFile` failure does not block navigation because the note itself is already saved. |
| Native conflict choice dialog and retry path | Source review: conflict signal presents explicit keep-local or reload-saved actions | Keep-local refreshes the expected timestamp before saving; reload replaces page content and reconciles the pending bundle file queue. Runtime and encrypted-page interaction remain unverified. |
| Focused Notes/PageView `qmllint` | Passed, exit code 0, with existing diagnostics in neighboring Notes QML files | No runtime save failure or conflict was injected. |
| Core save failure, stale timestamp conflict, each resolution choice, manual retry and subsequent navigation | Not run | Verify that the header retry action still targets the preserved page and that pending file operations remain scoped through the retry. |

### File-widget metadata and restore iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Core-backed file-widget lookup | Source review: Qt asks Core for the active file record by ID and returns only ID/name/type/size metadata | Supports files in nested folders and avoids returning local paths or Drive identifiers to the widget. C++ compilation remains unverified. |
| Restore notification and widget refresh | Source review: successful file restore emits `filesChanged`; the Notes widget listens for the signal and reruns the ID lookup | Does not prove runtime signal delivery or preview behavior. |
| Focused `qmllint` and `git diff --check` | Passed, exit code 0 | Existing dynamic-object/context diagnostics remain in `FileAttachmentWidget.qml`; no diagnostic points to the new ID lookup, signal refresh or rename result path. C++ compilation remains unchecked. |
| Nested-folder metadata, missing/Trash state, rename, restore and preview | Not run | Verify the open note updates without requiring page reload; confirm locked vault metadata remains appropriately redacted. |
| Forced rename failure, retry and note/Core consistency | Source review: the note attributes now update only after a successful Core return | No runtime failure injection or React round-trip was run. |
| Active/floating/nested Notes and bundle preview routes | Focused `qmllint` exits 0 with existing diagnostics; source review confirms bundle and file widgets forward one preview request through toggle, column and collection wrappers to PageView, which starts Core preview and navigates to Files | Async result timing, modal closure, nested depth and viewer-type behavior have not been runtime checked. |
| Confirmed attachment removal and serializer error handling | Source review: Notes AST serialization is validated before removing the node; a failed mutation keeps the dialog open with error text | No injected serialization failure or keyboard interaction was run. |
| Attachment removal with pending rich-text edits | Source review: confirmed removal flushes pending rich-text slices before serializing the removal, then revalidates the target block | Runtime flush failure, adjacent rich-text edits and serialization failure remain unchecked. |
| Attachment local Trash, remote Drive delete and typed viewer parity | Not run / not implemented | See QT-NOTES-046 and [10-file-widget-crosswalk.md](10-file-widget-crosswalk.md). |
| Same-ID file rename attributes | Focused `qmllint` exit 0; source review confirms Core file-change refresh writes the resolved display name to each loaded widget's canonical attributes, with a recursion guard and no write while that widget is being renamed | Existing QML dynamic-scope and Loader diagnostics remain. Verify page save/reload, failure behavior and Qt/React attribute round-trip. |

Exact focused QML lint command for the file-widget lifecycle iteration:

```bash
/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml \
  apps/desktop-qt/qml/notes/FileAttachmentWidget.qml \
  apps/desktop-qt/qml/notes/FileAttachmentDeleteDialog.qml \
  apps/desktop-qt/qml/notes/FileAttachmentMissingDialog.qml \
  apps/desktop-qt/qml/notes/BlockDelegateRouter.qml \
  apps/desktop-qt/qml/notes/BlockListEditor.qml \
  apps/desktop-qt/qml/notes/DocumentBundleOperations.js \
  apps/desktop-qt/qml/notes/DocumentBundleWidget.qml \
  apps/desktop-qt/qml/notes/Editor.qml \
  apps/desktop-qt/qml/notes/DocumentBundleItemsPreview.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidgetBody.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidget.qml \
  apps/desktop-qt/qml/notes/DocumentBundleWidgetDialogs.qml \
  apps/desktop-qt/qml/notes/DocumentBundleManagerItem.qml \
  apps/desktop-qt/qml/notes/DocumentBundleManagerDialog.qml \
  apps/desktop-qt/qml/notes/NotesToggleBlock.qml \
  apps/desktop-qt/qml/notes/NotesColumnLayout.qml \
  apps/desktop-qt/qml/notes/CollectionBlock.qml \
  apps/desktop-qt/qml/page-view/PageConflictDialog.qml \
  apps/desktop-qt/qml/page-view/PageView.qml \
  apps/desktop-qt/qml/page-view/PageViewModalsHost.qml \
  apps/desktop-qt/qml/modals/FloatingPageModal.qml
```

### File-widget rename-editor iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/FileAttachmentWidget.qml` | Passed, exit code 0 | Confirms the updated rename-start helper parses. This does not instantiate the `TextField` or execute focus and selection behavior. |
| `git diff --check` | Passed after the implementation and audit updates | No whitespace errors in the rename-editor change or its parity records. |
| Runtime cancel/reopen, Core refresh, extension selection, focus and cross-client acceptance | Not run | Verify current-name reset and React-equivalent selection for ordinary, dotfile, extensionless and multi-dot names before closing QT-NOTES-051. |

### Notes widget keyboard-action iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/FileAttachmentWidget.qml apps/desktop-qt/qml/notes/DocumentBundleWidgetActions.qml` | Passed, exit code 0 | Confirms both updated action components parse. This does not exercise tab focus, accessibility announcements or button activation. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed, exit code 0 | Rebuilt the native app target after the QML resource changes. This does not instantiate widgets or validate keyboard interaction. |
| `git diff --check` | Passed after source and audit updates | No whitespace errors in the widget action changes or their parity records. |
| Runtime Tab/Shift+Tab traversal, focus reveal, Enter/Space activation and dialog return focus | Not run | These scenarios remain open before closing QT-NOTES-052. |

### Document-bundle metadata extraction iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `wc -l apps/desktop-qt/qml/notes/DocumentBundleWidget.qml apps/desktop-qt/qml/notes/DocumentBundleOperations.js` | Passed; 271 and 223 lines respectively | Both files remain below the project 300-line target. This is a structural check only. |
| Focused `qmllint` for `DocumentBundleWidget.qml` and `DocumentBundleOperations.js` | Passed, exit code 0 | Confirms the extracted helper import and QML/JS syntax. It does not execute malformed metadata or signal-order behavior. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed, exit code 0 | Rebuilt the native target after adding the helper import. This does not execute metadata parsing or render the widget. |
| Runtime metadata, visual, event-order and Qt/React round-trip acceptance | Not run | Compare canonical, empty, malformed and legacy values before treating the refactor as behaviorally accepted. |

### File-attachment view extraction iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Focused `/usr/lib/qt6/bin/qmllint` on `FileAttachmentWidget.qml`, `FileAttachmentRenameEditor.qml`, `FileAttachmentActionBar.qml`, and `FileAttachmentIdentity.qml` | Passed, exit code 0, no diagnostics after removing an unused import | Confirms QML/JS syntax and local component references. It does not instantiate the widgets or verify runtime layout, focus, signal order, or Core behavior. |
| `wc -l` for the four file-widget QML components | Passed; 272, 106, 72, and 72 lines | All are under the 300-line source target. This is structural evidence only. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed, exit code 0 | Rebuilt the native app target. The project loads QML from the workspace at runtime, so this does not replace widget instantiation or visual acceptance. |
| `git diff --check` | Passed | No whitespace errors in the view extraction or parity records. |
| Rename field accessible-name source check | Passed: `FileAttachmentRenameEditor.qml` sets `Accessible.name` and retains the error as `Accessible.description`; focused `qmllint` passes | No screen reader or accessibility-tree runtime inspection was run. |
| Runtime visual, keyboard/accessibility, rename, palette, delete, serialized-attribute and React round-trip acceptance | Not run | Verify same-viewport geometry, focus and event behavior before treating this extraction as behaviorally accepted. No React source was changed. |

### File-attachment long-name wrapping iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Focused `/usr/lib/qt6/bin/qmllint` on the attachment parent and identity, rename, and action views | Passed, exit code 0 | Confirms the wrapping and implicit-height QML expressions parse. It does not calculate final geometry at a runtime viewport. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed, exit code 0 | Rebuilt the native app target; the CMake target does not instantiate the local QML widget. |
| Source comparison for React wrap, icon size, and combined spacing | Passed on second pass | React uses `break-words`, a 16 px icon inside `p-2` (32 px badge), and a 12 px combined icon/title gap. Qt now uses `Text.WrapAtWordBoundaryOrAnywhere`, which also breaks unbroken names, plus 32 px badge geometry and 12 px spacing. This does not prove same-viewport rendering. |
| Wide/narrow runtime geometry, overlap, save/reopen and Qt/React filename round-trip | Not run | Check unbroken Unicode names, multiple wraps, control overlap, and following-block spacing before closing QT-NOTES-053. |

### File-widget adjacent keyboard deletion iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Source route for Backspace from the following rich-text block | Passed | `mergeRichWithPrev()` now detects a preceding `fileWidget` and calls the existing `requestBlockDeletion()` with that block's widget instance. |
| Source route for Delete from the preceding rich-text block | Passed | `NotesRichTextInput` only intercepts Delete at the text end when its live `nextBlockIsFileWidget` property is true; routing then uses `requestBlockDeletion()`. Other block boundaries are not intercepted by this branch. |
| Focused Notes `qmllint` | Passed with existing Loader/dynamic-context diagnostics in `NotesRichTextEditor.qml`, `BlockDelegateRouter.qml`, and `BlockListEditor.qml`; no new warning points to the adjacent-key route | Confirms the new signal/property chain parses. It does not synthesize key events or open the dialog. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed, exit code 0 | The native app target builds; this does not exercise local QML key behavior. |
| Backspace/Delete, nested editors, dialog focus, Cancel/Unlink/Trash, save failure and neighboring non-file block behavior | Not run | Verify the entire confirmation and persistence path before closing QT-NOTES-054. |

### Notes source-length inventory iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Scoped `wc -l` scan over Desktop Qt Notes QML/controllers, `synapse-core` Notes domain, and Qt Notes bridge | Found 30 files above the strict 300-line target | The per-file counts and command are in [11-structural-debt.md](11-structural-debt.md). The snapshot is source-structure evidence, not proof that each listed file is a monolith; each split still needs responsibility and caller review. |
| `NotesSetupWidgetsModal.qml` line count | 265 | It is below the target and has been removed from the over-limit inventory. |
| Core/bridge and UI decomposition, public contract review, and post-split checks | Not run | The inventory is a backlog. Preserve NoteBlock data, Qt properties/signals, Core APIs, FFI contracts and runtime behavior during each separate extraction. |

### File-widget selected-state iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| React source comparison | Passed | `FileWidgetNodeView.tsx` selects the node on `mousedown`. Default widgets use the brand ring; custom-color and missing widgets use corresponding border and shadow colors. This is source evidence only. |
| Qt state and caller-chain review | Passed | `BlockListEditor.qml` selects the stable NoteBlock ID from a row `TapHandler` press, clears it on another block/rich-text focus/page reload or block removal, and preserves it through same-ID block updates. `BlockDelegateRouter.qml` forwards the state; `FileAttachmentWidget.qml` renders default/custom/missing color-family border and ring treatments, while the extracted `FileAttachmentKeyboardActions.qml` focus scope routes unmodified Delete/Backspace to the existing confirmation unless rename, palette, action or dialog focus is active. The ID is not added to block attributes or Core serialization. This does not prove pointer/focus ordering or persistence across view changes at runtime. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/BlockListEditor.qml apps/desktop-qt/qml/notes/BlockDelegateRouter.qml apps/desktop-qt/qml/notes/FileAttachmentWidget.qml` | Passed, exit code 0, with existing diagnostics | QML parses. Two unused imports were removed from `BlockListEditor.qml`; remaining diagnostics concern unqualified context access and dynamic `QQuickItem`/`QObject` properties. None identifies the new selection, focus or key route. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed, exit code 0 | Rebuilt the native app. This does not instantiate the file widget, exercise selection, or measure the ring. |
| Scoped QML component lengths | Passed; 299 lines for `FileAttachmentWidget.qml`, 21 for `FileAttachmentKeyboardActions.qml`, 106 for rename, 72 for identity and 72 for action bar | The keyboard focus/key route was extracted after the parent exceeded the 300-line target. All five focused widget components are now below that threshold; this does not establish runtime focus behavior. |
| `git diff --check` | Passed after source and audit updates | No whitespace errors in the selection change or its records. |
| Same-viewport visuals, pointer/key ordering, preview open/return, dialog/action focus suppression, nested editors and serialization | Not run | Exact shadow/glow parity and behavior on the running app remain open. The selected-widget key path now exists in source but must be checked for active-focus restoration, exactly one confirmation and no interception while another control owns focus. The adjacent rich-text boundary paths remain under QT-NOTES-054. No tests were run. |

### Notes custom-color alpha correction (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Focused `qmllint` across `NotesColorUtils.js` and all eight changed widget QML files | Passed, exit code 0, with pre-existing diagnostics in larger Notes widgets | The helper and replacement bindings parse. Existing messages concern unqualified context access, dynamic Loader members, layout sizing and unused imports; no diagnostic identifies `NotesColorUtils` or its calls. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed, exit code 0 | Rebuilt the native target. Desktop QML is loaded from local files, so this does not instantiate or render the changed widgets. |
| Scoped scan for alpha-byte concatenation in `apps/desktop-qt/qml/notes/` | Passed; no remaining `+ "xx"` custom color suffixes | Static QML colors retain their alpha-first `#AARRGGBB` literals; all dynamic custom-color alpha paths use the helper. Stored palette values are unchanged. This is a source scan, not a visual check. |
| `wc -l` and scoped Notes monolith inventory | Passed; `FileAttachmentWidget.qml` is 299 lines, helper is 11 lines, and the scoped >300-line inventory remains 30 files | The new color helper is below target and did not add a file to the over-limit set. |
| Matched-viewport color opacity, hover/selection transitions, high-DPI rendering and React/Qt round-trip | Not run | Compare the actual rendered colors in file, toggle, media, event, link and bundle widgets before closing QT-NOTES-056. No tests or screenshots were run. |


### Widget color-palette positioning review (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `NotesWidgetColorPalette.qml` timer and positioning connections | Source fix removes the 40 ms poll, resolves the nearest ancestor `Flickable`, observes `contentX`/`contentY`, performs a one-shot update after popup opening, and disconnects on close | Focused `qmllint` passes without diagnostics and the native app target builds. Isolated harnesses verify top-edge flip, vertical-scroll repositioning and observer cleanup. Horizontal scroll, resize and nearest nested-Flickable updates also pass; anchoring in real Notes widgets/editors and idle resource profiling remain open under QT-NOTES-057. |


### Linked calendar event identity lookup re-review (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `CalendarEventWidgetState.qml::syncFromCore()` caller and API scan | Passed: source now calls only `getCalendarEvent(eventId)` and has no `getCalendarEvents()` fallback | Prevents per-widget full-list scans and respects Core's indexed identity query independent of its 300-row list page. This is source evidence; create/update/delete refresh and >300-record resolution still require runtime acceptance. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/CalendarEventWidget.qml apps/desktop-qt/qml/notes/CalendarEventWidgetState.qml` | Passed, exit code 0, no diagnostics | Moving `Connections` to the visual `CalendarEventWidget` removes the invalid `QtObject` default-property warning and keeps the mutation signal connected to its state controller. This verifies QML diagnostics, not runtime signal delivery. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed, exit code 0 | Native target compiles. This does not exercise linked record lookup or signal refresh at runtime. |


### Widget palette default swatch comparison (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| React `ColorPalettePicker.tsx` versus Qt `NotesWidgetColorPalette.qml` source comparison | Qt default swatch now has a transparent idle fill, white/20 selected fill, one-pixel selected border, and 12 px × glyph | React's selected clear swatch uses white/20 and a 12 px text glyph; other color swatches keep their two-pixel selection ring. Focused QML lint/build and matched-scale runtime visuals remain to be recorded. |


### Desktop Qt offscreen startup smoke (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `apps/desktop-qt/build/synapse-desktop` with `QT_QPA_PLATFORM=offscreen` and a temporary `SYNAPSE_DATABASE_PATH` | Process remained active through the 8-second observation window; startup output reported opening the local database and loading the native interface; no QML/runtime error was printed | The temporary directory was removed after the process exited at the observation timeout. This confirms application startup only. It did not open a Caderno page, instantiate or interact with Notes widgets, or capture rendered output. |


### Notes audit link and source-path check (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Internal Markdown links and backtick-quoted repository source paths across the 12 Notes audit documents | Passed; 0 missing targets | The source-path scan covered quoted `.qml`, `.cpp`, `.h`, `.rs`, `.tsx`, `.ts`, and `.js` repository paths. This verifies link/path existence only, not that each cited source still proves its associated claim. |


### Palette positioning QML interaction harness (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Temporary `qmltestrunner` `TestCase` with `ApplicationWindow`, `Flickable`, anchor at y=500, and `NotesWidgetColorPalette` | Passed: 3 passed, 0 failed. With a 600×600 window the popup opens above at y=390, then after `contentY=100` flips below at y=436; closing clears the `scrollViewport` reference. | Ran with Qt 6.10.2 and `QT_QPA_PLATFORM=offscreen`; the test file lived in a temporary directory and was not added to the repository. Covers one vertical scroll viewport and edge-flip path, not a real Notes page, horizontal scrolling, resize, high DPI, focus/dismissal, or visual parity. |
| Focused `qmllint` and `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` after initial-position fix | Passed; no focused lint diagnostics, build exit code 0 | Confirms QML syntax and native target compilation only. |


### Nested viewport, horizontal scroll and resize harness (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Temporary `qmltestrunner` harness with outer and inner `Flickable`s, 2D inner content, and a palette anchored inside the inner viewport | Passed: 3 passed, 0 failed. The popup selected the nearest inner viewport, stayed aligned while `contentX` and `contentY` changed, recalculated clamping after the window narrowed from 700 px to 500 px, and cleared the observer on close. | Qt 6.10.2, offscreen; the generated QML test remained in a temporary directory. This exercises generic nested Flickables, not the real file/bundle widget parent chains or focus/dismissal behavior. |


### Palette dismissal and focus harness (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Temporary `qmltestrunner` harness with active `ApplicationWindow`, focused `TextField`, and shared `NotesWidgetColorPalette` | Passed: 4 passed, 0 failed. Escape closes the popup and restores focus to the editor; clicking outside closes it; each close emits one dismissal. | Qt 6.10.2, offscreen, temporary harness not committed. The runner emitted a `keyToAscii` warning while synthesizing Escape, but the Qt close/focus assertions passed. Does not prove focus behavior in actual file/bundle delegates or nested editors. |


### File attachment palette integration harness (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Temporary `qmltestrunner` harness mounting the actual `FileAttachmentWidget.qml`, its controller boundary, and an enclosing `Flickable` | Passed: 4 passed, 0 failed. Opened the widget palette, verified its nearest viewport and scroll position, dismissed with Escape while restoring editor focus, then dismissed by outside click and confirmed `showColorPicker` reset. | Qt 6.10.2, offscreen; test file remained temporary. The palette has `objectName: notesWidgetColorPalette` for native UI automation. The bundle widget, real NotePage nested editor chain, high-DPI rendering and visual comparison remain unverified. |
| Focused `qmllint` for `NotesWidgetColorPalette.qml` and native `synapse-desktop` build after adding the palette automation name | Passed; lint emitted no diagnostics and build exit code 0 | Confirms QML syntax and target compilation; no persistent test file was added. |


### Document bundle palette integration and color selection (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Temporary `qmltestrunner` harness mounting the actual `DocumentBundleWidget.qml` in a `Flickable` | Passed: 4 passed, 0 failed. Verified viewport tracking, scroll repositioning, Escape/outside dismissal, and focus restoration to an editor field. | Qt 6.10.2, offscreen; temporary test only. The harness uses a valid empty bundle and does not instantiate the manager or page-level nested editor chain. |
| Bundle palette swatch selection and `attrsUpdated` payload | Passed: selecting `#22C55E` closes the palette, updates `data-color` to the selected six-digit hex and preserves `data-type="document-bundle"` | Verifies widget attribute behavior only; PageView save, reload and React round-trip remain open. |
