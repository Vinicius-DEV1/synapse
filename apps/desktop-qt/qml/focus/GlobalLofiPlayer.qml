import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import Synapse.Media 1.0

Item {
    id: globalLofiRoot
    z: 9999

    property var activeTrack: null
    property bool isPlaying: false
    property bool isExpanded: false
    property double currentTime: 0
    property double trackDuration: 0
    property double playerVolume: 0.75

    function playTrack(track) {
        if (!track) return
        activeTrack = track
        isPlaying = true
        isExpanded = true
        if (track.file_path) {
            audioBackend.command(["loadfile", track.file_path])
            audioBackend.volume = playerVolume * 100
        }
    }

    function togglePlay() {
        if (!activeTrack) return
        isPlaying = !isPlaying
        audioBackend.togglePlay()
    }

    function stopTrack() {
        audioBackend.command(["stop"])
        activeTrack = null
        isPlaying = false
        isExpanded = false
        currentTime = 0
        trackDuration = 0
    }

    // Headless MPV engine instance dedicated to audio & ambient lofi playback
    MpvVideoPlayer {
        id: audioBackend
        visible: false
        width: 0
        height: 0

        onPositionChanged: {
            globalLofiRoot.currentTime = audioBackend.position
        }

        onDurationChanged: {
            if (audioBackend.duration > 0) {
                globalLofiRoot.trackDuration = audioBackend.duration
            } else if (globalLofiRoot.activeTrack && globalLofiRoot.activeTrack.duration > 0) {
                globalLofiRoot.trackDuration = globalLofiRoot.activeTrack.duration
            }
        }

        onEndOfFile: {
            if (globalLofiRoot.activeTrack && globalLofiRoot.activeTrack.file_path) {
                audioBackend.command(["loadfile", globalLofiRoot.activeTrack.file_path])
            }
        }
    }

    visible: activeTrack !== null

    anchors.left: parent.left
    anchors.bottom: parent.bottom
    anchors.margins: 20
    width: isExpanded ? 280 : 48
    height: isExpanded ? 116 : 48

    Behavior on width { NumberAnimation { duration: 250; easing.type: Easing.OutCubic } }
    Behavior on height { NumberAnimation { duration: 250; easing.type: Easing.OutCubic } }

    Rectangle {
        id: expandedCard
        anchors.fill: parent
        radius: isExpanded ? 16 : 24
        color: isExpanded ? "#181726" : (bubbleView.isHovered ? "#26223b" : "#1f1d2e")
        border.color: isExpanded ? "#ffffff14" : (globalLofiRoot.isPlaying ? "#8b5cf680" : "#ffffff1a")
        border.width: 1
        clip: true

        Behavior on radius { NumberAnimation { duration: 200 } }
        Behavior on color { ColorAnimation { duration: 150 } }

        // Subtle Drop Shadow Effect
        Rectangle {
            anchors.fill: parent
            anchors.margins: -1
            radius: parent.radius
            color: "transparent"
            border.color: globalLofiRoot.isPlaying ? "#8b5cf633" : "transparent"
            border.width: 2
            visible: globalLofiRoot.isPlaying
        }

        // 1. Minimized View (Bubble Mode)
        LofiBubbleView {
            id: bubbleView
            visible: !globalLofiRoot.isExpanded
            isPlaying: globalLofiRoot.isPlaying
            onExpandRequested: globalLofiRoot.isExpanded = true
        }

        // 2. Full Expanded Mini Player View
        LofiMiniCardView {
            visible: globalLofiRoot.isExpanded
            opacity: globalLofiRoot.isExpanded ? 1.0 : 0.0
            activeTrack: globalLofiRoot.activeTrack
            isPlaying: globalLofiRoot.isPlaying
            currentTime: globalLofiRoot.currentTime
            trackDuration: globalLofiRoot.trackDuration
            playerVolume: globalLofiRoot.playerVolume

            Behavior on opacity { NumberAnimation { duration: 200 } }

            onTogglePlayRequested: globalLofiRoot.togglePlay()
            onStopTrackRequested: globalLofiRoot.stopTrack()
            onMinimizeRequested: globalLofiRoot.isExpanded = false
            onVolumeChanged: function(vol) {
                globalLofiRoot.playerVolume = vol
                audioBackend.volume = vol * 100
            }
        }
    }
}
