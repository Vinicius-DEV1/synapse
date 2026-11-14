import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: controlsRoot
    anchors.fill: parent

    property var activeVideo: null
    property double currentPos: 0
    property double videoDuration: 0
    property double currentSpeed: 1.0
    property double currentVolume: 100
    property bool muted: mediaPlayer && typeof mediaPlayer.muted === "boolean" ? mediaPlayer.muted : false
    property bool isPlaying: false
    property int bookmarksCount: 0
    property bool isVocabDrawerOpen: false
    property bool shortcutsBlocked: false
    property var mediaPlayer: null
    property var controller: null
    property bool isPlayerFullscreen: false
    property bool showControls: true
    property bool isHoveringControls: false

    signal exitRequested()
    signal speedChanged(double speed)
    signal vocabDrawerToggled()
    signal playPauseToggled()
    signal seekRelativeRequested(int seconds)
    signal seekAbsoluteRequested(double seconds)
    signal volumeChanged(double volume)
    signal fullscreenToggled()

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return "00:00"
        var minutes = Math.floor(seconds / 60)
        var remainder = Math.floor(seconds % 60)
        var hours = Math.floor(minutes / 60)
        minutes %= 60
        if (hours > 0) {
            return hours + ":" + (minutes < 10 ? "0" : "") + minutes + ":" +
                   (remainder < 10 ? "0" : "") + remainder
        }
        return (minutes < 10 ? "0" : "") + minutes + ":" +
               (remainder < 10 ? "0" : "") + remainder
    }

    Timer {
        id: autoHideTimer
        interval: 3000
        repeat: false
        onTriggered: {
            if (controlsRoot.isPlaying && !controlsRoot.isHoveringControls) {
                controlsRoot.showControls = false
            }
        }
    }

    function resetControls() {
        controlsRoot.showControls = true
        if (controlsRoot.isPlaying && !controlsRoot.isHoveringControls) {
            autoHideTimer.restart()
        }
    }

    onIsPlayingChanged: {
        if (isPlaying) {
            autoHideTimer.restart()
        } else {
            showControls = true
            autoHideTimer.stop()
        }
    }

    VideoPlayerToolbar {
        id: topToolbar
        activeVideo: controlsRoot.activeVideo
        currentSpeed: controlsRoot.currentSpeed
        bookmarksCount: controlsRoot.bookmarksCount
        isVocabDrawerOpen: controlsRoot.isVocabDrawerOpen
        shortcutsBlocked: controlsRoot.shortcutsBlocked
        mediaPlayer: controlsRoot.mediaPlayer
        controller: controlsRoot.controller
        opacity: controlsRoot.showControls ? 1.0 : 0.0
        visible: opacity > 0

        Behavior on opacity {
            NumberAnimation { duration: 240; easing.type: Easing.OutCubic }
        }

        onExitRequested: controlsRoot.exitRequested()
        onSpeedRequested: function(speed) { controlsRoot.speedChanged(speed) }
        onVocabDrawerRequested: controlsRoot.vocabDrawerToggled()
        onPlayPauseRequested: controlsRoot.playPauseToggled()
        onSeekRelativeRequested: function(seconds) { controlsRoot.seekRelativeRequested(seconds) }
        onFullscreenRequested: controlsRoot.fullscreenToggled()
    }

    Rectangle {
        id: bottomControlsBar
        anchors.bottom: parent.bottom
        anchors.left: parent.left
        anchors.right: parent.right
        height: 80
        color: "#cc0f0e17"
        opacity: controlsRoot.showControls ? 1.0 : 0.0
        visible: opacity > 0

        Behavior on opacity {
            NumberAnimation { duration: 240; easing.type: Easing.OutCubic }
        }

        MouseArea {
            anchors.fill: parent
            hoverEnabled: true
            onEntered: {
                controlsRoot.isHoveringControls = true
                controlsRoot.showControls = true
                autoHideTimer.stop()
            }
            onExited: {
                controlsRoot.isHoveringControls = false
                if (controlsRoot.isPlaying) autoHideTimer.restart()
            }
            propagateComposedEvents: true
        }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 12
            spacing: 8

            Slider {
                id: positionSlider
                Layout.fillWidth: true
                from: 0
                to: controlsRoot.videoDuration > 0 ? controlsRoot.videoDuration : 100
                value: controlsRoot.currentPos
                onMoved: {
                    controlsRoot.resetControls()
                    controlsRoot.seekAbsoluteRequested(value)
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 16

                Rectangle {
                    Layout.preferredWidth: 36
                    Layout.preferredHeight: 36
                    radius: 18
                    color: "#6366f1"
                    Text {
                        anchors.centerIn: parent
                        text: controlsRoot.isPlaying ? "❚❚" : "▶"
                        color: "#ffffff"
                        font.pixelSize: 14
                    }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            controlsRoot.resetControls()
                            controlsRoot.playPauseToggled()
                        }
                    }
                }

                Text {
                    text: "⏪ 5s"
                    color: "#a7a9be"
                    font.pixelSize: 12
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            controlsRoot.resetControls()
                            controlsRoot.seekRelativeRequested(-5)
                        }
                    }
                }

                Text {
                    text: "5s ⏩"
                    color: "#a7a9be"
                    font.pixelSize: 12
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            controlsRoot.resetControls()
                            controlsRoot.seekRelativeRequested(5)
                        }
                    }
                }

                Text {
                    text: controlsRoot.formatTime(controlsRoot.currentPos) + " / " +
                          controlsRoot.formatTime(controlsRoot.videoDuration)
                    color: "#fffffe"
                    font.pixelSize: 12
                }

                RowLayout {
                    spacing: 6
                    ToolButton {
                        id: muteButton
                        text: controlsRoot.muted || controlsRoot.currentVolume <= 0 ? "◖" : "◖♪"
                        Accessible.name: controlsRoot.muted ? "Unmute video" : "Mute video"
                        onClicked: {
                            controlsRoot.resetControls()
                            if (controlsRoot.mediaPlayer) controlsRoot.mediaPlayer.toggleMute()
                        }
                        contentItem: Text {
                            text: muteButton.text
                            color: "#a7a9be"
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        background: Rectangle { color: "transparent" }
                    }
                    Slider {
                        Layout.preferredWidth: 112
                        from: 0
                        to: 100
                        value: controlsRoot.muted ? 0 : controlsRoot.currentVolume
                        Accessible.name: "Playback volume"
                        onMoved: {
                            controlsRoot.resetControls()
                            controlsRoot.volumeChanged(value)
                            if (controlsRoot.muted && value > 0 && controlsRoot.mediaPlayer) {
                                controlsRoot.mediaPlayer.toggleMute()
                            }
                        }
                    }
                }

                Item { Layout.fillWidth: true }

                Text {
                    text: "[J/L] ±5s • [F] Tela Cheia • [Shift+>/<] Speed"
                    color: "#64748b"
                    font.pixelSize: 11
                }

                // Dedicated Fullscreen Toggle Button in bottom controls bar
                ToolButton {
                    id: bottomFullscreenBtn
                    Layout.preferredWidth: 32
                    Layout.preferredHeight: 32
                    text: controlsRoot.isPlayerFullscreen ? "⤢" : "⛶"
                    Accessible.name: controlsRoot.isPlayerFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"
                    onClicked: {
                        controlsRoot.resetControls()
                        controlsRoot.fullscreenToggled()
                    }
                    contentItem: Text {
                        text: bottomFullscreenBtn.text
                        color: "#e4e4e7"
                        font.pixelSize: 16
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle {
                        radius: 6
                        color: bottomFullscreenBtn.down ? "#33ffffff" : (bottomFullscreenBtn.hovered ? "#15ffffff" : "transparent")
                    }
                }
            }
        }
    }
}
