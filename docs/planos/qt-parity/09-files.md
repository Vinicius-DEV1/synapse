# 09 — Files

> **Status**: ✅ Complete | **Complexity**: 🟡 Medium | **Priority**: P2
>
> Files explorer with grid/table views, category filters, hierarchical folder sidebar, breadcrumbs, inspector pane with metadata and linked notes, multi-file selection, clipboard operations (Ctrl+C/X/V), keyboard shortcuts, ephemeral encrypted previews, folder upload modal with progress, dedicated audio player modal with waveform visualization, file info modal with encryption details, document AI assistant for summaries/quizzes, and in-app guide are all fully implemented and verified in Qt.

---

## React Reference
- **Components**: `apps/web-react/src/components/files/` (45 files)
- **Hooks**: 14 hooks in `hooks/`
- **Viewer subsystem**: `viewer/` (12 files including AI document analysis)

## Qt Existing
- **QML**: `FilesView.qml`, `FilesWorkspace.qml`, `FilesExplorer.qml`, `FilesFolderSidebar.qml`, `FilesCategoryFilter.qml`, `FilesInspector.qml`, `FilesItemMenu.qml`, `FilesDialogs.qml`, `FilesLinkDialogs.qml`, `FilesPreviewOverlay.qml`, `FilesCollection.qml`, `FilesActions.qml`, `FilesHelpDialog.qml`, `FilesFolderUploadModal.qml`, `FilesAudioPlayerModal.qml`, `FilesInfoModal.qml`, `FilesDocumentAiModal.qml`
- **Controller**: `files_controller.cpp`, `synapse_controller.h`

---

## Feature Parity Table

| Feature | React File | Qt Status |
|---------|-----------|-----------|
| Files grid view | `ui/FilesGrid.tsx` | ✅ Done (`FilesExplorer.qml`) |
| Files table view | `ui/FilesTable.tsx` | ✅ Done (`FilesExplorer.qml`) |
| Breadcrumbs | `ui/FilesBreadcrumbs.tsx` | ✅ Done (`FilesWorkspace.qml`) |
| Upload modal | `FileUploadModal.tsx` | ✅ Done (`FilesDialogs.qml`) |
| Move modal | `MoveModal.tsx` | ✅ Done (`FilesDialogs.qml`) |
| Rename modal | `RenameModal.tsx` | ✅ Done (`FilesDialogs.qml`) |
| Delete modal | `DeleteModal.tsx` | ✅ Done (`FilesDialogs.qml`) |
| Folder create modal | `FolderModal.tsx` | ✅ Done (`FilesDialogs.qml`) |
| Context menu | `FileContextMenu.tsx` | ✅ Done (`FilesItemMenu.qml`) |
| Help dialog | — | ✅ Done (`FilesHelpDialog.qml`) |
| **File viewer (ephemeral preview)** | `viewer/TextPreviewer.tsx` | ✅ Done (`FilesPreviewOverlay.qml`) |
| **Document AI assistant** | `viewer/modals/DocumentAiModal.tsx` | ✅ Done (`FilesDocumentAiModal.qml`) |
| **Audio player modal** | `AudioPlayerModal.tsx` | ✅ Done (`FilesAudioPlayerModal.qml`) |
| **File info modal** | `FileInfoModal.tsx` | ✅ Done (`FilesInfoModal.qml`) |
| **Folder upload modal** | `FolderUploadModal.tsx` | ✅ Done (`FilesFolderUploadModal.qml`) |
| **Folder sidebar tree** | `ui/FilesFolderSidebar.tsx` | ✅ Done (`FilesFolderSidebar.qml`) |
| **Inspector pane** | `ui/FilesInspectorPane.tsx` | ✅ Done (`FilesInspector.qml`) |
| **Category filter** | `ui/FilesCategoryFilter.tsx` | ✅ Done (`FilesCategoryFilter.qml`) |
| **Clipboard (copy/cut/paste)** | `hooks/useFilesClipboard.ts` | ✅ Done (Ctrl+C, Ctrl+X, Ctrl+V in `FilesView.qml`) |
| **Keyboard shortcuts** | `hooks/useFilesKeyboardShortcuts.ts` | ✅ Done (Alt+Left/Right/Up, Ctrl+A/C/X/V, Del, Ctrl+Shift+I) |
| **Multi-file selection** | `hooks/useFilesSelection.ts` | ✅ Done (`FilesCollection.qml`) |

---

## Implementation Specs

### File Viewer
- **React**: `viewer/FileViewerHeader.tsx`, `viewer/TextPreviewer.tsx`
- **Create**: `qml/files/viewer/FileViewerView.qml`, `qml/files/viewer/FileViewerHeader.qml`, `qml/files/viewer/TextPreviewer.qml`
- **Behavior**: Full-screen immersive file reader. For text files: syntax-highlighted viewer with line numbers. For images: zoomable image viewer. For audio: audio player. For PDF/EPUB: redirect to Library reader. Header shows filename, path, close button, and action buttons (download, share, delete).
- **Acceptance**: Double-clicking a file opens viewer, correct viewer type for file format, close returns to file list.

### Audio Player Modal
- **Create**: `qml/files/AudioPlayerModal.qml`
- **Behavior**: Audio file player with play/pause, seek bar, duration, volume, waveform visualization. Supports MP3, WAV, FLAC, OGG.
- **Approach**: Qt Multimedia `MediaPlayer` + `AudioOutput`
- **Acceptance**: Audio files play with controls, seek works, volume adjustable.

### Document AI Modal
- **React**: `viewer/modals/DocumentAiModal.tsx` + components + services
- **Create**: `qml/files/viewer/DocumentAiModal.qml`, `qml/files/viewer/DocumentAiChat.qml`
- **Behavior**: AI-powered document analysis. User can ask questions about the document, generate summaries, create quiz questions from document content. Chat interface with message history.
- **Controller**: HTTP calls to Gemini API with document content as context.
- **Acceptance**: User opens AI modal from document viewer, asks question, AI responds with document-aware answer.

### Folder Sidebar Tree
- **Create**: `qml/files/FilesFolderSidebar.qml`, `qml/files/FilesFolderTreeItem.qml`
- **Behavior**: Left sidebar showing folder hierarchy as expandable tree. Click folder to navigate. Drag files into folders. Context menu on folders.
- **Approach**: QML `TreeView` or recursive `ListView` with custom delegate.
- **Acceptance**: Tree shows all folders, expanding works, click navigates, drag to folder moves file.

### Inspector Pane
- **Create**: `qml/files/FilesInspectorPane.qml`, `qml/files/FilesInspectorFileDetails.qml`, `qml/files/FilesInspectorFolderDetails.qml`
- **Behavior**: Right sidebar showing details of selected file/folder. File: name, type, size, created date, modified date, path, preview thumbnail. Folder: name, item count, total size, created date.
- **Acceptance**: Selecting a file shows its details in inspector, selecting folder shows folder details.

### Drag & Drop
- **Create**: Update existing grid/table QML with `Drag` and `DropArea`
- **Behavior**: Drag files to reorder, move to folders, or upload from system file manager. Visual feedback during drag.
- **Acceptance**: Drag file to folder moves it, drag from system file manager uploads, drop indicator visible.

### Clipboard & Keyboard Shortcuts
- **Create**: Add keyboard shortcut handlers to `FilesView.qml`
- **Behavior**: Ctrl+C copy, Ctrl+X cut, Ctrl+V paste (files within the app), Delete to trash, F2 to rename, Ctrl+A select all, Ctrl+Shift+N new folder.
- **Acceptance**: All keyboard shortcuts work as described, clipboard operations move/copy files correctly.

### Bulk Actions Bar
- **Create**: `qml/files/FilesBulkActionsBar.qml`
- **Behavior**: When multiple files selected, show action bar with: Move, Copy, Delete, Download, Encrypt (vault). Shows selected count.
- **Acceptance**: Multi-select with Shift/Ctrl, action bar appears, all actions apply to selection.

### File Info Modal
- **Create**: `qml/files/FileInfoModal.qml`
- **Behavior**: Modal showing detailed file metadata: name, path, size, type, created/modified dates, dimensions (for images), duration (for audio/video), word count (for text).
- **Acceptance**: Right-click → Info opens modal with accurate metadata.

### Category Filter
- **Create**: `qml/files/FilesCategoryFilter.qml`
- **Behavior**: Filter files by type: All, Documents, Images, Audio, Video, Archives. Pill/chip style buttons.
- **Acceptance**: Clicking category filters the view to show only matching files.

---

## Dependencies
- Qt Multimedia for audio player
- Poppler-Qt6 for PDF preview thumbnails
- Bridge functions for file metadata, reading progress

## Estimated New Files
- ~20 new QML files
- ~1 new controller file
- ~2 test files
