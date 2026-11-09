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
    border.color: "#ffffff10"
    border.width: 1
    z: 50

    property var bookmarks: []
    property double currentPos: 0
    property bool isAddingBookmark: false
    property string newBookmarkWord: ""
    property string newBookmarkNote: ""

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

    function submitBookmark() {
        if (newBookmarkWord.trim().length === 0) return
        drawerRoot.bookmarkSaved(newBookmarkWord.trim(), newBookmarkNote.trim())
        newBookmarkWord = ""
        newBookmarkNote = ""
        isAddingBookmark = false
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
                color: "#ffffff10"
                Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 12 }
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: drawerRoot.closeRequested()
                }
            }
        }

        // Add Moment Quick Bar
        Rectangle {
            Layout.fillWidth: true
            height: drawerRoot.isAddingBookmark ? 140 : 40
            radius: 10
            color: "#1a1924"
            border.color: "#ffffff12"
            border.width: 1
            clip: true

            // Collapsed state button
            Item {
                anchors.fill: parent
                visible: !drawerRoot.isAddingBookmark

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 8
                    Text { text: "+"; color: "#818cf8"; font.pixelSize: 16; font.bold: true }
                    Text {
                        text: "Marcar momento em " + drawerRoot.formatTime(drawerRoot.currentPos)
                        color: "#818cf8"
                        font.pixelSize: 13
                        font.bold: true
                    }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: drawerRoot.isAddingBookmark = true
                }
            }

            // Expanded creation form
            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 10
                spacing: 8
                visible: drawerRoot.isAddingBookmark

                Rectangle {
                    Layout.fillWidth: true
                    height: 32
                    radius: 6
                    color: "#0f0e17"
                    border.color: "#ffffff18"

                    TextInput {
                        id: bmWordInput
                        anchors.fill: parent
                        anchors.leftMargin: 8
                        anchors.rightMargin: 8
                        verticalAlignment: TextInput.AlignVCenter
                        color: "#fffffe"
                        font.pixelSize: 12
                        text: drawerRoot.newBookmarkWord
                        onTextChanged: drawerRoot.newBookmarkWord = text
                        onAccepted: drawerRoot.submitBookmark()

                        Text {
                            visible: !bmWordInput.text && !bmWordInput.activeFocus
                            anchors.fill: parent
                            verticalAlignment: Text.AlignVCenter
                            text: "Palavra / Título do momento..."
                            color: "#64748b"
                            font.pixelSize: 12
                        }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    height: 32
                    radius: 6
                    color: "#0f0e17"
                    border.color: "#ffffff18"

                    TextInput {
                        id: bmNoteInput
                        anchors.fill: parent
                        anchors.leftMargin: 8
                        anchors.rightMargin: 8
                        verticalAlignment: TextInput.AlignVCenter
                        color: "#fffffe"
                        font.pixelSize: 12
                        text: drawerRoot.newBookmarkNote
                        onTextChanged: drawerRoot.newBookmarkNote = text
                        onAccepted: drawerRoot.submitBookmark()

                        Text {
                            visible: !bmNoteInput.text && !bmNoteInput.activeFocus
                            anchors.fill: parent
                            verticalAlignment: Text.AlignVCenter
                            text: "Contexto / Nota opcional..."
                            color: "#64748b"
                            font.pixelSize: 12
                        }
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Rectangle {
                        Layout.fillWidth: true
                        height: 28
                        radius: 6
                        color: "#6366f1"
                        Text { anchors.centerIn: parent; text: "Salvar"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: drawerRoot.submitBookmark()
                        }
                    }

                    Rectangle {
                        width: 60
                        height: 28
                        radius: 6
                        color: "#ffffff10"
                        Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: drawerRoot.isAddingBookmark = false
                        }
                    }
                }
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
                border.color: "#ffffff0a"
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
                            color: "#6366f125"
                            border.color: "#818cf855"

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
