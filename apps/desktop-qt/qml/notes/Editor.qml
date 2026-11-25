import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

// Unified native WYSIWYG Editor mirroring apps/web-react/src/components/notes/Editor.tsx
// Eliminates legacy Preview vs Source split; all blocks, widgets, and prose edit inline live.
ColumnLayout {
    id: editorRoot
    objectName: "notesEditorCanvas"

    property string activeContent: ""
    property string pageId: ""
    property string activeTitle: ""
    property var pageList: []
    property var controller: null
    property var textOperations: notesTextOperations
    property bool active: true
    property var modalsHost: null
    property var shortcutsHost: null
    property bool suppressContentSync: false
    property int pendingWidgetBlockIndex: -1
    property var pendingFileDropQueue: []
    property var pendingFileDropWidgets: []
    property string pendingFileDropRequestId: ""
    property string pendingFileDropPageId: ""
    property string pendingFileDropBlockId: ""
    property int pendingFileDropCursorPosition: -1
    property int fileImportRequestSequence: 0
    property string fileDropFeedback: ""
    readonly property string lastSlashQuery: blockListEditor.lastSlashQuery
    readonly property bool hasPendingRichEdits: false
    readonly property bool hasContentFocus: blockListEditor.hasActiveRichFocus

    signal contentModified(string content)
    signal pagePreviewRequested(string pageId)
    signal pageOpenRequested(string pageId)
    signal externalLinkRequested(string link)
    signal pageHierarchyChanged()
    signal playQuestionRequested(string batteryId, string questionId, string title)
    signal openInQuestionsRequested(string batteryId)
    signal youtubeWatchRequested(string videoUrl, string videoTitle)
    signal mermaidFullscreenRequested(string code)
    signal habitStatsRequested(string habitId)
    signal openMediaRequested(string mediaType, string mediaId, string title)

    function toggleActiveMark(mark) {
        return blockListEditor.toggleActiveMark(mark)
    }

    function hasPendingEdits() {
        return blockListEditor.hasPendingEdits()
    }

    function flushActiveEdits() {
        return blockListEditor.flushActiveRichSlices()
    }

    function insertWidgetHtmlAtPending(html) {
        blockListEditor.insertWidgetHtmlAfter(pendingWidgetBlockIndex, html)
        pendingWidgetBlockIndex = -1
    }

    function handleSlashWidgetCommand(cmdId, blockIdx) {
        pendingWidgetBlockIndex = blockIdx
        if (cmdId === "youtube") {
            blockListEditor.insertWidgetHtmlAfter(blockIdx, "<div data-type=\"youtube-widget\" url=\"\"></div>")
            return
        }
        if (cmdId === "mermaid") {
            blockListEditor.insertWidgetHtmlAfter(blockIdx,
                "<div data-type=\"mermaid\" code=\"graph TD\n  A[Inicio] --&gt; B[Fim]\"></div>")
            return
        }
        if (cmdId === "columns" || cmdId === "columns2" || cmdId === "cols2" || cmdId === "columns3" || cmdId === "cols3") {
            var cols = (cmdId === "columns3" || cmdId === "cols3") ? 3 : 2
            var w = cols === 3 ? "33.3" : "50"
            var inner = ""
            for (var i = 0; i < cols; ++i) {
                inner += "<div data-type=\"columnBlock\" data-width=\"" + w + "\" data-group-child=\"\" class=\"column-block\" style=\"--group-flex: " + w + ";\"><p></p></div>"
            }
            blockListEditor.insertWidgetHtmlAfter(blockIdx, "<div data-type=\"columnGroup\" class=\"group-layout column-group\" data-columns=\"" + cols + "\">" + inner + "</div>")
            return
        }
        if (cmdId === "toggle" || cmdId === "blockquoteToggle") {
            var tag = cmdId === "blockquoteToggle" ? "blockquote-toggle" : "toggle"
            blockListEditor.insertWidgetHtmlAfter(blockIdx, "<div data-type=\"" + tag + "\" open=\"true\" title=\"Novo tópico\"><p></p></div>")
            return
        }
        if (cmdId === "collection" || cmdId === "group") {
            blockListEditor.insertWidgetHtmlAfter(blockIdx, "<div data-type=\"collection\" title=\"Nova Coleção\" open=\"true\"><p></p></div>")
            return
        }
        if (cmdId === "codeBlock" || cmdId === "code") {
            blockListEditor.insertWidgetHtmlAfter(blockIdx, "<pre><code class=\"language-plaintext\"></code></pre>")
            return
        }
        if (cmdId === "blockquote" || cmdId === "callout") {
            blockListEditor.insertWidgetHtmlAfter(blockIdx, "<blockquote data-color=\"default\"><p></p></blockquote>")
            return
        }
        if (cmdId === "agrupar" || cmdId === "bundle") {
            blockListEditor.insertWidgetHtmlAfter(blockIdx, "<div data-type=\"document-bundle\" data-auto-open=\"true\" data-items=\"[]\"></div>")
            return
        }
        var setupMode = cmdId === "focus" ? "foco"
            : cmdId === "alarm" ? "alarme"
            : cmdId === "calendar" ? "evento"
            : cmdId === "habit" ? "habito" : cmdId
        if (modalsHost && typeof modalsHost.openSetupWidget === "function" &&
            (setupMode === "question" || setupMode === "habito" || setupMode === "foco" ||
             setupMode === "alarme" || setupMode === "evento")) {
            modalsHost.openSetupWidget(setupMode, { query: blockListEditor.lastSlashQuery || "" })
            return
        }
        var mediaMode = cmdId === "file" ? "documento"
            : cmdId === "book" ? "livro" : cmdId
        if (modalsHost && typeof modalsHost.openMediaWidgetPicker === "function" &&
            (mediaMode === "documento" || mediaMode === "media" || mediaMode === "livro" ||
             mediaMode === "video" || mediaMode === "scrap")) {
            modalsHost.openMediaWidgetPicker(mediaMode, "")
            return
        }
        if ((cmdId === "askAi" || cmdId === "ia") && modalsHost && typeof modalsHost.openAiPrompt === "function") {
            modalsHost.openAiPrompt("", editorRoot.activeContent)
        }
    }

    function applyAiResult(htmlOrText) {
        if (pendingWidgetBlockIndex >= 0) {
            blockListEditor.insertWidgetHtmlAfter(pendingWidgetBlockIndex, htmlOrText)
            pendingWidgetBlockIndex = -1
        } else {
            blockListEditor.insertWidgetHtmlAfter(blockListEditor.blocks.length - 1, htmlOrText)
        }
    }

    function appendTrailingParagraphAndFocus() {
        blockListEditor.appendTrailingParagraph()
    }

    function escapeHtmlAttribute(value) {
        return String(value || "").replace(/&/g, "&amp;").replace(/\"/g, "&quot;")
            .replace(/</g, "&lt;").replace(/>/g, "&gt;")
    }

    function localPathFromFileUrl(rawUrl) {
        var match = String(rawUrl || "").match(/^file:\/\/\/(.*)$/i)
        if (!match) return ""
        try {
            var decodedPath = decodeURIComponent(match[1])
            return Qt.platform.os === "windows" ? decodedPath : "/" + decodedPath
        } catch (error) {
            console.warn("[Notes:Editor] Could not decode a dropped local file URL:", String(rawUrl), error)
            return ""
        }
    }

    function handleDroppedFileUrls(urls, dropX, dropY) {
        if (pendingFileDropRequestId || pendingFileDropQueue.length > 0) {
            fileDropFeedback = qsTr("Aguarde a importação atual terminar.")
            return
        }
        var queue = []
        var rejectedCount = 0
        for (var i = 0; i < urls.length; ++i) {
            var rawUrl = String(urls[i] || "")
            if (/\.(png|jpe?g|gif|webp|bmp)(\?|#|$)/i.test(rawUrl)) continue
            var localPath = localPathFromFileUrl(rawUrl)
            if (!localPath) {
                rejectedCount += 1
                continue
            }
            fileImportRequestSequence += 1
            queue.push({
                path: localPath,
                requestId: "notes_drop_" + Date.now() + "_" + fileImportRequestSequence
            })
        }
        if (queue.length === 0) {
            if (rejectedCount > 0) fileDropFeedback = qsTr("Solte arquivos locais para anexá-los à página.")
            return
        }
        if (!controller || typeof controller.importLocalFile !== "function") {
            fileDropFeedback = qsTr("A importação de arquivos não está disponível.")
            return
        }
        var point = fileDropArea.mapToItem(blockListEditor, dropX, dropY)
        var target = blockListEditor.focusDropTargetAt(point.x, point.y)
        pendingFileDropQueue = queue
        pendingFileDropWidgets = []
        pendingFileDropPageId = pageId
        pendingFileDropBlockId = String(target.blockId || "")
        pendingFileDropCursorPosition = Number(target.cursorPosition)
        fileDropFeedback = rejectedCount > 0 ? qsTr("Alguns itens não eram arquivos locais e foram ignorados.") : ""
        startNextDroppedFileImport()
    }

    function startNextDroppedFileImport() {
        if (pendingFileDropRequestId || pendingFileDropQueue.length === 0) return
        if (!controller || typeof controller.importLocalFile !== "function" || controller.fileOperationRunning) return
        var nextFile = pendingFileDropQueue[0]
        pendingFileDropRequestId = nextFile.requestId
        controller.importLocalFile(nextFile.path, "", nextFile.requestId)
    }

    function finishDroppedFileImport(result) {
        if (!result || String(result.requestId || "") !== pendingFileDropRequestId) return
        pendingFileDropRequestId = ""
        if (result.success) {
            var fileId = escapeHtmlAttribute(result.id)
            var fileName = escapeHtmlAttribute(result.name || qsTr("Arquivo"))
            var widgets = pendingFileDropWidgets.slice()
            widgets.push(
                "<div class=\"file-widget\" data-type=\"file-widget\" data-file-id=\"" + fileId +
                "\" data-name=\"" + fileName + "\" data-file-name=\"" + fileName +
                "\" data-file-type=\"other\"></div>")
            pendingFileDropWidgets = widgets
        } else {
            fileDropFeedback = String(result.error || qsTr("Um arquivo não pôde ser importado."))
        }
        pendingFileDropQueue = pendingFileDropQueue.slice(1)
        if (pendingFileDropQueue.length > 0) {
            Qt.callLater(startNextDroppedFileImport)
            return
        }
        if (pendingFileDropWidgets.length > 0) {
            if (pageId === pendingFileDropPageId &&
                    blockListEditor.insertWidgetHtmlAtBlock(
                        pendingFileDropBlockId, pendingFileDropCursorPosition,
                        pendingFileDropWidgets.join(""))) {
                if (fileDropFeedback.length === 0) fileDropFeedback = qsTr("Arquivo(s) importado(s) e anexado(s).")
            } else {
                fileDropFeedback = qsTr("Os arquivos foram importados, mas a página ou bloco mudou antes de anexá-los.")
            }
        }
        pendingFileDropWidgets = []
        pendingFileDropPageId = ""
        pendingFileDropBlockId = ""
        pendingFileDropCursorPosition = -1
    }

    spacing: 8
    Layout.fillWidth: true

    Connections {
        target: editorRoot.shortcutsHost
        ignoreUnknownSignals: true
        function onRichMarkRequested(markName) {
            blockListEditor.toggleActiveMark(markName)
        }
    }

    DropArea {
        id: fileDropArea
        Layout.fillWidth: true
        implicitHeight: blockListEditor.implicitHeight
        onDropped: function(drop) {
            if (!drop.hasUrls) return
            editorRoot.handleDroppedFileUrls(drop.urls, drop.x, drop.y)
        }

        BlockListEditor {
            id: blockListEditor
            width: parent.width
            sourceHtml: editorRoot.activeContent
            pageId: editorRoot.pageId
            pageTitle: editorRoot.activeTitle
            pageList: editorRoot.pageList
            controller: editorRoot.controller
            textOperations: editorRoot.textOperations
            active: editorRoot.active
            onHtmlChanged: function(serializedHtml) {
                editorRoot.suppressContentSync = true
                editorRoot.contentModified(serializedHtml)
                editorRoot.suppressContentSync = false
            }
            onPagePreviewRequested: function(pid) { editorRoot.pagePreviewRequested(pid) }
            onPageOpenRequested: function(pid) { editorRoot.pageOpenRequested(pid) }
            onExternalLinkRequested: function(lnk) { editorRoot.externalLinkRequested(lnk) }
            onAskAiRequested: function(sel, bHtml) {
                if (editorRoot.modalsHost && typeof editorRoot.modalsHost.openAiPrompt === "function") {
                    editorRoot.modalsHost.openAiPrompt(sel, bHtml)
                }
            }
            onSlashWidgetRequested: function(cmd, idx) { editorRoot.handleSlashWidgetCommand(cmd, idx) }
            onPlayQuestionRequested: function(bid, qid, t) { editorRoot.playQuestionRequested(bid, qid, t) }
            onOpenInQuestionsRequested: function(bid) { editorRoot.openInQuestionsRequested(bid) }
            onYoutubeWatchRequested: function(u, t) { editorRoot.youtubeWatchRequested(u, t) }
            onMermaidFullscreenRequested: function(c) { editorRoot.mermaidFullscreenRequested(c) }
            onCreateSubPageWithContent: function(title, html) {
                if (!editorRoot.controller || !editorRoot.pageId) return
                var newId = editorRoot.controller.createSubPage(editorRoot.pageId, title, "📄")
                if (newId) {
                    editorRoot.controller.savePage(newId, title, html, "📄", "")
                    editorRoot.pageHierarchyChanged()
                }
            }
            onHabitStatsRequested: function(hid) { editorRoot.habitStatsRequested(hid) }
            onOpenMediaRequested: function(mt, mid, t) { editorRoot.openMediaRequested(mt, mid, t) }
        }
    }

    Connections {
        target: editorRoot.controller
        ignoreUnknownSignals: true
        function onFileOperationFinished(result) { editorRoot.finishDroppedFileImport(result) }
        function onFileOperationStateChanged() {
            if (editorRoot.pendingFileDropQueue.length > 0 && !editorRoot.pendingFileDropRequestId &&
                    editorRoot.controller && !editorRoot.controller.fileOperationRunning) {
                Qt.callLater(editorRoot.startNextDroppedFileImport)
            }
        }
    }

    Text {
        Layout.fillWidth: true
        visible: editorRoot.fileDropFeedback.length > 0
        text: editorRoot.fileDropFeedback
        color: editorRoot.fileDropFeedback.indexOf("importado(s)") >= 0 ? "#86efac" : "#fda4af"
        font.pixelSize: 12
        wrapMode: Text.Wrap
        Accessible.role: Accessible.AlertMessage
    }
}
