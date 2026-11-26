.pragma library
.import "NotesHtmlEscaping.js" as HtmlEscaping
.import "NotesJsonAttribute.js" as NotesJsonAttribute

var MAX_NESTED_EDITOR_DEPTH = 24

function parseBundleItems(attrs) {
    var sourceAttrs = attrs || ({})
    var raw = sourceAttrs["data-items"]
    if (raw === undefined || raw === null || raw === "") raw = sourceAttrs.items
    if (raw === undefined || raw === null || raw === "") raw = "[]"

    var result = typeof raw === "string"
        ? NotesJsonAttribute.parseJsonAttribute(raw, true)
        : { valid: Array.isArray(raw), value: raw, error: "Expected a JSON array." }
    if (!result.valid) {
        return {
            valid: false,
            items: [],
            error: "Could not parse bundled file metadata; editing is disabled to preserve the stored value.",
            details: String(result.error || "")
        }
    }

    if (!Array.isArray(result.value)) {
        return {
            valid: false,
            items: [],
            error: "Bundled file metadata must be an array; editing is disabled to preserve the stored value."
        }
    }

    for (var i = 0; i < result.value.length; i++) {
        var item = result.value[i]
        var itemId = item && (item.fileId || item.id)
        if (!item || typeof item !== "object" || Array.isArray(item) ||
                typeof itemId !== "string" || itemId.length === 0) {
            return {
                valid: false,
                items: [],
                error: "Bundled file metadata contains an invalid item; editing is disabled to preserve the stored value."
            }
        }
    }
    return { valid: true, items: result.value }
}

function uniqueFileExtensions(items) {
    var seen = ({})
    var out = []
    var sourceItems = Array.isArray(items) ? items : []
    for (var i = 0; i < sourceItems.length; i++) {
        var item = sourceItems[i] || ({})
        var name = String(item.name || item.title || "")
        var dot = name.lastIndexOf(".")
        var extension = dot > 0
            ? name.substring(dot).toUpperCase()
            : String(item.fileType || "DOC").toUpperCase()
        if (extension && !seen[extension]) {
            seen[extension] = true
            out.push(extension)
            if (out.length >= 3) break
        }
    }
    return out
}

function isNestedBlockContainer(blockType) {
    return blockType === "toggleBlock" || blockType === "blockquoteToggle" ||
        blockType === "collectionBlock" || blockType === "blockquote" ||
        blockType === "linkGroup" || blockType === "columnGroup" ||
        blockType === "columnBlock"
}

function createBundleItemFromFileWidget(block, fallbackName) {
    if (!block || block.blockType !== "fileWidget") return { valid: false, item: null }
    var attrs = block.attrs || ({})
    var fileId = String(attrs["data-file-id"] || attrs["file-id"] || attrs.fileId || "").trim()
    if (!fileId) return { valid: false, item: null }

    var name = String(attrs["data-name"] || attrs.name || attrs["data-file-name"] ||
        attrs["file-name"] || fallbackName)
    var fileType = String(attrs["data-file-type"] || attrs["file-type"] || attrs.fileType || "other").toLowerCase()
    var isLink = String(attrs["data-is-link"] || attrs["is-link"] || attrs.isLink || "").toLowerCase() === "true"
    var item = {
        id: fileId,
        fileId: fileId,
        name: name,
        fileType: fileType,
        isLink: isLink,
        addedAt: Date.now()
    }
    var rawSize = attrs["data-file-size"] !== undefined ? attrs["data-file-size"]
        : (attrs["file-size"] !== undefined ? attrs["file-size"] : attrs.fileSize)
    if (rawSize !== undefined && rawSize !== null && rawSize !== "") {
        var fileSize = Number(rawSize)
        if (!isFinite(fileSize) || fileSize < 0) return { valid: false, item: null }
        item.fileSize = Math.floor(fileSize)
    }
    return { valid: true, item: item }
}

function collectLooseFileWidgets(blocks, controller, fallbackName, parentPath) {
    if (!Array.isArray(blocks) || !controller || typeof controller.parseNoteBlocks !== "function") return []
    var pathPrefix = Array.isArray(parentPath) ? parentPath : []
    if (pathPrefix.length >= MAX_NESTED_EDITOR_DEPTH) return []

    var looseFiles = []
    for (var i = 0; i < blocks.length; ++i) {
        var block = blocks[i]
        if (!block) continue
        var blockPath = pathPrefix.concat([i])
        if (block.blockType === "fileWidget") {
            var result = createBundleItemFromFileWidget(block, fallbackName)
            if (!result.valid) continue
            var item = Object.assign({}, result.item)
            item.sourceBlockPath = blockPath
            looseFiles.push(item)
            continue
        }
        if (!isNestedBlockContainer(block.blockType) || !block.innerHtml) continue
        var childBlocks = controller.parseNoteBlocks(String(block.innerHtml)) || []
        var nestedFiles = collectLooseFileWidgets(childBlocks, controller, fallbackName, blockPath)
        Array.prototype.push.apply(looseFiles, nestedFiles)
    }
    return looseFiles
}

function removeLooseFileWidgetAtPath(blocks, sourceBlockPath, fileId, controller, depth) {
    var currentDepth = Number(depth || 0)
    if (!Array.isArray(blocks) || !Array.isArray(sourceBlockPath) || sourceBlockPath.length === 0 ||
            currentDepth >= sourceBlockPath.length || currentDepth >= MAX_NESTED_EDITOR_DEPTH) {
        return { valid: false, blocks: [] }
    }

    var index = Number(sourceBlockPath[currentDepth])
    if (!isFinite(index) || Math.floor(index) !== index || index < 0 || index >= blocks.length) {
        return { valid: false, blocks: [] }
    }
    var block = blocks[index]
    if (!block) return { valid: false, blocks: [] }

    var nextBlocks = blocks.slice()
    if (currentDepth === sourceBlockPath.length - 1) {
        var sourceItem = createBundleItemFromFileWidget(block, "Documento")
        if (!sourceItem.valid || sourceItem.item.fileId !== String(fileId || "")) {
            return { valid: false, blocks: [] }
        }
        nextBlocks.splice(index, 1)
        return { valid: true, blocks: nextBlocks, item: sourceItem.item }
    }

    if (!isNestedBlockContainer(block.blockType) || !block.innerHtml || !controller ||
            typeof controller.parseNoteBlocks !== "function" ||
            typeof controller.serializeNoteBlocks !== "function") {
        return { valid: false, blocks: [] }
    }
    var childBlocks = controller.parseNoteBlocks(String(block.innerHtml)) || []
    var childResult = removeLooseFileWidgetAtPath(
        childBlocks, sourceBlockPath, fileId, controller, currentDepth + 1)
    if (!childResult.valid) return { valid: false, blocks: [] }

    var updatedBlock = Object.assign({}, block)
    var updatedInnerHtml = controller.serializeNoteBlocks(childResult.blocks)
    if (typeof updatedInnerHtml !== "string") return { valid: false, blocks: [] }
    updatedBlock.innerHtml = updatedInnerHtml
    nextBlocks[index] = updatedBlock
    return { valid: true, blocks: nextBlocks, item: childResult.item }
}

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
