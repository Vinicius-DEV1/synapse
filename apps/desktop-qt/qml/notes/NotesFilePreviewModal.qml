import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Dialogs
import "../files" as Files

Rectangle {
    id: modalRoot
    anchors.fill: parent
    z: 150
    visible: false
    color: "transparent"
    focus: visible

    property var controller: null
    property string requestId: ""
    property string pendingExportFileId: ""
    property bool exportPending: false
    property bool pdfRendering: false

    function openForFile(fileId) {
        var stableFileId = String(fileId || "").trim()
        if (!controller || stableFileId.length === 0 || visible) return
        requestId = "notes-viewer-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2)
        viewer.previewFileId = stableFileId
        viewer.previewName = ""
        viewer.previewType = ""
        viewer.previewPath = ""
        viewer.previewUrl = ""
        viewer.previewText = ""
        viewer.previewError = ""
        viewer.previewPdfPage = 1
        viewer.previewPdfImageUrl = ""
        viewer.previewPdfImagePath = ""
        viewer.previewPdfRequestId = requestId
        pdfRendering = false
        viewer.loading = true
        visible = true
        controller.previewLocalFile(stableFileId, requestId)
    }

    function closeModal(alreadyInvalidated) {
        if (!visible) return
        if ((viewer.loading || pdfRendering) && requestId.length > 0 && controller &&
                typeof controller.cancelFilePreview === "function") {
            controller.cancelFilePreview(requestId)
        }
        pdfRendering = false
        viewer.stopVideo()
        if (!alreadyInvalidated && viewer.previewPdfImagePath.length > 0 && controller &&
                typeof controller.closeLibraryBook === "function") {
            controller.closeLibraryBook(viewer.previewPdfImagePath)
        }
        if (!alreadyInvalidated && viewer.previewPath.length > 0 && controller &&
                typeof controller.closeFilePreview === "function") {
            controller.closeFilePreview(viewer.previewPath)
        }
        viewer.previewPath = ""
        viewer.previewUrl = ""
        viewer.previewName = ""
        viewer.previewFileId = ""
        viewer.previewType = ""
        viewer.previewText = ""
        viewer.previewError = ""
        viewer.previewPdfPage = 1
        viewer.previewPdfImageUrl = ""
        viewer.previewPdfImagePath = ""
        viewer.previewPdfRequestId = ""
        viewer.loading = false
        requestId = ""
        visible = false
    }

    function exportFile(fileId) {
        if (exportPending || exportDialog.visible) return
        pendingExportFileId = String(fileId || "")
        if (pendingExportFileId.length > 0) exportDialog.open()
    }

    Connections {
        target: modalRoot.controller
        ignoreUnknownSignals: true

        function onFilePreviewReady(result) {
            if (!modalRoot.visible || String(result.request_id || "") !== modalRoot.requestId) return
            viewer.loading = false
            if (result.cancelled) return
            if (!result.success) {
                viewer.previewError = String(result.error || qsTr("Could not open the file preview."))
                return
            }
            viewer.previewPath = String(result.path || "")
            viewer.previewUrl = String(result.url || "")
            viewer.previewName = String(result.name || "")
            viewer.previewType = String(result.file_type || "other")
            if (viewer.previewType === "text" || viewer.previewType === "code") {
                var textResult = modalRoot.controller.readFilePreviewText(viewer.previewPath)
                if (textResult.success) viewer.previewText = String(textResult.text || "")
                else viewer.previewError = String(textResult.error || qsTr("Could not read the text preview."))
            } else if (viewer.previewType === "pdf" && viewer.previewPath.length > 0) {
                modalRoot.pdfRendering = true
                modalRoot.controller.renderLibraryPdfPage(viewer.previewPath, 1, 960, modalRoot.requestId)
            }
        }

        function onNotesFilePreviewPdfPageReady(result) {
            if (!modalRoot.visible || viewer.previewType !== "pdf" ||
                    String(result.request_id || "") !== modalRoot.requestId) return
            modalRoot.pdfRendering = false
            if (!result.success) {
                if (Number(result.pageNumber || 1) === 1 && viewer.previewPdfImageUrl.length === 0)
                    viewer.previewError = String(result.error || qsTr("Could not render the PDF."))
                return
            }
            if (viewer.previewPdfImagePath.length > 0 && viewer.previewPdfImagePath !== result.path)
                modalRoot.controller.closeLibraryBook(viewer.previewPdfImagePath)
            viewer.previewPdfImageUrl = String(result.url || "")
            viewer.previewPdfImagePath = String(result.path || "")
            viewer.previewPdfPage = Number(result.pageNumber || 1)
            viewer.previewError = ""
        }

        function onFilePreviewsInvalidated() { modalRoot.closeModal(true) }

        function onFileOperationFinished(result) {
            if (!modalRoot.exportPending || result.operation !== "export") return
            modalRoot.exportPending = false
            viewer.previewError = result.success
                ? ""
                : String(result.error || qsTr("Could not export the file."))
        }
    }

    Shortcut {
        sequence: "Escape"
        enabled: modalRoot.visible && !exportDialog.visible
        onActivated: modalRoot.closeModal()
    }

    Files.FilesPreviewOverlay {
        id: viewer
        objectName: "notesFilePreviewSurface"
        anchors.fill: parent
        visible: modalRoot.visible
        onCloseRequested: modalRoot.closeModal()
        onExportRequested: function(fileId) { modalRoot.exportFile(fileId) }
    }

    FileDialog {
        id: exportDialog
        title: qsTr("Export decrypted file")
        fileMode: FileDialog.SaveFile
        onAccepted: {
            if (modalRoot.controller && modalRoot.pendingExportFileId.length > 0) {
                modalRoot.exportPending = true
                modalRoot.controller.exportLocalFile(modalRoot.pendingExportFileId, selectedFile.toLocalFile())
            }
            modalRoot.pendingExportFileId = ""
        }
        onRejected: {
            modalRoot.pendingExportFileId = ""
            modalRoot.exportPending = false
        }
    }
}
