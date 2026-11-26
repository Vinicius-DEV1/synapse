import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Dialogs
import "../files" as Files
import "../ui"

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
    property bool savePending: false
    property string saveRequestId: ""
    property string pendingMarkdown: ""
    property string pendingSaveSource: ""
    property string saveNotice: ""

    AiClient {
        id: notesAiClient
        dataController: modalRoot.controller
    }

    function openForFile(fileId) {
        var stableFileId = String(fileId || "").trim()
        if (!controller || stableFileId.length === 0 || visible) return
        readingProgress.resetForFile(stableFileId)
        markdownEditor.visible = false
        notesMarkdownAi.closeModal(true)
        savePending = false
        saveRequestId = ""
        pendingMarkdown = ""
        pendingSaveSource = ""
        saveNotice = ""
        requestId = "notes-viewer-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2)
        viewer.previewFileId = stableFileId
        viewer.previewName = ""
        viewer.previewType = ""
        viewer.previewPath = ""
        viewer.previewUrl = ""
        viewer.previewText = ""
        viewer.previewError = ""
        viewer.markdownRendered = true
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
        if (!visible || (savePending && !alreadyInvalidated)) return
        readingProgress.saveNow()
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
        markdownEditor.visible = false
        notesMarkdownAi.closeModal(true)
        requestId = ""
        saveRequestId = ""
        pendingMarkdown = ""
        pendingSaveSource = ""
        visible = false
    }

    function startMarkdownEditing() {
        if (!visible || viewer.loading || savePending || !viewer.isMarkdownFile ||
                (viewer.previewType !== "text" && viewer.previewType !== "code")) return
        markdownEditor.openForFile(viewer.previewName, viewer.previewText)
    }

    function saveMarkdown(content, source) {
        if (savePending || !controller || typeof controller.saveNotesTextFile !== "function") return
        saveRequestId = "notes-text-save-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2)
        pendingMarkdown = String(content || "")
        pendingSaveSource = String(source || "editor")
        savePending = true
        if (pendingSaveSource === "ai") {
            notesMarkdownAi.errorText = ""
        } else {
            markdownEditor.saving = true
            markdownEditor.errorMessage = ""
        }
        controller.saveNotesTextFile(viewer.previewFileId, pendingMarkdown, saveRequestId)
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
                if (textResult.success) {
                    viewer.previewText = String(textResult.text || "")
                    readingProgress.loadForFile(viewer.previewFileId)
                }
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
            if (result.operation === "save-text" && String(result.requestId || "") === modalRoot.saveRequestId) {
                modalRoot.savePending = false
                var saveSource = modalRoot.pendingSaveSource
                if (result.success) {
                    viewer.previewText = modalRoot.pendingMarkdown
                    if (saveSource === "ai") {
                        notesMarkdownAi.proposal = ""
                        notesMarkdownAi.closeModal(true)
                    } else {
                        markdownEditor.saving = false
                        markdownEditor.closeAfterSave()
                    }
                    modalRoot.saveNotice = result.has_drive_copy
                        ? qsTr("Salvo localmente. A cópia do Drive não foi atualizada.")
                        : qsTr("Documento salvo.")
                    saveNoticeTimer.restart()
                    modalRoot.pendingMarkdown = ""
                    modalRoot.saveRequestId = ""
                    modalRoot.pendingSaveSource = ""
                } else {
                    if (saveSource === "ai") {
                        notesMarkdownAi.errorText = String(result.error || qsTr("Could not save the document."))
                    } else {
                        markdownEditor.saving = false
                        markdownEditor.errorMessage = String(result.error || qsTr("Could not save the document."))
                    }
                }
                return
            }
            if (!modalRoot.exportPending || result.operation !== "export") return
            modalRoot.exportPending = false
            viewer.previewError = result.success
                ? ""
                : String(result.error || qsTr("Could not export the file."))
        }
    }

    Shortcut {
        sequence: "Escape"
        enabled: modalRoot.visible && !exportDialog.visible && !markdownEditor.visible && !notesMarkdownAi.visible
        onActivated: modalRoot.closeModal()
    }

    Files.FilesPreviewOverlay {
        id: viewer
        objectName: "notesFilePreviewSurface"
        anchors.fill: parent
        visible: modalRoot.visible
        onCloseRequested: modalRoot.closeModal()
        onExportRequested: function(fileId) { modalRoot.exportFile(fileId) }
        notesMarkdownEditingEnabled: true
        onMarkdownEditRequested: modalRoot.startMarkdownEditing()
        notesMarkdownAiEnabled: true
        onMarkdownAiRequested: notesMarkdownAi.openForDocument(viewer.previewName, viewer.previewText, viewer.previewFileId)
    }

    Timer {
        id: saveNoticeTimer
        interval: 4500
        repeat: false
        onTriggered: modalRoot.saveNotice = ""
    }

    Rectangle {
        objectName: "notesMarkdownSaveNotice"
        anchors.top: parent.top
        anchors.right: parent.right
        anchors.topMargin: 74
        anchors.rightMargin: 24
        z: 3
        visible: modalRoot.visible && modalRoot.saveNotice.length > 0
        width: Math.min(380, modalRoot.width - 48)
        height: noticeText.implicitHeight + 22
        radius: 10
        color: "#ed1a1924"
        border.color: "#3363d99b"
        Label {
            id: noticeText
            anchors.fill: parent
            anchors.margins: 11
            text: modalRoot.saveNotice
            color: "#a7f3d0"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }
    }

    NotesFileReadingProgress {
        id: readingProgress
        z: 2
        visible: modalRoot.visible && !viewer.loading &&
                 (viewer.previewType === "text" || viewer.previewType === "code") && viewer.previewError.length === 0
        controller: modalRoot.controller
        readerSurface: viewer
        fileId: viewer.previewFileId
    }

    NotesFileMarkdownEditor {
        id: markdownEditor
        onSaveRequested: function(content) { modalRoot.saveMarkdown(content) }
        onCancelRequested: {
            visible = false
            saving = false
            errorMessage = ""
        }
    }

    NotesMarkdownAiModal {
        id: notesMarkdownAi
        anchors.fill: parent
        aiClient: notesAiClient
        controller: modalRoot.controller
        documentFileId: viewer.previewFileId
        saving: modalRoot.savePending && modalRoot.pendingSaveSource === "ai"
        onApplyProposalRequested: function(markdown) { modalRoot.saveMarkdown(markdown, "ai") }
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
