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

function hostForUrl(url) {
    var match = String(url || "").match(/^https?:\/\/([^/?#:]+)/i)
    return match ? match[1].replace(/^www\./i, "") : ""
}

function metadataFor(url, provider, cache) {
    if (!provider || typeof provider.getLinkMetadata !== "function") return ({})
    if (cache[url] !== undefined) return cache[url]
    try {
        cache[url] = provider.getLinkMetadata(url) || ({})
    } catch (error) {
        console.warn("[NotesLinkPreview] Could not read cached metadata for", url, error)
        cache[url] = ({})
    }
    return cache[url]
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

function statusActionUrl(url, watched, watching, field) {
    var nextWatched = watched
    var nextWatching = watching
    if (field === "watched") {
        nextWatched = !watched
        if (nextWatched) nextWatching = false
    } else {
        nextWatching = !watching
        if (nextWatching) nextWatched = false
    }
    return "synapse-link://status?url=" + encodeURIComponent(url) +
        "&watched=" + String(nextWatched) + "&watching=" + String(nextWatching)
}

function durationText(value) {
    var seconds = Number(value)
    if (!isFinite(seconds) || seconds <= 0) return ""
    var total = Math.floor(seconds)
    var minutes = Math.floor(total / 60)
    var remainder = total % 60
    if (minutes >= 60) {
        var hours = Math.floor(minutes / 60)
        return hours + ":" + String(minutes % 60).padStart(2, "0") + ":" + String(remainder).padStart(2, "0")
    }
    return minutes + ":" + String(remainder).padStart(2, "0")
}

function cardSurfaceColor(color, opacity) {
    var match = String(color || "").match(/^#([0-9a-f]{6})$/i)
    if (!match) return "#1c1b24"
    var base = [28, 27, 36]
    var channels = [0, 2, 4].map(function(offset, index) {
        var source = parseInt(match[1].substring(offset, offset + 2), 16)
        return Math.round(base[index] + (source - base[index]) * opacity)
    })
    return "#" + channels.map(function(channel) {
        return channel.toString(16).padStart(2, "0")
    }).join("")
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
            blocks.push({start: match.index, markup: match[0]})
        }
    }
    blocks.sort(function(left, right) { return left.start - right.start })
    return blocks
}

function cardForTag(tag, provider, metadataCache, entityCache, copiedUrl) {
    var attributes = attributesFromTag(tag)
    var url = safeHttpUrl(attributes.url)
    if (!url) {
        return "<p><font color=\"#a7a9be\">Unsupported link preview</font></p>"
    }

    var metadata = metadataFor(url, provider, metadataCache)
    var entity = linkEntityFor(url, provider, entityCache)
    var cardColor = String(attributes.color || entity.color || "default")
    var cardBackground = cardSurfaceColor(cardColor, 0.094)
    var cardBorder = cardSurfaceColor(cardColor, 0.376)
    var host = hostForUrl(url)
    var title = String(attributes.title || metadata.title || "").trim() || host
    var channel = String(attributes.channel || metadata.channel || "").trim()
    var details = channel.length > 0
        ? "<p><font color=\"#a7a9be\" size=\"2\">" + escapeHtml(channel) + "</font></p>" : ""
    var duration = durationText(attributes.duration || metadata.duration)
    if (duration.length > 0) details += "<p><font color=\"#a7a9be\" size=\"2\">" + duration + "</font></p>"
    var playlistCount = Number(attributes.playlistCount || metadata.playlistCount || metadata.playlist_count)
    if ((attributes.isPlaylist === "true" || metadata.isPlaylist || metadata.is_playlist) &&
            isFinite(playlistCount) && playlistCount > 0) {
        details += "<p><font color=\"#a7a9be\" size=\"2\">" +
            Math.floor(playlistCount) + " videos</font></p>"
    }
    var watched = entity.watched !== undefined ? entity.watched === true : attributes.watched === "true"
    var watching = entity.watching !== undefined ? entity.watching === true : attributes.watching === "true"
    var status = watched ? "Completed" : watching ? "Watching" : "Not started"
    var watchedLabel = watched ? "Mark as not completed" : "Mark as completed"
    var watchingLabel = watching ? "Stop watching" : "Mark as watching"
    details += "<p><font color=\"#a7a9be\" size=\"2\">Status: " + status + "</font></p>" +
        "<p><a href=\"" + escapeHtml(statusActionUrl(url, watched, watching, "watched")) + "\">" +
        watchedLabel + "</a> &nbsp; <a href=\"" + escapeHtml(statusActionUrl(url, watched, watching, "watching")) + "\">" +
        watchingLabel + "</a> &nbsp; <a href=\"synapse-link://copy?url=" +
        escapeHtml(encodeURIComponent(url)) + "\">" + (copiedUrl === url ? "Copied" : "Copy URL") + "</a></p>"

    var notesSection = ""
    if (attributes.shownotes === "true") {
        var notes = String(attributes.notes || entity.notes || "")
        var noteContent = notes.length > 0
            ? escapeHtml(notes).replace(/\r\n|\r|\n/g, "<br/>")
            : "<font color=\"#71717a\">No link notes yet. Choose Edit link notes to add one.</font>"
        notesSection = "<p><font color=\"#a7a9be\" size=\"2\"><b>Link notes</b></font></p>" +
            "<p><font color=\"#f4f4f5\">" + noteContent + "</font></p>"
    }

    return "<table width=\"100%\" border=\"1\" bordercolor=\"" + cardBorder + "\" cellpadding=\"10\" cellspacing=\"0\" bgcolor=\"" + cardBackground + "\"><tr><td>" +
        "<p><font color=\"#a7a9be\" size=\"2\">↗ " + escapeHtml(host) + "</font></p>" +
        "<p><font color=\"#f4f4f5\" size=\"4\"><b>" + escapeHtml(title) + "</b></font></p>" +
        details +
        notesSection +
        "<p><a href=\"" + escapeHtml(url) + "\">" + escapeHtml(url) + "</a></p>" +
        "</td></tr></table>"
}

function actionItems(source, provider, copiedUrl) {
    var actions = []
    var metadataCache = ({})
    var entityCache = ({})
    var blocks = previewBlocks(source)
    for (var index = 0; index < blocks.length; index++) {
        var block = blocks[index]
        var attributes = attributesFromTag(block.markup)
        var url = safeHttpUrl(attributes.url)
        if (!url) continue
        var metadata = metadataFor(url, provider, metadataCache)
        var entity = linkEntityFor(url, provider, entityCache)
        var title = String(attributes.title || metadata.title || entity.title || "").trim() || hostForUrl(url)
        var watched = entity.watched !== undefined ? entity.watched === true : attributes.watched === "true"
        var watching = entity.watching !== undefined ? entity.watching === true : attributes.watching === "true"

        actions.push({label: "Open link: " + title, url: url})
        actions.push({label: (watched ? "Mark not completed: " : "Mark completed: ") + title,
                      url: statusActionUrl(url, watched, watching, "watched")})
        actions.push({label: (watching ? "Stop watching: " : "Mark watching: ") + title,
                      url: statusActionUrl(url, watched, watching, "watching")})
        actions.push({label: (copiedUrl === url ? "Copied URL: " : "Copy URL: ") + title,
                      url: "synapse-link://copy?url=" + encodeURIComponent(url)})
        var showNotes = attributes.shownotes === "true"
        actions.push({label: (showNotes ? "Hide link notes: " : "Show link notes: ") + title,
                      url: "synapse-link://toggle-notes?url=" + encodeURIComponent(url) +
                           "&start=" + block.start + "&show=" + String(!showNotes)})
        if (showNotes) {
            actions.push({label: "Edit link notes: " + title,
                          url: "synapse-link://edit-notes?url=" + encodeURIComponent(url) +
                               "&start=" + block.start})
        }
        actions.push({label: "Change link color: " + title,
                      url: "synapse-link://color?url=" + encodeURIComponent(url) + "&start=" + block.start})
        actions.push({label: "Convert to text: " + title,
                      url: "synapse-link://convert?url=" + encodeURIComponent(url) + "&start=" + block.start})
    }
    return actions
}

function setTagBooleanAttribute(tag, name, value) {
    var serializedValue = value === true || value === "true" ? "true" : "false"
    var pattern = new RegExp("(\\s+" + name + "\\s*=\\s*)(?:\"[^\"]*\"|'[^']*'|[^\\s>]+)", "i")
    if (pattern.test(tag)) {
        return tag.replace(pattern, function(match, prefix) { return prefix + "\"" + serializedValue + "\"" })
    }
    var closingStart = tag.lastIndexOf(">")
    if (closingStart < 0) return tag
    var insertAt = closingStart > 0 && tag.charAt(closingStart - 1) === "/" ? closingStart - 1 : closingStart
    return tag.substring(0, insertAt) + " " + name + "=\"" + serializedValue + "\"" + tag.substring(insertAt)
}

function render(source, metadataProvider, copiedUrl) {
    var html = String(source || "")
    var metadataCache = ({})
    var entityCache = ({})
    var blockPattern = /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\blink-preview-block[^\"]*"|'[^']*\blink-preview-block[^']*'))[^>]*>\s*<\/div\s*>/gi
    var selfClosingPattern = /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\blink-preview-block[^\"]*"|'[^']*\blink-preview-block[^']*'))[^>]*\/\s*>/gi
    html = html.replace(blockPattern, function(tag) {
        return cardForTag(tag, metadataProvider, metadataCache, entityCache, copiedUrl)
    })
    return html.replace(selfClosingPattern, function(tag) {
        return cardForTag(tag, metadataProvider, metadataCache, entityCache, copiedUrl)
    })
}

function replaceStatusAttributes(source, url, watched, watching) {
    var expectedUrl = safeHttpUrl(url)
    if (!expectedUrl) return String(source || "")
    var blockTag = /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\blink-preview-block[^"]*"|'[^']*\blink-preview-block[^']*'))[^>]*>/gi
    return String(source || "").replace(blockTag, function(tag) {
        if (safeHttpUrl(attributesFromTag(tag).url) !== expectedUrl) return tag
        var next = setTagBooleanAttribute(tag, "watched", watched ? "true" : "false")
        return setTagBooleanAttribute(next, "watching", watching ? "true" : "false")
    })
}
