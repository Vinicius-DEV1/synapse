pragma ComponentBehavior: Bound

import QtQuick 2.15

Item {
    id: flow
    objectName: "notesRichImageViewerFlow"

    property var controller: null
    property var textEditor: null
    property var textOperations: null
    property var commitTimer: null
    property string pageId: ""
    property bool active: false
    readonly property bool viewerOpen: imageViewer.visible
    property string pendingRequestId: ""
    property string pendingPageId: ""
    property string pendingSource: ""
    property int pendingPosition: -1

    signal contentModified()

    function openForImage(imagePosition) {
        if (!active || !textEditor || !textOperations || !textEditor.textDocument || imagePosition < 0)
            return false
        const source = String(textOperations.richImageData(textEditor.textDocument, imagePosition) || "")
        if (source.length === 0) return false
        pendingRequestId = ""
        pendingPageId = String(pageId)
        pendingPosition = Number(imagePosition)
        pendingSource = source
        imageViewer.openForImage(source)
        return true
    }

    function cropImage(x, y, width, height, requestId) {
        if (!controller || typeof controller.cropNotesRichImage !== "function") {
            imageViewer.showError(qsTr("Image cropping is unavailable in this session."))
            return
        }
        if (controller.fileOperationRunning) {
            imageViewer.showError(qsTr("Wait for the current file operation to finish."))
            return
        }
        pendingRequestId = String(requestId)
        pendingPageId = String(pageId)
        pendingSource = String(imageViewer.imageSource)
        pendingPosition = Number(pendingPosition)
        controller.cropNotesRichImage(pendingSource, x, y, width, height, pendingRequestId)
    }

    function handleCropResult(result) {
        if (!result || String(result.operation || "") !== "notes-rich-image-crop" ||
                String(result.requestId || "") !== pendingRequestId || pendingRequestId.length === 0) return
        pendingRequestId = ""
        if (!imageViewer.visible || !active) return
        if (!result.success) {
            imageViewer.showError(String(result.error || qsTr("The crop could not be saved.")))
            return
        }
        if (String(pageId) !== pendingPageId ||
                String(textOperations.richImageData(textEditor.textDocument, pendingPosition) || "") !== pendingSource) {
            imageViewer.showError(qsTr("The selected image changed before the crop finished. Reopen the viewer and try again."))
            return
        }
        const croppedSource = String(result.imageDataUrl || "")
        if (!textOperations.replaceRichImageSource(textEditor.textDocument, pendingPosition, croppedSource)) {
            imageViewer.showError(qsTr("The cropped image could not be applied to the selected image."))
            return
        }
        textEditor.cursorPosition = pendingPosition
        textEditor.forceActiveFocus()
        if (commitTimer) commitTimer.restart()
        imageViewer.finishCrop()
        contentModified()
        pendingPageId = ""
        pendingSource = ""
        pendingPosition = -1
    }

    function cancelPending() {
        pendingRequestId = ""
        pendingPageId = ""
        pendingSource = ""
        pendingPosition = -1
        if (imageViewer.visible) imageViewer.close()
    }

    onActiveChanged: if (!active) cancelPending()
    onPageIdChanged: if (imageViewer.visible && pendingPageId !== String(pageId)) cancelPending()

    NotesRichImageViewer {
        id: imageViewer
        onCropRequested: function(x, y, width, height, requestId) {
            flow.cropImage(x, y, width, height, requestId)
        }
        onClosed: {
            flow.pendingRequestId = ""
            flow.pendingPageId = ""
            flow.pendingSource = ""
            flow.pendingPosition = -1
        }
    }

    Connections {
        target: flow.controller
        enabled: !!flow.controller
        ignoreUnknownSignals: true
        function onFileOperationFinished(result) { flow.handleCropResult(result) }
    }
}
