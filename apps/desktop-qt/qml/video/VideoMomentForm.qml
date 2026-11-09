import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: formRoot
    Layout.fillWidth: true
    height: isExpanded ? 140 : 40
    radius: 10
    color: "#1a1924"
    border.color: "#ffffff12"
    border.width: 1
    clip: true

    property bool isExpanded: false
    property double currentPos: 0
    property string newBookmarkWord: ""
    property string newBookmarkNote: ""

    signal bookmarkSubmitted(string word, string note)

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

    function submit() {
        if (newBookmarkWord.trim().length === 0) return
        formRoot.bookmarkSubmitted(newBookmarkWord.trim(), newBookmarkNote.trim())
        newBookmarkWord = ""
        newBookmarkNote = ""
        isExpanded = false
    }

    // Collapsed state button
    Item {
        anchors.fill: parent
        visible: !formRoot.isExpanded

        RowLayout {
            anchors.centerIn: parent
            spacing: 8
            Text { text: "+"; color: "#818cf8"; font.pixelSize: 16; font.bold: true }
            Text {
                text: "Marcar momento em " + formRoot.formatTime(formRoot.currentPos)
                color: "#818cf8"
                font.pixelSize: 13
                font.bold: true
            }
        }

        MouseArea {
            anchors.fill: parent
            cursorShape: Qt.PointingHandCursor
            onClicked: formRoot.isExpanded = true
        }
    }

    // Expanded creation form
    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 10
        spacing: 8
        visible: formRoot.isExpanded

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
                text: formRoot.newBookmarkWord
                onTextChanged: formRoot.newBookmarkWord = text
                onAccepted: formRoot.submit()

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
                text: formRoot.newBookmarkNote
                onTextChanged: formRoot.newBookmarkNote = text
                onAccepted: formRoot.submit()

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
                    onClicked: formRoot.submit()
                }
            }

            Rectangle {
                width: 60
                height: 28
                radius: 6
                color: "#ffffff10"
                Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 11 }
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: formRoot.isExpanded = false
                }
            }
        }
    }
}
