import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import Synapse.Media 1.0

Rectangle {
    id: videoRoot
    color: "#0f0e17"

    property var videos: []
    property var collections: []
    property string selectedCollection: "Todos"
    property var activeVideo: null
    property bool isPlaying: false
    property double currentPos: 0
    property double videoDuration: 0
    property double currentSpeed: 1.0
    property int currentVolume: 100
    property var videoBookmarks: []
    property bool isVocabDrawerOpen: false

    function loadVideos() {
        videos = dataController.getVideos(selectedCollection === "Todos" ? "" : selectedCollection)
        var cols = dataController.getVideoCollections()
        var colList = ["Todos"]
        for (var i = 0; i < cols.length; ++i) {
            colList.push(cols[i].collection_name)
        }
        collections = colList
    }

    function selectCollection(colName) {
        selectedCollection = colName
        loadVideos()
    }

    function playVideo(vid) {
        activeVideo = vid
        loadVideoBookmarks(vid.id)
        if (mpvPlayer) {
            mpvPlayer.command(["loadfile", vid.file_path])
            if (vid.progress && vid.progress > 0) {
                mpvPlayer.command(["seek", vid.progress.toString(), "absolute"])
            }
            isPlaying = true
        }
    }

    function loadVideoBookmarks(videoId) {
        if (!videoId) {
            videoBookmarks = []
            return
        }
        videoBookmarks = dataController.getVideoWords(videoId)
    }

    function jumpToTimestamp(seconds) {
        if (mpvPlayer) {
            mpvPlayer.command(["seek", seconds.toString(), "absolute"])
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
        if (mpvPlayer) {
            mpvPlayer.command(["stop"])
        }
        isPlaying = false
        activeVideo = null
        loadVideos()
    }

    function setSpeed(spd) {
        currentSpeed = spd
        if (mpvPlayer) {
            mpvPlayer.command(["set", "speed", spd.toString()])
        }
    }

    function seekRelative(seconds) {
        if (mpvPlayer) {
            mpvPlayer.command(["seek", seconds.toString()])
        }
    }

    function seekAbsolute(seconds) {
        if (mpvPlayer) {
            mpvPlayer.command(["seek", seconds.toString(), "absolute"])
        }
    }

    function togglePlayPause() {
        if (mpvPlayer) {
            mpvPlayer.command(["cycle", "pause"])
            isPlaying = !isPlaying
        }
    }

    Component.onCompleted: {
        loadVideos()
    }

    // Keyboard navigation during playback
    Shortcut {
        sequence: "Space"
        enabled: videoRoot.activeVideo !== null
        onActivated: videoRoot.togglePlayPause()
    }
    Shortcut {
        sequence: "Left"
        enabled: videoRoot.activeVideo !== null
        onActivated: videoRoot.seekRelative(-5)
    }
    Shortcut {
        sequence: "Right"
        enabled: videoRoot.activeVideo !== null
        onActivated: videoRoot.seekRelative(5)
    }
    Shortcut {
        sequence: "Esc"
        enabled: videoRoot.activeVideo !== null
        onActivated: videoRoot.exitPlayer()
    }
    Shortcut {
        sequence: "B"
        enabled: videoRoot.activeVideo !== null
        onActivated: videoRoot.isVocabDrawerOpen = !videoRoot.isVocabDrawerOpen
    }

    // ===================================================================
    // 1. Gallery Mode
    // ===================================================================
    VideoGallerySection {
        visible: !videoRoot.activeVideo
        videos: videoRoot.videos
        collections: videoRoot.collections
        selectedCollection: videoRoot.selectedCollection

        onRefreshRequested: videoRoot.loadVideos()
        onCollectionSelected: function(colName) { videoRoot.selectCollection(colName) }
        onVideoSelected: function(vid) { videoRoot.playVideo(vid) }
        onVideoDeleted: function(vidId) {
            dataController.deleteVideo(vidId)
            videoRoot.loadVideos()
        }
    }

    // ===================================================================
    // 2. Active Video Player Mode (libmpv Hardware GPU Canvas)
    // ===================================================================
    Item {
        anchors.fill: parent
        visible: videoRoot.activeVideo !== null

        // Hardware accelerated mpv frame
        MpvVideoPlayer {
            id: mpvPlayer
            anchors.fill: parent

            onPositionChanged: function(pos) {
                videoRoot.currentPos = pos
                if (videoRoot.activeVideo && Math.floor(pos) % 5 === 0) {
                    dataController.updateVideoProgress(videoRoot.activeVideo.id, pos)
                }
            }

            onDurationChanged: function(dur) {
                videoRoot.videoDuration = dur
            }
        }

        // Top Navigation Bar and Bottom Controls Bar
        VideoPlayerControls {
            activeVideo: videoRoot.activeVideo
            currentPos: videoRoot.currentPos
            videoDuration: videoRoot.videoDuration
            currentSpeed: videoRoot.currentSpeed
            isPlaying: videoRoot.isPlaying
            bookmarksCount: videoRoot.videoBookmarks.length
            isVocabDrawerOpen: videoRoot.isVocabDrawerOpen

            onExitRequested: videoRoot.exitPlayer()
            onSpeedChanged: function(spd) { videoRoot.setSpeed(spd) }
            onVocabDrawerToggled: videoRoot.isVocabDrawerOpen = !videoRoot.isVocabDrawerOpen
            onPlayPauseToggled: videoRoot.togglePlayPause()
            onSeekRelativeRequested: function(secs) { videoRoot.seekRelative(secs) }
            onSeekAbsoluteRequested: function(secs) { videoRoot.seekAbsolute(secs) }
        }

        // Right Vocabulary & Moments Drawer
        VideoMomentsDrawer {
            visible: videoRoot.isVocabDrawerOpen
            bookmarks: videoRoot.videoBookmarks
            currentPos: videoRoot.currentPos

            onCloseRequested: videoRoot.isVocabDrawerOpen = false
            onJumpRequested: function(ts) { videoRoot.jumpToTimestamp(ts) }
            onBookmarkSaved: function(word, note) { videoRoot.saveBookmark(word, note) }
            onBookmarkDeleted: function(bId) { videoRoot.deleteBookmark(bId) }
        }
    }
}
