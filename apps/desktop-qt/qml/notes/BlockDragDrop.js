.pragma library
.import "NotesHtmlEscaping.js" as HtmlEscaping

var MAX_COLUMNS = 5

function computeEqualWidths(columnCount) {
    var count = Math.max(1, Math.min(MAX_COLUMNS, Number(columnCount) || 1))
    var each = Math.floor((1000 / count)) / 10
    var out = []
    for (var i = 0; i < count; ++i) out.push(each)
    return out
}

function extractColumnSlices(innerHtml) {
    var src = String(innerHtml || "")
    var slices = []
    var openRe = /<div\b[^>]*data-type=["']columnBlock["'][^>]*>/gi
    var m
    var starts = []
    while ((m = openRe.exec(src)) !== null) starts.push({ start: m.index, bodyStart: m.index + m[0].length, tag: m[0] })
    if (starts.length === 0) return [src]
    for (var i = 0; i < starts.length; ++i) {
        var end = i + 1 < starts.length ? starts[i + 1].start : src.length
        var slice = src.substring(starts[i].bodyStart, end).replace(/<\/div>\s*$/i, "")
        var wMatch = starts[i].tag.match(/data-width=["']([^"']+)["']/i)
        var width = wMatch ? parseFloat(wMatch[1]) : 50
        slices.push({ html: slice || "<p></p>", width: isNaN(width) ? 50 : width, openTag: starts[i].tag })
    }
    return slices
}

function setQuotedAttribute(tag, name, value) {
    var escaped = HtmlEscaping.escapeHtmlAttribute(value)
    var attribute = new RegExp("(\\s" + name + "\\s*=\\s*)([\\\"'])(.*?)\\2", "i")
    if (attribute.test(tag)) return tag.replace(attribute, "$1\"" + escaped + "\"")
    return tag.replace(/>$/, " " + name + "=\"" + escaped + "\">")
}

function updateColumnBlockOpenTag(rawTag, width) {
    var tag = String(rawTag || "")
    if (!/^<div\b/i.test(tag)) return buildColumnBlockHtml(width, "").replace(/><p><\/p><\/div>$/, ">")
    tag = setQuotedAttribute(tag, "data-width", Number(width))
    var styleMatch = tag.match(/\sstyle\s*=\s*([\"'])(.*?)\1/i)
    if (styleMatch) {
        var style = styleMatch[2]
        var flexRule = /(--group-flex\s*:\s*)[^;\"']+/i
        style = flexRule.test(style) ? style.replace(flexRule, "$1" + Number(width)) : style.trim() + "; --group-flex: " + Number(width)
        tag = tag.replace(styleMatch[0], " style=\"" + style.replace(/\"/g, "&quot;") + "\"")
    } else {
        tag = setQuotedAttribute(tag, "style", "--group-flex: " + Number(width) + ";")
    }
    return tag
}

function buildColumnBlockHtml(width, innerHtml) {
    return "<div data-type=\"columnBlock\" data-width=\"" + Number(width || 50) +
        "\" data-group-child=\"\" class=\"column-block\" style=\"--group-flex: " + Number(width || 50) + ";\">" +
        (innerHtml || "<p></p>") + "</div>"
}

function serializeColumnsGroup(columnsHtml, widths, baseAttrs, blockId, columnOpenTags) {
    var inner = ""
    var fallbackW = Math.round((100 / Math.max(1, columnsHtml.length)) * 10) / 10
    for (var i = 0; i < columnsHtml.length; ++i) {
        var body = String(columnsHtml[i] || "<p></p>").trim() || "<p></p>"
        var colW = (widths && widths.length === columnsHtml.length) ? Math.round(widths[i] * 10) / 10 : fallbackW
        var openTag = columnOpenTags && columnOpenTags.length === columnsHtml.length
            ? updateColumnBlockOpenTag(columnOpenTags[i], colW) : ""
        inner += openTag
            ? openTag + body + "</div>"
            : buildColumnBlockHtml(colW, body)
    }
    var nextAttrs = Object.assign({}, baseAttrs || ({}))
    nextAttrs["_tag"] = "div"
    nextAttrs["data-type"] = "columnGroup"
    nextAttrs["class"] = "group-layout column-group"
    nextAttrs["data-columns"] = String(columnsHtml.length)
    return { id: blockId || "", blockType: "columnGroup", attrs: nextAttrs, innerHtml: inner, html: "" }
}

function buildColumnGroupBlock(columns) {
    var count = Math.min(MAX_COLUMNS, columns.length)
    var widths = computeEqualWidths(count)
    var colPayloads = []
    for (var i = 0; i < count; ++i) colPayloads.push(typeof columns[i] === "string" ? columns[i] : (columns[i].html || "<p></p>"))
    return serializeColumnsGroup(colPayloads, widths, ({}), "blk_cols_" + Date.now())
}

function applyBlockDrop(blocks, src, dst, side, controller) {
    if (!controller || typeof controller.serializeNoteBlocks !== "function") return null
    if (src < 0 || dst < 0 || src === dst || src >= blocks.length || dst >= blocks.length) return null
    var next = blocks.slice()
    var moved = next[src]
    if (side === "left" || side === "right") {
        var movedHtml = controller.serializeNoteBlocks([moved])
        var targetBlk = next[dst]
        if (targetBlk.blockType === "columnGroup") {
            var existingSlices = extractColumnSlices(targetBlk.innerHtml || "")
            if (existingSlices.length >= MAX_COLUMNS) return null
            var colPayloads = []
            var columnOpenTags = []
            for (var i = 0; i < existingSlices.length; ++i) {
                colPayloads.push(existingSlices[i].html || "<p></p>")
                columnOpenTags.push(existingSlices[i].openTag || "")
            }
            if (side === "left") { colPayloads.unshift(movedHtml); columnOpenTags.unshift("") }
            else { colPayloads.push(movedHtml); columnOpenTags.push("") }
            // React redistributes widths when a column is added; retain its group and child metadata.
            next[dst] = serializeColumnsGroup(
                colPayloads, computeEqualWidths(colPayloads.length), targetBlk.attrs, targetBlk.id, columnOpenTags)
            next.splice(src, 1)
            return next
        }
        var targetHtml = controller.serializeNoteBlocks([targetBlk])
        next[dst] = buildColumnGroupBlock(side === "left" ? [movedHtml, targetHtml] : [targetHtml, movedHtml])
        next.splice(src, 1)
        return next
    }
    next.splice(src, 1)
    var insertAt = dst > src ? (side === "top" ? dst - 1 : dst) : (side === "top" ? dst : dst + 1)
    insertAt = Math.max(0, Math.min(next.length, insertAt))
    next.splice(insertAt, 0, moved)
    return next
}

function moveBlockInArray(blocks, idx, delta) {
    var target = idx + delta
    if (target < 0 || target >= blocks.length) return null
    var next = blocks.slice()
    var moved = next.splice(idx, 1)[0]
    next.splice(target, 0, moved)
    return next
}

function duplicateBlockInArray(blocks, idx) {
    var next = blocks.slice()
    var copy = JSON.parse(JSON.stringify(next[idx]))
    copy.id = "blk_dup_" + Date.now()
    next.splice(idx + 1, 0, copy)
    return next
}

function deleteBlockInArray(blocks, idx) {
    var next = blocks.slice()
    next.splice(idx, 1)
    if (next.length === 0) next.push({ id: "blk_0", blockType: "richText", attrs: ({}), html: "<p><br/></p>", innerHtml: "<p><br/></p>" })
    return next
}
