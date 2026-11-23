import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import Synapse.Media 1.0

Rectangle {
    id: root
    anchors.fill: parent
    color: "#80000000"
    visible: false
    z: 200

    property var fileItem: null
    property bool isPlaying: false
    property double currentTime: 0
    property double duration: 0
    property double volume: 0.8
    property bool isMuted: false

    signal closeRequested()

    MpvPlayerItem {
        id: audioPlayer
        visible: false
        width: 1
        height: 1
        volume: root.volume * 100
        muted: root.isMuted
        onPositionChanged: {
            if (!scrubSlider.pressed) root.currentTime = position
        }
        onDurationChanged: {
            if (duration > 0) root.duration = duration
        }
        onPausedChanged: {
            root.isPlaying = !paused
        }
        onEndOfFile: {
            root.isPlaying = false
            root.currentTime = 0
        }
        onPlaybackError: function(msg) {
            console.warn("[FilesAudioPlayerModal] Erro de reprodução:", msg)
        }
    }

    function openForFile(item) {
        fileItem = item
        currentTime = 0
        duration = 0
        visible = true
        var path = ""
        if (item) {
            path = item.local_path || item.file_path || item.path || ""
        }
        if (path.length > 0) {
            audioPlayer.source = path
            audioPlayer.play()
            isPlaying = true
        } else {
            isPlaying = false
        }
    }

    function closeModal() {
        audioPlayer.pause()
        audioPlayer.source = ""
        isPlaying = false
        visible = false
        closeRequested()
    }

    function formatTime(secs) {
        if (isNaN(secs) || secs < 0) return "00:00"
        var m = Math.floor(secs / 60)
        var s = Math.floor(secs % 60)
        return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s
    }

    MouseArea {
        anchors.fill: parent
        onClicked: root.closeModal()
    }

    Rectangle {
        id: card
        width: Math.min(parent.width - 32, 460)
        implicitHeight: contentCol.implicitHeight + 36
        anchors.centerIn: parent
        radius: 16
        color: "#161524"
        border.color: "#25ffffff"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: contentCol
            anchors.fill: parent
            anchors.margins: 20
            spacing: 16

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Text { text: "🎵"; font.pixelSize: 22 }
                ColumnLayout {
                    spacing: 2
                    Text {
                        text: root.fileItem ? (root.fileItem.name || root.fileItem.title || "Áudio") : "Reprodução de Áudio"
                        color: "#fffffe"
                        font.pixelSize: 16
                        font.bold: true
                        elide: Text.ElideRight
                        Layout.maximumWidth: 320
                    }
                    Text {
                        text: "Decodificação MPV nativa de alta fidelidade"
                        color: "#818cf8"
                        font.pixelSize: 11
                    }
                }

                Item { Layout.fillWidth: true }

                Rectangle {
                    width: 28; height: 28; radius: 6
                    color: "#15ffffff"
                    Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.closeModal()
                    }
                }
            }

            // Waveform visual bars
            RowLayout {
                Layout.fillWidth: true
                Layout.preferredHeight: 48
                spacing: 4

                Repeater {
                    model: 28
                    delegate: Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 12 + Math.abs(Math.sin((index + root.currentTime) * 0.4)) * (root.isPlaying ? 32 : 10)
                        radius: 2
                        color: root.duration > 0 && (index / 28.0) <= (root.currentTime / root.duration) ? "#818cf8" : "#28273c"
                    }
                }
            }

            // Scrubber
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4

                Slider {
                    id: scrubSlider
                    Layout.fillWidth: true
                    from: 0
                    to: Math.max(1, root.duration)
                    value: root.currentTime
                    onMoved: {
                        root.currentTime = value
                        audioPlayer.position = value
                    }

                    background: Rectangle {
                        x: parent.leftPadding
                        y: parent.topPadding + parent.availableHeight / 2 - height / 2
                        implicitWidth: 200
                        implicitHeight: 4
                        width: parent.availableWidth
                        height: implicitHeight
                        radius: 2
                        color: "#28273c"

                        Rectangle {
                            width: root.duration > 0 ? (parent.width * (root.currentTime / root.duration)) : 0
                            height: parent.height
                            color: "#6366f1"
                            radius: 2
                        }
                    }

                    handle: Rectangle {
                        x: parent.leftPadding + parent.visualPosition * (parent.availableWidth - width)
                        y: parent.topPadding + parent.availableHeight / 2 - height / 2
                        implicitWidth: 14
                        implicitHeight: 14
                        radius: 7
                        color: "#ffffff"
                        border.color: "#6366f1"
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    Text { text: root.formatTime(root.currentTime); color: "#a7a9be"; font.pixelSize: 11 }
                    Item { Layout.fillWidth: true }
                    Text { text: root.formatTime(root.duration); color: "#a7a9be"; font.pixelSize: 11 }
                }
            }

            // Controls bar
            RowLayout {
                Layout.alignment: Qt.AlignHCenter
                spacing: 20

                // Rewind 5s
                Button {
                    Layout.preferredWidth: 36
                    Layout.preferredHeight: 36
                    text: "⏪"
                    onClicked: audioPlayer.seekRelative(-5)
                    background: Rectangle { color: parent.hovered ? "#28273c" : "transparent"; radius: 18 }
                    contentItem: Text { text: parent.text; font.pixelSize: 14; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }

                // Play / Pause
                Button {
                    Layout.preferredWidth: 48
                    Layout.preferredHeight: 48
                    text: root.isPlaying ? "❚❚" : "▶"
                    onClicked: audioPlayer.togglePlay()
                    background: Rectangle { color: "#6366f1"; radius: 24 }
                    contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 16; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }

                // Forward 5s
                Button {
                    Layout.preferredWidth: 36
                    Layout.preferredHeight: 36
                    text: "⏩"
                    onClicked: audioPlayer.seekRelative(5)
                    background: Rectangle { color: parent.hovered ? "#28273c" : "transparent"; radius: 18 }
                    contentItem: Text { text: parent.text; font.pixelSize: 14; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }
            }
        }
    }

    Shortcut {
        sequence: "Escape"
        enabled: root.visible
        onActivated: root.closeModal()
    }
}
