.pragma library
.import "NotesSlashCommandArguments.js" as SlashArgs

function handleSlashWidgetCommand(editorRoot, blockListEditor, cmdId, blockIdx) {
    editorRoot.pendingWidgetBlockIndex = blockIdx
    if (cmdId === "youtube") {
        blockListEditor.insertWidgetHtmlAfter(blockIdx, "<div data-type=\"youtube-widget\" url=\"\"></div>")
        return
    }
    if (cmdId === "mermaid") {
        blockListEditor.insertWidgetHtmlAfter(blockIdx,
            "<div data-type=\"mermaid\" code=\"graph TD\n  A[Inicio] --&gt; B[Fim]\"></div>")
        return
    }
    if (["columns", "columns2", "cols2", "columns3", "cols3"].indexOf(cmdId) >= 0) {
        var columnCount = cmdId === "columns3" || cmdId === "cols3" ? 3 : 2
        var widths = editorRoot.controller && typeof editorRoot.controller.computeEqualNoteColumnWidths === "function"
            ? editorRoot.controller.computeEqualNoteColumnWidths(columnCount) : []
        if (!widths || widths.length !== columnCount)
            widths = columnCount === 3 ? [33.3, 33.3, 33.4] : [50, 50]
        var inner = ""
        for (var i = 0; i < columnCount; ++i) {
            var width = Number(widths[i]).toFixed(1)
            inner += "<div data-type=\"columnBlock\" data-width=\"" + width + "\" data-group-child=\"\" class=\"column-block\" style=\"--group-flex: " + width + ";\"><p></p></div>"
        }
        blockListEditor.insertWidgetHtmlAfter(blockIdx,
            "<div data-type=\"columnGroup\" class=\"group-layout column-group\" data-columns=\"" + columnCount + "\">" + inner + "</div>")
        return
    }
    if (cmdId === "toggle" || cmdId === "blockquoteToggle") {
        var toggleTag = cmdId === "blockquoteToggle" ? "blockquote-toggle" : "toggle"
        blockListEditor.insertWidgetHtmlAfter(blockIdx,
            "<div data-type=\"" + toggleTag + "\" open=\"true\" title=\"Novo tópico\"><p></p></div>")
        return
    }
    if (cmdId === "collection" || cmdId === "group") {
        blockListEditor.insertWidgetHtmlAfter(blockIdx,
            "<div data-type=\"collection\" title=\"Nova Coleção\" open=\"true\"><p></p></div>")
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
        blockListEditor.insertWidgetHtmlAfter(blockIdx,
            "<div data-type=\"document-bundle\" data-auto-open=\"true\" data-items=\"[]\"></div>")
        return
    }

    var setupMode = cmdId === "focus" ? "foco"
        : cmdId === "alarm" ? "alarme"
        : cmdId === "calendar" ? "evento"
        : cmdId === "habit" ? "habito" : cmdId
    var modalsHost = editorRoot.modalsHost
    if (modalsHost && typeof modalsHost.openSetupWidget === "function" &&
        ["question", "habito", "foco", "alarme", "evento"].indexOf(setupMode) >= 0) {
        var query = blockListEditor.lastSlashQuery || ""
        var prefill = {}
        if (setupMode === "foco") prefill = SlashArgs.focusPrefill(query)
        else if (setupMode === "alarme") prefill = SlashArgs.alarmPrefill(query)
        else if (setupMode === "evento") {
            prefill.title = SlashArgs.extractSlashCommandArgument(query,
                ["evento da agenda", "evento", "agenda", "calendario", "event"])
        } else if (setupMode === "habito") {
            prefill.query = SlashArgs.extractSlashCommandArgument(query,
                ["habito / meta diaria", "habito", "habit", "tracker", "rotina", "frequencia", "meta"])
        }
        modalsHost.openSetupWidget(setupMode, prefill)
        return
    }

    var mediaMode = cmdId === "file" ? "documento" : cmdId === "book" ? "livro" : cmdId
    if (modalsHost && typeof modalsHost.openMediaWidgetPicker === "function" &&
        ["documento", "media", "livro", "video", "scrap"].indexOf(mediaMode) >= 0) {
        var scrapArgument = mediaMode === "scrap"
            ? SlashArgs.extractSlashCommandArgument(blockListEditor.lastSlashQuery,
                ["snapshot web", "snapshot", "scrap", "capturar", "offline", "copia", "web"])
            : ""
        var normalizedScrapUrl = SlashArgs.normalizeWebUrl(scrapArgument)
        modalsHost.openMediaWidgetPicker(mediaMode, mediaMode === "scrap" ? (normalizedScrapUrl || scrapArgument) : "",
            mediaMode === "scrap" && normalizedScrapUrl.length > 0)
        return
    }
    if ((cmdId === "askAi" || cmdId === "ia") && modalsHost && typeof modalsHost.openAiPrompt === "function")
        modalsHost.openAiPrompt("", editorRoot.activeContent)
}
