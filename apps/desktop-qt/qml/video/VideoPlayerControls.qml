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
    property bool isPlaying: false
    property int bookmarksCount: 0
    property bool isVocabDrawerOpen: false

    signal exitRequested()
    signal speedChanged(double spd)
    signal vocabDrawerToggled()
    signal playPauseToggled()
    signal seekRelativeRequested(int seconds)
    signal seekAbsoluteRequested(double seconds)

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return "00:00"
        var mins = Math.floor(seconds / 60)
        var secs = Math.floor(seconds % 60)
        var hrs = Math.floor(mins / 60)
        mins = mins % 60
        if (hrs > 0) {
            return hrs + ":" + (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs
        }
        return (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs
    }

    // Top Navigation Bar
    Rectangle {
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        height: 60
        color: "#cc0f0e17"

        RowLayout {
            anchors.fill: parent
            anchors.margins: 16
            spacing: 16

            Rectangle {
                width: 36; height: 36; radius: 8
                color: "#ffffff15"

                Text { anchors.centerIn: parent; text: "←"; color: "#ffffff"; font.pixelSize: 18; font.bold: true }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: controlsRoot.exitRequested()
                }
            }

            Text {
                Layout.fillWidth: true
                text: controlsRoot.activeVideo ? controlsRoot.activeVideo.title : ""
                color: "#fffffe"
                font.pixelSize: 16
                font.bold: true
                elide: Text.ElideRight
            }

            // Speed buttons
            RowLayout {
                spacing: 4
                Repeater {
                    model: [0.75, 1.0, 1.25, 1.5, 2.0]
                    delegate: Rectangle {
                        width: 36; height: 26; radius: 6
                        color: controlsRoot.currentSpeed === modelData ? "#6366f1" : "#ffffff10"
                        Text {
                            anchors.centerIn: parent
                            text: modelData + "x"
                            color: "#ffffff"
                            font.pixelSize: 10
                            font.bold: true
                        }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: controlsRoot.speedChanged(modelData)
                        }
                    }
                }
            }

            // Bookmarks / Vocabulary drawer toggle
            Rectangle {
                height: 30
                width: vocabBtnText.contentWidth + 24
                radius: 8
                color: controlsRoot.isVocabDrawerOpen ? "#6366f1" : "#ffffff15"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "🔖"; font.pixelSize: 12 }
                    Text {
                        id: vocabBtnText
                        text: "Momentos (" + controlsRoot.bookmarksCount + ")"
                        color: "#ffffff"
                        font.pixelSize: 12
                        font.bold: true
                    }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: controlsRoot.vocabDrawerToggled()
                }
            }
        }
    }

    // Bottom Controls Bar
    Rectangle {
        anchors.bottom: parent.bottom
        anchors.left: parent.left
        anchors.right: parent.right
        height: 80
        color: "#cc0f0e17"

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 12
            spacing: 8

            // Seek Slider
            Slider {
                id: positionSlider
                Layout.fillWidth: true
                from: 0
                to: controlsRoot.videoDuration > 0 ? controlsRoot.videoDuration : 100
                value: controlsRoot.currentPos

                onMoved: {
                    controlsRoot.seekAbsoluteRequested(value)
                }
            }

            // Controls Row
            RowLayout {
                Layout.fillWidth: true
                spacing: 16

                // Play/Pause button
                Rectangle {
                    width: 36; height: 36; radius: 18
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
                        onClicked: controlsRoot.playPauseToggled()
                    }
                }

                // Seek -5s
                Text {
                    text: "⏪ 5s"
                    color: "#a7a9be"
                    font.pixelSize: 12
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: controlsRoot.seekRelativeRequested(-5)
                    }
                }

                // Seek +5s
                Text {
                    text: "5s ⏩"
                    color: "#a7a9be"
                    font.pixelSize: 12
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: controlsRoot.seekRelativeRequested(5)
                    }
                }

                // Time display
                Text {
                    text: controlsRoot.formatTime(controlsRoot.currentPos) + " / " + controlsRoot.formatTime(controlsRoot.videoDuration)
                    color: "#fffffe"
                    font.pixelSize: 12
                }

                Item { Layout.fillWidth: true }

                // Keyboard shortcuts tip
                Text {
                    text: "[Espaço] Pausar • [←/→] ±5s • [B] Momentos • [Esc] Sair"
                    color: "#64748b"
                    font.pixelSize: 11
                }
            }
        }
    }
}
