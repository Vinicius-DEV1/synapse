# Notes Modal and Popover Crosswalk

**Scope:** Modal and popover entry points owned by the React Notes editor and their Desktop Qt equivalents. This audit does not review the standalone Files, Focus, Habits, Calendar, Library, Video, or Questions modules.

**Status:** Source crosswalk in progress. Qt contains several native equivalents that are hosted under different names or consolidated into Notes setup/picker surfaces. The existence of an equivalent does not establish visual or interaction parity. All runtime and matched-viewport checks remain open unless explicitly recorded below.

## React editor modal host

React Notes mounts these editor-owned modal components from `apps/web-react/src/components/notes/components/EditorModalHost.tsx`:

| React surface | Notes entry point | Qt surface found | Source comparison | Status / next evidence |
| --- | --- | --- | --- | --- |
| `ImageViewerModal` | Activate/double-click a rich image | `NotesRichImageViewer` via `NotesRichImageViewerFlow` | Qt has full-canvas view, zoom, crop selection, cancel/save, async Core crop, stale-target validation, and error feedback. Its native interaction model differs from `react-easy-crop`; compare crop handles, zoom, toolbar geometry, focus and error states. | Partial; same-viewport and crop round-trip open |
| `ImageDeleteModal` | Delete a selected rich image | `NotesRichImageDeletion` | Qt has a focused confirmation dialog, Escape/cancel, keyboard confirmation, page/image identity checks, undo-friendly document removal and autosave scheduling. React directly deletes at the captured ProseMirror node/position. | Partial; verify keyboard propagation, focus restoration, undo and stale-target cases |
| `SetupModal` | Slash command `/foco` | `NotesSetupWidgetsModal` (`foco`) | Qt uses a combined native setup/picker surface and applies focus defaults through the Notes action. This is not a 1:1 dialog yet. | Partial; compare initial values, validation, cancellation, timer action, layout and keyboard path |
| `AlarmSetupModal` | Slash command `/alarme` | `NotesSetupWidgetsModal` (`alarme`) | Qt combines create/link behavior in its setup surface; time and label constraints have source fixes. Compare exact controls, default time, labels, validation timing and saved alarm state. | Partial; runtime and visual check open |
| `FileUploadModal` | Slash command `/upload`, `/file-upload`, local drop | `NotesMediaWidgetPickerModal` (`documento`) | Qt picker includes native file selection/import paths and emits file widget HTML; React supports upload completion, link mode, multi-file selection and optional grouping. Confirm every React path and group behavior against Qt. | Partial; upload/link/multi-file/error/cancel comparison open |
| `FileSelectModal` | Slash command `/file` | `NotesMediaWidgetPickerModal` (`documento`) | Qt exposes existing local file selection as part of its combined picker. React inserts the selected file as a linked file widget. | Partial; compare list filtering, empty/error states, metadata, focus and insertion position |
| `CalendarEventModal` | Slash command `/evento` | `NotesSetupWidgetsModal` (`evento`) → `NotesCalendarEventForm` | Qt has a native linked-event form and source fixes for defaults, validation and Core IDs. React mounts a dedicated modal. | Partial; compare all fields, date/time/timezone, reminder defaults, page binding, validation, size and focus |
| `HabitSelectModal` | Slash command `/habito` | `NotesSetupWidgetsModal` (`habito`) | Qt combines existing-habit selection and setup behavior. React has a dedicated searchable selection modal. | Partial; compare query prefill, search, empty/loading/error, selection, create-vs-link behavior and insertion |
| `MediaSelectModal` | Slash command `/video` or `/livro` | `NotesMediaWidgetPickerModal` (`video` / `livro`) | Qt combines media selection and other widget types. | Partial; compare type filtering, search, empty/error states, metadata and insertion position |
| `MediaActionModal` | Activate a media widget | `NotesLinkedItemActionDialog` launched by `MediaWidget` | Qt now shows a centered dialog with current/new tab choices and keeps the media type, ID and title through the Notes host. The application routes books to Library and videos to Video; video tab state now retains/restores its linked ID. | Source fix applied; confirm actual reader/player opening, tab switching/restoration, error feedback, and matched-viewport appearance |
| `FileActionModal` | Activate a file widget | `NotesLinkedItemActionDialog` launched by `FileAttachmentWidget` | Qt now offers quick preview, full reader in current tab, and full reader in a new tab. Quick preview opens the existing protected preview in a new Files tab so the note is not replaced; React keeps the preview over the current note. A source flag differentiates direct file widgets from bundle-item previews so bundle behavior remains on its existing path. | Partial; confirm file-type routes, missing IDs, preview completion, tab restoration, nested editor focus, and matched-viewport appearance; compare React overlay against native Files-tab preview |
| `QuestionCreateModal` | Slash command `/question` | `NotesSetupWidgetsModal` (`question`) | Qt uses a combined native setup surface; React creates a battery title and inserts a `questionBlock` with the returned battery ID. | Partial; compare title validation, persisted ID/linking, error recovery, cancellation and insertion position |
| `PageSearchMenu` (popover) | `[[` / page-link slash flow | `NotesLinkDialog` and page-reference flow | Qt uses native link dialogs and inline reference objects rather than React's positioned search menu. | Partial; compare query filtering, create/link modes, placement, keyboard navigation, focus and reference serialization |

## Surfaces outside the central React host

Some Notes overlays are owned by extension/node views rather than `EditorModalHost`. Do not count them as missing merely because they are absent from that file.

| React Notes surface | Qt counterpart | Notes |
| --- | --- | --- |
| Document bundle manager / file selection / item removal dialogs | `DocumentBundleModal`, `DocumentBundleManagerDialog`, `DocumentBundleItemRemovalDialog`, and `DocumentBundleWidgetDialogs` | These are widget-owned flows. Their React/Qt operations are tracked in [09-document-bundle-crosswalk.md](09-document-bundle-crosswalk.md). |
| File missing/delete confirmations | React file widget confirmation state | Qt has `FileAttachmentMissingDialog` and `FileAttachmentDeleteDialog`; tracked in [10-file-widget-crosswalk.md](10-file-widget-crosswalk.md). |
| Page history | React Notes page history modal | Qt `PageHistoryModal` is hosted by `NotesEditorModalsHost.qml`; history and restore acceptance remains open. |
| YouTube watch/playlist/summary and Mermaid fullscreen | React extension renderers and related editor flows | Qt loaders exist in `NotesEditorModalsHost.qml`; compare sizing, loading/error/close lifecycle and focus separately. |
| Notes help, AI prompt, setup widgets, media picker, page reference preview and delete note | Notes-level React flows / help components | Qt direct components are present in `NotesEditorModalsHost.qml`; compare each entry point, content, viewport, keyboard, stacking and save/error states. |
| Slash command menu | React `notes/components/SlashMenu.tsx` | Qt `NotesRichSlashCommandMenu.qml` and slash argument/action helpers | Compare command catalog, filtering, selected row, keyboard navigation, placement/clamping, argument previews, nested editor routing and dismissal. |
| Text selection bubble menu | React `EditorBubbleMenus.tsx` and extension bubble menus | Qt `NotesFormattingToolbar.qml`, `NotesLinkOptionsMenu.qml`, and rich-image action toolbar | Compare show/hide thresholds, selection preservation, toolbar placement, formatting actions, nested editor behavior, keyboard focus and dismiss-on-selection-change. |
| Table color/type popovers | React `TableColorPopover.tsx` and `TableColumnTypePopover.tsx` | Qt `NotesTableColumnTypePopover.qml` plus table color controls in Notes table toolbar | Compare exact palette/type options, selected state, anchor/flip/clamp, Escape/outside click, accessible names and save/undo effects. |
| Calendar event widget actions | React `CalendarEventPopover.tsx` and `CalendarEventDeleteModal.tsx` | Qt `CalendarEventWidgetPopover.qml` and native confirmation in the event widget | Compare modal-vs-anchored behavior, fields, date/time, reminder/color controls, recurrence/delete rules, stacking, validation and persisted outcomes. |
| Link preview actions and details | React `LinkMoreOptionsMenu`, `LinkInfoModal`, `LinkDuplicatesModal`, notes/color dialogs | Qt `NotesLinkPreviewActionMenu.qml`, `NotesLinkInfoDialog.qml`, `NotesLinkNotesDialog.qml`, `NotesLinkColorDialog.qml`, and `NotesLinkConfirmDialog.qml` | Compare every open trigger, safe URL/error states, duplicate handling, note/color edits, confirmation copy, action order, anchoring and keyboard/focus behavior. |
| Question block and quiz overlays | React question block delete/create/editor and sequential quiz confirmation/focus surfaces | Qt `QuestionBlock.qml`, `QuizSequentialFocusModal.qml`, `QuizResultsModal.qml` and Notes setup modal | Keep the entry point restricted to question widgets inside Notes; compare create/delete confirmation, battery identity, sequential session states, completion, error, exit and focus restoration. |
| Page hierarchy, import/export, floating page | React `MovePageModal`, `RenamePageModal`, `FloatingPageModal`, page history and import/export flows | Qt `MovePageModal.qml`, `RenamePageModal.qml`, `FloatingPageModal.qml`, `PageHistoryModal.qml`, and `NotesImportExportDialogs.qml` | Compare save-before-navigation, hierarchy refresh, conflicts, floating edit/expand, restore, file pick/export failure, and behavior when opened from a nested/floating note. |
| Bundle manager and item actions | React `DocumentBundleModal` and node-view manager/confirmation overlays | Qt `DocumentBundleModal.qml`, `DocumentBundleManagerDialog.qml`, `DocumentBundleItemRemovalDialog.qml`, `DocumentBundleDeleteDialog.qml`, and `DocumentBundleWidgetDialogs.qml` | See the dedicated [bundle crosswalk](09-document-bundle-crosswalk.md); compare manager geometry, preview path, all deletion choices, reorder controls, error recovery and undo. |

### Inactive React modal state is not a Qt gap

`EditorModalHost.tsx` receives `groupBundleModal` and its setter but destructures both as unused values; the host does not render a group-bundle modal from that state. Bundle creation and management are node-view-owned and are tracked in [09-document-bundle-crosswalk.md](09-document-bundle-crosswalk.md). Do not classify an unrendered React state flag as a missing Qt modal.

## Confirmed Notes action gaps

### Media widget activation

`MediaWidget.qml` previously opened an anchored `Popup` that discarded the current/new tab choice and did not preserve the linked entity ID at `PageView.qml`. Qt now opens a centered Notes-owned dialog sized to the same 400 px maximum, retains the media type/ID/title, and routes the chosen tab action through `AuthenticatedApplication.qml`. The video tab now records and restores its video ID. The routing code is built and the dialog's signal payloads have a focused Qt harness; actual module loading and tab restore still need live application verification.

**Implementation status:** Source fix applied. The widget now opens a Notes-owned native dialog, keeps color and remove controls on the widget, routes current/new choices through the tab coordinator, opens books by ID, opens videos by ID, and stores/restores video identity with the selected tab. No media persistence or domain algorithms were added in the Notes QML. Keep the UI/runtime and visual checks below open.

### File widget activation

`FileAttachmentWidget.qml` previously emitted `previewFileRequested`; `PageView.qml` called `previewLocalFile(fileId)` and navigated to Files without offering React's choice. Qt now shows a Notes-owned dialog with quick preview, full reader in current tab and full reader in a new tab. The forwarded flag distinguishes direct file widgets from bundle previews, which retain the existing bundle route.

**Implementation status:** Source fix applied. File ID/name now flow through the nested Notes block signals; quick preview uses the existing protected local-file preview API in a new Files tab so it does not replace the note; full-reader actions use the Library reader and current/new tab coordinator; bundle item previews are kept separate. React presents quick preview over the active note, so the native preview placement still differs and needs an explicit visual/runtime comparison. Verify file types, missing IDs, preview failures/completion, tab restore and focus. Do not assume every file type can use the same reader route.

## Visual and interaction acceptance checklist

- [ ] Capture both clients at the same viewport, device scale, theme, note content, and dialog state for every row above.
- [ ] Compare dialog dimensions, centering/anchoring, backdrop opacity/blur, border, radius, shadow, internal spacing, typography, icons, colors, and button order.
- [ ] Compare all open triggers: toolbar, slash command, keyboard, widget activation, drop/paste, context/action menu, and nested block/editor cases where applicable.
- [ ] Verify initial focus, Tab/Shift+Tab order, accessible names, Escape, outside click, Enter/Space, focus restoration, and keyboard event propagation into the editor.
- [ ] Verify busy/disabled state, validation, empty list, loading, failure/retry, cancellation during async work, duplicate submission prevention, and stale selection handling.
- [ ] Verify successful output is inserted at the saved editor selection even if the dialog/search interaction changes focus.
- [ ] Verify page switch, editor flush, encrypted/locked page, nested editors, and multiple mounted editors cannot route a modal result into the wrong page.
- [ ] Verify save/reload and React round-trip for widget attributes and linked Core IDs.
- [ ] Recheck Qt native performance: modal loads do not eagerly instantiate unrelated viewers; async callbacks are canceled or identity-checked on close/page change.

## Review pass

The initial pass compared the central React host with the Notes modal host and then traced image, file, and media actions through the Qt note widgets and `PageView.qml`. This second pass confirmed that the image viewer/delete equivalents and consolidated picker/setup surfaces exist, while media/file activation lose React's current-tab/new-tab choice. It also found Qt application tab support, so lack of tabs is not a valid limitation. Runtime behavior and matched-viewport rendering remain unverified; keep this crosswalk open until the new action paths and every checklist item have evidence.
