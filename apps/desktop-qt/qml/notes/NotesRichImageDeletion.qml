import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: deletionRoot
    objectName: "notesRichImageDeletion"

    property var textEditor
    property var textOperations
    property var commitTimer
    property string pageId: ""
    property bool active: false

    signal contentModified()

    function requestDelete(position) {
        if (!active || !textEditor || !textOperations) return false
        var dataUrl = textOperations.richImageData(textEditor.textDocument, position)
        if (!dataUrl) return false
        deleteDialog.openForImage(position, dataUrl, pageId)
        return true
    }

    function handleKey(key) {
        if (key !== Qt.Key_Backspace && key !== Qt.Key_Delete) return false
        if (!active || !textEditor || !textOperations) return false

        var selectionStart = textEditor.selectionStart
        var selectionEnd = textEditor.selectionEnd
        if (selectionEnd > selectionStart) {
            var selected = textOperations.richImageAt(
                        textEditor.textDocument, textEditor.cursorPosition, selectionStart, selectionEnd)
            if (selectionEnd - selectionStart !== 1 || !selected.valid ||
                    Number(selected.position) !== selectionStart) return false
            return requestDelete(Number(selected.position))
        }

        var backward = key === Qt.Key_Backspace
        var adjacentPosition = textOperations.adjacentRichImagePosition(
                    textEditor.textDocument, textEditor.cursorPosition, backward)
        if (adjacentPosition < 0) return false
        textEditor.select(adjacentPosition, adjacentPosition + 1)
        textEditor.forceActiveFocus()
        return true
    }

    function confirmDelete(position, dataUrl, requestedPageId) {
        if (!active || String(requestedPageId) !== String(pageId) || !textOperations || !textEditor)
            return false
        var current = textOperations.richImageAt(textEditor.textDocument, position, position, position)
        if (!current.valid || Number(current.position) !== Number(position) ||
                textOperations.richImageData(textEditor.textDocument, position) !== String(dataUrl))
            return false
        if (!textOperations.removeRichImage(textEditor.textDocument, position)) return false
        textEditor.cursorPosition = position
        textEditor.forceActiveFocus()
        if (commitTimer) commitTimer.restart()
        contentModified()
        return true
    }

    onActiveChanged: if (!active) deleteDialog.close()
    onPageIdChanged: deleteDialog.close()

    Connections {
        target: deletionRoot.textEditor
        function onTextChanged() {
            if (deleteDialog.visible) deleteDialog.close()
        }
    }

    Dialog {
        id: deleteDialog
        objectName: "notesRichImageDeleteDialog"
        modal: true
        focus: true
        anchors.centerIn: parent
        width: Math.min(parent.width - 32, 380)
        padding: 0
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        standardButtons: Dialog.NoButton

        property int imagePosition: -1
        property string imageData: ""
        property string requestedPageId: ""

        function openForImage(position, dataUrl, requestedPage) {
            imagePosition = position
            imageData = String(dataUrl || "")
            requestedPageId = String(requestedPage || "")
            open()
        }

        function confirmRemoval() {
            if (imagePosition < 0 || imageData.length === 0) return
            deletionRoot.confirmDelete(imagePosition, imageData, requestedPageId)
            close()
        }

        function handleKey(event) {
            if (event.key === Qt.Key_Escape) {
                close()
                return true
            }
            if (event.key === Qt.Key_Enter || event.key === Qt.Key_Return ||
                    event.key === Qt.Key_Backspace || event.key === Qt.Key_Delete) {
                confirmRemoval()
                return true
            }
            return false
        }

        onOpened: confirmButton.forceActiveFocus()

        background: Rectangle {
            color: "#1a1924"
            radius: 14
            border.color: "#55f87171"
        }

        header: Rectangle {
            implicitHeight: 58
            color: "#08ffffff"
            radius: 14
            Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: "#0cffffff" }
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 18
                anchors.rightMargin: 10
                Label {
                    Layout.fillWidth: true
                    text: qsTr("Delete image")
                    color: "#fffffe"
                    font.pixelSize: 14
                    font.bold: true
                }
                ToolButton {
                    text: "×"
                    Accessible.name: qsTr("Cancel image deletion")
                    Keys.priority: Keys.BeforeItem
                    Keys.onPressed: function(event) {
                        if (deleteDialog.handleKey(event)) event.accepted = true
                    }
                    onClicked: deleteDialog.close()
                }
            }
        }

        contentItem: ColumnLayout {
            spacing: 8
            Label {
                Layout.fillWidth: true
                padding: 18
                wrapMode: Text.Wrap
                color: "#d4d4dc"
                text: qsTr("Delete this image from the note? This edit can be undone.")
            }
        }

        footer: RowLayout {
            implicitHeight: 58
            spacing: 8
            Item { Layout.fillWidth: true }
            Button {
                text: qsTr("Cancel")
                Keys.priority: Keys.BeforeItem
                Keys.onPressed: function(event) {
                    if (deleteDialog.handleKey(event)) event.accepted = true
                }
                onClicked: deleteDialog.close()
            }
            Button {
                id: confirmButton
                objectName: "notesRichImageDeleteConfirmButton"
                text: qsTr("Delete image")
                Accessible.name: qsTr("Confirm deleting image")
                Keys.priority: Keys.BeforeItem
                Keys.onPressed: function(event) {
                    if (deleteDialog.handleKey(event)) event.accepted = true
                }
                onClicked: deleteDialog.confirmRemoval()
                background: Rectangle {
                    color: confirmButton.down ? "#be123c" : "#9f2941"
                    radius: 8
                }
                contentItem: Label {
                    text: confirmButton.text
                    color: "#fffffe"
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                    leftPadding: 8
                    rightPadding: 8
                }
            }
            Item { Layout.preferredWidth: 8 }
        }
    }
}
