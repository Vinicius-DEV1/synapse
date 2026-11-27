# Caderno Verification Plan

### Table-cell page references, UTF-16 cursor split, 928 px reading width & event widget state (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cargo test --manifest-path core/synapse-core/Cargo.toml domain::notes` | Passed: 21 passed, 0 failed | Verified Core Notes domain unit tests including `cursor_split` `taskItem` checkbox wrapper preservation. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-cursor-split` | Passed: 4 passed, 0 failed | Qt 6.10.2, offscreen. Verified `QQuickTextDocument` UTF-16 cursor offsets against `splitRichHtml` for supplementary emoji, combining marks, named/numeric entities, nested marks, task lists, adjacent `PageReferenceObjectType`, and `<br/>`/headings. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests pageViewDesktopReadingWidthMatchesReact928Px` (`NativeNotesTest`) | Passed: 3 passed, 0 failed | Verified `pageContentColumn` inner width is 928 px at 1280/1440/1920 and 636/468 px at 700/500. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/page-view/PageView.qml apps/desktop-qt/qml/notes/CalendarEventWidgetState.qml` | Passed, exit code 0 | Zero warnings on both modified QML files. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_calendar_event_widget.qml -import apps/desktop-qt/qml` | Passed: 6 passed, 0 failed | Verified `CalendarEventWidgetState` Core sync, independent widget color, failed toggle guard, space-separated date edit + duration/reminder preservation, `-15m`/`+60m` live boundaries, and active/recurring/expired/unlinked delete confirmation. |

### Dropped-file encrypted import & stale-target iteration (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/Editor.qml` | Passed, exit code 0; existing unused-import and unqualified-context warnings remain | `Editor.qml` parses with no new diagnostics. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Built `synapse-desktop-tests` with `native_notes_dropped_file_test.cpp`. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-dropped-files` | Passed: 4 passed, 0 failed (`initTestCase`, `droppedFilesImportEncryptOrderAndPersistAcrossReload`, `droppedFileLockedVaultStaleTargetAndPageSwitchRejectInsertion`, `cleanupTestCase`) | Qt 6.10.2, offscreen. Production `PageView.qml` + `SynapseDataController` + unlocked SQLite vault verifies multi-file encrypted import order (`first-doc.pdf`, `second note.txt`), canonical `data-file-id`/`data-file-type`/`data-file-size` attributes, `getFileWidgetMetadata()`, save/page-switch/reload, locked-vault rejection, stale-target cancellation, and page-switch cancellation. Cross-client React viewer routing and live preview open remain open. |

### Filtered table projection & persistence iteration (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/NotesRichTextEditor.qml apps/desktop-qt/qml/notes/NotesRichTextInput.qml apps/desktop-qt/qml/notes/NotesTableExcelGrips.qml` | Passed, exit code 0; existing unqualified-access and unused-import diagnostics remain | All three modified QML files parse with no new diagnostics. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Built `synapse-desktop-tests` with `native_notes_table_filter_persistence_test.cpp`. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-table-filter` | Passed: 4 passed, 0 failed (`initTestCase`, `filteredTablePreservesHiddenRowsAcrossSaveAutosavePageSwitchAndReload`, `failedFilterProjectionRestoresCanonicalContentAndEditing`, `cleanupTestCase`) | Qt 6.10.2, offscreen. Production `PageView.qml` + `SynapseDataController` + temporary SQLite database verifies pre-filter pending edit commit, multi-table `tableIndex == 1` filtering, explicit save, autosave, page switch, reload with hidden rows preserved, and failed-projection canonical restoration. Vault lock, modal-open while filtering, crash recovery, and matched-viewport screenshots remain open. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_table_column_type_popover.qml -import apps/desktop-qt/qml` | Passed: 10 passed, 0 failed | Confirms no regression in the table column-type/filter popover QML suite. |
| `git diff --check` | Passed | No whitespace errors. |

### Page deletion event-impact iteration (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/NotesDeleteDialog.qml apps/desktop-qt/qml/notes/NotesDeleteEventsWarning.qml apps/desktop-qt/qml/notes/NotesEditorModalsHost.qml apps/desktop-qt/qml/page-view/PageViewModalsHost.qml` | Passed, exit code 0; existing dynamic-loader `QObject` type warnings remain in the two modal hosts | Both changed delete-dialog QML components parse with no diagnostics. Host warnings predate this change; lint does not establish geometry, keyboard/focus or Core mutation behavior. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed | Rebuilt the native application after the QML host/property changes. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Rebuilt the focused native test binary with the new delete-dialog fixture. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-history` | Passed: 9 QtTest rows across page history and page-history keyboard suites | New test opens the actual Notes delete QML, checks target/subtree direct links, active-page inline reference, excludes expired and unrelated events, verifies the event warning/list/count label, and dismisses with Cancel. Other rows cover the production PageView modal route and page-history behavior. No live Core delete or restore was run. |
| Matched-viewport screenshot, no-event state, full event-list scroll/truncation, small-window clipping, keyboard/focus, live Core delete/restore, inline-linked events in unloaded descendants | Not run | Keep QT-NOTES-100 and its checklist items open until visible application and persistence evidence exists. |

### Move Page dialog iteration (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/modals/MovePageModal.qml apps/desktop-qt/qml/modals/MovePageModalHeader.qml apps/desktop-qt/qml/modals/MovePageSearchBar.qml apps/desktop-qt/qml/modals/MovePageModalFooter.qml apps/desktop-qt/qml/modals/MovePageDestinationRow.qml` | Passed, exit code 0; existing unqualified delegate/context diagnostics remain in `MovePageModal.qml` | The native dialog and four focused presentation components parse. Lint does not establish rendered parity, runtime keyboard behavior, or resize behavior. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Rebuilt the production PageView integration test binary against the changed QML tree. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-history` | Passed: 8 QtTest rows across page history and page-history keyboard suites | The production PageView path verifies Move Page opens with nonzero dimensions; its header receives the source title and current breadcrumb; search/footer components mount; the selected destination path is correct; and the current-parent action disables/enables correctly for root vs another destination. It also exercises existing history behavior. The test does not take screenshots or cover all Move Page key/focus paths. |
| Same-viewport React/Qt screenshots, narrow-window live resize, Tab/Shift+Tab, Enter/Escape propagation, focus return, search clear and invalid-target interaction | Not run | Keep QT-NOTES-099 and its remaining checklist items open until visible application evidence exists. |

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

### Notes open-answer discussion assistant iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_quiz_discussion.qml -import apps/desktop-qt/qml` | Passed: 8 QtTest results (6 behavior cases plus setup/cleanup) | A mocked evaluator verifies the React-shaped question/answer/verdict/reference prompt, optional answer/reference behavior, follow-up history, clear, provider error, close notification, late-response invalidation, and conversation cleanup when the parent focus session ends. No Gemini request is sent. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_open_answer_flow.qml -import apps/desktop-qt/qml` | Passed: 14 QtTest results | Open-answer persistence/restoration, retry, navigation, provider errors and non-Notes behavior remain intact with the discussion action added. The mock does not verify the live Core database. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_question_session_loading.qml -import apps/desktop-qt/qml` | Passed: 6 QtTest results | Confirms existing targeted Notes question loading and malformed-options behavior. |
| Focused finish-confirmation and finish-flow QML harnesses | Passed: 5 and 4 QtTest results | Existing review/finish/cancel behavior remains intact. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed | Native app target links. This does not exercise live Gemini, assistant display in a real Notes window or visual parity. |
| Focused `qmllint` on the discussion components and changed Notes/quiz host chain | Passed, exit code 0; existing warnings remain in neighboring shared quiz/host files | New assistant component files have no lint warnings. Existing layout, unqualified-access and dynamic `Loader.item` warnings in shared neighbors were not part of this feature. |
| `git diff --check` | Passed | No whitespace errors in the current iteration. |
| Live Gemini conversation, real Notes focus-session close/reopen, focus restoration, provider transport review, suggested-action handling and same-viewport React/Qt comparison | Not run | Suggested question action cards and accept/reject are tracked separately as QT-NOTES-079. Keep both QT-NOTES-078 and QT-NOTES-079 partial/open until live and visual evidence exists. |

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


### Notes multi-file local upload and grouping (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Persistent `qmltestrunner` harness for `NotesMediaWidgetPickerLocalUpload.qml`, its operations module, and a mocked `fileOperationFinished` signal | Passed: 8 test cases (10 QtTest totals including setup/cleanup), 0 failures. Covers queue metadata, stale/unrelated results, failure and retry, multi-file sequential import, bundle HTML parsed by the existing bundle operation, separate widget output, add/remove/deduplication, and Linux/Windows URL path decoding. | Qt 6.10.2, offscreen. Does not drive the native `OpenFiles` dialog, real encryption, parent modal dismissal/focus, editor insertion/save/reopen, or matched-viewport visuals. |
| Focused `qmllint` for the picker and upload components/operations plus native `synapse-desktop` build | Build passed. `qmllint` exit 0; existing controller-fallback, nested-scope, and parent-hover warnings remain. | Confirms target compilation and QML syntax only. No full-app file-dialog or persistence acceptance. |
| `git diff --check` | Passed | Whitespace validation only. |

### Notes quiz finish confirmation (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_quiz_finish_flow.qml` | Passed: 2 behavior cases (4 QtTest totals including setup/cleanup), 0 failures. | Exercises the native focus modal through the final question: results remain closed until confirmation; Review keeps the current question active. Does not exercise hardware keyboard events or attempt persistence. |
| `QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_quiz_finish_confirmation.qml` | Passed: 3 behavior cases (5 QtTest totals including setup/cleanup), 0 failures. | Verifies answered/pending counts, singular status copy, confirmation, Review, and backdrop cancellation. |
| Focused `qmllint` for `QuizSequentialFocusModal.qml`, `NotesQuizFinishConfirmDialog.qml`, `NotesEditorModalsHost.qml` and `AppIcon.qml` | Passed: exit 0. Existing layout, unqualified access, and Loader `QObject` member warnings remain in neighboring code. | New dialog and icon cases add no diagnostics; QML lint does not test rendered icon paths or focus behavior. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed: target linked. | Build validation only; live modal screenshot, keyboard events, and attempt save/reopen remain open. |
| `git diff --check` | Passed | Whitespace validation only. |

### Notes question-block delete confirmation (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_question_block_delete.qml` | Passed: 2 behavior cases (4 QtTest totals including setup/cleanup), 0 failures. | Exercises the real `QuestionBlock` dialog wiring: Cancel emits no `removeRequested`, confirmation emits exactly one. Does not validate live database retention or rendered viewport appearance. |
| Focused `qmllint` for `QuestionBlock.qml` and `NotesQuestionBlockDeleteDialog.qml` | Passed: exit 0; pre-existing layout, unqualified access, and dynamic delegate/hover warnings remain in `QuestionBlock.qml`. | The new dialog adds no lint diagnostics. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed: target linked. | Build validation only; no live save/reopen or visual comparison. |
| `git diff --check` | Passed | Whitespace validation only. |

### Notes question focus session loading (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_question_session_loading.qml` | Passed: 3 behavior cases (5 QtTest totals including setup/cleanup), 0 failures. | Verifies battery ID, legacy question ID, and missing-target paths; none calls `getAllQuizQuestions()`. Does not open the interactive session modal or measure UI responsiveness. |
| Focused `qmllint` for `NotesQuestionSession.js` and `NotesEditorModalsHost.qml` | Passed: exit 0. The host reports existing dynamic Loader `QObject` member warnings for `reloadData`/`visible`. | The new helper and call site add no diagnostics; the existing Loader warnings remain. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed: target linked. | Build validation only; the focus overlay was not opened in a running Notes session. |
| `git diff --check` | Passed | Whitespace validation only. |

### Notes question-create modal hierarchy (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Persistent `qmltestrunner` harness for `NotesQuestionCreateForm.qml` through `NotesSetupWidgetsModal.qml` | Passed: 4 behavior cases (6 QtTest totals including setup/cleanup), 0 failures. Verifies the create path and Core ID, existing battery ID, failure feedback, help/title header, 450 px card, 48 px field, disabled empty-title action, results heading, empty state and viewport sizing for empty, one and many results. | Qt 6.10.2, offscreen. Parent window is not visible, so effective on-screen visibility, focus and exact rendered geometry require live-window comparison. |
| Focused `qmllint` for the question form, setup host and habit picker | Passed: exit 0, no warnings. | Static QML checks only. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed: Desktop Qt target linked. | Build validation only; no interactive visual capture. |
| `git diff --check` | Passed | Whitespace validation only. |

### Notes question-block targeted loading (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cargo test -p synapse-core test_quiz_lifecycle_and_error_notebook -- --nocapture` | Passed: 1 focused test, 0 failures. Exercises the new by-ID battery summary and single-question queries, including missing IDs. | Core unit test only; the controller integration case is below. |
| `qmltestrunner` for `tst_notes_question_block_loading.qml` | Passed: 2 behavior cases (4 QtTest totals including setup/cleanup), 0 failures. Confirms summary lookup uses the exact battery ID, collapsed blocks load no question list, expanded battery previews use `getBatteryQuestions(id)`, single-question previews use `getQuizQuestion(id)`, and neither global-list API is called. | Qt 6.10.2, offscreen with a mock controller. Does not measure a large live note or verify preview visuals. |
| Focused `qmllint` for `QuestionBlock.qml` | Passed: exit 0 with existing layout, scope, and dynamic-property warnings. | The new query paths add no diagnostics; pre-existing static warnings remain in the component. |
| `cargo build --release -p synapse-bridge-qt` | Passed. | Confirms the new typed Core lookups are exported by the Qt bridge. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed. | Desktop Qt native application target. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed. | Rebuilt the native test target after the shared controller header change. |
| `QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=questions noteBatteryCreationReturnsPersistedCoreIdentityAndRejectsMissingPage questionAttemptsPersistAndErrorNotebookUsesLatestAnswer` | Passed: 2 focused controller tests (4 QtTest totals including setup/cleanup), 0 failures. | Confirms Notes battery creation uses the persisted Core identity and the Questions controller resolves the specific question by ID. |
| Large note responsiveness and external edit/missing record runtime checks | Open | Requires live Notes runtime with many question widgets and batteries. |
| `git diff --check` | Passed | Whitespace validation only. |

### Notes habit select/create modal (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Persistent `qmltestrunner` harness for the Notes habit picker through `NotesSetupWidgetsModal.qml` | Passed: 3 behavior cases (5 QtTest results including setup/cleanup), 0 failures. Verifies case-insensitive duplicate prevention, emerald/flame/seven-day create arguments, creation result lookup by fresh Core ID, existing-habit ID serialization and correct widget output. | Qt 6.10.2, offscreen with a mock controller. Does not verify live Core persistence, note save/reopen, keyboard navigation, loading/empty/retry messaging, focus or matched-viewport UI. |
| Focused `qmllint` for `NotesSetupWidgetPickerPanel.qml` and `NotesSetupWidgetsModal.qml` | Passed: exit 0, no warnings. | Static QML checks only. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed: target linked successfully. | Build validation only. |
| `git diff --check` | Passed | Whitespace validation only. |

### Notes habit picker keyboard and empty state (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Persistent `qmltestrunner` harness for habit-picker navigation handlers | Passed: 5 behavior cases (7 QtTest results including setup/cleanup), 0 failures. Covers wrapped result selection, Enter on existing/create, direct 1–9, Escape, duplicate-name selection and empty state. | Qt 6.10.2, offscreen. Calls the picker navigation handler directly; actual native key propagation in a visible window and focus-return behavior remain unverified. |
| Focused `qmllint` for Notes setup/picker components | Passed: exit 0, no warnings. | Static QML checks only. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed: target linked successfully. | Build validation only. |
| `git diff --check` | Passed | Whitespace validation only. |

### Notes question-battery create and page link (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cargo test -p synapse-core test_create_quiz_battery_for_page -- --nocapture` | Passed: 2 focused tests, 0 failures. Verifies sequential layout, page ID, actual battery identity in `quiz_page_links`, and no partial rows for an invalid page. | Exercises Core persistence with an initialized temporary SQLite database. Does not invoke the C ABI or desktop note save/reopen. |
| `cargo build --release -p synapse-bridge-qt` and exported-symbol check for `synapse_quiz_create_battery_for_page` | Passed; Rust bridge exports the new Notes-specific creator. | Build/export validation; C++ caller compilation is recorded below. |
| `qmltestrunner` for `tst_notes_question_picker.qml` | Passed: 3 behavior cases (5 QtTest totals including setup/cleanup), 0 failures. Covers page context, actual returned ID serialization, existing ID selection and error feedback with a mock controller. | Qt 6.10.2, offscreen. Does not exercise the actual Core controller through QML or saved-note reopen. |
| Focused native controller/bridge test via `synapse-desktop-tests --suite=questions noteBatteryCreationReturnsPersistedCoreIdentityAndRejectsMissingPage` | Passed: 1 behavior case (3 QtTest totals including setup/cleanup), 0 failures. Creates a real Notes page, creates and resolves a battery through the controller/Core bridge, and verifies an invalid page does not add another battery. | The aggregate native test executable now supports `--suite=questions` so only the in-scope test executes. Core tests separately verify the actual stored layout and link row. |
| Focused `qmllint` for `NotesSetupWidgetPickerPanel.qml` and `NotesSetupWidgetsModal.qml` | Passed: exit 0, no warnings. | Static QML checks only. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed: Desktop Qt target linked with the updated bridge. | Build validation only; no live UI interaction or persistence round-trip. |
| `git diff --check` | Passed | Whitespace validation only. |

### Notes Alarm setup hierarchy and routes (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Persistent `qmltestrunner` harness for `NotesAlarmSetupForm.qml` through `NotesSetupWidgetsModal.qml` | Passed: 4 behavior cases (6 QtTest results including setup/cleanup), 0 failures. Verifies React-like title, 672 px content cap, large time control, label section, slash-prefilled time, save request payload, invalid-time guard, and existing-alarm link serialization. | Qt 6.10.2, offscreen. Does not verify native full-canvas parity, live Core alarm creation, reminder delivery or focus/DPI behavior. |
| Focused `qmllint` for alarm, focus, shared setup and picker components | Passed: exit 0, no warnings. | Static QML checks only. |
| Focus and calendar event persistent QML harnesses | Passed: focus 1 behavior case; event 2 behavior cases (setup/cleanup totals excluded here). | Guard against regressions from extracting the focus form; does not verify live timer/event services. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed: native application linked successfully. | Build validation only. |
| `git diff --check` | Passed | Whitespace validation only. |

### Notes focus setup modal field hierarchy (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Persistent `qmltestrunner` harness for the `foco` mode in `NotesSetupWidgetsModal.qml` | Passed: 1 behavior case (3 QtTest results including setup/cleanup), 0 failures. Verifies Tag → Description → Target Time visual order, visible labels, example placeholders, and parsed `/foco` prefill values. | Qt 6.10.2, offscreen. Does not verify pointer/keyboard behavior, focus return, live timer start, or matched-viewport screenshots. |
| Focused `qmllint` for `NotesSetupWidgetsModal.qml` | Passed: exit 0, no warnings. | Static QML checks only. |
| `git diff --check` | Passed | Whitespace validation only. |

### Notes inline Calendar event modal actions (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Persistent `qmltestrunner` harness for `NotesCalendarEventForm.qml` with a mock Notes controller | Passed: 2 behavior cases (4 QtTest results including setup/cleanup), 0 failures. Cancel closes without a controller call or HTML insertion; create passes linked-page/reminder data to the controller, inserts its returned event identity and closes once. | Qt 6.10.2, offscreen. Verifies the actual cancel/create button slots and serialization. Does not exercise native Core persistence, reminder delivery, keyboard/focus traversal or matched-viewport visuals. |
| Focused `qmllint` for `NotesCalendarEventForm.qml` and its date/time dependency | Passed: exit 0, no warnings. | Static QML checks only. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed: target linked successfully. | Build validation only. |
| `git diff --check` | Passed | Whitespace validation only. |

### Notes upload and existing-file mode separation (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| Persistent `qmltestrunner` harness for `NotesMediaWidgetPickerModal.qml`, upload operations, existing-file list and a mocked controller | Passed: 10 behavior cases (12 QtTest results including setup/cleanup), 0 failures. Covers separate slash-command routing, existing-file lookup/filtering, linked-file serialization, upload serialization, multi-file queue, grouping, retry, stale results, path decoding and close-while-importing guard. | Qt 6.10.2, offscreen. Test parent is not visible, so effective child visibility is not asserted; mode selection, list data and serialized outputs are asserted. Native open dialog, real ENC1 encryption, insertion/save/reopen and matched-viewport visuals remain open. |
| Focused `qmllint` over six changed QML/JS implementation files | Passed: exit 0, no warnings. | Syntax and static QML checks only. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed: target linked successfully. | Build validation only; does not drive file selection or the live Notes UI. |
| `git diff --check` | Passed | Whitespace validation only. |

### Duplicate-link modal iteration (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_link_duplicates_dialog.qml -import apps/desktop-qt/qml` | Passed: 4 behavior cases (6 QtTest results including setup/cleanup). Covers resource title/URL and ancestor ordering, no-open behavior for empty matches, clicking a duplicate row and verifying navigation plus dismissal, Escape, and outside-click dismissal. | Qt 6.10.2, offscreen. Uses a mock controller/page tree. It does not validate duplicate discovery from persisted Notes content, focus restoration or visual parity in the full editor. |
| Focused `qmllint` for `NotesLinkDuplicatesDialog.qml`, `LinkPreviewCard.qml` and `LinkPreviewCardDrawers.qml` | Passed, exit code 0 | The new dialog produced no lint diagnostics. Existing warnings remain in neighboring files for an unused import, layout-managed icon sizing and a dynamic `Button.hovered` lookup. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed | Native application target linked. This does not exercise the active Notes editor or persisted duplicate lookup. |
| `git diff --check` | Passed | Patch formatting and whitespace only. |
| Live duplicate discovery/navigation, focus restoration, same-viewport capture, accessibility and screen-edge/DPI comparison | Not run | Keep QT-NOTES-076 and its remaining modal acceptance checklist open until full-editor evidence is collected. |

### Notes question payload normalization (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_question_session_loading.qml -import apps/desktop-qt/qml` | Passed: 4 behavior cases (6 QtTest results including setup/cleanup). Verifies battery and legacy ID-targeted reads, Core `question` to `prompt` mapping, JSON-string option parsing, correct-index/expected-answer/explanation mapping, no global scan, and malformed-options fail-closed behavior. | Qt 6.10.2, offscreen. Uses a mock controller; does not prove the real bridge payload, rendered answer selection or save/reopen behavior. |
| `git diff --check` | Passed | Patch whitespace only. |
| Full Core-backed Notes focus session, question render, answer interaction and saved attempt round-trip | Not run | Keep QT-NOTES-077 and the open-answer acceptance items active until application evidence is collected. |

### Notes open-answer card visual parity pass (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_open_answer_flow.qml -import apps/desktop-qt/qml` | Passed: 18 behavior cases (20 QtTest results including setup/cleanup), latest run after option-boundary coverage | Verifies explanation-panel state, Markdown, `Alt+G`/`Ctrl+G` and plain-`G` sequence/gating, the option-G conflict, Left/Right and `<`/`>` registration, Alt+arrow input-safe navigation, number/letter mapping and 1/4/9/10/26-option boundaries, input/confirmed selection guards, answer draft restoration, finish confirmation and Space progression gating. This harness does not dispatch keys through a window or compare same-viewport rendering; the separate visible-`QQuickWindow` event test is recorded below. |
| `/usr/lib/qt6/bin/qmllint --ignore-settings -I apps/desktop-qt/qml apps/desktop-qt/qml/questions/QuizSequentialFocusModal.qml` | Passed with existing diagnostics; exit code 0 | The updated modal parses. This invocation did not assess runtime shortcut dispatch or matched-viewport appearance. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed | The native desktop target links with the updated QML modal. This is not a visible-window smoke test. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop synapse-notes-rich-qml-tests -j2` | Passed | Rebuilds the native app and Notes rich QML test target. |
| `/usr/lib/qt6/bin/qmllint --ignore-settings -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/NotesOpenAnswerReferenceAnswer.qml apps/desktop-qt/qml/questions/QuizSequentialCard.qml apps/desktop-qt/qml/questions/QuizSequentialFocusModal.qml` | Completed with existing diagnostics | The changed reference-answer component and the new card bindings produce no diagnostics. The shared modal still reports pre-existing unqualified accesses and a `parent.text` warning outside the new Notes-specific bindings. |
| `git diff --check` | Passed | Patch whitespace only. |

### Notes open-answer Qt controller round-trip (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Configures and links the native controller test binary. The target compiles the shared test executable's existing source set; no unrelated module behavior was audited or changed. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-open-answer` | Passed: 1 behavior test (3 QtTest results including setup/cleanup) | A real `SynapseDataController` opens a temporary SQLite file, creates a Notes page and page-linked battery, creates an open question through the typed question-action API, records typed answer/verdict/feedback through the controller, then is destroyed. A second controller reopens the same file and retrieves the latest attempt by battery/question. The test invokes the production `NotesQuestionSession.loadQuestions` JavaScript adapter, then instantiates the production `QuizSequentialFocusModal.qml` and starts it with the loaded view model. It confirms the normalized prompt/reference answer, restored typed response and feedback, answered/explanation flags, answer text, answered count, verdict and explanation state in the real focus modal. This does not instantiate the complete Notes page/editor host, dispatch shortcuts in a visible active window, contact Gemini, or compare React rendering. |
| `git diff --check` | Passed | Patch whitespace only. |

### Notes open-answer keyboard event dispatch (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests synapse-desktop -j2` | Passed | Configured and built both the native test executable and desktop application after adding the focused shortcut test. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-shortcuts` | Passed: 1 behavior test (3 QtTest results including setup/cleanup) | Instantiates the production modal in a visible `QQuickWindow` and sends Qt key events. Verifies plain `G` enters the focused answer field, `Ctrl+G`/`Alt+G` toggle the explanation with text focus, an unmodified Right arrow leaves the focused answer and question unchanged, Alt+Left/Right navigates and restores drafts, unmodified Left/Right and `<`/`>` navigate with modal focus and respect first/last bounds, Right opens finish confirmation at the end, navigation closes the explanation, `G`/`7` select option seven, `A`/`Z` select indexes 0/25 in a 26-option question, and Space is inert before answer confirmation/while focused, advances after confirmation, then opens finish confirmation. Uses the offscreen platform and programmatically sets the answered state; it does not launch the full Notes host, test OS window-manager focus, or compare React visuals. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-open-answer` | Passed: 1 behavior test (3 QtTest results including setup/cleanup) | Reopens the controller/database, calls the production Notes question-session loader, and confirms the restored answer and evaluation reach the production sequential focus modal. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_open_answer_flow.qml -import apps/desktop-qt/qml` | Passed: 18 behavior cases (20 QtTest results including setup/cleanup) | Covers QML sequence mapping, 1/4/9/10/26-option boundaries, guards, answer state and evaluation flows. Window-level dispatch is covered by the native test row above. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/questions/QuizSequentialCard.qml apps/desktop-qt/qml/questions/QuizSequentialFocusModal.qml` | Passed, exit code 0, with diagnostics | Existing layout-managed sizing, unqualified access and `parent.text` diagnostics remain in these QML files; no diagnostic points to the new input object name or Notes option key handler. No QML runtime warnings were observed by this check. |
| `git diff --check` | Passed | Patch whitespace only. |
| Full running-app shortcut/focus flow and matched-viewport comparison with React | Not run | Keep the application-level, boundary, accessibility and visual acceptance items open in the checklist. |

### Notes open-answer database reopen round-trip (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cargo test -p synapse-core open_attempts_tests -- --nocapture` | Passed: 3 tests | Adds a file-backed Core round-trip: save an open answer and feedback, drop the database handle, reopen the same SQLite file, and recover the latest typed attempt by battery and question. Also covers verdict/target validation and latest-attempt lookup. This verifies Core persistence across a database reopen; it does not launch the Qt Notes UI, reopen a saved note, contact Gemini, or establish cross-client visibility. |
| `cargo test -p synapse-bridge-qt open_answer_bridge_roundtrips_typed_attempt_after_database_reopen -- --nocapture` | Passed: 1 test | Calls the typed C bridge save and latest-attempt APIs, confirms the serialized answer/verdict/feedback fields, closes and reopens the SQLite file, then confirms the latest typed JSON payload. The open question fixture is prepared through Core; the Qt controller and Notes UI are not launched. Existing deprecation warnings come from an unrelated bridge SQL API test. |
| `rustfmt --edition 2021 --check bridges/bridge-qt/src/domain/questions_open_attempt_tests.rs` | Passed | Formatting check for the new focused bridge test only. |
| `cargo fmt --all --check` | Not clean | Reports pre-existing formatting diffs across unrelated workspace files. No repository-wide formatting was applied; the new bridge test was formatted and checked individually. |
| `git diff --check` | Passed | Patch whitespace only. |

### Notes open-answer evaluation and attempt persistence (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cargo test -p synapse-core open_attempts_tests -- --nocapture` | Passed: 2 tests | Verifies open-question validation, answer/feedback persistence, latest attempt lookup, verdict validation, and rejection of unscoped lookups. Uses a temporary Core database. |
| `cargo build --release -p synapse-bridge-qt` | Passed | Builds the typed Qt bridge API for open-answer persistence and targeted latest-attempt reads. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_open_answer_flow.qml -import apps/desktop-qt/qml` | Passed: 12 behavior cases (14 QtTest results including setup/cleanup) | Mocked evaluator/controller. Covers draft navigation, evaluation and typed persistence, provider failure/retry, persistence retry without a second provider request, latest-attempt restoration, ignoring late callbacks after session close, out-of-order evaluations across questions, missing evaluator state, React verdict-parsing precedence, native evaluator loading, reference-answer binding and preservation of the generic non-Notes focus behavior. Does not contact Gemini or reopen a saved Notes page. |
| `cargo test -p synapse-core db::migrations::tests -- --nocapture` | Passed: 6 migration tests | Verifies schema version 11, migration of existing databases to include the battery-scoped attempt index, idempotence, and rejection of a newer schema. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_question_session_loading.qml -import apps/desktop-qt/qml` | Passed: 4 behavior cases (6 QtTest results including setup/cleanup) | Uses a mock controller; verifies ID-targeted session loading, normalized question/answer fields and malformed-options handling. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_quiz_finish_flow.qml -import apps/desktop-qt/qml` | Passed: 2 behavior cases (4 QtTest results including setup/cleanup) | Verifies finish confirmation before results and Review returning to the last question. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_quiz_finish_confirmation.qml -import apps/desktop-qt/qml` | Passed: 3 behavior cases (5 QtTest results including setup/cleanup) | Verifies complete/incomplete status, confirmation and backdrop cancellation. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_question_block_loading.qml -import apps/desktop-qt/qml` | Passed: 2 behavior cases (4 QtTest results including setup/cleanup) | Verifies battery/question ID-targeted preview loading. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_question_block_delete.qml -import apps/desktop-qt/qml` | Passed: 2 behavior cases (4 QtTest results including setup/cleanup) | Verifies cancellation and note-block-only removal request. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/NotesOpenAnswerEvaluator.qml apps/desktop-qt/qml/notes/NotesOpenAnswerFeedback.qml apps/desktop-qt/qml/notes/NotesOpenAnswerReferenceAnswer.qml` | Passed with no diagnostics | Focused lint for the new, atomic Notes open-answer evaluator and display components. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed | Native application target linked with the updated bridge/controller. Does not exercise a live Notes page or provider call. |
| `git diff --check` | Passed | Patch whitespace only. |
| Real Notes page, configured Gemini evaluation, saved-note reopen/cross-client history, credential storage/configuration review, matched-viewport and accessibility comparison | Not run | Keep QT-NOTES-075 acceptance open. The QML harness intentionally mocks the provider and storage boundary. The shared `AiClient` source currently sends generation keys in `x-goog-api-key`; the Settings AI tab's separate model-list probe still uses a key query parameter and is outside the Notes evaluation path. No live transport test was run. |

### Typed assistant action persistence (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cargo test -p synapse-core assistant_actions_tests -- --nocapture` | Passed: 3 tests | Exercises create/edit/delete/reorder, open-answer type changes, partial order preservation, rejection of cross-battery IDs and invalid multiple-choice choices, and all-or-nothing rollback using a temporary Core database. |
| `cargo build --release -p synapse-bridge-qt` | Passed | Builds the JSON boundary that deserializes typed assistant actions and returns either the refreshed battery questions or a structured failure. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed at that stage | Rebuilt the native app/controller against the typed action bridge before the proposal UI was wired; current native build evidence is listed below. |
| `git diff --check` | Passed | No whitespace errors in this stage. |
| Mocked Qt controller invocation, accepted/rejected card interactions, batch failure UI and live question list refresh | Not run at that stage | The tests below now cover the mocked proposal lifecycle; live Core-backed Qt acceptance remains open. |

### Notes assistant proposal lifecycle (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_quiz_discussion.qml -import apps/desktop-qt/qml` | Passed: 19 QtTest results | Covers contextual conversation, response parsing and truncated-JSON recovery, stable target mapping, invalid suggestions, validation merge, single/batch accept/reject, no persistence on rejection, Core controller adapter success/failure, retry, and stable-question/answer refresh after reorder. Provider and action persistence are mocked in this QML harness. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_open_answer_flow.qml -import apps/desktop-qt/qml` | Passed: 14 QtTest results | Existing Notes open-answer flow and generic focus fallback remain intact. |
| `cargo test -p synapse-core assistant_actions_tests -- --nocapture` | Passed: 3 tests | Verifies transaction actions, same-battery constraints, validation and rollback. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed | Native executable links with the current Notes assistant, proposal components and Core-backed controller. |
| Focused `qmllint` on the changed assistant components | Passed with warnings only in the shared sequential-focus modal; new proposal/assistant files are warning-free after cleanup | This does not claim the entire QML folder is warning-free. |
| `git diff --check` | Passed | No patch whitespace errors. |
| Live Gemini, QML-to-Core accepted action, saved-note reopen, keyboard/focus return, matched viewport | Not run | Keep QT-NOTES-078/079 open. Qt currently uses the same configured Gemini model for generation and validation, unlike React's separate validator-model preference. |

### Notes assistant shortcuts and referenced batteries (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_quiz_discussion.qml -import apps/desktop-qt/qml` | Passed: 24 QtTest results | Covers all four React quick-prompt templates; active/standalone/already attached battery exclusions; matching by title/page; keyboard index wrap/dismiss/no-results; attach/remove; loading reference questions lazily; prompt context inclusion and read-only boundary; plus the proposal lifecycle cases above. The controller and provider are mocked. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_open_answer_flow.qml -import apps/desktop-qt/qml` | Passed: 14 QtTest results | Existing open-answer flow remains intact. |
| `cargo test -p synapse-core domain::questions::tests -- --nocapture` | Passed: 3 tests | Covers linked battery page ID/title metadata and standalone batteries without page metadata, along with page-linked creation behavior. |
| `cargo build --release -p synapse-bridge-qt` | Passed | Rebuilds the Qt JSON bridge against the added battery page metadata. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed | Native app links against the updated Core bridge. |
| Focused `qmllint` for the Notes assistant dialog, composer and quick-prompt components | Passed with no diagnostics | New composer and prompt UI are clean. |
| `git diff --check` | Passed | No patch whitespace errors. |
| Real Notes battery/page loading, Gemini generation using references, physical keyboard event and matched-viewport comparison | Not run | Keep QT-NOTES-080 acceptance open for live database/provider and visual evidence. |

### Notes alarm full-canvas setup (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_alarm_setup_modal.qml -import apps/desktop-qt/qml` | Passed: 9 QtTest results | Covers full-window canvas dimensions/tint, 672 px desktop content width, narrow-window scrolling and adaptive time typography, slash prefill, valid/invalid submission, existing-alarm reference serialization, Escape and header close. Uses a mocked controller. |
| Focused `qmllint` on `NotesSetupWidgetsModal.qml` and `NotesAlarmSetupForm.qml` | Passed with no diagnostics | The changed QML parses cleanly. This does not establish rendered blur/tint, click-outside behavior, focus restoration or screen-reader behavior. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed | Native target linked with the new Notes alarm canvas. Does not contact Core reminders or open the live editor. |
| Focused QML regression harnesses for Notes focus setup, calendar event form, habit picker, and question picker | Passed: 3 + 4 + 7 + 6 QtTest results | The shared setup host continues to mount the unaffected Notes modes and their existing picker flows. Mocked controller data does not verify live persistence or visual parity. |
| `git diff --check` | Passed | No patch whitespace errors. |
| Live Core alarm creation/failure, OS reminder delivery, backdrop click, focus return, blur and matched-viewport comparison | Not run | Keep QT-NOTES-066 acceptance open for real persistence/reminder and visual/interactions evidence. |

### Notes audio attachment player (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed | Rebuilt the Qt app against the request-correlated preview API. |
| `cmake --build apps/desktop-qt/build --target synapse-notes-rich-qml-tests -j2` | Passed | The Qt QML harness registers a mock MPV item and loads the Notes-owned audio overlay. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-notes-rich-qml-tests --suite=audio-preview` | Passed: 9 QtTest results | Three isolated cases verify stale request results are ignored, matching results start playback, close releases the prepared path, close during preparation cancels the matching request, controller errors are shown, and Escape closes the modal. Mock controller/player; no actual audio output. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Rebuilt the native controller tests with the optional preview request ID. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=files` | Passed: 4 QtTest results | The encrypted-file test exercises the real controller preview, checks returned ID, verifies a mismatched cancel does not cancel it, and confirms missing-file errors retain their request ID. Also runs the existing file/folder management case. |
| QML syntax-only lint for the new modal and `git diff --check` | Passed | `qmllint -s` parses the modal; `Synapse.Media` is registered in the running app rather than a lint qmldir, so ordinary lint reports the expected unresolved runtime type. The QML integration harness resolves it using a mock. |
| Actual MPV playback, codec matrix, vault lock during playback, live file widget in active/floating/nested notes, focus/accessibility and matched-viewport comparison | Not run | Keep these QT-NOTES-045 acceptance items open; mock-player success is not live playback or visual evidence. |


### Notes folder attachment navigation (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_file_attachment_route.qml -import apps/desktop-qt/qml` | Passed: 5 QtTest results | Verifies that a folder attachment sets the folder-navigation intent, audio filenames retain the player intent, and ordinary documents do not request folder navigation. It mocks the metadata controller and does not instantiate the full Notes-to-Files shell. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed | Native app links after propagating the new folder-intent argument through Notes block and bundle wrappers. |
| Focused `qmllint --ignore-settings -s` over changed QML and `git diff --check` | Passed | Syntax and whitespace checks do not verify folder existence, tree selection, persistence or live module transition. |
| Root/nested folder open from active, floating and nested Notes; save/reopen and matched viewport | Not run | Keep QT-NOTES-045 partial until live folder selection/navigation and same-size visual comparison are checked. |


### Notes-owned direct file viewer (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_file_attachment_route.qml -import apps/desktop-qt/qml` | Passed: 6 QtTest results | Verifies folders request direct folder navigation, PDF requests the document action modal, audio suffixes request playback, and ordinary document types do not request PDF/EPUB actions. |
| `cmake --build apps/desktop-qt/build --target synapse-notes-rich-qml-tests -j2` | Passed | Builds the native QML viewer harness with mock video/audio media types. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-notes-rich-qml-tests --suite=file-preview` | Passed: 9 QtTest results across three isolated runs | Covers request-ID matching, stale-response rejection, text preview preparation, temporary path release, pending request cancellation, vault invalidation, and request-scoped PDF page results with both the source PDF and rendered page cleaned up. Preview controller, Theme and media objects are test doubles. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=library nativeLibraryImportProgressAndPasswordRemoval` | Passed | Uses a generated native PDF fixture to verify the Notes PDF signal carries its request ID and source path, stays separate from the Library PDF signal, and discards a cancelled render without returning a temporary page path. This exercises the real controller and renderer, not an interactive Notes window. |
| Focused `qmllint --ignore-settings -s` on changed QML and `git diff --check` | Passed | Syntax/whitespace only; does not prove real image/video/PDF rendering or the viewer's matched-viewport appearance. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop synapse-desktop-tests synapse-notes-rich-qml-tests -j2` | Passed | Rebuilt the native app and focused controller/QML test targets with the optional request-correlated PDF render signal. |
| Actual image/video decoding, PDF page render, export dialog, unsupported formats, live nested Notes routes and same-size React comparison | Not run | Keep QT-NOTES-045 partial until real file/viewer acceptance covers the type matrix and visual comparison. |

### Notes text attachment progress and bookmarks (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop synapse-desktop-tests synapse-notes-rich-qml-tests -j2` | Passed | Rebuilt the desktop, native controller tests and focused Notes QML harness after the progress UI and preview changes. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-notes-rich-qml-tests --suite=reading-progress` | Passed: 3 QtTest results | Restores saved 42% progress/bookmark, scrolls a synthetic long text file, checks the debounced config write, resumes, adds/removes/renames a bookmark and jumps to its saved position. Controller/config and preview file contents are test doubles. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-notes-rich-qml-tests --suite=file-preview` | Passed: 9 QtTest results across three isolated cases | Covers preview result correlation, close/vault invalidation cleanup and Notes-scoped PDF page results/cancellation. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-notes-rich-qml-tests --suite=audio-preview` | Passed: 9 QtTest results across three isolated cases | Regression check for audio result correlation, cancellation, error text and Escape close; MPV is a mock. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=library nativeLibraryImportProgressAndPasswordRemoval` | Passed: 3 QtTest results | Generated-PDF controller fixture verifies the Notes request ID and source path, separate Library signal, and cancellation without orphan page output. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=files` | Passed: 4 QtTest results | Checks the encrypted-file preview/export lifecycle and file/folder management regressions. |
| `/usr/lib/qt6/bin/qmllint --ignore-settings -s apps/desktop-qt/qml/notes/NotesFileReadingProgress.qml apps/desktop-qt/qml/notes/NotesFileBookmarksControl.qml apps/desktop-qt/qml/notes/NotesFilePreviewModal.qml apps/desktop-qt/qml/files/FilesPreviewOverlay.qml` | Passed with no diagnostics | Parses the Notes-specific state and bookmark components and the shared preview changes. This is not a visual or live-database check. |
| `git diff --check` | Passed | No whitespace errors in the implementation and audit update. |
| Real database persistence across restart, resume dismissal behavior, bookmark editing/keyboard flow, actual protected text files, active/floating/nested Notes routes and matched-viewport visuals | Not run | Keep these QT-NOTES-045 acceptance items open; mocked config tests prove UI state transitions, not app-level or cross-client persistence. |

### Notes text attachment reading column (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-notes-rich-qml-tests -j2` | Passed | Recompiled the focused harness after adding responsive text-column assertions. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-notes-rich-qml-tests --suite=reading-progress` | Passed: 3 QtTest results | Checks the Notes preview text area is capped at 768 px in the 900 px window, narrows after resizing to 480 px, and retains reading-progress/bookmark behavior. The test validates geometry/state, not rendered screenshot equivalence. |
| `/usr/lib/qt6/bin/qmllint --ignore-settings -s apps/desktop-qt/qml/files/FilesPreviewOverlay.qml apps/desktop-qt/qml/notes/NotesFilePreviewModal.qml` | Passed with no diagnostics | Confirms QML parse and bindings; the Notes-only flag leaves Files viewer dimensions and typography at their prior values. |
| GFM table overflow, links, code-block highlighting/decorations, blockquote styling, long unbroken strings and matched-viewport screenshots | Not run | Qt `TextEdit.MarkdownText` supports CommonMark plus GFM tables/task lists, but its native decorations differ from ReactMarkdown. Keep these appearance/interaction checks open under QT-NOTES-045. |

### Notes Markdown attachment source editing (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cargo test --manifest-path core/synapse-core/Cargo.toml replacing_file_content_reference_updates_active_record_atomically -- --nocapture` | Passed | Checks input trimming, path/size update, invalid values and exclusion of trashed records in Core. |
| `cargo check --manifest-path bridges/bridge-qt/Cargo.toml` and `cargo build --release --manifest-path bridges/bridge-qt/Cargo.toml` | Passed | Verifies the new typed Qt bridge API in dev and release profiles. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop synapse-desktop-tests synapse-notes-rich-qml-tests -j2` | Passed after adding the new source to both native application and test target source lists | All three binaries link with the content-update controller and QML editor. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=files` | Passed: 4 QtTest results | Extends the encrypted import/preview/export/password-removal scenario to edit a Markdown attachment, verify its stable ID and changed byte size, preview updated text and export the saved content. It also rejects a >4 MiB edit and verifies the encrypted path, size and saved bytes remain unchanged. This is a generated local fixture, not a React or Drive round-trip. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-notes-rich-qml-tests --suite=markdown-editor` | Passed: 3 QtTest results | Verifies unsaved discard confirmation, keep-editing, Tab's two-space insertion, Ctrl+S save emission and close. Controller and encryption are covered by the separate native files test. |
| `/usr/lib/qt6/bin/qmllint --ignore-settings -s apps/desktop-qt/qml/notes/NotesFileMarkdownEditor.qml apps/desktop-qt/qml/notes/NotesFileReadingProgress.qml apps/desktop-qt/qml/notes/NotesFileBookmarksControl.qml apps/desktop-qt/qml/notes/NotesFilePreviewModal.qml apps/desktop-qt/qml/files/FilesPreviewOverlay.qml apps/desktop-qt/qml/files/FilesActions.qml` | Passed with no diagnostics | Parses edited view and shared preview files; does not validate live viewport behavior. |
| Ctrl+S through the live shell, >4 MiB rejection, failure injection, Drive content sync, cross-client reopen and same-viewport design comparison | Not run | Keep QT-NOTES-045 partial; Qt currently saves the local encrypted file only, and the React editor/Drive upload flow remains the comparison target. |

### Notes reading-progress database persistence (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Builds the native controller test with the restart persistence case. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=files` | Passed: 5 QtTest results | A controller writes file-ID-scoped reader JSON to a temporary SQLite database; after its destruction, a new controller opens the same database and reads the exact value. The focused QML state test still uses a mock controller, so full view-to-Core restore in a restarted app remains open. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-notes-rich-qml-tests --suite=reading-progress` | Passed: 3 QtTest results | In addition to resume and responsive reader behavior, opens the nonmodal bookmark popup, checks the count badge, focuses and selects the rename field, saves the changed label with Enter and closes with Escape. Full tab traversal and focus restoration to the trigger remain open. |
| `/usr/lib/qt6/bin/qmllint --ignore-settings -s apps/desktop-qt/qml/ui/AppIcon.qml apps/desktop-qt/qml/notes/NotesFileBookmarksControl.qml apps/desktop-qt/qml/notes/NotesFileReadingProgress.qml apps/desktop-qt/qml/notes/NotesFilePreviewModal.qml` | Passed with no diagnostics | Checks the new bookmark vector icon, accessible names and focus changes in the Notes bookmark control. |
| Live Notes viewer restart with saved progress/bookmarks, bookmark focus/keyboard, cross-client sync and matched-viewport comparison | Not run | The persistence primitive is verified; retain end-to-end and visual acceptance under QT-NOTES-045. |

### Notes Markdown document AI references and question insertion (2026-11-26)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop synapse-notes-rich-qml-tests -j2` | Passed | Rebuilt the native app and Notes rich QML test target, including the Core question-change signal. |
| `QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-notes-rich-qml-tests --suite=markdown-ai` | Passed: 5 focused cases (15 QtTest results including per-case setup/cleanup) | Covers document context/proposals, cancel/stale response, encrypted same-ID save/retry, `@` picker/context, typed question insertion/retry, keyboard selection/removal, actual viewer-to-controller wiring, Core `QVariantList` conversion, and cleanup after `filePreviewsInvalidated`. Controller/provider remain test doubles; no live Gemini request, database battery, or real vault lock. |
| `QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_markdown_ai_diff.qml` | Passed: 6 QtTest results | Checks unchanged/empty text, inline changed-token markup, escaping of untrusted Markdown HTML, and the bounded large-document fallback. |
| `QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_question_block_loading.qml` | Passed: 3 behavior cases (5 results including setup/cleanup) | Confirms a matching `quizQuestionsChanged` signal refreshes an expanded question block from Core and ignores changes for another battery. Uses a mock controller. |
| Focused `qmllint --ignore-settings -s` for the Markdown AI components, parser/prompt JS, `QuestionBlock.qml` and harness | Passed with no diagnostics | Checks QML/JS syntax and bindings; not a visual acceptance run. |
| `git diff --check` | Passed | No whitespace errors in the implementation and documentation updates. |
| Live Gemini response, actual controller-driven vault lock, semantic paraphrase detection, attachment reopen, diff color/typography parity and matched-viewport visual/focus/accessibility comparison | Not run | Keep QT-NOTES-081 partial. The modal's `filePreviewsInvalidated` handler is tested with a mock signal. Existing battery questions are sent as reference and the model is asked not to repeat them; Core separately rejects exact prompts after case/whitespace normalization. |

### Notes Markdown AI duplicate prompt guard (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cargo test -p synapse-core assistant_actions_tests -- --nocapture` | Passed: 5 focused tests | Verifies assistant create/edit/delete/reorder behavior, rejection of case/whitespace-normalized duplicate prompts, full batch rollback when one proposed create duplicates an active same-battery question, and independence across batteries. This guards exact normalized wording only; semantic paraphrase detection is not implemented. |
| `cargo check -p synapse-bridge-qt` and `cargo build --release -p synapse-bridge-qt` | Passed | Checks and rebuilds the Qt bridge so the native desktop test executable links the updated Core behavior. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Reconfigured and linked the native test target against the rebuilt release bridge. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-assistant-actions` | Passed: 1 behavior test (3 QtTest results including setup/cleanup) | Creates a temporary SQLite database, inserts an original open question, sends a case/whitespace-variant duplicate through `SynapseDataController`, and confirms the FFI/Core error returns while the battery still contains only the original. |
| `rustfmt --edition 2021 --check` for changed Core modules | Passed | Checked `assistant_actions.rs`, its focused tests, and `prompt_duplicates.rs`; `mod.rs` was checked with child traversal disabled. |
| `git diff --check` | Passed | No whitespace errors. |
| Live model paraphrases, deleted-question re-use, and real Notes Markdown assistant insertion | Not run | Do not claim semantic deduplication or full UI acceptance. The Core guard rejects exact prompts after lowercasing and whitespace collapse, within the active target battery only. |

### Notes page-switch save recovery (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Builds the new native Notes page-switch regression suite. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-page-switch` | Passed: 4 behavior tests (8 QtTest results including setup/cleanup) | Instantiates production `PageView.qml`. Deterministic-controller cases cover failed dirty-page save blocking navigation with selected page/content/dirty error retained, retry navigation, a saved note with a failed queued file deletion that still permits navigation, page-scoped queue retention and retry on return, plus stale-conflict keep-local/reload choices. A real `SynapseDataController` with temporary SQLite creates the pages, loads the initial timestamp into QML, performs a newer write through Core, observes the production conflict signal/dialog state, retries local content at the latest timestamp and reads back the saved local content before confirming navigation. It also confirms a real non-empty Core `QVariantList` parser result is normalized before the unreferenced-file check. The simulated competing write is a second controller call in the same process, not a second process/client. Test-only audio/video player type stubs satisfy the complete PageView modal tree. The expected QML warning in the delete-failure case verifies the recoverable error path; the run has no Qt parser/component warnings. Encrypted pages, OS keyboard/focus and screenshot parity remain untested. |
| `git diff --check` | Passed | No whitespace errors in the test and documentation changes. |
| Separate-process/client concurrent writes, real Core file-row Trash lifecycle, undo/re-link/malformed nested content, encrypted pages, modal keyboard/focus and matched-viewport visual comparison | Not run | Core stale-write handling and non-empty `QVariantList` normalization are exercised through the real controller and SQLite; post-save file-deletion failure is tested with a controller double. Keep QT-NOTES-041, QT-NOTES-042 and QT-NOTES-087 partial until their remaining native acceptance scenarios in [06-checklist.md](06-checklist.md) are completed. |

### Notes page-history restore recovery (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Builds the focused Notes history restore test. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-history` | Passed: 2 behavior tests (4 QtTest results including setup/cleanup) | One case instantiates production `PageView.qml`; forces the restore save to fail, verifies restored content remains selected, dirty and in error state after the history modal closes, then retries and verifies the same content is saved. It uses a deterministic controller double. The second instantiates production `PageHistoryModal.qml` with a real `SynapseDataController`, diffs two rich HTML paragraphs, and verifies the output contains visible changed text without escaped HTML tags. It does not verify diff formatting, block boundaries or widget-specific rendering. No live history database, Core conflict, encrypted page or empty revision click path is exercised. |
| `/usr/lib/qt6/bin/qmllint --ignore-settings -s apps/desktop-qt/qml/notes/PageHistoryModal.qml apps/desktop-qt/qml/page-view/PageView.qml` | Passed with no diagnostics | Checks the history restore content guard and PageView integration syntax. |
| Stale conflict during restore, empty revision interaction, restore confirmation, keyboard/focus, encrypted history, HTML block/widget boundaries, diff typography and matched-viewport comparison | Not run | Keep QT-NOTES-088/089 partial; React history is read-only while Qt exposes an additional restore action, and React preserves rich formatting inside its diff. |

### Notes history timestamp locale parity (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Rebuilds the focused test binary with the production history modal loaded from source. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-history` | Passed: 2 behavior tests (4 QtTest results including setup/cleanup) | Covers failed history-restore save/retry, rich HTML diff visible-text output, and UTC/date-only timestamps formatted with day + Portuguese abbreviated month + year + local time. The timestamp assertions check structure and local date-only day retention rather than exact abbreviation or alternate timezone behavior; invalid values and visual truncation are not checked. |
| `/usr/lib/qt6/bin/qmllint --ignore-settings -s apps/desktop-qt/qml/notes/PageHistoryModal.qml apps/desktop-qt/qml/page-view/PageView.qml` | Passed with no diagnostics | Checks the history formatter and PageView integration syntax. |
| Same-timezone React/Qt screenshot, invalid timestamp fallback, narrow viewport, exact month abbreviation and stored timestamp preservation | Not run | Keep QT-NOTES-090 partial pending runtime and matched-viewport acceptance. |

### Notes history revision keyboard interaction (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Rebuilt the production-QML keyboard and geometry checks in the focused Notes test binary. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-history` | Passed: 4 behavior tests (8 QtTest results across history and keyboard harnesses, including setup/cleanup) | Mounts production `PageHistoryModal.qml` in a visible `QQuickWindow`; verifies Tab moves from current to older revision, Return selects older, Space selects current, and the selected-row focus border remains visible; Escape emits the close request while a revision has focus; closing returns focus to the supplied opener target; the Qt accessibility interface reports Button and the revision/date name; the close control reports its Button role/name and measures 34×34 with an 18×18 icon. At 360 px, the close stays within the 20 px right margin and the accessible overflow menu retains Diff and Restore actions; keyboard activation of Restore emits the selected older HTML and requests modal close. Tests also cover the 639/640 px count transition and 767/768 px action transition, including no-overlap checks for Diff and Restore with current/older selection. Also covers restore retry, visible-text diff, timestamp, canvas and empty state. Does not verify screen-reader announcements, full desktop input-method behavior or matched-viewport appearance. |
| `/usr/lib/qt6/bin/qmllint --ignore-settings -s apps/desktop-qt/qml/page-view/PageHeaderActionButton.qml apps/desktop-qt/qml/page-view/PageHeader.qml apps/desktop-qt/qml/page-view/PageView.qml apps/desktop-qt/qml/page-view/PageViewModalsHost.qml apps/desktop-qt/qml/notes/NotesEditorModalsHost.qml apps/desktop-qt/qml/notes/PageHistoryModal.qml apps/desktop-qt/qml/notes/PageHistoryFocusManager.qml apps/desktop-qt/qml/notes/PageHistoryRevisionButton.qml` | Passed with no diagnostics | Checks native header actions, focus handoff and history modal production components. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-page-switch` | Passed: 4 behavior tests (8 QtTest results across the two page-switch classes, including setup/cleanup) | Confirms history host integration does not break page-save failure/retry, trash retry or Core conflict navigation. One expected warning reports the test's deliberately failed trash operation. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-page-header-actions` | Passed: 1 behavior test (3 QtTest results including setup/cleanup) | Instantiates production `PageHeaderActionButton.qml`; verifies its accessible Button role/name, Tab focus and Space activation signal. Separate component coverage verifies the header action. The actual production PageView header-to-modal path is covered in the next verification entry. |
| Screen-reader output, real application Tab traversal, matched-viewport focus appearance | Not run | Keep QT-NOTES-092 and QT-NOTES-093 partial until runtime accessibility acceptance. |

### Notes history revision canvas geometry (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Builds the production-QML geometry assertions into the focused Notes test binary. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-history` | Passed: 4 behavior tests (8 QtTest results across the history and keyboard harnesses, including setup/cleanup) | Covers failed restore retry, HTML visible-text diff and timestamp behavior, a mounted `PageHistoryModal.qml` at 1280×900 verifying the centered 672 px inner text column, 16 px `#e4e4e7` body, centered empty state, row insets and type scale, plus keyboard selection, accessibility metadata, Escape and focus entry/return. It does not measure both rail breakpoints or compare rendered pixels. |
| `/usr/lib/qt6/bin/qmllint --ignore-settings -s apps/desktop-qt/qml/notes/PageHistoryModal.qml apps/desktop-qt/qml/page-view/PageView.qml` | Passed with no diagnostics | Checks the production history modal and page-view host syntax. |
| `git diff --check` | Passed | No whitespace errors in the QML, test and audit changes. |
| Matched-viewport React/Qt capture, rail at 288 and 320 px, resized header actions, empty/error states, scroll boundary, keyboard/focus, high DPI and accessibility | Not run | Keep QT-NOTES-091 partial until visible runtime and screenshot acceptance. |


### PageView modal host geometry and production history handoff (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-history` | Passed: 4 behavior tests (8 QtTest results across the history and keyboard harnesses, including setup/cleanup) | A production `PageView.qml` is mounted in a visible 1280×900 `QQuickWindow`. The test verifies `PageViewModalsHost` fills the viewport, opens history by Space on the production header button, loads two revisions, sizes the history modal to 1280×900, focuses the current revision, closes on Escape and returns focus to the same header action. It then opens the production MovePageModal through the same host and verifies it becomes visible with non-zero dimensions. It also retains restore-retry, visible-text diff, timestamp, canvas, keyboard, close-control and responsive-header coverage. The host measurement exposed the previous 0×0 geometry defect. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-page-switch` | Passed: 4 behavior tests (8 QtTest results across page-switch and Core conflict classes, including setup/cleanup) | Confirms the host geometry change does not regress save failure/retry, file-Trash retry after save, or Core conflict navigation. The file-Trash failure warning is expected from the test scenario. |
| `/usr/lib/qt6/bin/qmllint --ignore-settings -s apps/desktop-qt/qml/page-view/PageHeaderActionButton.qml apps/desktop-qt/qml/page-view/PageView.qml apps/desktop-qt/qml/page-view/PageViewModalsHost.qml apps/desktop-qt/qml/notes/PageHistoryModal.qml` | Passed with no diagnostics | Parses the changed production host/action/modal QML. |
| `git diff --check` | Passed | No whitespace issues in the final source and audit edits. |
| Other PageView modal routes, full running-app traversal, screen-reader announcement and matched-viewport React/Qt capture | Not run | Keep QT-NOTES-093/096 partial until those acceptance checks are complete. |


### Encrypted page-history failure handling (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Rebuilt production history modal and keyboard integration checks. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-history` | Passed: 4 behavior tests (8 QtTest results across history and keyboard harnesses, including setup/cleanup) | Injects a revision with `decryption_error=true`; verifies the AlertMessage role and accessible error name, revision body hidden, desktop and overflow Diff/Restore disabled, and guarded restore emits neither content nor modal close. A readable Markdown revision retains Markdown rendering when its older comparison is unreadable, and restore preserves its exact Markdown source. Also covers PageView host/history and MovePageModal sizing, keyboard focus and responsive actions. This synthetic record does not exercise encryption, key rotation, locked-vault transitions or valid empty revisions through the real Core controller. |
| `/usr/lib/qt6/bin/qmllint --ignore-settings -s apps/desktop-qt/qml/notes/PageHistoryModal.qml` | Passed with no diagnostics | Parses the modified history modal QML. |
| `git diff --check` | Passed | No whitespace errors in the current changes. |
| Real encrypted-history decrypt/lock/key recovery, valid empty-history restore, screen-reader announcement and matched-viewport failure state | Not run | Keep QT-NOTES-097 partial until these actual-controller and visual acceptance cases are covered. |


### Page-history presentation decomposition (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-history` | Passed: 4 behavior tests (8 QtTest results across history and keyboard harnesses, including setup/cleanup) | Exercises the decomposed production history QML, including revision focus, responsive header/menu, diff/restore, accessible decryption failure, Markdown fallback, PageView modal host sizing, and MovePageModal sizing. Existing geometry assertions remain green. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-page-switch` | Passed: 4 behavior tests (8 QtTest results across page-switch and Core conflict classes, including setup/cleanup) | Confirms the production PageView and modal-host changes still coexist with save retry, pending file-Trash retry and Core conflict navigation. The intentional file-Trash failure emits the expected warning. |
| `/usr/lib/qt6/bin/qmllint --ignore-settings -s` on PageView header/host and all `PageHistory*.qml` components | Passed with no diagnostics | Parses the new component boundaries and their production caller chain. |
| `wc -l` on page-history QML files | Passed | `PageHistoryModal.qml` 171 lines; `PageHistoryHeader.qml` 160; `PageHistoryRevisionSidebar.qml` 78; `PageHistoryRevisionCanvas.qml` 98. No extracted component exceeds the 300-line target. |
| `git diff --check` | Passed | No whitespace errors after extraction. |
| Same-viewport React/Qt screenshots and screen-reader output | Not run | Extraction preserves current source layout and interaction evidence, but does not establish visual or assistive-technology parity. |


### Page-reference popover geometry and dismissal (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-notes-rich-qml-tests -j2` | Passed | Rebuilds the production QML test harness for the Notes page-reference flow. |
| `QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-notes-rich-qml-tests --suite=page-reference-search` | Passed: 1 behavior test (3 QtTest rows including setup/cleanup) | Loads `NotesRichTextInput.qml` through the production `NotesRichTableHarness.qml`; verifies visible popover geometry, 288×320 upper bounds, debounce, stale request cancellation/rejection, current content-search result, outside-tap dismissal and native caret movement from that same click. It does not use the real Core controller/database or verify save/reopen. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/NotesRichPageReferenceFlow.qml apps/desktop-qt/qml/notes/NotesRichPageReferenceMenu.qml apps/desktop-qt/qml/notes/NotesRichTextInput.qml` | Passed with no diagnostics | Parses the three changed production QML files. |
| `git diff --check` | Passed | Checked the implementation and audit changes before the implementation commit. |
| Matched-viewport React/Qt screenshots, resize/edge placement, screen-reader/focus review, and clicks outside the editor viewport | Not run | Keep QT-NOTES-101 partial; the native click catcher currently covers the editor bounds, while React listens on the full document. |

The same focused `page-reference-search` command was rerun after removing the swallowing `MouseArea`; the existing `NotesRichTextInput` tap handler closes the flow and the click now reaches `TextEdit`. It passed all 3 rows and confirmed `cursorPosition` changes. `qmllint` on `NotesRichPageReferenceFlow.qml`, `NotesRichPageReferenceMenu.qml` and `NotesRichTextInput.qml` passed with no diagnostics. The production harness checks a simple click; drag selection and pointer activity outside the editor viewport remain unverified (QT-NOTES-103).


### Page-deletion event impact accuracy (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Rebuilt the production delete-dialog QtTest harness. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-history` | Passed: 5 behavior tests (9 QtTest rows across history and keyboard harnesses, including setup/cleanup) | The deletion dialog shows two non-expired subtree events with persistent `page_id` links and one active inline-only event. It counts two Core-deletable events, identifies one inline-only reference as remaining in the Agenda, and excludes expired/unrelated records. Also exercises the existing history UI/keyboard checks. It uses a mock controller for the deletion modal and does not perform a real Core delete/restore transaction. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/NotesDeleteDialog.qml apps/desktop-qt/qml/notes/NotesDeleteEventsWarning.qml` | Passed with no diagnostics | Parses the updated production deletion dialog and warning panel. |
| Real Core soft-delete/restore with both linked and inline-only events; React behavior at matched viewport | Not run | Core source confirms only subtree `page_id` links are soft-deleted. Keep QT-NOTES-102 open until a real persistence test and matched visual/copy review are recorded. |


### Notes media picker behavior and empty state (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_media_widget_picker.qml` | Passed: 13 behavior tests (15 QtTest rows including setup/cleanup) | Visible production picker tests cover book-author/title filtering, video title filtering, book author and video duration subtitles, cover-source handling, 56 px rows, no-results state, search focus, backdrop non-dismissal, close action, plus the existing upload, file URL, stale-result and retry flows. Media records are mocks; no Core-backed live data or saved-note round-trip is exercised. |
| `/usr/lib/qt6/bin/qmllint apps/desktop-qt/qml/notes/NotesMediaWidgetPickerModal.qml apps/desktop-qt/qml/notes/NotesMediaWidgetPickerExistingItems.qml` | Passed with no diagnostics | Checks the updated Notes media modal and result-list QML. |
| `git diff --check` | Passed | No whitespace errors in the implementation changes. |
| Same-viewport React/Qt screenshots, live Core media, thumbnail contract, error/loading behavior, and large-catalog responsiveness | Not run | Keep QT-NOTES-104 partial. Core `VideoRecord` has no `thumbnail_url`; React data loading is async while Qt picker getters are synchronous. |
| `wc -l apps/desktop-qt/qml/notes/NotesMediaWidgetPickerModal.qml apps/desktop-qt/qml/notes/NotesMediaWidgetPickerHeader.qml apps/desktop-qt/qml/notes/NotesMediaWidgetPickerSearchField.qml` | Passed: 280 / 57 / 59 lines | The modal coordinator now stays under 300 lines; header and search field each have one cohesive presentation responsibility. |


### Rich-image deletion dialog geometry, copy, and interaction (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-notes-rich-qml-tests -j2` | Passed | Rebuilt the focused rich-image deletion production-QML harness and test-suite entry point. |
| `QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-notes-rich-qml-tests --suite=image-deletion` | Passed: 1 behavior test (3 QtTest rows including setup/cleanup) | Visible `NotesRichTextEditor` test checks 384 px dialog geometry, nonzero height, Portuguese title/prompt/description/actions, initial confirm focus, cancel-button and backdrop dismissal, Escape, Delete/Enter confirmation, canonical image removal, undo, and flush. The harness uses a visible 800×360 viewport; running application DPI and screenshots remain open. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/NotesRichImageDeletion.qml apps/desktop-qt/qml/notes/NotesRichImageActions.qml apps/desktop-qt/qml/notes/NotesRichImageToolbar.qml` | Passed with no diagnostics | Parses the modified modal and its Notes action/toolbar callers. |
| Python `xml.etree.ElementTree.parse` for `synapse_pt_BR.ts` and `synapse_en.ts` | Passed | Both catalogs are valid XML and contain the updated image-delete labels. `lrelease` is unavailable in the current environment, and no generated `.qm` file is present in the checkout/build tree, so generated-catalog loading/packaging is unverified. |
| Matched-viewport screenshot, modal blur/shadow/animation, narrow viewport, focus return/accessibility, locale switching and `.qm` generation | Not run | Keep QT-NOTES-105 partial; the focused harness establishes geometry and behavior but not these visual/runtime gates. |


### Rich editor references, slash search and combined Notes regression pass (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-notes-rich-qml-tests -j2` | Passed | Rebuilt the Notes rich-editor and page-reference QtTest harnesses. |
| `QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-notes-rich-qml-tests` | Passed: 80 QtTest rows, 0 failed, 0 skipped | Combined Notes rich editor, slash menu, page reference, reference search/actions, code, divider, image and deletion harnesses. This is module-focused coverage, not full application or Core-wide verification. |
| Regression test cross-review | Passed | Updated slash-menu expectations to React's substring-in-either-direction matching, verified rich page references as native QTextObjectInterface objects with typed page metadata, used the actual page-reference end position for Backspace, and removed a QSignalSpy configured for a nonexistent signal. Production Notes behavior and React were unchanged. |
| Runtime diagnostics during the combined run | Observed | The failure-path page-preview test intentionally logs its rejected-description `QCRITICAL`; the application Notes harness also emits a QML `Connections` warning from `FilesPreviewOverlay.qml`. The latter was outside this Notes-only change and was not investigated or modified. |
| Matched-viewport visual review, active/deleted page-reference focus and accessibility, and full cursor mapping around nested/adjacent widgets | Not run | Keep related page-reference visual and interaction checklist items open. The passing harnesses do not establish full behavior parity or real Core persistence. |


### Rich-image viewer locale and floating zoom controls (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-notes-rich-qml-tests -j2` | Passed | Rebuilt the production Notes rich-image harness. |
| `QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-notes-rich-qml-tests --suite=image-viewer` | Passed: 1 behavior test (3 QtTest rows including setup/cleanup) | Checks Portuguese view/crop labels, floating zoom-panel width/placement, actual slider click input, wheel zoom bounds, crop selection/cancel, saving state, Core-result handling, metadata retention, and undo in a visible 1000×420 window. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/NotesRichImageViewer.qml apps/desktop-qt/qml/notes/NotesRichImageViewerCanvas.qml apps/desktop-qt/qml/notes/NotesRichImageViewerFlow.qml apps/desktop-qt/qml/notes/NotesRichImageViewerZoomControls.qml` | Passed with no diagnostics | Covers the changed viewer and extracted zoom component. |
| Python `xml.etree.ElementTree.parse` and QML `qsTr`/catalog-context check for both `synapse_pt_BR.ts` and `synapse_en.ts` | Passed | All active viewer, canvas, flow, and zoom-control translation keys exist in the matching QML contexts. |
| `wc -l` for `NotesRichImageViewer.qml` and `NotesRichImageViewerZoomControls.qml` | Passed: 230 / 110 lines | Both focused QML files remain under the project 300-line target. |
| Runtime locale loading, generated `.qm`, matched-viewport screenshots, narrow/high-DPI, focus/accessibility, and React crop-gesture/output comparison | Not run | `lrelease` is unavailable and the build tree has no generated catalog files. Keep QT-NOTES-106 partial. |

### Notes file-upload modal layout and selection (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_media_widget_picker.qml` | Passed: 16 QtTest rows, 0 failures | Production QML suite covers 560 px and 360 px dialog widths, 448/328 px card geometry, black/50 backdrop, title/header, 176 px empty target, full-width footer, selector/search suppression, selected row and filename, upload/cancel labels and disabled state, grouping toggle, Scrap visibility, mode routing, import result metadata, correlation, failures/retry, bundle/separate outputs, add/remove/deduplication, close guard and encoded paths. Uses mocked controller; not actual local chooser, encryption, database or editor persistence. |
| `cmake --build apps/desktop-qt/build --target synapse-notes-rich-qml-tests -j2` | Passed | Build target completes. |
| `apps/desktop-qt/build/synapse-notes-rich-qml-tests` | Could not start test cases | The process aborts before QtTest startup because this environment's GLib settings schema lacks `org.gnome.settings-daemon.plugins.xsettings/antialiasing`. No test result was produced; this is an environment issue and does not replace the passing focused QML picker suite. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/NotesMediaWidgetPickerModal.qml apps/desktop-qt/qml/notes/NotesMediaWidgetPickerHeader.qml apps/desktop-qt/qml/notes/NotesMediaWidgetPickerUploadFooter.qml apps/desktop-qt/qml/notes/NotesLocalUploadSelection.qml apps/desktop-qt/qml/notes/NotesMediaWidgetPickerLocalUpload.qml` | Passed with no diagnostics | Covers upload surface, shared picker routing and selected-file controls. |
| Python `xml.etree.ElementTree.parse` for `synapse_pt_BR.ts` and `synapse_en.ts` | Passed | Both catalogs parse after adding the upload header, selection and footer contexts. Qt `lrelease`/generated `.qm` runtime could not be checked in this environment. |
| `wc -l` for upload picker components | Passed: modal 294, footer 81, file selection 191, header 58 | Each remains under the repository's 300-line target. |
| React/Qt behavior and visual second pass | Partial | Confirmed React's Notes mount, 448 px width cap, multiple file workflow, grouping default, copy and selected file-size display. Qt is isolated to local Core import and has no verified Notes Drive status/upload or per-byte progress API. The Qt row has no selected size. Same-viewport screenshots, blur/shadow/animation, focus/accessibility, runtime `.qm`, native chooser/drag interaction, real encryption, persistence and cross-client round-trip remain open under QT-NOTES-107. |

### Notes calendar-event modal labels, submit and responsive shell (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_calendar_event_form.qml` | Passed: 7 QtTest rows, 0 failures | Checks the exact title/type labels and title placeholder, tomorrow/14:00 contract values as applicable, type/reminder defaults, title focus, Return submission, Cancel, Core-linked page/title output, retryable Core failure, and responsive 448/328 px outer-card widths with a calendar icon. Uses a mock controller; it is not actual calendar persistence. |
| Habit, question and focus setup modal suites | Passed: 16 QtTest rows total | `tst_notes_habit_picker.qml` (7), `tst_notes_question_picker.qml` (6) and `tst_notes_focus_setup_modal.qml` (3) revalidate the shared setup-header extraction and adjacent Notes flows. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml` on event form, extracted fields, date/time fields, setup modal/header, and the focused test | Passed with no diagnostics | Checks the touched QML components and harness. |
| Python `xml.etree.ElementTree.parse` and component-context check on `synapse_pt_BR.ts` and `synapse_en.ts` | Passed | Both catalogs parse and contain the new title/type field and shared setup-header source contexts. `lrelease` and runtime `.qm` loading remain unavailable. |
| `wc -l` for setup modal/event form components | Passed: setup modal 241, setup header 92, event form 282, title field 35, type field 47 | Each stays under the project 300-line target. |
| Same-viewport modal and live event acceptance | Not run | Blur/shadow/animation, header/body/footer separators, native date/time picker parity, timezone conversion, focus return/accessibility, narrow-height scrolling, runtime `.qm`, live Core persistence, save/reopen, and React round-trip remain open under QT-NOTES-108; existing event data/default gates QT-NOTES-017/018/064 also remain partial. |

### Notes linked file/media action dialogs (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_linked_item_actions.qml` | Passed: 8 QtTest rows, 0 failures | Covers file-specific prompt and fallback content, 400 px maximum based on overlay geometry, narrow viewport bounds, quick preview/current/new file dispatch, current/new video/book dispatch, file-only preview visibility, linked kind/ID/title retention and Escape. The harness checks emitted requests, not actual destination module results. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/NotesLinkedItemActionDialog.qml apps/desktop-qt/tests/notes/qml/tst_notes_linked_item_actions.qml` | Passed with no diagnostics | Includes the test's bound component behavior and the changed production dialog. |
| Python `xml.etree.ElementTree.parse` plus action-dialog context check on both Qt catalogs | Passed | Portuguese and English catalogs parse and contain 17 action-dialog strings, including the file-specific prompt. Generated `.qm` runtime remains unverified. |
| React/Qt source-level second pass | Partial | Confirmed matching action types, labels, icon family, title and body dimensions, copy/fallback and responsive width cap. Qt still does not establish React's backdrop blur/shadow/animation, matched screenshots, screen-reader/focus-return parity, or real route and restoration outcomes. Keep QT-NOTES-109 partial. |

### Notes block-scoped AI apply routing audit (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| React/Qt source trace from block AI triggers to the apply callback | Source trace passed; behavior fix partial | React's four node-view integrations provide block-aware `onApplyReplacement` handlers. Qt now captures page ID, block ID and source snapshot, passes a callback through nested toggle/column/collection hosts, and updates the matching block. Note-level `/ia` and rich-text selection remain on the generic route. The UI and several proposal behaviors remain different. |
| `tst_notes_block_ai_operations.qml` | Passed: 11 QtTest rows, 0 failures | Exercises code fences/language including surrounding explanation, escaped text, Markdown heading/list/inline formatting, generated HTML allow-listing for active content/attributes/links, title and attribute preservation, exact target-local search/replace, stale search rejection, and unsupported widget rejection. Pure transform coverage; no persistence. |
| `tst_notes_block_ai_proposal.qml` | Passed: 4 QtTest rows, 0 failures | Verifies reply-specific search/replace count and resulting diff content, stale search rejection, toggle-title extraction and copyable body parsing. The controller used for rendered diffs is tested in the modal harness. |
| `tst_notes_block_ai_apply.qml` | Passed: 10 QtTest rows, 0 failures | Exercises only-target update and neighbor preservation, stable ID, callback dispatch from the code toolbar, nested code callback through a toggle, type eligibility, moved target, stale block/page rejection, source attribute preservation and insertion inside code. The controller is mocked; live persistence/save/undo/reopen are not verified. |
| `tst_notes_ai_prompt_modal_apply.qml` | Passed: 14 QtTest rows, 0 failures | Covers target callback, canonical/raw route, stale callback staying open, generic note-level insertion remaining separate, Escape/late-response invalidation, close/retarget XHR abort, anchored popup viewport clamping, in-memory conversation restoration/clear, separate user/assistant bubbles with first-turn context hidden and assistant Markdown formatted, auto-scroll, per-message copy/diff/apply/insert using an older reply, and React-like surgical-diff heading/count with a 220 px viewer cap. The Apply action assertions verify React's code label, 4 px radius and base violet color; the surgical case verifies the exact label casing and base emerald color. A component assertion verifies the Diff action selects the dedicated `file-diff` glyph. The popup width transitions between 370/420 px over 150 ms, matching React; the test waits for both target widths. Pointer hover appearance, clipboard output and cross-process persistence are not verified. |
| `tst_notes_block_ai_session.qml` | Passed: 5 QtTest rows, 0 failures | Verifies save/restore through the config contract after controller recreation, separation when the active database path changes, clear persistence, and filtering of malformed stored messages. Uses mock controllers; it does not exercise the real SQLite config table or app restart. |
| `NotesAiConversation.qml`, `NotesAiMessageActions.qml` and `NotesBlockAiProposal.js` extractions | Source re-review passed | The modal owns request/session lifecycle; the conversation component owns message rendering and scrolling; the atomic action component owns per-response controls; the proposal helper owns target-aware copy/diff/apply parsing separately from HTML/Markdown transforms. Production components are covered by the modal and proposal harnesses. |
| React `AiPromptModal.tsx` per-message diff/action crosswalk | Source re-review passed; visual acceptance partial | Qt now matches the Apply → Diff → Insert → Copy action order and `View Text` label, adds check/sparkles, file, plus and copy icon affordances, displays the comparison heading and surgical-change count, uses a selectable monospace diff area capped at 220 px and expands the anchored popup to 420 px while a reply diff is open. Exact Diff icon/stroke, hover/disabled states, pixel-level colors and same-viewport screenshots remain open. |
| `tst_notes_block_ai_prompt.qml` | Passed: 6 QtTest rows, 0 failures | Verifies code context includes language and fenced source, rich block HTML becomes readable text with title, and code/callout/toggle/toggle-callout system prompts apply target-specific constraints and surgical-edit guidance. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_block_ai_apply.qml` | Passed: 13 QtTest rows, 0 failures | Covers stable block-target callbacks and nested toggle forwarding. Code and toggle AI controls expose `Qt.TabFocus` and the accessible name; toggle focus reveals its hover toolbar. Toggle cases also prove `aiButtonItem` resolves to the assistant ToolButton, clicking sends the title/body context, toggle and blockquote-toggle actions create stable block-scoped apply handlers, both replace the correct target, and toggle-callout replacement preserves its block type and accent color. These component tests do not substitute for production `PageView`/SQLite routes for both toggle targets. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-ai-block-apply` | Passed: 3 QtTest results including setup/cleanup | Mounts production `PageView.qml` with a real temporary SQLite `SynapseDataController`. It applies proposals to a code block and a colored blockquote inside a column through the real modal and nested `BlockListEditor`, verifies each source target changed while its neighbor remained intact, waits for auto-save, and switches away/back to reload the saved code change. It also focuses the callout AI button through the native focus API and confirms the hover toolbar becomes visible. Toggle/blockquote-toggle apply routes and active-generation removal/page-switch behavior remain unverified. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-ai-session` | Passed: 3 QtTest results including setup/cleanup | Uses a temporary real SQLite database and production `NotesBlockAiSession.js` with `SynapseDataController`: saves a user/assistant conversation, destroys the controller, reopens the same database through a new controller, restores both messages, clears the session and confirms the config key no longer contains it. This validates controller/database reopen; application-process restart and cross-client visibility remain unverified. |
| Focused `qmllint` on `NotesAiPromptModal.qml`, `NotesAiConversation.qml`, block AI helpers, and proposal/modal harnesses | Passed with no diagnostics | Covers the extracted conversation component, target-aware proposal analysis, transformation helpers and production modal wiring. This is a focused Notes AI lint run, not a full Notes module lint. |
| Parse `synapse_en.ts` and `synapse_pt_BR.ts` with Python `xml.etree.ElementTree` | Passed | Confirms both updated catalogs remain well-formed; it does not compile `.qm` files or verify runtime lookup. |
| `git diff --check` | Passed | No whitespace errors in the current AI action, test and documentation changes. |
| Same-viewport React/Qt block assistant capture | Not run | Qt now uses a viewport-clamped anchored popup with 370/420 px widths, separate conversation bubbles, basic assistant Markdown, bottom input and block actions, but screenshot comparison, backdrop/shadow/hover, focus/accessibility, narrow-height resizing and per-message action rendering remain unverified. |
| `qmllint` on `NotesAiPromptModal.qml`, AI apply/session helpers and focused AI test harnesses | Passed with no diagnostics | Lint on the surrounding legacy Notes components still reports existing warnings; no module-wide lint-clean claim is made. |

### Notes production toggle AI targets (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Reconfigured and linked the native test executable after adding the dedicated production-toggle target test. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-ai-toggle-targets` | Passed: 3 QtTest results including setup/cleanup | Mounts production `PageView.qml` with the actual AI modal, nested block list and a temporary SQLite controller. Applies AI proposals through the simple-toggle and colored blockquote-toggle toolbar actions; verifies title/body updates, auto-save, preservation of the other toggle, and retention of the callout color. It also tests pending toggle proposals across page navigation and target removal, including SQLite state after each late response. This closes live production apply-route and stale-generation coverage for the four supported block kinds, while app-process restart remains open. |
| Checklist and QT-NOTES-110 cross-review | Passed, partial status retained | Updated the active audit to mark both new production routes as evidenced and keep stale-generation cancellation, process restart, cross-client visibility, broad nested-container runtime coverage, and visual/interaction acceptance open. |
| `git diff --check` | Passed | No whitespace errors in the test and audit updates. |

### Notes AI follow-up history contract (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_block_ai_prompt.qml -import apps/desktop-qt/qml` | Passed: 6 QtTest rows, 0 failures | Covers role/content to role/messageText mapping, order preservation, unsupported-role filtering, and existing block context/system prompt rules. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_ai_prompt_modal_apply.qml -import apps/desktop-qt/qml` | Passed: 13 QtTest rows, 0 failures | The production modal `runPrompt()` path receives a stub client. It verifies both prior user and assistant messages are passed in the native adapter shape, the next response is appended, and the existing visible/persisted messages retain `{role, content}`. No live provider or API key is used. |
| Focused `qmllint` on `NotesAiPromptModal.qml`, `NotesBlockAiPrompt.js`, and both prompt harnesses | Passed with no diagnostics | Confirms the Notes-only history adapter and modal test seam parse cleanly. |
| Second-pass `AiClient.qml` contract review | Passed | Confirmed the native adapter reads `messageText`/`text` and maps `assistant` to provider role `model`; the Notes boundary now supplies those fields. |
| `git diff --check` | Passed | No whitespace errors in the implementation, tests or audit updates. |

### Notes AI request cancellation on close and retarget (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_ai_prompt_modal_apply.qml -import apps/desktop-qt/qml` | Passed: 15 QtTest rows, 0 failures | A stub request is aborted on close, target replacement and conversation clear; replacement clears `isGenerating`, and late callbacks cannot change the active conversation or restore cleared messages. |
| Focused `qmllint` on `NotesAiPromptModal.qml` and `tst_notes_ai_prompt_modal_apply.qml` | Passed with no diagnostics | Covers the request handle/abort path and the QML regression harness. |
| `git diff --check` | Passed | No whitespace errors in the cancellation fix and audit update. |
| Production PageView block removal/page switch during a pending provider request | Passed for both cases | The focused suite switches to another SQLite-backed page and separately deletes the source toggle while requests are pending, then delivers each delayed response. Neither page is mutated by stale output, the deleted toggle does not return, and its adjacent callout remains saved. |

### Notes production PageView switch during a pending block AI request (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j2` | Passed | Builds the native production `PageView` test and its request-client harness. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-ai-toggle-targets` | Passed: 3 QtTest results including setup/cleanup | After verifying simple and callout-toggle apply routes, opens a pending AI request from the real toggle, switches the production `PageView` to another SQLite-backed page, and delivers the delayed proposal. It then returns to the source, opens a second pending request, removes the exact toggle through production `BlockListEditor.requestBlockDeletion()`, waits for SQLite auto-save, and delivers another late proposal. Navigation leaves both pages unchanged; removal keeps the toggle deleted and preserves its neighbor. A still-open stale modal rejects Apply; a closed/destroyed modal has aborted its request. The companion harness does not contact Gemini. |
| `tst_notes_ai_prompt_modal_apply.qml` | Passed: 15 QtTest rows, 0 failures | Separately verifies request abort and late-callback behavior on close, target replacement, conversation clear and modal destruction. |
| Focused `qmllint` on `NotesAiPromptModal.qml` and request harnesses | Passed with no diagnostics | Confirms the modal destruction cleanup and both stub harnesses parse. |
| `git diff --check` | Passed | No whitespace errors in the production integration and audit updates. |

### Notes block AI Markdown and GFM compatibility (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j4` | Passed | Configured and linked the new dedicated Notes AI Markdown test executable entry. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-ai-markdown` | Passed: 3 behavior tests, 0 failures (5 QtTest rows including setup/cleanup) | Verifies CommonMark soft breaks, inline code/emphasis, inline and literal HTTP(S)/www/email links, unsafe scheme rejection, raw checkbox exclusion, GFM pipe tables, checked/unchecked/mixed unordered task fixtures, checked/unchecked ordered-task glyphs in conversation-only rendering, ordinary ordered-list fallback in saved block HTML, image alt fallback, and Core NoteBlock parse/serialize retention of unordered task state and table markup. Does not establish exact checkbox-glyph visuals, numbered task-state retention in applied block HTML, full GFM/CommonMark, rendered images, nested-list/quote equivalence, or DOMPurify-equivalent sanitization. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-ai-toggle-targets` | Passed: 1 production PageView behavior row, 0 failures (3 QtTest rows including setup/cleanup) | Rechecks the four live target kinds and pending-response/page-switch/source-removal behavior after the Markdown helper extraction. Uses a temporary SQLite database and stubbed provider; no live Gemini call. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_block_ai_operations.qml -import apps/desktop-qt/qml` | Passed: 9 behavior rows, 0 failures (11 QtTest rows including setup/cleanup) | Rechecks the established code-fence, target replacement, HTML allow-list, Markdown formatting, search/replace and unsupported-target transformations after extracting the Markdown helper. |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_ai_prompt_modal_apply.qml` | Passed: 13 behavior tests, 0 failures (15 QtTest rows including setup/cleanup) | Rechecks conversation rendering and modal actions after the assistant display converter change. Its stale controller stub now provides the Core SEARCH/REPLACE response contract; the suite verifies diff parsing and prior modal behavior. |
| `/usr/lib/qt6/bin/qmllint -I apps/desktop-qt/qml apps/desktop-qt/qml/notes/NotesBlockAiMarkdown.js apps/desktop-qt/qml/notes/NotesBlockAiOperations.js apps/desktop-qt/tests/notes/qml/NotesBlockAiMarkdownHarness.qml` | Passed with no diagnostics | Focused lint for the extracted converter, its operations adapter and test harness. |
| `git diff --check` | Passed | No whitespace errors. |
| Matched-viewport Markdown/editor visual comparison and sanitizer security review | Not run | The Qt allow-list is regex-based and remains distinct from React DOMPurify. Rendered images, numbered task-state retention in applied block HTML, nested structures, reference links and editor-schema edge cases remain open under QT-NOTES-110. |


### Notes block-AI search/replace Core delegation (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cargo build -p synapse-bridge-qt --release` | Passed | Rebuilt the release bridge selected by the Desktop Qt CMake configuration. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j4` | Passed | Relinked the native test binary against the rebuilt release bridge. |
| `QT_QPA_PLATFORM=offscreen apps/desktop-qt/build/synapse-desktop-tests --suite=notes-ai-markdown` | Passed: 3 behavior rows, 0 failures (5 QtTest rows including setup/cleanup) | Calls the real `SynapseDataController.applyNoteSearchReplace` and verifies exact, CRLF, trimmed-edge whitespace preservation, missing-patch rejection, parsedCount and replacedCount values, no-patch passthrough, whitespace/overlapping SEARCH markers, CRLF delimiter capture, malformed-opening recovery, multiple blocks and JavaScript replacement tokens, alongside existing Markdown/Core serialization tests. |
| `QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_block_ai_operations.qml` | Passed: 9 behavior rows (11 QtTest rows including setup/cleanup) | QML operation tests use a controller response stub; Core's matching behavior is separately exercised through the native controller test. |
| `QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_block_ai_proposal.qml` | Passed: 4 behavior rows (6 QtTest rows including setup/cleanup) | Exercises valid/stale source-aware proposal state, Core-derived flexible marker counts, paragraph-preserving rich-text search, and exactly one controller call per proposal using mocked controller results. |
| Focused `qmllint` on `NotesAiConversation.qml`, `NotesBlockAiApply.js`, `NotesBlockAiOperations.js`, and `NotesBlockAiProposal.js` | Passed with no diagnostics | QML and imported JS syntax checks only; does not establish visual parity. |
| `rustfmt --check --edition 2021 core/synapse-core/src/domain/notes/diff_engine.rs core/synapse-core/src/domain/notes/search_replace.rs bridges/bridge-qt/src/domain/notes/table_ast_ffi.rs`; `rustfmt --check --edition 2021 --config skip_children=true core/synapse-core/src/domain/notes/mod.rs`; `git diff --check` | Passed | Checks the changed Core/bridge files, module exports and patch whitespace. A broader crate-level `cargo fmt --check` surfaced existing formatting differences in unrelated files and was not used to reformat them. |
| `cargo test -p synapse-core search_replace -- --nocapture` | Passed: 6 focused Core unit tests | The parser/application now live in atomic `search_replace.rs` (under 300 lines), separate from `diff_engine.rs`. Covers marker whitespace, optional line breaks/CRLF captures, malformed-opening recovery, overlapping starts, multiple patches, representative JavaScript replacement tokens and existing diff behavior. This is a reviewed compatibility subset, not an automated run of the React function. |
| `cargo test -p synapse-core diff_engine -- --nocapture` | Passed: 1 focused diff test | Confirms the split `diff_engine.rs` file retains its ordered word-diff coverage. |
| Shared React/Core fixture differential | Passed: 12 named cases and 28 Unicode whitespace probes | `node --experimental-strip-types audits/desktop-qt-parity/notes/scripts/notes_search_replace_react_fixtures.mjs` and `cargo test -p synapse-core --test notes_search_replace_parity` passed. Fixtures cover React's literal marker precheck, regex marker whitespace after that precheck, U+0085 exclusion, truncation, overlapping starts, CRLF capture, BOM/NBSP edge trim, empty search, sequential repeated matches, all four JavaScript replacement tokens (`$$`, `$&`, dollar-backtick prefix, `$'` suffix), and exact not-found error copy. Additional probes cover all 25 ECMAScript trim-whitespace code points and U+0085/U+180E/U+200B exclusions. This found/fixed Core's over-acceptance of noncanonical markers and JavaScript trim mismatches. More exhaustive delimiter and CRLF combinations remain open; see QT-NOTES-110. |

### Notes help and shortcut guide (2026-11-27)

| Check | Result | Scope and limits |
| --- | --- | --- |
| `GSETTINGS_BACKEND=memory QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input apps/desktop-qt/tests/notes/qml/tst_notes_shortcuts.qml` | Passed: 6 QtTest rows, 0 failures (4 behavior tests plus setup/cleanup) | Verifies Ctrl/Cmd formatting and spoiler actions, shortcut blocking under an editor modal, guide close behavior, current Editing/Pages/Shortcuts text, and absence of removed source/preview modes and Ctrl/Cmd+E from each section. The save shortcut is checked against the live component; menu keys and formatting are checked against visible guide content. |
| `/usr/lib/qt6/bin/qmllint apps/desktop-qt/qml/notes/NotesHelpDialog.qml apps/desktop-qt/qml/notes/NotesEditorShortcuts.qml apps/desktop-qt/tests/notes/qml/tst_notes_shortcuts.qml` | Passed with no diagnostics | Parses the guide, shortcut component and focused test. Does not verify localized `.qm` runtime loading or visual parity. |
| `git diff --check` | Passed | No whitespace errors in the focused guide/test/audit changes. |
