.pragma library
.import "NotesHtmlEscaping.js" as HtmlEscaping

function createFileWidgetBlocks(items, groupColor, controller, fallbackName) {
    if (!Array.isArray(items) || items.length === 0 || !controller ||
            typeof controller.parseNoteBlocks !== "function") {
        return { valid: false, blocks: [] }
    }

    var widgetHtml = ""
    for (var i = 0; i < items.length; ++i) {
        var item = items[i]
        var fileId = item && String(item.fileId || item.id || "")
        if (!fileId) return { valid: false, blocks: [] }
        var name = String(item.name || item.title || fallbackName)
        var fileType = String(item.fileType || item.file_type || "other")
        var fileSize = Number(item.fileSize || item.file_size || 0)
        if (!isFinite(fileSize) || fileSize < 0) fileSize = 0
        fileSize = Math.floor(fileSize)
        var isLink = item.isLink === true || item.isLink === "true"
        widgetHtml += "<div class=\"file-widget\" data-type=\"file-widget\" data-file-id=\"" + HtmlEscaping.escapeHtmlAttribute(fileId) +
            "\" data-name=\"" + HtmlEscaping.escapeHtmlAttribute(name) +
            "\" data-file-name=\"" + HtmlEscaping.escapeHtmlAttribute(name) +
            "\" data-file-type=\"" + HtmlEscaping.escapeHtmlAttribute(fileType) +
            "\" data-file-size=\"" + HtmlEscaping.escapeHtmlAttribute(fileSize) +
            "\" data-is-link=\"" + (isLink ? "true" : "false") +
            "\" data-color=\"" + HtmlEscaping.escapeHtmlAttribute(groupColor || "default") + "\"></div>"
    }

    try {
        var blocks = controller.parseNoteBlocks(widgetHtml) || []
        if (!Array.isArray(blocks) || blocks.length !== items.length) return { valid: false, blocks: [] }
        for (var blockIndex = 0; blockIndex < blocks.length; ++blockIndex) {
            var parsed = blocks[blockIndex]
            var parsedAttrs = parsed && parsed.attrs ? parsed.attrs : ({})
            var sourceItem = items[blockIndex]
            var expectedId = String(sourceItem.fileId || sourceItem.id || "")
            var expectedSize = Number(sourceItem.fileSize || sourceItem.file_size || 0)
            if (!isFinite(expectedSize) || expectedSize < 0) expectedSize = 0
            expectedSize = String(Math.floor(expectedSize))
            if (!parsed || parsed.blockType !== "fileWidget" ||
                    String(parsedAttrs["data-file-id"] || "") !== expectedId ||
                    String(parsedAttrs["data-name"] || "") !== String(sourceItem.name || sourceItem.title || fallbackName) ||
                    String(parsedAttrs["data-file-name"] || "") !== String(sourceItem.name || sourceItem.title || fallbackName) ||
                    String(parsedAttrs["data-file-type"] || "") !== String(sourceItem.fileType || sourceItem.file_type || "other") ||
                    String(parsedAttrs["data-file-size"] || "") !== expectedSize ||
                    String(parsedAttrs["data-is-link"] || "") !==
                        ((sourceItem.isLink === true || sourceItem.isLink === "true") ? "true" : "false") ||
                    String(parsedAttrs["data-color"] || "") !== String(groupColor || "default")) {
                return { valid: false, blocks: [] }
            }
        }
        return { valid: true, blocks: blocks }
    } catch (error) {
        return { valid: false, blocks: [], error: String(error) }
    }
}
