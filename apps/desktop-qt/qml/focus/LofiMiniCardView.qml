import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: miniCardRoot
    anchors.fill: parent
    anchors.margins: 12
    spacing: 8

    property var activeTrack: null
    property bool isPlaying: false
    property double currentTime: 0
    property double trackDuration: 0
    property double playerVolume: 0.75

    signal togglePlayRequested()
    signal stopTrackRequested()
    signal minimizeRequested()
    signal volumeChanged(double vol)

    function formatTime(sec) {
        if (!sec || isNaN(sec) || sec < 0) return "0:00"
        var s = Math.floor(sec)
        var m = Math.floor(s / 60)
        var h = Math.floor(m / 60)
        s = s % 60
        m = m % 60
        var sStr = s < 10 ? "0" + s : "" + s
        if (h > 0) {
            var mStr = m < 10 ? "0" + m : "" + m
            return h + ":" + mStr + ":" + sStr
        }
        return m + ":" + sStr
    }

    // Top Header: Icon + Titles + Minimize + Close
    RowLayout {
        Layout.fillWidth: true
        spacing: 10

        // Equalizer Icon Badge
        Rectangle {
            width: 32
            height: 32
            radius: 8
            color: "#268b5cf6"
            border.color: "#408b5cf6"
            border.width: 1

            Text {
                anchors.centerIn: parent
                text: miniCardRoot.isPlaying ? "🔊" : "🎧"
                font.pixelSize: 14
            }
        }

        // Title & Subtitle Info
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2

            Text {
                Layout.fillWidth: true
                text: miniCardRoot.activeTrack ? (miniCardRoot.activeTrack.title || miniCardRoot.activeTrack.original_name || "Trilha Lofi") : ""
                color: "#fffffe"
                font.pixelSize: 12
                font.bold: true
                elide: Text.ElideRight
            }

            RowLayout {
                spacing: 6
                Text {
                    text: "LOFI STATION"
                    color: "#a855f7"
                    font.pixelSize: 9
                    font.bold: true
                    font.letterSpacing: 0.8
                }
                Text {
                    text: "•"
                    color: "#33ffffff"
                    font.pixelSize: 8
                }
                Text {
                    text: miniCardRoot.formatTime(miniCardRoot.currentTime) + " / " + miniCardRoot.formatTime(miniCardRoot.trackDuration || (miniCardRoot.activeTrack ? miniCardRoot.activeTrack.duration : 0))
                    color: "#94a3b8"
                    font.pixelSize: 10
                    font.family: "monospace"
                }
            }
        }

        // Minimize Button
        Rectangle {
            width: 22
            height: 22
            radius: 11
            color: minimizeMouse.containsMouse ? "#1fffffff" : "transparent"

            Text {
                anchors.centerIn: parent
                text: "⌄"
                color: "#94a3b8"
                font.pixelSize: 14
                font.bold: true
            }

            MouseArea {
                id: minimizeMouse
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                hoverEnabled: true
                onClicked: miniCardRoot.minimizeRequested()
            }
        }

        // Stop / Close Button
        Rectangle {
            width: 22
            height: 22
            radius: 11
            color: closeMouse.containsMouse ? "#33f43f5e" : "transparent"

            Text {
                anchors.centerIn: parent
                text: "✕"
                color: closeMouse.containsMouse ? "#f43f5e" : "#94a3b8"
                font.pixelSize: 10
                font.bold: true
            }

            MouseArea {
                id: closeMouse
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                hoverEnabled: true
                onClicked: miniCardRoot.stopTrackRequested()
            }
        }
    }

    // Bottom Controls: Play/Pause + Volume Slider
    RowLayout {
        Layout.fillWidth: true
        spacing: 12

        // Play / Pause Circular Button
        Rectangle {
            width: 30
            height: 30
            radius: 15
            color: playBtnMouse.containsMouse ? "#f1f5f9" : "#ffffff"

            Text {
                anchors.centerIn: parent
                text: miniCardRoot.isPlaying ? "⏸" : "▶"
                color: "#0f0e17"
                font.pixelSize: 11
                font.bold: true
            }

            MouseArea {
                id: playBtnMouse
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                hoverEnabled: true
                onClicked: miniCardRoot.togglePlayRequested()
            }
        }

        // Volume Icon
        Text {
            text: miniCardRoot.playerVolume === 0 ? "🔇" : "🔉"
            font.pixelSize: 12
        }

        // Custom Volume Slider
        Slider {
            id: volumeSlider
            Layout.fillWidth: true
            from: 0.0
            to: 1.0
            value: miniCardRoot.playerVolume
            onMoved: {
                miniCardRoot.volumeChanged(value)
            }

            background: Rectangle {
                x: volumeSlider.leftPadding
                y: volumeSlider.topPadding + volumeSlider.availableHeight / 2 - height / 2
                implicitWidth: 100
                implicitHeight: 4
                width: volumeSlider.availableWidth
                height: 4
                radius: 2
                color: "#1affffff"

                Rectangle {
                    width: volumeSlider.visualPosition * parent.width
                    height: parent.height
                    color: "#8b5cf6"
                    radius: 2
                }
            }

            handle: Rectangle {
                x: volumeSlider.leftPadding + volumeSlider.visualPosition * (volumeSlider.availableWidth - width)
                y: volumeSlider.topPadding + volumeSlider.availableHeight / 2 - height / 2
                implicitWidth: 10
                implicitHeight: 10
                radius: 5
                color: volumeSlider.pressed ? "#c4b5fd" : "#fffffe"
            }
        }

        // Volume Percent Text
        Text {
            text: Math.round(miniCardRoot.playerVolume * 100) + "%"
            color: "#94a3b8"
            font.pixelSize: 10
            font.family: "monospace"
            Layout.preferredWidth: 32
            horizontalAlignment: Text.AlignRight
        }
    }
}
