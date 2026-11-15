import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: audioPlayerRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 46
    radius: 10
    color: "#161524"
    border.color: "#27272a"
    border.width: 1

    property string audioPath: ""
    property bool isPlaying: false
    property real progress: 0.0
    property int durationSeconds: 0

    signal playToggled()
    signal seekRequested(real positionRatio)

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 12
        anchors.rightMargin: 12
        spacing: 10

        // Play/Pause button
        Rectangle {
            width: 28
            height: 28
            radius: 14
            color: playMouse.containsMouse ? "#6366f1" : "#4f46e5"

            Text {
                anchors.centerIn: parent
                text: audioPlayerRoot.isPlaying ? "⏸" : "▶"
                color: "#ffffff"
                font.pixelSize: 11
            }

            MouseArea {
                id: playMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    audioPlayerRoot.isPlaying = !audioPlayerRoot.isPlaying
                    audioPlayerRoot.playToggled()
                }
            }
        }

        // Progress bar / Scrubber
        Rectangle {
            id: trackBar
            Layout.fillWidth: true
            height: 6
            radius: 3
            color: "#27272a"

            Rectangle {
                width: parent.width * audioPlayerRoot.progress
                height: parent.height
                radius: 3
                color: "#818cf8"
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: function(mouse) {
                    var ratio = Math.max(0.0, Math.min(1.0, mouse.x / width))
                    audioPlayerRoot.progress = ratio
                    audioPlayerRoot.seekRequested(ratio)
                }
            }
        }

        // Time Indicator
        Text {
            text: {
                var s = Math.floor(audioPlayerRoot.durationSeconds * audioPlayerRoot.progress)
                var mins = Math.floor(s / 60)
                var secs = s % 60
                return (mins < 10 ? "0" + mins : mins) + ":" + (secs < 10 ? "0" + secs : secs)
            }
            color: "#71717a"
            font.pixelSize: 11
            font.family: "Monospace"
        }
    }
}
