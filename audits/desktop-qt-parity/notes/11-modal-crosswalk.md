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
| `MediaActionModal` | Activate a media widget | `MediaWidget` `Popup` | Qt currently offers one open route plus color/remove controls. React offers a centered dialog with “open in this tab” and “open in new tab”. The Desktop app already has tabs, so the missing new-tab choice is a real Notes interaction gap. | **Gap confirmed:** add a native Notes action dialog and route both choices to the linked media ID; verify tab metadata and target playback/reader |
| `FileActionModal` | Activate a file widget | `FileAttachmentWidget` direct preview callback | Qt currently previews the local file then navigates to Files. React presents quick viewer, full reader in current tab, and full reader in a new tab. The current Qt path has no choice dialog and does not preserve the Notes tab. | **Gap confirmed:** add a native Notes action dialog; retain quick preview and add current/new reader routes. Verify file types and tab restore behavior |
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

## Confirmed Notes action gaps

### Media widget activation

`MediaWidget.qml` currently opens a small anchored `Popup` and routes directly to the Library or Video module after the user chooses its single open action. React's `MediaActionModal` is a centered 400 px dialog with title/icon, item-specific prompt, close affordance, and separate current/new tab actions. Qt `AuthenticatedApplication.qml` supports tabs, while the note signal currently discards the media ID and title at `PageView.qml`. Therefore the current path cannot reproduce either React tab choice or reliably target the linked entity.

**Required implementation:** preserve `mediaType`, `mediaId`, and title from the widget signal; open a Notes-owned native action dialog; route current/new tab choices through the application tab coordinator and restore the target media entity. Keep color and remove actions available as widget actions. Avoid implementing media domain logic in QML; call existing module/Core entry points.

### File widget activation

`FileAttachmentWidget.qml` emits `previewFileRequested`; `PageView.qml` calls `previewLocalFile(fileId)` and navigates to Files. React's `FileActionModal` offers quick viewer, full reader in current tab, and full reader in a new tab. This is a confirmed interaction gap even though Qt has native preview and tab infrastructure.

**Required implementation:** preserve ID/name through the Notes host; provide a dialog with the three React actions; connect quick preview to the existing local-file preview API; connect full-reader routes to the correct file/library surface and current/new tab coordinator; verify file types, missing IDs, failures, tab restore and focus. Do not assume every file type can use the same reader route.

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
