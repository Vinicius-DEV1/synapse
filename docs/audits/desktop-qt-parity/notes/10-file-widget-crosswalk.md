# Notes File-Widget React/Qt Crosswalk

This document compares only the file-attachment widget inside Caderno. It does not audit the standalone Files module. React is the behavior and appearance reference; Qt remains the implementation target.

## Source map

| Responsibility | React Web | Desktop Qt |
| --- | --- | --- |
| Editor node and UI | `apps/web-react/src/components/editor-extensions/FileWidgetBlock.ts` and `FileWidgetNodeView.tsx` | `apps/desktop-qt/qml/notes/FileAttachmentWidget.qml` through `BlockDelegateRouter.qml` |
| Missing-record and delete prompts | `FileWidgetDeletedNoticeModal.tsx`, `FileWidgetDeleteConfirmModal.tsx` | `FileAttachmentMissingDialog.qml`, `FileAttachmentDeleteDialog.qml` |
| File record lookup | `window.api.files.getById(fileId)` | Core `synapse_files_get_file` through `SynapseDataController::getFileWidgetMetadata` |
| File preview | `FileViewer`, `FloatingPdfViewer`, `AudioPlayerModal`, file actions and module navigation | `previewLocalFile` and the `FilesPreviewOverlay` listener owned by `FilesView` |
| Editor persistence | TipTap node attributes and file API updates | Core `NoteBlock` AST, `FileAttachmentWidget::attrsUpdated`, and `PageView` save flow |

## Behavior comparison

| Action/state | React behavior | Qt source behavior after current changes | Remaining parity work |
| --- | --- | --- | --- |
| Load file metadata | Asynchronously loads by stable file ID; suppresses stale/unmounted responses and keeps prior object identity when unchanged | Synchronously asks Core for a narrow ID/name/type/size map; responds to `filesChanged`; never exposes the file path to the widget | Compare loading feedback, vault lock behavior, and transient Core errors at runtime. The sync call may block the QML thread if the Core lookup becomes slow. |
| Missing or trashed file | Shows a red widget and a notice with “Keep” or “Remove Widget” | Shows the red deleted label and now opens a native notice with the same two outcomes. Generic block deletion also opens the widget confirmation | Verify focus restoration, Escape/outside dismissal, screen-reader text, failed AST removal, Trash restore and reopen behavior. |
| Click/open | Folder navigates into Files; PDF/EPUB opens file action; audio opens audio player; other records open the file viewer; absent records open the deleted notice | A live attachment invokes `previewLocalFile`, then routes both the active and floating PageView to Files so the file preview result is visible. Missing records open the notice | Verify runtime result timing and modal closure. Qt preview supports image, video, PDF raster, text and code in the shared Files overlay; EPUB, audio and folder-specific navigation differ from React. |
| Rename | Double-click or hover action; focuses the input and selects the base name before the extension; updates Core record and every same-ID TipTap node; disables duplicate submission while saving; reports an error | Double-click or hover action; calls Core first, updates the note attributes only on success, and keeps failed input open with an error. Core `filesChanged` refreshes same-ID widgets and now synchronizes their persisted display-name attributes | Compare input selection/caret behavior, extension editing, Core failure, same-ID serialization, page-save failure after Core success and React round-trip. Qt still has no explicit saving spinner, though the Core call is synchronous. |
| Color | Anchored Floating UI popover with nine named colors plus default; closes on outside click and Escape; persists the chosen hex color | Inline six-swatch palette plus default; stores `data-color`; no swatch names or Escape/outside dismissal | Match the nine React hex values and labels, anchored placement, five-column grid, selected state, outside/Escape dismissal, focus behavior and saved color normalization. See QT-NOTES-048, shared with the document-bundle widget. |
| Reorder | Widget hover controls move one block up/down | No widget-local arrows; users rely on the parent native block handle/drag route | Add or explicitly accept a keyboard-accessible native equivalent; compare first/last boundaries and nested editor behavior. |
| Remove from note | Confirmation offers Cancel, Unlink, and Delete All. Unlink removes only the node. Delete All removes the local record and attempts Drive deletion when a Drive copy exists. Missing-file notice separately offers keep/remove widget. | Confirmation currently removes only the attachment node and leaves the Core record active. It does not offer the local Trash or Drive deletion choices from React. | Match React choices where safe. Keep local Trash deferred until note save succeeds and preserve the file on save conflict. Do not claim Drive removal until a native typed service returns reliable completion. See QT-NOTES-046. |
| Delete from keyboard | React emits a file-widget-specific delete request so the same confirmation appears | `BlockListEditor::requestBlockDeletion` now asks the file widget to open its confirmation | Verify Backspace/Delete, block menu, toolbar and widget button all open exactly one dialog and never delete on an unconfirmed route. |
| Preview errors | Viewer-specific loading/error/retry and missing-record UI | Core emits `filePreviewReady`; `FilesActions` consumes it and the Files overlay displays supported preview or error. Active and floating PageViews both forward navigation to Files. | Verify the module switch happens before the asynchronous result and the error remains actionable. Runtime timing and typed viewer differences remain unverified. |
| Pending rich-text edits during removal | React's TipTap transaction removes only the selected node while preserving the surrounding document state | Qt flushes pending rich-text slices, rechecks that the target remains a file widget, then serializes before updating the block list | Inject flush and serializer failures; confirm no neighboring text or wrong block is lost and the prompt remains actionable. |
| Accessibility and keyboard | Buttons expose titles; rename supports Enter/Escape; modal actions are native buttons | Qt exposes selected accessible names in new prompts; rename supports Enter/Escape; block reorder uses native handle | Compare tab order, accessible roles/names, focus restoration, Space/Enter, tooltip announcement, and hidden hover controls. |

## Data contract

The persisted React-compatible widget uses a stable file ID plus display metadata such as name, file type, size, link flag and color. Qt must preserve the same canonical `data-file-id`, `data-name`, `data-file-name`, `data-file-type`, `data-file-size`, `data-is-link` and `data-color` attributes when editing. `getFileWidgetMetadata` intentionally returns only ID/name/type/size; paths and Drive identifiers remain inside the controller and preview service.

An attachment can outlive its file record because a file can be trashed independently. The widget must distinguish the saved node from the live Core record: missing records stay visible with the stored display name, and restore/change signals refresh the live state without rewriting the note by themselves.

## Required acceptance

- [ ] Open root-folder and nested-folder attachments from the active Caderno page and confirm the preview result is visible in the intended native surface.
- [ ] Repeat open and missing-file recovery from a floating/read-only page preview; verify the modal closes and module navigation forwards to Files before the asynchronous preview completes.
- [ ] Compare folder, PDF, EPUB, audio, image, video, text, code and unsupported formats against React's destination and error behavior.
- [ ] Move a referenced file to Trash, open the note, keep the missing widget, remove it, restore the file, and preview it without reopening the note.
- [ ] Rename a file from one widget and confirm all matching IDs refresh; force Core failure and page-save failure separately; verify no saved note/Core mismatch.
- [ ] Rename a file used by multiple widgets in the same note; save/reopen in Qt, then open in React and verify every matching `data-name`/`data-file-name` attribute agrees with Core and the rendered label.
- [ ] Compare the rename input's initial selection/caret against React: basename selection before the final extension, dotfiles, extensionless names and multi-dot names; verify Enter, Escape, retry and click behavior.
- [ ] Compare palette values, keyboard operation, color persistence, same-ID propagation and preset swatch contrast.
- [ ] Match all React file-widget color choices exactly: default plus `#9CA3AF`, `#A8A29E`, `#F97316`, `#EAB308`, `#22C55E`, `#3B82F6`, `#A855F7`, `#EC4899`, and `#EF4444`; verify names, anchored five-column placement, selected ring, outside click, Escape, focus and saved attributes.
- [ ] Compare block reordering through direct arrows, parent handle, keyboard and nested blocks.
- [ ] Compare Cancel, Unlink and Delete All. Verify local soft-delete waits for note save and conflicts preserve both file and note; document Drive behavior separately.
- [ ] Verify button labels, dialog focus, Escape/outside behavior, screen-reader announcements, missing-state explanation and preview errors.
- [ ] Save/reload in Qt and React after every metadata or structure action and compare the canonical widget HTML.

## Current evidence

The file-by-ID metadata adapter, file-change/restore refresh signal, Core-first rename result handling and same-ID attribute synchronization, active/floating/nested PageView preview routes, missing-file notice, generic block-delete confirmation and pre-removal rich-text flush have source paths. Focused `qmllint` exits 0 with existing dynamic-scope and Loader diagnostics; `git diff --check` passes. No runtime UI, Core failure injection, C++ build, matched-viewport screenshot, keyboard/screen-reader, or cross-client acceptance was run. Continue tracking [QT-NOTES-043](04-bug-register.md#qt-notes-043-file-widgets-do-not-resolve-or-refresh-records-by-id), [QT-NOTES-044](04-bug-register.md#qt-notes-044-failed-file-rename-still-changes-the-note-widget), [QT-NOTES-045](04-bug-register.md#qt-notes-045-file-widget-preview-and-missing-recovery-differ-from-react), [QT-NOTES-046](04-bug-register.md#qt-notes-046-file-widget-deletion-does-not-offer-reacts-choices), [QT-NOTES-047](04-bug-register.md#qt-notes-047-renaming-a-file-leaves-other-widget-attributes-stale), and [QT-NOTES-049](04-bug-register.md#qt-notes-049-file-previews-from-bundles-and-nested-notes-do-not-reach-files).
