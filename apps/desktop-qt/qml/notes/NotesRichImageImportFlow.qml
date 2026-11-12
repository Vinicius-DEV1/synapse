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
        if (savedEnd - savedStart === 1) {
            var selectedImage = textOperations.richImageAt(
                        textEditor.textDocument, savedStart, savedStart, savedEnd)
            if (selectedImage && selectedImage.valid && Number(selectedImage.position) === savedStart) {
                var positionAfterImage = textOperations.richImageInsertionPositionAfter(
                            textEditor.textDocument, savedStart)
                if (Number(positionAfterImage) < 0) {
                    showError(qsTr("The selected image has no editable paragraph after it."))
                    return false
                }
                savedStart = Number(positionAfterImage)
                savedEnd = savedStart
            }
        }
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
        return importDroppedImages([fileUrl], position)
    }

    function importDroppedImages(fileUrls, position) {
        if (!fileUrls || fileUrls.length === 0 || !captureInsertionTarget(position, position))
            return false
        controller.processNotesRichImages(fileUrls)
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
        var preparedImages = result.images && result.images.length ? result.images : [result]
        var insertions = []
        for (var index = 0; index < preparedImages.length; ++index) {
            var image = preparedImages[index]
            var naturalWidth = Number(image.width)
            var naturalHeight = Number(image.height)
            var dataUrl = String(image.imageDataUrl || "")
            if (naturalWidth <= 0 || naturalHeight <= 0 || dataUrl.length === 0) {
                showError(qsTr("One of the selected images is incomplete."))
                return false
            }
            var displayWidth = Math.min(720, naturalWidth)
            insertions.push({
                imageDataUrl: dataUrl,
                fileName: String(image.fileName || "").trim(),
                width: displayWidth,
                height: Math.max(1, Math.round(naturalHeight * displayWidth / naturalWidth))
            })
        }
        if (insertions.length === 0) {
            showError(qsTr("No supported images could be inserted."))
            return false
        }
        var insertionPosition = textOperations.insertRichImages(
                    textEditor.textDocument, Number(start), Number(end), insertions)
        if (insertionPosition < 0) {
            showError(qsTr("The images could not be inserted at this position. Place the caret in a regular paragraph and try again."))
            return false
        }
        if (String(result.warning || "").length > 0) imageStatus.showWarning(result.warning)
        else errorMessage = ""
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
