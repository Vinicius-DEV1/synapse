import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Dialogs

Item {
    id: imageActionsRoot
    objectName: "notesRichImageActions"

    property var textEditor
    property var textOperations
    property var controller
    property var commitTimer
    property string pageId: ""
    property bool active: false
    property int savedStart: -1
    property int savedEnd: -1
    property string savedPageId: ""
    property string savedDocumentSource: ""
    property string errorMessage: ""

    signal contentModified()

    function showError(message) {
        errorMessage = String(message || qsTr("The image could not be inserted."))
        errorTimer.restart()
    }

    function openForPosition() {
        if (!active || !textEditor || !textOperations || !controller || controller.fileOperationRunning) {
            showError(qsTr("Wait for the current file operation to finish."))
            return false
        }
        savedStart = Math.min(Number(textEditor.selectionStart), Number(textEditor.selectionEnd))
        savedEnd = Math.max(Number(textEditor.selectionStart), Number(textEditor.selectionEnd))
        savedPageId = String(pageId)
        savedDocumentSource = String(textEditor.text)
        if (!textOperations.canInsertRichImage(textEditor.textDocument, savedStart)) {
            showError(qsTr("Place the caret in a regular paragraph before inserting an image."))
            return false
        }
        errorMessage = ""
        imageFileDialog.open()
        return true
    }

    function insertPreparedImage(result, start, end) {
        if (!result || !result.success || !textEditor || !textOperations) {
            showError(result && result.error ? result.error : qsTr("The image could not be inserted."))
            return false
        }
        if (String(pageId) !== savedPageId || String(textEditor.text) !== savedDocumentSource) {
            showError(qsTr("The note changed while the image was being prepared. Choose the image again."))
            return false
        }
        var naturalWidth = Number(result.width)
        var naturalHeight = Number(result.height)
        var dataUrl = String(result.imageDataUrl || "")
        if (naturalWidth <= 0 || naturalHeight <= 0 || dataUrl.length === 0) {
            showError(qsTr("The selected image is incomplete."))
            return false
        }
        var displayWidth = Math.min(720, naturalWidth)
        var displayHeight = Math.max(1, Math.round(naturalHeight * displayWidth / naturalWidth))
        var altText = String(result.fileName || "").trim()
        var insertionPosition = textOperations.insertRichImage(
                    textEditor.textDocument, Number(start), Number(end), dataUrl,
                    altText, displayWidth, displayHeight)
        if (insertionPosition < 0) {
            showError(qsTr("The image could not be inserted at this position. Place the caret in a regular paragraph and try again."))
            return false
        }
        errorMessage = ""
        textEditor.cursorPosition = insertionPosition
        textEditor.forceActiveFocus()
        if (commitTimer) commitTimer.restart()
        contentModified()
        return true
    }

    Connections {
        target: imageActionsRoot.controller
        ignoreUnknownSignals: true
        function onFileOperationFinished(result) {
            if (String(result.operation || "") !== "notes-rich-image") return
            if (!result.success) {
                imageActionsRoot.showError(result.error || qsTr("The image could not be processed."))
                return
            }
            imageActionsRoot.insertPreparedImage(result, imageActionsRoot.savedStart, imageActionsRoot.savedEnd)
        }
    }

    FileDialog {
        id: imageFileDialog
        title: qsTr("Choose an image for the note")
        fileMode: FileDialog.OpenFile
        nameFilters: [qsTr("Images (*.png *.jpg *.jpeg *.gif *.webp *.bmp)")]
        onAccepted: {
            if (!imageActionsRoot.controller) {
                imageActionsRoot.showError(qsTr("Image import is unavailable."))
                return
            }
            imageActionsRoot.controller.processNotesRichImage(selectedFile)
        }
    }

    Label {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        visible: imageActionsRoot.errorMessage.length > 0
        text: imageActionsRoot.errorMessage
        color: "#fda4af"
        wrapMode: Text.Wrap
        padding: 8
        background: Rectangle { color: "#f21a1924"; border.color: "#22fb7185"; radius: 8 }
        z: 20
    }

    Timer {
        id: errorTimer
        interval: 5000
        repeat: false
        onTriggered: imageActionsRoot.errorMessage = ""
    }
}
