.pragma library
.import "NotesHtmlEscaping.js" as HtmlEscaping

function filteredItems(items, search) {
    var query = String(search || "").trim().toLowerCase()
    if (!query) return items || []
    return (items || []).filter(function(item) {
        var label = String(item.name || item.title || "").toLowerCase()
        var author = String(item.author || "").toLowerCase()
        return label.indexOf(query) >= 0 || author.indexOf(query) >= 0
    })
}

function localUploadCompletion(requestId, result, fallbackError) {
    if (!requestId || !result || result.operation !== "import" ||
            String(result.requestId || "") !== String(requestId || "")) return null
    if (!result.success || !result.id) {
        return { success: false, error: String(result.error || fallbackError) }
    }
    return {
        success: true,
        file: {
            id: String(result.id),
            fileId: String(result.id),
            name: String(result.name || "Arquivo"),
            fileType: String(result.file_type || "document"),
            fileSize: Number(result.file_size) || 0,
            isLink: false
        }
    }
}

function mediaPickerModeForSlashCommand(commandId) {
    if (commandId === "file" || commandId === "documento-link") return "file-select"
    if (commandId === "file-upload" || commandId === "documento") return "documento"
    if (commandId === "file-link") return "documento-link"
    if (commandId === "book") return "livro"
    return commandId
}

function widgetHtmlForPickedItem(item, mode) {
    var label = HtmlEscaping.escapeHtmlAttribute(item.name || item.title || "Item")
    var itemId = HtmlEscaping.escapeHtmlAttribute(item.id)
    if (mode === "documento" || mode === "file-select") {
        var fileType = HtmlEscaping.escapeHtmlAttribute(item.file_type || "document")
        var fileSize = HtmlEscaping.escapeHtmlNonNegativeIntegerAttribute(item.file_size)
        return "<div class=\"file-widget\" data-type=\"file-widget\" data-file-id=\"" + itemId +
            "\" data-name=\"" + label + "\" data-file-name=\"" + label + "\" data-file-type=\"" +
            fileType + "\" data-file-size=\"" + fileSize + "\" data-is-link=\"" +
            (mode === "file-select" ? "true" : "false") + "\"></div>"
    }
    var mediaType = mode === "livro" ? "book" : "video"
    return "<span class=\"media-widget\" data-type=\"media-widget\" data-media-type=\"" + mediaType +
        "\" data-media-id=\"" + itemId + "\" data-title=\"" + label + "\"></span>"
}

function widgetHtmlForUploadedFiles(files, groupAsBundle) {
    if (!Array.isArray(files) || files.length === 0) return ""
    if (groupAsBundle && files.length > 1) {
        var items = files.map(function(file) {
            return {
                fileId: String(file.fileId || file.id || ""),
                name: String(file.name || "Arquivo"),
                fileType: String(file.fileType || "other"),
                fileSize: Math.max(0, Math.floor(Number(file.fileSize) || 0)),
                isLink: Boolean(file.isLink),
                addedAt: Date.now()
            }
        })
        if (items.some(function(item) { return item.fileId.length === 0 })) return ""
        var json = HtmlEscaping.escapeHtmlAttribute(JSON.stringify(items))
        return "<div class=\"document-bundle-widget\" data-type=\"document-bundle\"" +
            " data-title=\"Documentos\" data-items=\"" + json + "\"></div>"
    }
    return files.map(function(file) {
        var label = HtmlEscaping.escapeHtmlAttribute(file.name || "Arquivo")
        var fileId = HtmlEscaping.escapeHtmlAttribute(file.fileId || file.id || "")
        var fileType = HtmlEscaping.escapeHtmlAttribute(file.fileType || "other")
        var fileSize = HtmlEscaping.escapeHtmlNonNegativeIntegerAttribute(file.fileSize)
        return "<div class=\"file-widget\" data-type=\"file-widget\" data-file-id=\"" + fileId +
            "\" data-name=\"" + label + "\" data-file-name=\"" + label + "\" data-file-type=\"" +
            fileType + "\" data-file-size=\"" + fileSize + "\" data-is-link=\"" +
            (file.isLink ? "true" : "false") + "\"></div>"
    }).join("")
}

function filePathFromUrl(fileUrl) {
    var path = decodeURIComponent(String(fileUrl || "").replace(/^file:\/\//, ""))
    return /^\/[A-Za-z]:\//.test(path) ? path.substring(1) : path
}

function fileNameFromUrl(fileUrl) {
    var path = filePathFromUrl(fileUrl).replace(/\\/g, "/")
    var segments = path.split("/")
    return segments.length > 0 && segments[segments.length - 1]
        ? segments[segments.length - 1]
        : path
}

function capturedScrapWidgetHtml(title, url, result) {
    var safeTitle = HtmlEscaping.escapeHtmlAttribute(title || (result && result.title) || "Captura Web")
    var safeUrl = HtmlEscaping.escapeHtmlAttribute((result && result.url) || url || "")
    var attributes = " title=\"" + safeTitle + "\" data-title=\"" + safeTitle +
        "\" url=\"" + safeUrl + "\" data-url=\"" + safeUrl + "\""
    if (!result) return "<div class=\"scrap-widget-block\" data-type=\"scrap-widget\"" + attributes + "></div>"
    var size = HtmlEscaping.escapeHtmlNonNegativeIntegerAttribute(result.file_size)
    var excerpt = HtmlEscaping.escapeHtmlAttribute(result.excerpt || "")
    return "<div class=\"scrap-widget-block\" data-type=\"scrap-widget\" data-status=\"ready\"" +
        attributes + " data-file-size=\"" + size + "\" data-excerpt=\"" + excerpt + "\"></div>"
}
