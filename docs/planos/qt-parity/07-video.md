# 07 — Video

> **Status**: ✅ Complete | **Complexity**: 🟡 Medium | **Priority**: P2
>
> MPV player, gallery with folders/collections, interactive subtitles, video info modal, track selection, resume prompt, keyboard shortcuts, moments drawer, player controls, upload modal with success feedback, YouTube downloader modal with subtitle selector, vocabulary sidebar, quality selector, and video view modals host are all fully implemented and verified in Qt.

---

## React Reference
- **Components**: `apps/web-react/src/components/video/` (36 files)
- **Hooks**: 11 hooks in `hooks/`
- **Services**: `apps/web-react/src/services/video/` (8 files)

## Qt Existing
- **QML**: `VideoPlayerView.qml`, `VideoPlayerSurface.qml`, `VideoPlayerControls.qml`, `VideoPlayerToolbar.qml`, `VideoPlayerShortcuts.qml`, `VideoGallerySection.qml`, `VideoGalleryItem.qml`, `VideoGalleryHeader.qml`, `VideoGalleryPreferences.qml`, `VideoGalleryCollections.qml`, `VideoGalleryFolderCard.qml`, `VideoInteractiveSubtitles.qml`, `VideoInfoDialog.qml`, `VideoInfoDialogHost.qml`, `VideoInfoDialogTabs.qml`, `VideoInfoTracksPanel.qml`, `VideoInfoStoragePanel.qml`, `VideoInfoAudioTracksPanel.qml`, `VideoTrackSelector.qml`, `VideoResumePrompt.qml`, `VideoMomentsDrawer.qml`, `VideoMomentForm.qml`, `VideoMoveMenu.qml`, `VideoDialogs.qml`, `VideoFolderDialogs.qml`, `VideoDictionaryDialog.qml`, `VideoHelpDialog.qml`, `VideoQualitySelector.qml`, `VideoUploadSuccess.qml`, `YouTubeSubtitleSelector.qml`, `VideoVocabularySidebar.qml`, `VideoUploadModal.qml`, `YouTubeDownloadModal.qml`, `VideoModalsHost.qml`
- **Controllers**: `video_controller.cpp`, `video_catalog_controller.cpp`, `video_collections_controller.cpp`, `video_storage_controller.cpp`, `video_subtitles_controller.cpp`, `video_subtitle_import_controller.cpp`, `video_subtitle_metadata_controller.cpp`, `video_subtitle_format.cpp`, `video_subtitle_helpers.cpp`

---

## Feature Parity Table

| Feature | React File | Qt Status |
|---------|-----------|-----------|
| MPV video player surface | `VideoPlayer.tsx` | ✅ Done (native MpvPlayerItem) |
| Player controls (play/pause/seek/volume) | `ui/VideoControlsOverlay.tsx` | ✅ Done |
| Player toolbar | — | ✅ Done |
| Keyboard shortcuts | `hooks/useVideoKeyboardShortcuts.ts` | ✅ Done |
| Video gallery grid | `VideoGrid.tsx` | ✅ Done |
| Video card | `ui/VideoCard.tsx` | ✅ Done |
| Folder cards | `ui/VideoFolderCard.tsx` | ✅ Done |
| Gallery header | `ui/VideoViewHeader.tsx` | ✅ Done |
| Gallery collections | — | ✅ Done |
| Gallery preferences | — | ✅ Done |
| Interactive subtitles | `InteractiveSubtitles.tsx` | ✅ Done |
| Video info modal (overview/storage/tracks) | `VideoInfoModal.tsx`, tabs | ✅ Done |
| Track selection | `ui/TrackSelectionSection.tsx` | ✅ Done |
| Resume prompt | `ui/VideoResumePrompt.tsx` | ✅ Done |
| Moments/bookmarks drawer | — | ✅ Done |
| Move video menu | — | ✅ Done |
| Dictionary dialog | — | ✅ Done |
| Help dialog | `modals/VideoHelpModal.tsx` | ✅ Done |
| **Video upload modal** | `VideoUploadModal.tsx` | ✅ Done (`VideoUploadModal.qml`) |
| **Upload success feedback** | `ui/VideoUploadSuccess.tsx` | ✅ Done (`VideoUploadSuccess.qml`) |
| **Upload scanner (auto-detect videos)** | `hooks/useVideoUploadScanner.ts` | ✅ Done (native FFmpeg metadata extraction) |
| **YouTube download modal** | `YouTubeDownloadModal.tsx` | ✅ Done (`YouTubeDownloadModal.qml`) |
| **YouTube subtitle selector** | `ui/YouTubeSubtitleSelector.tsx` | ✅ Done (`YouTubeSubtitleSelector.qml`) |
| **Vocabulary sidebar** | `ui/VideoVocabularySidebar.tsx` | ✅ Done (`VideoVocabularySidebar.qml`) |
| **Vocabulary hook** | `hooks/useVideoVocabulary.ts` | ✅ Done (`dataController.getVideoWords`) |
| **Quality selector** | `ui/VideoQualitySelector.tsx` | ✅ Done (`VideoQualitySelector.qml`) |
| **Controls overlay (full overlay UI)** | `ui/VideoControlsOverlay.tsx` | ✅ Done |
| **Web version modal (desktop-only notice)** | `WebVersionModal.tsx` | ❌ N/A (Qt is native) |
| **Video view modals host** | `ui/VideoViewModals.tsx` | ✅ Done (`VideoModalsHost.qml`) |

---

## Implementation Specs

### Video Upload Modal
- **React**: `VideoUploadModal.tsx`, `hooks/useVideoUploadScanner.ts`
- **Create**: `qml/video/VideoUploadModal.qml`, `qml/video/VideoUploadScanner.qml`
- **Behavior**: Modal to import local video files into the managed video library. File picker (multi-select), progress bar per file, thumbnail generation, metadata extraction (duration, resolution, codec via FFmpeg). Option to organize into folders during upload. Scan for auto-detected videos in common directories.
- **Controller**: `Q_INVOKABLE void importVideos(const QStringList &paths, const QString &folderId)`, `Q_INVOKABLE QVariantList scanForVideos()`
- **Approach**: Qt already has native file dialogs. FFmpeg metadata extraction via existing `native_video_metadata.cpp`. Copy files to managed directory, create DB entries via bridge-qt.
- **Acceptance**: User selects files, sees progress, files appear in gallery with correct metadata and thumbnails.

### Upload Success Feedback
- **React**: `ui/VideoUploadSuccess.tsx`
- **Create**: `qml/video/VideoUploadSuccess.qml`
- **Behavior**: Transient success notification/card shown after successful upload. Shows count of imported videos and link to view them.
- **Acceptance**: After upload completes, success card appears briefly with video count.

### YouTube Download Modal
- **React**: `YouTubeDownloadModal.tsx`, `hooks/useYouTubeDownload.ts`
- **Create**: `qml/video/YouTubeDownloadModal.qml`
- **Behavior**: User pastes YouTube URL, app extracts metadata (title, thumbnail, duration, available formats/quality). User selects quality and whether to download subtitles. Download using `yt-dlp` CLI. Progress bar with ETA. Downloaded video is added to library.
- **Controller**: `Q_INVOKABLE void downloadYouTube(const QString &url, const QString &quality, bool withSubtitles)`
- **Approach**: Shell out to `yt-dlp` via `QProcess`, parse progress output, emit signals for progress updates.
- **Acceptance**: User pastes URL, sees video info, selects quality, download progresses with percentage, video appears in library when done.

### YouTube Subtitle Selector
- **React**: `ui/YouTubeSubtitleSelector.tsx`
- **Create**: `qml/video/YouTubeSubtitleSelector.qml`
- **Behavior**: During YouTube download, list available subtitle languages. User can select multiple. Subtitles downloaded and auto-associated with the video.
- **Acceptance**: Available subtitle languages shown, user selects, subtitles download with video.

### Vocabulary Sidebar
- **React**: `ui/VideoVocabularySidebar.tsx`, `hooks/useVideoVocabulary.ts`
- **Create**: `qml/video/VideoVocabularySidebar.qml`
- **Behavior**: Sidebar panel during video playback showing vocabulary words extracted from subtitles. User can click on a word to see dictionary definition, save word to personal vocabulary list, and see word frequency in the video. Supports look-up via external dictionary API.
- **Controller**: `Q_INVOKABLE QVariantList getVocabulary(const QString &videoId)`, `Q_INVOKABLE void saveWord(const QString &word, const QString &definition)`
- **Acceptance**: Sidebar shows vocabulary during playback, clicking a word shows definition, saved words persist.

### Quality Selector
- **React**: `ui/VideoQualitySelector.tsx`
- **Create**: `qml/video/VideoQualitySelector.qml`
- **Behavior**: Dropdown in player controls to select video quality when multiple tracks are available. Shows resolution (1080p, 720p, 480p, etc.) and codec info.
- **Approach**: MPV supports `vid` property switching. List available video tracks from `MpvPlayerItem::videoTracks()`.
- **Acceptance**: Quality options appear in dropdown, selecting changes playback quality.

### Video View Modals Host
- **React**: `ui/VideoViewModals.tsx`
- **Create**: `qml/video/VideoModalsHost.qml`
- **Behavior**: Centralized modal management for video view — ensures only one modal is open at a time, passes context between modals (e.g., upload → upload success).
- **Acceptance**: Modals don't overlap, transitions are smooth.

---

## Dependencies
- `yt-dlp` binary for YouTube downloads (sidecar binary)
- FFmpeg for metadata extraction (already available)
- Dictionary API for vocabulary (optional, can use offline dictionary)

## Estimated New Files
- ~7 new QML files
- ~1 controller extension
- ~1 test file
