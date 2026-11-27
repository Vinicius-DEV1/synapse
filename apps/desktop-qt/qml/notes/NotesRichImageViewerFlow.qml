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
            imageViewer.showError(qsTr("O recorte de imagem não está disponível nesta sessão."))
            return
        }
        if (controller.fileOperationRunning) {
            imageViewer.showError(qsTr("Aguarde a conclusão da operação de arquivo atual."))
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
            imageViewer.showError(String(result.error || qsTr("Não foi possível salvar o recorte.")))
            return
        }
        if (String(pageId) !== pendingPageId ||
                String(textOperations.richImageData(textEditor.textDocument, pendingPosition) || "") !== pendingSource) {
            imageViewer.showError(qsTr("A imagem selecionada mudou antes do fim do recorte. Abra o visualizador novamente e tente de novo."))
            return
        }
        const croppedSource = String(result.imageDataUrl || "")
        if (!textOperations.replaceRichImageSource(textEditor.textDocument, pendingPosition, croppedSource)) {
            imageViewer.showError(qsTr("Não foi possível aplicar o recorte à imagem selecionada."))
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
