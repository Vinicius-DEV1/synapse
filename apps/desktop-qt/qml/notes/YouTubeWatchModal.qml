import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import Synapse.Media 1.0

Rectangle {
    id: ytWatchRoot
    anchors.fill: parent
    z: 120
    visible: false
    color: "#09090b"

    property string url: ""
    property string videoTitle: "Vídeo do YouTube"
    property string channelName: ""
    property bool isFullscreen: false

    signal closeRequested()

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds) || seconds < 0) return "00:00"
        var s = Math.floor(seconds)
        var m = Math.floor(s / 60)
        var h = Math.floor(m / 60)
        s = s % 60
        m = m % 60
        if (h > 0) {
            return (h < 10 ? "0" + h : h) + ":" + (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s)
        }
        return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s)
    }

    onVisibleChanged: {
        if (visible) {
            if (url.length > 0) {
                mpvPlayer.source = url
                mpvPlayer.play()
            }
        } else {
            mpvPlayer.pause()
            mpvPlayer.source = ""
        }
    }

    Shortcut {
        sequence: "Escape"
        enabled: ytWatchRoot.visible
        onActivated: {
            if (ytWatchRoot.isFullscreen) {
                ytWatchRoot.isFullscreen = false
            } else {
                ytWatchRoot.closeRequested()
            }
        }
    }

    Shortcut {
        sequence: "Space"
        enabled: ytWatchRoot.visible
        onActivated: mpvPlayer.togglePlay()
    }

    Shortcut {
        sequence: "Left"
        enabled: ytWatchRoot.visible
        onActivated: mpvPlayer.seekRelative(-5)
    }

    Shortcut {
        sequence: "Right"
        enabled: ytWatchRoot.visible
        onActivated: mpvPlayer.seekRelative(5)
    }

    Shortcut {
        sequence: "M"
        enabled: ytWatchRoot.visible
        onActivated: mpvPlayer.toggleMute()
    }

    Shortcut {
        sequence: "F"
        enabled: ytWatchRoot.visible
        onActivated: ytWatchRoot.isFullscreen = !ytWatchRoot.isFullscreen
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // Top Navigation & Title Bar (hidden in fullscreen unless hovered)
        Rectangle {
            id: topBar
            Layout.fillWidth: true
            Layout.preferredHeight: 52
            visible: !ytWatchRoot.isFullscreen || headerMouseArea.containsMouse
            color: "#0f0f12"
            border.color: "#18ffffff"

            MouseArea {
                id: headerMouseArea
                anchors.fill: parent
                hoverEnabled: true
            }

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 16
                anchors.rightMargin: 16
                spacing: 12

                Rectangle {
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 20
                    radius: 4
                    color: "#dc2626"
                    Text {
                        anchors.centerIn: parent
                        text: "▶"
                        color: "#ffffff"
                        font.pixelSize: 10
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text {
                        text: ytWatchRoot.videoTitle
                        color: "#f4f4f5"
                        font.pixelSize: 13
                        font.bold: true
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }
                    Text {
                        text: ytWatchRoot.channelName.length > 0 ? ytWatchRoot.channelName : ytWatchRoot.url
                        color: "#71717a"
                        font.pixelSize: 11
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }
                }

                Button {
                    id: openExternalBtn
                    text: qsTr("Abrir no Navegador")
                    flat: true
                    onClicked: Qt.openUrlExternally(ytWatchRoot.url)
                    contentItem: Text {
                        text: openExternalBtn.text
                        color: "#a1a1aa"
                        font.pixelSize: 11
                    }
                }

                ToolButton {
                    id: closeBtn
                    text: "✕"
                    implicitWidth: 32
                    implicitHeight: 32
                    onClicked: ytWatchRoot.closeRequested()
                    contentItem: Text {
                        text: closeBtn.text
                        color: "#a1a1aa"
                        font.pixelSize: 16
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle {
                        color: closeBtn.hovered ? "#22ffffff" : "transparent"
                        radius: 6
                    }
                }
            }
        }

        // Center MPV Player Area
        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true

            MpvVideoPlayer {
                id: mpvPlayer
                anchors.fill: parent
                interactiveSubtitles: true
            }

            // Subtitle Display Overlay
            Rectangle {
                anchors.bottom: parent.bottom
                anchors.bottomMargin: 24
                anchors.horizontalCenter: parent.horizontalCenter
                width: Math.min(parent.width - 48, subText.implicitWidth + 32)
                height: subText.implicitHeight + 16
                radius: 8
                color: "#cc000000"
                visible: mpvPlayer.currentSubtitle.length > 0

                Text {
                    id: subText
                    anchors.centerIn: parent
                    text: mpvPlayer.currentSubtitle
                    color: "#ffffff"
                    font.pixelSize: 16
                    font.bold: true
                    wrapMode: Text.Wrap
                    horizontalAlignment: Text.AlignHCenter
                }
            }
        }

        // Bottom Controls Bar
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 56
            color: "#0f0f12"
            border.color: "#18ffffff"

            ColumnLayout {
                anchors.fill: parent
                anchors.leftMargin: 16
                anchors.rightMargin: 16
                anchors.topMargin: 4
                anchors.bottomMargin: 6
                spacing: 2

                // Scrubber Progress Bar
                Slider {
                    id: positionSlider
                    Layout.fillWidth: true
                    from: 0
                    to: Math.max(1, mpvPlayer.duration)
                    value: mpvPlayer.position
                    onMoved: mpvPlayer.setPosition(value)
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    ToolButton {
                        id: playPauseBtn
                        text: mpvPlayer.paused ? "▶" : "⏸"
                        implicitWidth: 32
                        implicitHeight: 32
                        onClicked: mpvPlayer.togglePlay()
                        contentItem: Text {
                            text: playPauseBtn.text
                            color: "#ffffff"
                            font.pixelSize: 14
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }

                    Text {
                        text: ytWatchRoot.formatTime(mpvPlayer.position) + " / " + ytWatchRoot.formatTime(mpvPlayer.duration)
                        color: "#a1a1aa"
                        font.pixelSize: 11
                        font.family: "Monospace"
                    }

                    Item { Layout.fillWidth: true }

                    ToolButton {
                        id: muteBtn
                        text: mpvPlayer.muted ? "🔇" : "🔊"
                        implicitWidth: 28
                        implicitHeight: 28
                        onClicked: mpvPlayer.toggleMute()
                        contentItem: Text {
                            text: muteBtn.text
                            color: "#a1a1aa"
                            font.pixelSize: 13
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }

                    Slider {
                        id: volumeSlider
                        Layout.preferredWidth: 80
                        from: 0
                        to: 100
                        value: mpvPlayer.volume
                        onMoved: mpvPlayer.setVolume(value)
                    }

                    ToolButton {
                        id: fsBtn
                        text: ytWatchRoot.isFullscreen ? "🗗" : "⛶"
                        implicitWidth: 28
                        implicitHeight: 28
                        onClicked: ytWatchRoot.isFullscreen = !ytWatchRoot.isFullscreen
                        contentItem: Text {
                            text: fsBtn.text
                            color: "#a1a1aa"
                            font.pixelSize: 14
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }
            }
        }
    }
}
