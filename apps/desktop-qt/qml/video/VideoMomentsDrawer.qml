import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: drawerRoot
    anchors.top: parent.top
    anchors.bottom: parent.bottom
    anchors.right: parent.right
    width: 340
    color: "#161524"
    border.color: "#10ffffff"
    border.width: 1
    z: 50

    property var bookmarks: []
    property double currentPos: 0

    signal closeRequested()
    signal jumpRequested(double timestamp)
    signal bookmarkSaved(string word, string note)
    signal bookmarkDeleted(string bookmarkId)

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

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 16
        spacing: 16

        // Drawer Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Text { text: "🔖"; font.pixelSize: 18 }
            Text {
                text: "Momentos & Vocabulário"
                color: "#fffffe"
                font.pixelSize: 15
                font.bold: true
            }

            Item { Layout.fillWidth: true }

            Rectangle {
                width: 28; height: 28; radius: 6
                color: "#10ffffff"
                Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 12 }
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: drawerRoot.closeRequested()
                }
            }
        }

        // Add Moment Quick Bar
        VideoMomentForm {
            currentPos: drawerRoot.currentPos
            onBookmarkSubmitted: function(word, note) {
                drawerRoot.bookmarkSaved(word, note)
            }
        }

        // Bookmarks List
        ListView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            spacing: 8
            model: drawerRoot.bookmarks

            delegate: Rectangle {
                width: parent.width
                height: bmCol.height + 16
                radius: 8
                color: "#1a1924"
                border.color: "#0affffff"
                border.width: 1

                ColumnLayout {
                    id: bmCol
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.top: parent.top
                    anchors.margins: 8
                    spacing: 4

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        // Jump button
                        Rectangle {
                            height: 22
                            width: tsText.contentWidth + 12
                            radius: 4
                            color: "#256366f1"
                            border.color: "#55818cf8"

                            Text {
                                id: tsText
                                anchors.centerIn: parent
                                text: drawerRoot.formatTime(modelData.timestamp)
                                color: "#818cf8"
                                font.pixelSize: 11
                                font.bold: true
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: drawerRoot.jumpRequested(modelData.timestamp)
                            }
                        }

                        Text {
                            Layout.fillWidth: true
                            text: modelData.word
                            color: "#fffffe"
                            font.pixelSize: 13
                            font.bold: true
                            elide: Text.ElideRight
                        }

                        Text {
                            text: "🗑️"
                            font.pixelSize: 11
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: drawerRoot.bookmarkDeleted(modelData.id)
                            }
                        }
                    }

                    Text {
                        visible: modelData.context && modelData.context.length > 0
                        Layout.fillWidth: true
                        text: modelData.context ? modelData.context : ""
                        color: "#94a3b8"
                        font.pixelSize: 11
                        wrapMode: Text.Wrap
                    }
                }
            }
        }

        // Empty state
        Text {
            visible: drawerRoot.bookmarks.length === 0
            Layout.fillWidth: true
            text: "Nenhum momento salvo neste vídeo.\nClique acima para marcar o segundo atual."
            color: "#64748b"
            font.pixelSize: 12
            horizontalAlignment: Text.AlignHCenter
        }
    }
}
