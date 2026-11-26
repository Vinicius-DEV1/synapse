# Extended File Review Log

This log records source inspected in the second static review pass. “Reviewed” means source was read or its call path was traced; it does not mean behavior was executed.

## Reviewed paths

| Area | Files/path reviewed | Evidence added |
| --- | --- | --- |
| Focus | `FocusLofiView.qml`, `FocusSettingsModal.qml`, `AlarmTriggerModal.qml`, `GlobalLofiPlayer.qml`, Qt focus API, React Focus store/hooks | DESK-PAR-023, DESK-PAR-024, DESK-PAR-025 |
| Notifications | `NotificationCenter.qml`, Qt controller/API, Qt bridge exports, Core notification repository, React scheduler | DESK-PAR-024 |
| Files | `FilesAudioPlayerModal.qml`, `FilesPreviewOverlay.qml`, `FilesFolderUploadModal.qml`, controllers, React upload/viewer hooks | DESK-PAR-026, DESK-PAR-011 |
| Culture | `CultureMediaSearchModal.qml`, Culture QML/controller paths, React references | DESK-PAR-027 |
| Diagrams | `DiagramsView.qml`, `DiagramImportModal.qml`, `DiagramExportModal.qml`, `WhiteboardCanvas.qml`, React `DiagramEditor.tsx` | DESK-PAR-014, DESK-PAR-028 |
| Anki | `AnkiAIAssistantModal.qml`, audio recorder path, React Anki references | DESK-PAR-013, DESK-PAR-029 |
| Habits | `HabitsView.qml`, `HabitsHeatmapModal.qml`, React heatmap hook/grid | DESK-PAR-031 |
| Vault | `VaultView.qml`, breach badge/controller, React Vault references | DESK-PAR-032 |
| Finance | `FinanceView.qml`, transaction/payment/loan QML, Qt API, Core Finance operations | DESK-PAR-033 |
| Shell/status | `SyncStatusToast.qml`, `BackgroundTaskWidget.qml`, `AuthenticatedApplication.qml` references | DESK-PAR-003, DESK-PAR-030 |
| Library reader | `LibraryReaderView.qml`, annotation actions/controller, React PDF/EPUB reader components | DESK-PAR-034 |
| Library visual/reader controls | React library/PDF/EPUB view, grid, and typography components; Qt library grids, reader toolbar, and typography modal | DESK-PAR-036 |
| Library book details | Qt `BookDetailsModal.qml`, React `BookInfoModal.tsx`, Qt edit-dialog inventory | DESK-PAR-037 |
| Library shell/grid | Qt `LibraryView.qml`, `LibraryKpiHeader.qml`, `LibraryViewModeBar.qml`, book/collection grids; React `LibraryView.tsx` and `LibraryHeader.tsx` | DESK-PAR-038 |
| Library storage actions | Qt `LibraryBookGrid.qml` / `LibraryBookActionsMenu.qml`; React `LibraryGrid.tsx`; Qt Library-controller inventory | DESK-PAR-039 |
| Home | `HomeWeatherWidget.qml`, `HomeView.qml`, Qt source/provider search | DESK-PAR-035 |

## Confirmed details

- The Focus timer is QML in-memory state. The Core API inspected has no active-timer state, so restart/termination loses an in-progress session.
- `FocusSettingsModal` emits a retention range, but its consumer deletes every Focus session for all three values: `today`, `last7days`, and `all`.
- The Focus alarm modal has visibility state, but no observed clock/scheduler path sets it true. Its snooze handler only closes the modal.
- Notification snooze writes a future `scheduled_for` value using generic add. The Qt bridge exposes neither Core’s snooze nor due/deliver operations, and no native scheduler was found. Core’s notification query hides scheduled event-reminder records; end-to-end delivery needs a contract before advertising this control.
- The Files audio modal advances a hardcoded 180-second clock through a QML Timer. It does not bind to a native decoder or media source.
- Culture provider search produces three locally constructed results; no Culture network/provider implementation was found.
- Diagram import stores arbitrary text and opening parses it as an array, silently substituting an empty canvas on parse failure. “Excalidraw” export is custom shapes JSON, and the PNG path writes a `.png.json` file instead of PNG bytes.
- Anki AI assistant constructs cards locally from input lines.
- Habits uses Core-backed data for the last seven days, but its annual heatmap and headline statistics are fixed/synthetic.
- The Vault breach lookup runs synchronously through a nested Qt event loop from QML. It needs an asynchronous, cancellable boundary and duplicate-submission protection before a network request can be considered responsive/safe.
- Finance normal transaction/account paths are persisted, but the loan tab seeds two demo loans. Payment changes the in-memory array and inserts a generic expense instead of invoking Core’s atomic linked-loan payment operation.
- Library persists bookmarks/highlight records and surfaces them in the sidebar, but PDF content is a single image without a highlight layer and EPUB content is a `TextEdit` without persisted-highlight rendering.
- React’s PDF reader has continuous pages, page entry, zoom/fit controls, theme/annotation toggles, and contextual layers. Qt’s reader is a one-page image/text surface with basic next/previous/search/bookmark controls. React EPUB has additional reading-flow and typography controls that the Qt modal does not expose or persist.
- Qt opens a fixed progress-oriented `BookDetailsModal` from a book card; React’s primary book-info modal exposes substantially more metadata and availability information. Qt’s separate edit dialog does not remove this inspection-surface delta.
- Library Qt receives a fixed `viewportWidth: 1366` for its book and collection breakpoints, rather than observed live width. Its persistent KPI/header/view-mode composition also differs structurally from React’s header/filter hierarchy.
- Qt renders local/cloud badges for books but does not expose React’s context-menu actions to download a cloud-only book for offline use or evict a synced local copy.
- Home labels fixed QML values (`24°C`, `Parcialmente nublado`, `Local`) as current weather; only its clock receives timer updates.

## Remaining review queue

- [ ] Notes: each extension, preview renderer, import/export path, HTML safety, external links, image/media, and conflict surface.
- [ ] Video: every dialog signal through importer/downloader/subtitle/audio-track persistence; cancellation and errors.
- [ ] Library: reader lifecycle, annotations, search cancellation, Poppler failures, and provider behavior.
- [ ] Vault: lock/unlock timing, copy/reveal, breach lookup, recovery/migration, and plaintext leakage in labels/errors.
- [ ] Finance/Culture/Habits/Calendar: source-to-Core field matrix against every React form and destructive flow.
- [ ] Layout/shell: global modal signals, command palette, tab/sidebar context actions, focus restoration, keyboard collision, and background task wiring.
- [ ] Tests/CMake: map targets to claimed behavior and inspect fixture coverage before targeted execution.

## Update template

- Files/path reviewed:
- React/reference contract:
- Confirmed findings or “no new finding”:
- Static evidence:
- Dynamic verification still required:
- Documentation updated:
