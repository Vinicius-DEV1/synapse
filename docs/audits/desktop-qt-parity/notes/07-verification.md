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
| Source review of React descendant traversal and Qt `NoteBlock` parsing/serialization | Added bounded recursive discovery and path-based removal for toggle, blockquote-toggle, collection, blockquote and link-group containers; source ID is revalidated before changing a copy of the AST | The parent container is serialized by the Core-backed NoteBlock serializer and the bundle update is committed in the same page serialization. Column-group descendants are excluded because the parser does not model `columnBlock` wrappers. No runtime markup comparison was run. |
| `git diff --check` | Passed | No whitespace errors in the recursive path flow or parity records. |
| Nested markup preservation, stale-path rejection, column-group exclusion, page save/reload, undo and React round-trip | Not run | Check these manually before marking QT-NOTES-040 or the manager checklist complete. |

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
