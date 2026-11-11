import QtQuick 2.15
import Synapse.Media 1.0

Item {
    id: surfaceRoot
    anchors.fill: parent
    visible: activeVideo !== null

    property alias mediaPlayer: mpvPlayer
    property var activeVideo: null
    property var controller: null
    property var bookmarks: []
    property double currentPos: 0
    property double videoDuration: 0
    property double currentSpeed: 1.0
    property bool isPlaying: false
    property int bookmarksCount: 0
    property bool isVocabDrawerOpen: false
    property bool shortcutsBlocked: false
    property bool showResumePrompt: false
    property string playerError: ""

    signal positionObserved(double position)
    signal durationObserved(double duration)
    signal playingObserved(bool playing)
    signal playbackErrorObserved(string message)
    signal endOfFileObserved()
    signal exitRequested()
    signal speedRequested(double speed)
    signal vocabDrawerToggled()
    signal playPauseToggled()
    signal seekRelativeRequested(int seconds)
    signal seekAbsoluteRequested(double seconds)
    signal volumeRequested(double volume)
    signal drawerCloseRequested()
    signal timestampRequested(double timestamp)
    signal bookmarkSaved(string word, string note)
    signal bookmarkDeleted(string bookmarkId)
    signal resumeRestartRequested()
    signal resumeContinueRequested()

    MpvVideoPlayer {
        id: mpvPlayer
        anchors.fill: parent

        onPositionChanged: surfaceRoot.positionObserved(mpvPlayer.position)
        onDurationChanged: surfaceRoot.durationObserved(mpvPlayer.duration)
        onPausedChanged: surfaceRoot.playingObserved(!mpvPlayer.paused)
        onPlaybackError: function(message) { surfaceRoot.playbackErrorObserved(message) }
        onEndOfFile: surfaceRoot.endOfFileObserved()
    }

    Rectangle {
        visible: surfaceRoot.playerError.length > 0
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 560)
        height: 72
        radius: 10
        color: "#e61c1b27"
        border.color: "#668f4155"
        Text {
            anchors.fill: parent
            anchors.margins: 16
            text: surfaceRoot.playerError
            color: "#fda4af"
            wrapMode: Text.Wrap
            verticalAlignment: Text.AlignVCenter
            horizontalAlignment: Text.AlignHCenter
        }
    }

    VideoPlayerControls {
        activeVideo: surfaceRoot.activeVideo
        mediaPlayer: mpvPlayer
        controller: surfaceRoot.controller
        currentPos: surfaceRoot.currentPos
        videoDuration: surfaceRoot.videoDuration
        currentSpeed: surfaceRoot.currentSpeed
        currentVolume: mpvPlayer.volume
        isPlaying: surfaceRoot.isPlaying
        shortcutsBlocked: surfaceRoot.shortcutsBlocked
        bookmarksCount: surfaceRoot.bookmarksCount
        isVocabDrawerOpen: surfaceRoot.isVocabDrawerOpen

        onExitRequested: surfaceRoot.exitRequested()
        onSpeedChanged: function(speed) { surfaceRoot.speedRequested(speed) }
        onVocabDrawerToggled: surfaceRoot.vocabDrawerToggled()
        onPlayPauseToggled: surfaceRoot.playPauseToggled()
        onSeekRelativeRequested: function(seconds) { surfaceRoot.seekRelativeRequested(seconds) }
        onSeekAbsoluteRequested: function(seconds) { surfaceRoot.seekAbsoluteRequested(seconds) }
        onVolumeChanged: function(volume) { surfaceRoot.volumeRequested(volume) }
    }

    VideoMomentsDrawer {
        visible: surfaceRoot.isVocabDrawerOpen
        bookmarks: surfaceRoot.bookmarks
        currentPos: surfaceRoot.currentPos

        onCloseRequested: surfaceRoot.drawerCloseRequested()
        onJumpRequested: function(timestamp) { surfaceRoot.timestampRequested(timestamp) }
        onBookmarkSaved: function(word, note) { surfaceRoot.bookmarkSaved(word, note) }
        onBookmarkDeleted: function(bookmarkId) { surfaceRoot.bookmarkDeleted(bookmarkId) }
    }

    VideoResumePrompt {
        visible: surfaceRoot.showResumePrompt
        savedProgress: surfaceRoot.currentPos
        onRestartRequested: surfaceRoot.resumeRestartRequested()
        onResumeRequested: surfaceRoot.resumeContinueRequested()
    }
}
