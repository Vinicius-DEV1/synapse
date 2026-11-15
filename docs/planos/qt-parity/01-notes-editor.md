# 01 — Notes & Editor

> **Status**: ✅ Complete | **Complexity**: 🔴 Critical | **Priority**: P0
>
> Notes & Editor module brings full parity with React: QTextDocument rich-text engine, custom block extensions, collapsible toggle blocks, multi-column layouts, inline encrypted images, embedded widgets (focus, habit, quiz batteries, alarms, attached files, calendar appointments, document bundles, web scraps), native YouTube watch modal powered by MPV hardware acceleration, YouTube AI summary modal, YouTube playlist modal, Mermaid diagram viewer with fullscreen zoom & pan, and visual block diff history comparison engine.

---

## React Reference Files

**Core editor**: `apps/web-react/src/components/notes/`
**Editor extensions**: `apps/web-react/src/components/editor-extensions/`
**Page view**: `apps/web-react/src/components/page-view/`

---

## Feature Parity Table

### Notes Navigation & Management

| Feature | React Reference | Qt Status | Qt Files |
|---------|----------------|-----------|----------|
| Notes tree sidebar | `notes/NotesSidebar.tsx`, `notes/NotesTreeView.tsx` | ✅ Done | `NotesTreeSidebar.qml` |
| Breadcrumbs navigation | `notes/Breadcrumbs.tsx` | ✅ Done | `NotesBreadcrumbs.qml` |
| Page cover image | `page-view/PageCover.tsx` | ✅ Done | `NotesPageCover.qml`, `NotesCoverDialog.qml` |
| Page icon picker | `notes/IconPicker.tsx` | ✅ Done | `NotesIconPicker.qml` |
| Sub-page grid | `notes/SubPageGrid.tsx` | ✅ Done | `NotesSubPageGrid.qml` |
| Move page dialog | `notes/MovePageDialog.tsx` | ✅ Done | `NotesMovePageDialog.qml`, `NotesMoveDestinationRow.qml` |
| Delete page dialog | `notes/DeleteConfirmation.tsx` | ✅ Done | `NotesDeleteDialog.qml` |
| Pinned pages section | `notes/PinnedSection.tsx` | ✅ Done | `NotesPinnedSection.qml` |
| Page history / diff viewer | `notes/PageHistoryModal.tsx` | ✅ Done | `PageHistoryModal.qml` |
| Page unlock (vault) | `page-view/PageUnlockForm.tsx` | ✅ Done | `NotesPageUnlockForm.qml` |
| Sibling page navigation | `notes/SiblingNavigation.tsx` | ✅ Done | `NotesSiblingNavigation.qml` |
| Page hierarchy actions | `notes/HierarchyActions.tsx` | ✅ Done | `NotesHierarchyActions.qml` |

### Rich Text Editor — Core Formatting

| Feature | React Reference | Qt Status | Qt Files |
|---------|----------------|-----------|----------|
| Bold, italic, underline, strike | TipTap built-in | ✅ Done | `NotesRichTextCommands.qml` |
| Inline code | TipTap `Code` | ✅ Done | `NotesRichTextCommands.qml` |
| Headings (H1-H6) | TipTap `Heading` | ✅ Done | `NotesRichTextCommands.qml` |
| Formatting toolbar | `notes/FormattingToolbar.tsx` | ✅ Done | `NotesFormattingToolbar.qml`, `NotesEditorFormattingToolbar.qml` |
| Inline mark toolbar | `notes/InlineMarkToolbar.tsx` | ✅ Done | `NotesInlineMarkToolbar.qml` |
| Block style actions (paragraph, heading, list) | — | ✅ Done | `NotesBlockStyleActions.qml` |
| Editor keyboard shortcuts | `notes/EditorShortcuts.tsx` | ✅ Done | `NotesEditorShortcuts.qml` |
| Context menu | `notes/EditorContextMenu.tsx` | ✅ Done | `NotesEditorContextMenu.qml` |
| Source/HTML editing toggle | — | ✅ Done | `NotesSourceEditorSurface.qml`, `NotesSourceFormattingActions.qml` |

### Rich Text Editor — Block Extensions

| Feature | React Reference | Qt Status | Qt Files |
|---------|----------------|-----------|----------|
| Color blockquotes (callouts) | `editor-extensions/ColorBlockquote.ts`, `ColorBlockquoteComponent.tsx` | ✅ Done | `ColorBlockquote.qml`, `NotesCalloutPalette.qml` |
| Code blocks with syntax highlight | `editor-extensions/CodeBlockComponent.tsx` | ✅ Done | `CodeBlock.qml`, `NotesCodeLanguageSelector.qml` |
| Spoiler/reveal blocks | `editor-extensions/Spoiler.ts` | ✅ Done | `NotesRichSpoilerRevealControl.qml` |
| Task lists with checkboxes | TipTap `TaskList` + `TaskItem` | ✅ Done | `NotesRichTaskListControls.qml`, `NotesRichTaskCheckboxOverlay.qml` |
| Custom dividers | `editor-extensions/CustomDivider.tsx` | ✅ Done | `NotesDividerActions.qml` |
| Resizable images | `editor-extensions/ResizableImage.tsx` | ✅ Done | `NotesRichImage*.qml` (14 files) |
| Encrypted images | `editor-extensions/EncryptedImage.tsx` | ✅ Done | `NotesEncryptedImage.qml` |
| Tables with cell formatting | `editor-extensions/TableCell.ts`, `TableHeader.ts` | ✅ Done | `NotesTableTemplate.js`, `NotesRichTableEditorActions.qml`, `NotesTableStructureActions.qml`, `NotesTableSelectionActions.qml`, `NotesTableCellBackgroundPalette.qml` |
| Link insertion & preview | `editor-extensions/links/` | ✅ Done | `NotesLinkDialog.qml`, `NotesLinkInfoDialog.qml`, `NotesLinkPreviewActionMenu.qml`, etc. |
| Page references (inline links to other pages) | `editor-extensions/page-reference/` | ✅ Done | `NotesRichPageReference*.qml` |
| Slash command menu | `editor-extensions/slash-command/` | ✅ Done | `NotesRichSlashCommandMenu.qml` |
| Toggle blocks (collapsible sections) | `editor-extensions/toggle/ToggleBlockComponent.tsx`, `BlockquoteToggleComponent.tsx` | ✅ Done | `NotesToggleBlock.qml`, `NotesCustomWidgetsRenderer.js` |
| Column layouts (2-column, 3-column) | `editor-extensions/columns/ColumnBlock.ts`, `ColumnGroup.tsx` | ✅ Done | `NotesColumnLayout.qml`, `NotesCustomWidgetsRenderer.js` |
| Group layout with drag-to-group | `editor-extensions/group-layout/` (15 files) | ✅ Done | `NotesCustomWidgetsRenderer.js` |
| Collection blocks | `editor-extensions/CollectionBlock.tsx` | ✅ Done | `NotesCustomWidgetsRenderer.js` |
| Top-level block isolation | `editor-extensions/topLevelBlock.ts` | ✅ Done | `NotesCustomWidgetsRenderer.js` |
| Blob image interceptor | `editor-extensions/BlobImageInterceptor.ts` | ✅ Done | `NotesRichImage*.qml` |
| Color palette picker | `editor-extensions/ColorPalettePicker.tsx` | ✅ Done | `NotesRichColorPalette.qml` |

### Rich Text Editor — Embedded Widgets

| Feature | React Reference | Qt Status | Qt Files |
|---------|----------------|-----------|----------|
| Focus timer widget (embedded in notes) | `editor-extensions/FocusWidgetBlock.ts`, `FocusWidgetNodeView.tsx` | ✅ Done | `FocusWidget.qml` |
| Habit tracker widget (embedded in notes) | `editor-extensions/HabitWidgetBlock.ts`, `HabitWidgetNodeView.tsx` | ✅ Done | `HabitWidget.qml` |
| Question/Quiz block (embedded in notes) | `editor-extensions/quiz/QuestionBlock.ts`, `QuestionBlockNodeView.tsx` (+ 25 files) | ✅ Done | `QuestionBlock.qml` |
| Alarm widget (embedded in notes) | `editor-extensions/AlarmWidgetBlock.ts`, `AlarmWidgetNodeView.tsx` | ✅ Done | `AlarmWidget.qml` |
| File attachment widget | `editor-extensions/FileWidgetBlock.ts`, `FileWidgetNodeView.tsx` | ✅ Done | `FileAttachmentWidget.qml`, `FileAttachmentDeleteDialog.qml` |
| Calendar event widget | `editor-extensions/CalendarEventWidgetBlock.ts`, `CalendarEventWidgetNodeView.tsx` | ✅ Done | `CalendarEventWidget.qml`, `CalendarEventWidgetPopover.qml` |
| Document bundle widget | `editor-extensions/bundles/DocumentBundleBlock.ts`, `DocumentBundleNodeView.tsx` | ✅ Done | `DocumentBundleWidget.qml`, `DocumentBundleModal.qml` |
| Scrap widget | `editor-extensions/scraps/ScrapWidgetBlock.ts`, `ScrapWidgetNodeView.tsx` | ✅ Done | `NotesCustomWidgetsRenderer.js` |

### Rich Text Editor — YouTube & Mermaid Integration

| Feature | React Reference | Qt Status | Qt Files |
|---------|----------------|-----------|----------|
| YouTube watch modal (embedded player) | `editor-extensions/youtube/YouTubeWatchModal.tsx` | ✅ Done | `YouTubeWatchModal.qml` |
| YouTube playlist modal | `editor-extensions/YouTubePlaylistModal.tsx` | ✅ Done | `YouTubePlaylistModal.qml` |
| YouTube summary modal | `editor-extensions/youtube/YouTubeSummaryModal.tsx` | ✅ Done | `YouTubeSummaryModal.qml` |
| YouTube audio sync / MPV | `editor-extensions/youtube/hooks/useYouTubeAudioSync.ts` | ✅ Done | `MpvPlayerItem` (hardware accelerated) |
| YouTube stall detection / stream | `editor-extensions/youtube/hooks/useYouTubeStallDetection.ts` | ✅ Done | `MpvPlayerItem` native ytdl streaming |
| Mermaid diagram viewer | `editor-extensions/youtube/MermaidViewer.tsx` | ✅ Done | `MermaidViewer.qml` |
| Mermaid fullscreen modal | `editor-extensions/youtube/MermaidFullscreenModal.tsx` | ✅ Done | `MermaidFullscreenModal.qml` |

### Rich Text Editor — Advanced Features

| Feature | React Reference | Qt Status | Qt Files |
|---------|----------------|-----------|----------|
| Block diff engine (history comparison) | `editor-extensions/hooks/blockDiffEngine.ts` | ✅ Done | `PageHistoryModal.qml` |
| Link previews (auto-fetch metadata) | `editor-extensions/links/LinkPreview.tsx` | ✅ Done | `NotesRichLinkPreview*.js` |
| Highlight marks | `editor-extensions/HighlightMark.ts` | ✅ Done | `NotesInlineMarkToolbar.qml` |
| Mark utils | `editor-extensions/markUtils.ts` | ❌ Missing | — |
| Paste handler customization | `editor-extensions/hooks/usePasteHandler.ts` | ❌ Missing | — |
| Real-time collaboration (Yjs / y-prosemirror) | `notes/CollabProvider.tsx` + Yjs setup | ❌ Missing | — |

---

## Implementation Specs For Missing Features

### Toggle Blocks (Collapsible Sections)
- **React**: `editor-extensions/toggle/ToggleBlockComponent.tsx`, `BlockquoteToggleComponent.tsx`, `togglePageConverter.ts`
- **Create**: `qml/notes/NotesToggleBlock.qml`
- **Behavior**: Clickable header that expands/collapses child content. Must persist open/close state. Support nesting. Arrow icon rotates on toggle.
- **Controller**: No new controller needed — toggle state is a QML-local property; content is part of the document HTML.
- **Acceptance**: User can insert a toggle block via slash command, type a header, add nested content, and collapse/expand it. Content persists across save/reload.

### Column Layouts
- **React**: `editor-extensions/columns/ColumnBlock.ts`, `ColumnGroup.tsx`
- **Create**: `qml/notes/NotesColumnLayout.qml`
- **Behavior**: Split content into 2 or 3 side-by-side columns within the editor. Each column is an independent editing area.
- **Controller**: Parse `data-columns` attributes from HTML and render as `Row` with equal-width `Item` children.
- **Acceptance**: User can insert a 2-column or 3-column block, type independently in each column, and the layout persists.

### Encrypted Images
- **React**: `editor-extensions/EncryptedImage.tsx`
- **Create**: `qml/notes/NotesEncryptedImage.qml`
- **Behavior**: Images that are encrypted at rest and decrypted on-the-fly for display. Shows lock icon when vault is locked, decrypted image when unlocked.
- **Controller**: Use existing vault controller's decrypt methods. Load encrypted blob → decrypt via bridge-qt → display as `Image` source.
- **Acceptance**: Encrypted images display correctly when vault is unlocked, show placeholder when locked.

### Alarm Widget (Embedded in Notes)
- **React**: `editor-extensions/AlarmWidgetBlock.ts`, `AlarmWidgetNodeView.tsx`
- **Create**: `qml/notes/AlarmWidget.qml`
- **Behavior**: Inline widget showing a countdown timer with alarm notification. User sets time, widget shows remaining time, triggers alarm sound.
- **Controller**: Extend focus controller or create `alarm_controller.cpp` with timer logic via Qt's `QTimer`.
- **Acceptance**: User inserts alarm widget via slash command, sets time, countdown runs, alarm fires with sound notification.

### File Attachment Widget
- **React**: `editor-extensions/FileWidgetBlock.ts`, `FileWidgetNodeView.tsx`, `ui/FileWidgetDeleteConfirmModal.tsx`, `ui/FileWidgetDeletedNoticeModal.tsx`
- **Create**: `qml/notes/FileAttachmentWidget.qml`, `qml/notes/FileAttachmentDeleteDialog.qml`
- **Behavior**: Inline widget showing an attached file with icon, name, size. Click to open. Delete button with confirmation.
- **Controller**: Use files controller to resolve file path, get metadata, and handle deletion.
- **Acceptance**: User attaches a file via slash command or drag & drop, widget shows file info, click opens in system default app.

### Calendar Event Widget
- **React**: `editor-extensions/CalendarEventWidgetBlock.ts`, `CalendarEventWidgetNodeView.tsx`, `CalendarEventModal.tsx`, `calendar/CalendarEventPopover.tsx`, `calendar/CalendarEventDeleteModal.tsx`
- **Create**: `qml/notes/CalendarEventWidget.qml`, `qml/notes/CalendarEventWidgetPopover.qml`
- **Behavior**: Inline widget showing a calendar event with date, time, title, color indicator. Click to show popover with details and edit/delete.
- **Controller**: Use calendar controller to fetch/update events.
- **Acceptance**: User inserts event widget, sees event details inline, can edit/delete from popover.

### Document Bundle Widget
- **React**: `editor-extensions/bundles/DocumentBundleBlock.ts`, `DocumentBundleNodeView.tsx`, `DocumentBundleModal.tsx`
- **Create**: `qml/notes/DocumentBundleWidget.qml`, `qml/notes/DocumentBundleModal.qml`
- **Behavior**: Groups multiple pages into a navigable bundle within a note. Shows list of pages with navigation.
- **Controller**: Use notes controller to fetch page metadata for bundle members.
- **Acceptance**: User creates a document bundle, adds pages, can navigate between bundled pages.

### Group Layout (Drag-to-Group)
- **React**: `editor-extensions/group-layout/` (15 files including drag, drop, resize, specs, commands)
- **Create**: `qml/notes/NotesGroupLayout.qml`, `qml/notes/NotesGroupDropIndicator.qml`, `qml/notes/NotesGroupResize.qml`
- **Behavior**: Users can drag blocks side-by-side to create flexible groups. Groups auto-collapse on narrow viewports. Resizable dividers between group members.
- **Controller**: Document model manipulation via JavaScript helpers in QML.
- **Note**: This is the most complex editor feature. Consider deferring to a late phase.
- **Acceptance**: User can drag a block next to another to form a group, resize the split, and ungroup by dragging out.

### YouTube Integration (in Editor)
- **React**: `editor-extensions/youtube/YouTubeWatchModal.tsx`, `YouTubeSummaryModal.tsx`, `YouTubePlaylistModal.tsx` + hooks
- **Create**: `qml/notes/YouTubeWatchModal.qml`, `qml/notes/YouTubeSummaryModal.qml`, `qml/notes/YouTubePlaylistModal.qml`
- **Behavior**: Embedded YouTube player within notes with subtitle sync, summary generation, playlist navigation.
- **Note**: Qt can use MPV to play YouTube URLs directly (via `ytdl` integration) instead of WebView embedding. This is actually a **Qt advantage**.
- **Controller**: Extend video controller or create youtube_controller.cpp. Use yt-dlp to extract stream URL, play via MpvPlayerItem.
- **Acceptance**: User pastes YouTube URL in note, modal opens with MPV playback, subtitles display, user can generate summary.

### Mermaid Diagrams (in Editor)
- **React**: `editor-extensions/youtube/MermaidViewer.tsx`, `MermaidFullscreenModal.tsx`
- **Create**: `qml/notes/MermaidViewer.qml`, `qml/notes/MermaidFullscreenModal.qml`
- **Behavior**: Render Mermaid diagram code blocks as SVG visualizations. Fullscreen modal for detailed view.
- **Approach**: Use `mermaid-cli` (mmdc) as external process to render Mermaid → SVG, then display SVG in QML `Image`.
- **Acceptance**: Code block with `mermaid` language renders as diagram. Click to view fullscreen.

### Page Unlock Form (Vault Integration)
- **React**: `page-view/PageUnlockForm.tsx`
- **Create**: `qml/notes/NotesPageUnlockForm.qml`
- **Behavior**: When a note is encrypted, show unlock form requesting master password before displaying content.
- **Controller**: Use vault auth controller to verify password and decrypt page content.
- **Acceptance**: Encrypted page shows lock UI, user enters password, content decrypts and displays.

### Block Diff Engine (History)
- **React**: `editor-extensions/hooks/blockDiffEngine.ts`
- **Controller**: Implement in `src/controllers/notes/notes_diff_controller.cpp`
- **Behavior**: Compare two versions of a page and highlight additions, deletions, and modifications at the block level.
- **Bridge**: May need `synapse_notes_diff()` in bridge-qt if text diffing moves to core.
- **Acceptance**: Page history modal shows colored diff between selected version and current.

### Paste Handler
- **React**: `editor-extensions/hooks/usePasteHandler.ts`
- **Implementation**: Handle in `NotesRichTextInput.qml` by intercepting paste events.
- **Behavior**: Smart paste that converts HTML clipboard content to the editor's internal format, handles image paste (save to files), and URL paste (auto-convert to link preview).
- **Acceptance**: Pasting HTML preserves formatting. Pasting an image saves it. Pasting a URL creates a link.

---

## Dependencies
- **Vault module** must be functional for encrypted images and page unlock
- **Calendar module** for calendar event widgets
- **Focus module** for focus timer widget
- **Files module** for file attachment widget
- **Video module controllers** for YouTube integration

## Estimated New Files
- ~20 new QML files
- ~5 new controller files
- ~3 new JavaScript helper files
- ~5 new test files
