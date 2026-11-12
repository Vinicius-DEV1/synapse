pragma ComponentBehavior: Bound

import QtQuick 2.15

Item {
    id: importFlow
    objectName: "notesRichImageImportFlow"

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
    property alias errorMessage: imageStatus.message

    signal contentModified()

    function showError(message) {
        imageStatus.show(message)
    }

    function captureInsertionTarget(start, end) {
        if (!active || !textEditor || !textOperations || !controller || controller.fileOperationRunning) {
            showError(qsTr("Wait for the current file operation to finish."))
            return false
        }
        var requestedStart = Number(start)
        var requestedEnd = Number(end)
        var hasRequestedRange = isFinite(requestedStart) && isFinite(requestedEnd) &&
                requestedStart >= 0 && requestedEnd >= 0
        savedStart = hasRequestedRange
                ? Math.min(requestedStart, requestedEnd)
                : Math.min(Number(textEditor.selectionStart), Number(textEditor.selectionEnd))
        savedEnd = hasRequestedRange
                ? Math.max(requestedStart, requestedEnd)
                : Math.max(Number(textEditor.selectionStart), Number(textEditor.selectionEnd))
        savedPageId = String(pageId)
        savedDocumentSource = String(textEditor.text)
        if (!textOperations.canInsertRichImage(textEditor.textDocument, savedStart)) {
            showError(qsTr("Place the caret in a regular paragraph before inserting an image."))
            return false
        }
        errorMessage = ""
        return true
    }

    function openForPosition() {
        if (!captureInsertionTarget()) return false
        imageFileDialog.open()
        return true
    }

    function pasteFromClipboard() {
        if (!active || !controller || !controller.hasClipboardNotesRichImage ||
                !controller.hasClipboardNotesRichImage() || !captureInsertionTarget()) return false
        controller.processClipboardNotesRichImage()
        return true
    }

    function importDroppedImage(fileUrl, position) {
        if (!fileUrl || !String(fileUrl).startsWith("file://") || !captureInsertionTarget(position, position))
            return false
        controller.processNotesRichImage(fileUrl)
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
        target: importFlow.controller
        ignoreUnknownSignals: true
        function onFileOperationFinished(result) {
            if (String(result.operation || "") !== "notes-rich-image") return
            if (!result.success) {
                importFlow.showError(result.error || qsTr("The image could not be processed."))
                return
            }
            importFlow.insertPreparedImage(result, importFlow.savedStart, importFlow.savedEnd)
        }
    }

    NotesRichImageImportDialog {
        id: imageFileDialog
        controller: importFlow.controller
        onImageSelected: function(fileUrl) {
            importFlow.controller.processNotesRichImage(fileUrl)
        }
        onControllerUnavailable: importFlow.showError(qsTr("Image import is unavailable."))
    }

    NotesRichImageStatusBanner {
        id: imageStatus
        anchors.fill: parent
        z: 20
    }
}
