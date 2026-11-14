import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import Synapse.Media 1.0

Rectangle {
    id: videoRoot
    color: "#0f0e17"

    property var videos: []
    property string selectedCollection: "__all__"
    property string selectedCollectionName: "Todos"
    property var activeVideo: null
    property bool isPlaying: false
    property double currentPos: 0
    property double videoDuration: 0
    property double currentSpeed: 1.0
    property var videoBookmarks: []
    property bool isVocabDrawerOpen: false
    property string importStatus: ""
    property string playerError: ""
    property int viewportWidth: 1366
    property double lastSavedProgressBucket: -1
    property bool durationPersisted: false
    property bool showResumePrompt: false
    property bool isPlayerFullscreen: false

    signal fullscreenToggled()

    function toggleFullscreen() {
        isPlayerFullscreen = !isPlayerFullscreen
        fullscreenToggled()
    }

    function loadVideos() {
        videos = galleryCollections.loadVideos(selectedCollection)
    }
    function applyFolderResult(result) {
        if (!result.success) { importStatus = result.message; return }
        selectedCollection = result.selectedId
        selectedCollectionName = result.selectedName
        importStatus = result.message
        loadVideos()
    }
    function selectCollection(collectionId, collectionName) { selectedCollection = collectionId; selectedCollectionName = collectionName; loadVideos() }
    function playVideo(vid) {
        if (!playerSurface.mediaPlayer) return
        playerError = ""
        var result = dataController.configureVideoPlayback(playerSurface.mediaPlayer, vid.id)
        if (!result.success) {
            playerError = result.error || "Não foi possível abrir este vídeo."
            importStatus = playerError
            return
        }
        activeVideo = vid; setSpeed(1.0); playerSurface.mediaPlayer.volume = 100; playerSurface.mediaPlayer.muted = false
        currentPos = result.progress || 0
        videoDuration = result.duration || 0
        lastSavedProgressBucket = Math.floor(currentPos / 5)
        durationPersisted = videoDuration > 0
        showResumePrompt = result.showResumePrompt === true
        loadVideoBookmarks(vid.id)
        isPlaying = !showResumePrompt
    }

    function loadVideoBookmarks(videoId) {
        if (!videoId) {
            videoBookmarks = []
            return
        }
        videoBookmarks = dataController.getVideoWords(videoId)
    }

    function jumpToTimestamp(seconds) {
        if (playerSurface.mediaPlayer) {
            playerSurface.mediaPlayer.command(["seek", seconds.toString(), "absolute"])
        }
    }

    function saveBookmark(word, note) {
        if (!activeVideo || word.trim().length === 0) return
        dataController.addVideoWord(activeVideo.id, word.trim(), note.trim(), currentPos)
        loadVideoBookmarks(activeVideo.id)
    }

    function deleteBookmark(wordId) {
        dataController.deleteVideoWord(wordId)
        if (activeVideo) {
            loadVideoBookmarks(activeVideo.id)
        }
    }

    function exitPlayer() {
        if (isPlayerFullscreen) {
            isPlayerFullscreen = false
            fullscreenToggled()
        }
        if (activeVideo && currentPos > 0) {
            dataController.updateVideoProgress(activeVideo.id, currentPos)
        }
        if (playerSurface.mediaPlayer) {
            playerSurface.mediaPlayer.command(["stop"])
            playerSurface.mediaPlayer.source = ""
            playerSurface.mediaPlayer.keyHex = ""
        }
        isPlaying = false
        showResumePrompt = false
        activeVideo = null
        playerError = ""
        loadVideos()
    }

    function setSpeed(spd) {
        currentSpeed = spd
        if (playerSurface.mediaPlayer) {
            playerSurface.mediaPlayer.command(["set", "speed", spd.toString()])
        }
    }

    function seekRelative(seconds) {
        if (playerSurface.mediaPlayer) {
            playerSurface.mediaPlayer.command(["seek", seconds.toString()])
        }
    }

    function seekAbsolute(seconds) {
        if (playerSurface.mediaPlayer) {
            playerSurface.mediaPlayer.command(["seek", seconds.toString(), "absolute"])
        }
    }

    function togglePlayPause() {
        if (playerSurface.mediaPlayer) {
            playerSurface.mediaPlayer.command(["cycle", "pause"])
            isPlaying = !isPlaying
        }
    }

    Component.onCompleted: loadVideos()
    VideoDialogs {
        id: videoDialogs
        anchors.fill: parent
        onVideoImportRequested: function(sourcePath) {
            videoRoot.importStatus = "Criptografando e adicionando vídeo…"
            galleryCollections.importVideo(sourcePath, videoRoot.selectedCollection)
        }
        onVideoDeleteConfirmed: function(video) {
            if (dataController.deleteVideo(video.id)) {
                videoRoot.importStatus = "Vídeo excluído."
                videoRoot.loadVideos()
            } else {
                videoRoot.importStatus = "Não foi possível excluir o vídeo e o arquivo local."
            }
        }
    }

    Connections {
        target: dataController
        function onFileOperationFinished(result) {
            if (result.operation === "video-subtitle-import") {
                if (!result.success) videoRoot.importStatus = result.error || "Não foi possível importar a legenda."
                videoRoot.loadVideos()
                if (videoInfoHost.video && result.videoId === videoInfoHost.video.id) {
                    for (var i = 0; i < videoRoot.videos.length; ++i) {
                        if (videoRoot.videos[i].id === result.videoId) {
                            videoInfoHost.video = videoRoot.videos[i]
                            break
                        }
                    }
                }
                return
            }
            if (result.operation !== "video-import") return
            videoRoot.importStatus = result.success
                ? "Vídeo importado e criptografado com sucesso."
                : (result.error || "Não foi possível importar o vídeo.")
            videoRoot.loadVideos()
        }
        function onVaultLocked() {
            if (!videoRoot.activeVideo || !videoRoot.activeVideo.file_path) return
            if (playerSurface.mediaPlayer && playerSurface.mediaPlayer.keyHex.length > 0) {
                dataController.updateVideoProgress(videoRoot.activeVideo.id, videoRoot.currentPos)
                playerSurface.mediaPlayer.command(["stop"])
                playerSurface.mediaPlayer.source = ""
                playerSurface.mediaPlayer.keyHex = ""
                videoRoot.activeVideo = null
                videoRoot.isPlaying = false
                videoRoot.showResumePrompt = false
                videoRoot.importStatus = "O cofre foi bloqueado; a reprodução criptografada foi encerrada."
            }
        }
    }

    VideoGalleryPreferences {
        id: galleryPreferences
        controller: dataController
    }

    VideoGalleryCollections {
        id: galleryCollections
        controller: dataController
    }

    VideoGallerySection {
        visible: !videoRoot.activeVideo
        viewportWidth: videoRoot.viewportWidth
        videos: videoRoot.videos
        videoFolders: galleryCollections.folders
        collections: galleryCollections.names
        selectedCollection: videoRoot.selectedCollection
        activeFolderName: videoRoot.selectedCollection === "__all__" ? "" : videoRoot.selectedCollectionName
        viewMode: galleryPreferences.viewMode

        onRefreshRequested: videoRoot.loadVideos()
        onFolderSelected: function(folderId, folderName) { videoRoot.selectCollection(folderId, folderName) }
        onBackRequested: videoRoot.selectCollection("__all__", "Todos")
        onFolderSaveRequested: function(folderId, _previousName, newName) {
            videoRoot.applyFolderResult(galleryCollections.saveFolder(
                folderId, newName, videoRoot.selectedCollection, videoRoot.selectedCollectionName))
        }
        onFolderDeleteRequested: function(folderId, _folderName) {
            videoRoot.applyFolderResult(galleryCollections.removeFolder(
                folderId, videoRoot.selectedCollection, videoRoot.selectedCollectionName))
        }
        onViewModeRequested: function(mode) { galleryPreferences.viewMode = mode }
        onImportRequested: videoDialogs.openImport()
        statusMessage: videoRoot.importStatus
        importRunning: dataController.fileOperationRunning
        onVideoSelected: function(vid) { videoRoot.playVideo(vid) }
        onVideoMoveRequested: function(vid, folderId) {
            var result = galleryCollections.moveVideo(vid.id, folderId)
            if (!result.success) { videoRoot.importStatus = result.message; return }
            videoRoot.importStatus = result.message
            videoRoot.loadVideos()
        }
        onVideoDeleted: function(vid) {
            videoDialogs.requestDelete(vid)
        }
        onVideoInfoRequested: function(vid) { videoInfoHost.openFor(vid) }
    }

    VideoInfoDialogHost {
        id: videoInfoHost
        anchors.fill: parent
        controller: dataController
        mediaPlayer: playerSurface.mediaPlayer
        onPlayRequested: function(vid) { videoRoot.playVideo(vid) }
        onVideoUpdated: videoRoot.loadVideos()
    }

    VideoPlayerSurface {
        id: playerSurface
        anchors.fill: parent
        activeVideo: videoRoot.activeVideo
        controller: dataController
        bookmarks: videoRoot.videoBookmarks
        currentPos: videoRoot.currentPos
        videoDuration: videoRoot.videoDuration
        currentSpeed: videoRoot.currentSpeed
        isPlaying: videoRoot.isPlaying
        bookmarksCount: videoRoot.videoBookmarks.length
        isVocabDrawerOpen: videoRoot.isVocabDrawerOpen
        isPlayerFullscreen: videoRoot.isPlayerFullscreen
        shortcutsBlocked: videoRoot.showResumePrompt
        showResumePrompt: videoRoot.showResumePrompt
        playerError: videoRoot.playerError

        onPositionObserved: function(position) {
            videoRoot.currentPos = position
            var bucket = Math.floor(position / 5)
            if (videoRoot.activeVideo && bucket !== videoRoot.lastSavedProgressBucket) {
                dataController.updateVideoProgress(videoRoot.activeVideo.id, position)
                videoRoot.lastSavedProgressBucket = bucket
            }
        }
        onDurationObserved: function(duration) {
            videoRoot.videoDuration = duration
            if (videoRoot.activeVideo && !videoRoot.durationPersisted && duration > 0)
                videoRoot.durationPersisted = dataController.updateVideoDuration(videoRoot.activeVideo.id, duration)
        }
        onPlayingObserved: function(playing) { videoRoot.isPlaying = playing }
        onPlaybackErrorObserved: function(message) { videoRoot.playerError = message; videoRoot.isPlaying = false }
        onEndOfFileObserved: {
            if (videoRoot.activeVideo && videoRoot.videoDuration > 0) {
                dataController.updateVideoProgress(videoRoot.activeVideo.id, videoRoot.videoDuration)
                videoRoot.lastSavedProgressBucket = Math.floor(videoRoot.videoDuration / 5)
            }
        }
        onExitRequested: videoRoot.exitPlayer()
        onSpeedRequested: function(speed) { videoRoot.setSpeed(speed) }
        onVocabDrawerToggled: videoRoot.isVocabDrawerOpen = !videoRoot.isVocabDrawerOpen
        onPlayPauseToggled: videoRoot.togglePlayPause()
        onSeekRelativeRequested: function(seconds) { videoRoot.seekRelative(seconds) }
        onSeekAbsoluteRequested: function(seconds) { videoRoot.seekAbsolute(seconds) }
        onVolumeRequested: function(volume) { playerSurface.mediaPlayer.volume = volume }
        onFullscreenToggled: videoRoot.toggleFullscreen()
        onDrawerCloseRequested: videoRoot.isVocabDrawerOpen = false
        onTimestampRequested: function(timestamp) { videoRoot.jumpToTimestamp(timestamp) }
        onBookmarkSaved: function(word, note) { videoRoot.saveBookmark(word, note) }
        onBookmarkDeleted: function(bookmarkId) { videoRoot.deleteBookmark(bookmarkId) }
        onResumeRestartRequested: {
            videoRoot.showResumePrompt = false
            videoRoot.currentPos = 0
            videoRoot.lastSavedProgressBucket = 0
            playerSurface.mediaPlayer.command(["seek", "0", "absolute"])
            playerSurface.mediaPlayer.paused = false
            videoRoot.isPlaying = true
        }
        onResumeContinueRequested: {
            videoRoot.showResumePrompt = false
            playerSurface.mediaPlayer.paused = false
            videoRoot.isPlaying = true
        }
    }
}
