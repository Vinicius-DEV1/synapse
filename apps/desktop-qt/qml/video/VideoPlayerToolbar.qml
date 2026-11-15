import QtQuick 2.15
import QtQuick.Window 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: toolbarRoot
    anchors.top: parent.top
    anchors.left: parent.left
    anchors.right: parent.right
    height: 60

    property var activeVideo: null
    property double currentSpeed: 1.0
    property int bookmarksCount: 0
    property bool isVocabDrawerOpen: false
    property bool isVocabSidebarOpen: false
    property bool shortcutsBlocked: false
    property var mediaPlayer: null
    property var controller: null

    signal exitRequested()
    signal speedRequested(double speed)
    signal vocabDrawerRequested()
    signal vocabSidebarRequested()
    signal playPauseRequested()
    signal seekRelativeRequested(int seconds)
    signal fullscreenRequested()

    VideoPlayerShortcuts {
        id: keyboardShortcuts
        activeVideo: toolbarRoot.shortcutsBlocked ? null : toolbarRoot.activeVideo
        mediaPlayer: toolbarRoot.mediaPlayer
        hostWindow: toolbarRoot.Window.window
        playbackRate: toolbarRoot.currentSpeed
        menusOpen: trackSelector.popupOpen
        onPlayPauseRequested: toolbarRoot.playPauseRequested()
        onSeekRelativeRequested: function(seconds) { toolbarRoot.seekRelativeRequested(seconds) }
        onVocabDrawerRequested: toolbarRoot.vocabDrawerRequested()
        onSpeedRequested: function(speed) { toolbarRoot.speedRequested(speed) }
        onFullscreenRequested: toolbarRoot.fullscreenRequested()
    }

    Rectangle {
        anchors.fill: parent
        color: "#cc0f0e17"

        RowLayout {
            anchors.fill: parent
            anchors.margins: 16
            spacing: 16

            Rectangle {
                Layout.preferredWidth: 36
                Layout.preferredHeight: 36
                radius: 8
                color: "#15ffffff"

                Text { anchors.centerIn: parent; text: "←"; color: "#ffffff"; font.pixelSize: 18; font.bold: true }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: toolbarRoot.exitRequested()
                }
            }

            Text {
                Layout.fillWidth: true
                text: toolbarRoot.activeVideo ? toolbarRoot.activeVideo.title : ""
                color: "#fffffe"
                font.pixelSize: 16
                font.bold: true
                elide: Text.ElideRight
            }

            ToolButton {
                id: speedButton
                Layout.preferredWidth: 48
                Layout.preferredHeight: 30
                text: toolbarRoot.currentSpeed.toFixed(2).replace(/0+$/, "").replace(/\.$/, "") + "x"
                Accessible.name: "Playback speed " + text
                onClicked: toolbarRoot.speedRequested(
                    toolbarRoot.currentSpeed >= 2.0 ? 0.25 : toolbarRoot.currentSpeed + 0.25)
                contentItem: Text {
                    text: speedButton.text
                    color: "#e4e4e7"
                    font.pixelSize: 11
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                background: Rectangle {
                    radius: 6
                    color: speedButton.down ? "#30303b" : "#171720"
                    border.color: "#242430"
                }
            }

            ToolButton {
                id: loopButton
                Layout.preferredWidth: 52
                Layout.preferredHeight: 30
                text: keyboardShortcuts.loopA >= 0
                    ? (keyboardShortcuts.loopB >= 0 ? "A–B" : "A ✓")
                    : (keyboardShortcuts.loopB >= 0 ? "B ✓" : "A/B")
                Accessible.name: keyboardShortcuts.loopA >= 0 || keyboardShortcuts.loopB >= 0
                    ? "Clear A-B loop" : "Mark A-B loop with I and O"
                enabled: keyboardShortcuts.loopA >= 0 || keyboardShortcuts.loopB >= 0
                onClicked: keyboardShortcuts.clearLoop()
                contentItem: Text {
                    text: loopButton.text
                    color: keyboardShortcuts.loopA >= 0 || keyboardShortcuts.loopB >= 0
                        ? "#c4b5fd" : "#a7a9be"
                    font.pixelSize: 10
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                background: Rectangle {
                    radius: 6
                    color: loopButton.down ? "#30303b" : "#171720"
                    border.color: keyboardShortcuts.loopA >= 0 || keyboardShortcuts.loopB >= 0
                        ? "#665b21b6" : "#242430"
                }
            }

            VideoTrackSelector {
                id: trackSelector
                player: toolbarRoot.mediaPlayer
                controller: toolbarRoot.controller
                activeVideo: toolbarRoot.activeVideo
            }

            ToolButton {
                id: fullscreenButton
                Layout.preferredWidth: 36
                Layout.preferredHeight: 30
                text: toolbarRoot.Window.window && toolbarRoot.Window.window.visibility === Window.FullScreen ? "⤢" : "⛶"
                font.pixelSize: 18
                padding: 0
                Accessible.name: toolbarRoot.Window.window && toolbarRoot.Window.window.visibility === Window.FullScreen
                    ? "Restore window" : "Enter full screen"
                onClicked: toolbarRoot.fullscreenRequested()
                contentItem: Text {
                    text: fullscreenButton.text
                    color: "#e4e4e7"
                    font: fullscreenButton.font
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                background: Rectangle {
                    radius: 6
                    color: fullscreenButton.down ? "#30303b" : "#171720"
                    border.color: "#242430"
                }
            }

            Rectangle {
                Layout.preferredHeight: 30
                Layout.preferredWidth: vocabWordsBtnText.contentWidth + 24
                radius: 8
                color: toolbarRoot.isVocabSidebarOpen ? "#818cf8" : "#15ffffff"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "📖"; font.pixelSize: 12 }
                    Text {
                        id: vocabWordsBtnText
                        text: "Vocabulário"
                        color: "#ffffff"
                        font.pixelSize: 12
                        font.bold: true
                    }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: toolbarRoot.vocabSidebarRequested()
                }
            }

            Rectangle {
                Layout.preferredHeight: 30
                Layout.preferredWidth: vocabBtnText.contentWidth + 24
                radius: 8
                color: toolbarRoot.isVocabDrawerOpen ? "#6366f1" : "#15ffffff"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "🔖"; font.pixelSize: 12 }
                    Text {
                        id: vocabBtnText
                        text: "Moments (" + toolbarRoot.bookmarksCount + ")"
                        color: "#ffffff"
                        font.pixelSize: 12
                        font.bold: true
                    }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: toolbarRoot.vocabDrawerRequested()
                }
            }
        }
    }
}
