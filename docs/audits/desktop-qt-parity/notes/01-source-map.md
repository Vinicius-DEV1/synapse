# Caderno Source Map

## Canonical user-facing implementation

| Concern | React Web reference | Desktop Qt target | Shared Core / bridge |
| --- | --- | --- | --- |
| Editor composition | `apps/web-react/src/components/Editor.tsx` | `apps/desktop-qt/qml/notes/Editor.qml`, `BlockListEditor.qml`, `BlockDelegateRouter.qml` | `core/synapse-core/src/domain/notes/block_ast/` |
| Rich text lifecycle | `apps/web-react/src/components/notes/hooks/useEditorSync.ts`, `useEditorSave.ts`, `useEditorExtensions.ts` | `apps/desktop-qt/qml/notes/NotesRichTextEditor.qml`, `NotesRichTextInput.qml`, `NotesRichTextCommands.qml` | `bridges/bridge-qt/src/domain/notes/table_ast_ffi.rs` and typed Notes bridge exports |
| Slash commands | `apps/web-react/src/components/notes/hooks/useSlashCommand.ts`, `components/SlashMenu.tsx` | `NotesRichSlashCommandMenu.qml`, `NotesSlashCommandIcon.qml`, `NotesRichTextInput.qml`, `NotesSlashCommandActions.js`, `NotesSlashCommandArguments.js`, `NotesHtmlEscaping.js`, setup/media modal hosts | Core for canonical block serialization and equal column widths; Qt-only alias extraction/HTML escaping stay in the presentation adapter |
| Extension schemas and node views | `apps/web-react/src/components/editor-extensions/` | Native components in `apps/desktop-qt/qml/notes/` and `qml/editor-extensions/` | `block_ast/`, `html_normalizer/`, `table_schema/`, `link_index.rs`, `mermaid_svg.rs` |
| Editor toolbar and block selection | `apps/web-react/src/components/notes/components/EditorBubbleMenus.tsx`, `EditorBlockHandleHost.tsx`, `BlockHandle.tsx` | `NotesSelectionBubbleToolbar.qml`, `NotesBlockHandle.qml`, `NotesFormattingToolbar.qml` | Shared text normalization and AST operations where appropriate |
| Table editor | `apps/web-react/src/components/notes/components/table/` and `hooks/useTableFilter.ts` | `NotesTableExcelGrips.qml`, `NotesRichTableEditorActions.qml`, `components/table/` | `table_schema/` and `table_ast_ffi.rs` |
| Page view and header | `apps/web-react/src/components/page-view/PageView.tsx`, `PageHeader.tsx`, `PageCover.tsx`, `PageUnlockForm.tsx` | `apps/desktop-qt/qml/page-view/PageView.qml`, `PageHeader.qml`, `PageCover.qml`, `PageUnlockForm.qml` | Notes page/content and hierarchy APIs through Core |
| Page tree and sub-pages | `apps/web-react/src/components/layout/sidebar/`, `components/notes/components/SubPageGrid.tsx` | `apps/desktop-qt/qml/layout/AppSidebarPageTree.qml`, `qml/notes/components/SubPageGrid.qml` | Core Notes hierarchy repository |
| Widget setup and modal routing | `apps/web-react/src/components/notes/components/EditorModalHost.tsx`, `useEditorModals.ts` | `NotesEditorModalsHost.qml`, `NotesSetupWidgetsModal.qml`, `NotesMediaWidgetPickerModal.qml` | Domain-specific calls through the typed bridge |
| Linked calendar event widget | `apps/web-react/src/components/editor-extensions/CalendarEventWidgetNodeView.tsx`, `calendar/CalendarEventPopover.tsx` | `CalendarEventWidget.qml`, `CalendarEventWidgetState.qml`, `CalendarEventWidgetPopover.qml`, event routing through `BlockListEditor.qml` and `PageView.qml` | `CalendarRepository::get_event`, Qt event-by-ID bridge/controller, and calendar mutation signal |
| History and diff | `apps/web-react/src/components/modals/PageHistoryModal.tsx` and Notes history service | `PageHistoryModal.qml` | `history.rs`, `diff_engine.rs` |
| Page storage and encryption | React page fetch/save API and Tauri adapter | Qt `PageView.qml` save lifecycle and `notes_controller.cpp` | Notes repository and encryption APIs in Core/bridge |

## Qt Notes structure in this worktree

- `qml/notes/`: editor, native block widgets, contextual tools, media, and history.
- `qml/notes/components/table/`: table overlays, toolbar, and filter helpers.
- `qml/page-view/`: page shell, header, cover, unlock form, and page-specific UI.
- `qml/editor-extensions/`: native extension-like presentation components.
- `qml/modals/`: modal presentation elements.
- `src/controllers/notes/`: thin UI orchestration and text-document adapters.
- `bridges/bridge-qt/src/domain/notes/`: typed FFI adapters.
- `core/synapse-core/src/domain/notes/`: canonical parser, serializer, normalization, tables, hierarchy, history, links, page persistence, and other shared Notes rules.

The old flat `qml/notes/` names are still present alongside new subdirectories. Do not move files solely to make a tree look symmetric: keep stable public QML types while splitting large files into focused components and updating imports and `qmldir` together.

## Core boundary

The following behavior must remain in `synapse-core` when shared by clients: block schema and normalization, lossless HTML parsing/serialization, table schema/filter calculations and structural edits, page hierarchy validation, history/diff calculations, link canonicalization, and persistence. Qt controllers may translate Qt document selections and signals into typed Core calls; they must not build SQL or reimplement domain rules.

QTextDocument geometry, native clipboard/file dialogs, Qt focus behavior, and QML rendering are platform presentation responsibilities. They should not be forced into Core merely to share UI code.

## Mapping and naming goals

- Keep `Editor` / `Editor.qml`, `PageView` / `PageView.qml`, `PageHeader` / `PageHeader.qml`, and similarly named extensions aligned where a direct equivalent exists.
- Preserve module-local names and APIs unless a rename removes a demonstrated source of confusion.
- Keep UI-only helpers next to their owning feature; keep reusable domain rules in Core; keep bridge files split by contract rather than growing a single Notes FFI monolith.
- React may receive naming/organization changes only if layout, behavior, and its public user experience remain unchanged.
