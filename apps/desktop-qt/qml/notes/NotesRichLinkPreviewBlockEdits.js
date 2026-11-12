.pragma library

function decodeAttribute(value) {
    return String(value || "")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&amp;/gi, "&")
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

function attributesFromTag(tag) {
    var attributes = ({})
    var pattern = /([a-zA-Z_:][a-zA-Z0-9_.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
    var match
    while ((match = pattern.exec(tag)) !== null) {
        var name = String(match[1] || "").toLowerCase()
        if (attributes[name] === undefined) {
            attributes[name] = decodeAttribute(match[2] !== undefined ? match[2]
                : match[3] !== undefined ? match[3] : match[4])
        }
    }
    return attributes
}

function safeHttpUrl(value) {
    var url = String(value || "").trim()
    return /^https?:\/\/(?:\[[0-9a-f:.]+\]|[a-z0-9.-]+)(?::[0-9]{1,5})?(?:[/?#][^\s<>"']*)?$/i.test(url)
        ? url : ""
}

function linkEntityFor(url, provider, cache) {
    if (!provider || typeof provider.getLinkEntity !== "function") return ({})
    if (cache[url] !== undefined) return cache[url]
    try {
        cache[url] = provider.getLinkEntity(url) || ({})
    } catch (error) {
        console.warn("[NotesLinkPreview] Could not read link-vault status for", url, error)
        cache[url] = ({})
    }
    return cache[url]
}

function previewBlocks(source) {
    var html = String(source || "")
    var blocks = []
    var patterns = [
        /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\blink-preview-block[^"]*"|'[^']*\blink-preview-block[^']*'))[^>]*>\s*<\/div\s*>/gi,
        /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\blink-preview-block[^"]*"|'[^']*\blink-preview-block[^']*'))[^>]*\/\s*>/gi
    ]
    for (var patternIndex = 0; patternIndex < patterns.length; patternIndex++) {
        var pattern = patterns[patternIndex]
        var match
        while ((match = pattern.exec(html)) !== null) {
            blocks.push({start: match.index, end: match.index + match[0].length, markup: match[0]})
        }
    }
    blocks.sort(function(left, right) { return left.start - right.start })
    return blocks
}

function setTagAttribute(tag, name, value) {
    var pattern = new RegExp("(\\s+" + name + "\\s*=\\s*)(?:\"[^\"]*\"|'[^']*'|[^\\s>]+)", "i")
    if (pattern.test(tag)) {
        return tag.replace(pattern, function(match, prefix) { return prefix + "\"" + escapeHtml(value) + "\"" })
    }
    var closingStart = tag.lastIndexOf(">")
    if (closingStart < 0) return tag
    var insertAt = closingStart > 0 && tag.charAt(closingStart - 1) === "/" ? closingStart - 1 : closingStart
    return tag.substring(0, insertAt) + " " + name + "=\"" + escapeHtml(value) + "\"" + tag.substring(insertAt)
}

function replaceStatusAttributes(source, url, watched, watching) {
    var expectedUrl = safeHttpUrl(url)
    if (!expectedUrl) return String(source || "")
    var blockTag = /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\blink-preview-block[^"]*"|'[^']*\blink-preview-block[^']*'))[^>]*>/gi
    return String(source || "").replace(blockTag, function(tag) {
        if (safeHttpUrl(attributesFromTag(tag).url) !== expectedUrl) return tag
        var next = setTagAttribute(tag, "watched", watched ? "true" : "false")
        return setTagAttribute(next, "watching", watching ? "true" : "false")
    })
}

function replacePreviewWithText(source, url, start) {
    var expectedUrl = safeHttpUrl(url)
    var blockStart = Number(start)
    if (!expectedUrl || !isFinite(blockStart) || blockStart < 0 || Math.floor(blockStart) !== blockStart) {
        return {success: false}
    }
    var blocks = previewBlocks(source)
    for (var index = 0; index < blocks.length; index++) {
        var block = blocks[index]
        if (block.start !== blockStart || safeHttpUrl(attributesFromTag(block.markup).url) !== expectedUrl) continue
        var escapedUrl = escapeHtml(expectedUrl)
        return {success: true, start: block.start, end: block.end,
                replacement: "<p><a href=\"" + escapedUrl + "\">" + escapedUrl + "</a></p>"}
    }
    return {success: false}
}

function linkPreviewData(source, url, start, provider) {
    var expectedUrl = safeHttpUrl(url)
    var blockStart = Number(start)
    if (!expectedUrl || !isFinite(blockStart) || blockStart < 0 || Math.floor(blockStart) !== blockStart) {
        return {success: false}
    }
    var blocks = previewBlocks(source)
    var entityCache = ({})
    for (var index = 0; index < blocks.length; index++) {
        var block = blocks[index]
        if (block.start !== blockStart) continue
        var attributes = attributesFromTag(block.markup)
        if (safeHttpUrl(attributes.url) !== expectedUrl) continue
        var entity = linkEntityFor(expectedUrl, provider, entityCache)
        return {success: true, notes: String(attributes.notes || entity.notes || ""),
                showNotes: attributes.shownotes === "true",
                color: String(attributes.color || entity.color || "default")}
    }
    return {success: false}
}

function replacePreviewAttributes(source, url, start, changes, provider) {
    var html = String(source || "")
    var expectedUrl = safeHttpUrl(url)
    var blockStart = Number(start)
    if (!expectedUrl || !isFinite(blockStart) || blockStart < 0 || Math.floor(blockStart) !== blockStart) {
        return {success: false}
    }
    var blocks = previewBlocks(html)
    var entityCache = ({})
    for (var index = 0; index < blocks.length; index++) {
        var block = blocks[index]
        if (block.start !== blockStart) continue
        var attributes = attributesFromTag(block.markup)
        if (safeHttpUrl(attributes.url) !== expectedUrl) continue
        var openingTagMatch = block.markup.match(/^<div\b[^>]*>/i)
        if (!openingTagMatch) return {success: false}
        var openingTag = openingTagMatch[0]
        if (changes && changes.notes !== undefined) {
            openingTag = setTagAttribute(openingTag, "notes", String(changes.notes))
        }
        if (changes && changes.color !== undefined) {
            openingTag = setTagAttribute(openingTag, "color", String(changes.color))
        }
        if (changes && changes.showNotes !== undefined) {
            var showNotes = changes.showNotes === true || changes.showNotes === "true"
            if (showNotes && changes.notes === undefined) {
                var entity = linkEntityFor(expectedUrl, provider, entityCache)
                openingTag = setTagAttribute(openingTag, "notes", String(attributes.notes || entity.notes || ""))
            }
            openingTag = setTagAttribute(openingTag, "showNotes", showNotes ? "true" : "false")
        }
        return {success: true, start: block.start, end: block.start + openingTagMatch[0].length,
                replacement: openingTag}
    }
    return {success: false}
}
