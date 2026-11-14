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

function cardForTag(tag, provider, metadataCache, entityCache, copiedUrl, blockStart) {
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

    var isYouTube = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(url)
    var isPlaylist = attributes.isPlaylist === "true" || metadata.isPlaylist || metadata.is_playlist
    var playlistCount = Number(attributes.playlistCount || metadata.playlistCount || metadata.playlist_count)

    var watched = entity.watched !== undefined ? entity.watched === true : attributes.watched === "true"
    var watching = entity.watching !== undefined ? entity.watching === true : attributes.watching === "true"
    var showNotes = attributes.shownotes === "true"
    var notes = String(attributes.notes || entity.notes || "")
    var hasNotes = notes.length > 0
    var startVal = isFinite(blockStart) ? blockStart : 0

    var iconChar = isYouTube ? (isPlaylist ? "📑" : "▶") : "💠"
    var iconBg = isYouTube ? "#25141c" : "#191724"
    var iconBorder = isYouTube ? "#4c1d2e" : "#2f2b42"
    var iconColor = isYouTube ? "#fb7185" : "#a78bfa"

    var hostLine = "<a href=\"" + escapeHtml(url) + "\" style=\"color: #a855f7; text-decoration: none;\"><font color=\"#a855f7\" size=\"2\"><b>" + escapeHtml(host) + "</b></font></a>"
    if (channel.length > 0) {
        hostLine += " &nbsp;<font color=\"#52525b\">•</font>&nbsp; <font color=\"#94a3b8\" size=\"2\">" + escapeHtml(channel) + "</font>"
    }
    var duration = durationText(attributes.duration || metadata.duration)
    if (duration.length > 0) {
        hostLine += " &nbsp;<font color=\"#52525b\">•</font>&nbsp; <font color=\"#94a3b8\" size=\"2\">" + duration + "</font>"
    }
    if (isPlaylist && isFinite(playlistCount) && playlistCount > 0) {
        hostLine += " &nbsp;<font color=\"#52525b\">•</font>&nbsp; <font color=\"#c4b5fd\" size=\"2\">" + Math.floor(playlistCount) + " videos</font>"
    }
    if (watched) {
        hostLine += " &nbsp;<font color=\"#52525b\">•</font>&nbsp; <font color=\"#34d399\" size=\"2\"><b>✓ Concluído</b></font>"
    } else if (watching) {
        hostLine += " &nbsp;<font color=\"#52525b\">•</font>&nbsp; <font color=\"#fbbf24\" size=\"2\"><b>⏳ Status: Watching</b></font>"
    }
    if (hasNotes && !showNotes) {
        hostLine += " &nbsp;<font color=\"#52525b\">•</font>&nbsp; <font color=\"#a78bfa\" size=\"2\"><b>📝 Anotações</b></font>"
    }

    var actionsLine = ""
    if (watching || watched) {
        var watchedLabel = watched ? "Mark as not completed" : "Mark as completed"
        var watchingLabel = watching ? "Stop watching" : "Mark as watching"
        actionsLine = "<p style=\"margin: 4px 0 0 0;\"><font color=\"#71717a\" size=\"1\">" +
            (watching ? "Status: Watching &nbsp;•&nbsp; " : "") +
            "<a href=\"" + escapeHtml(statusActionUrl(url, watched, watching, "watched")) + "\" style=\"color: #71717a; text-decoration: none;\">" + watchedLabel + "</a> &nbsp;•&nbsp; " +
            "<a href=\"" + escapeHtml(statusActionUrl(url, watched, watching, "watching")) + "\" style=\"color: #71717a; text-decoration: none;\">" + watchingLabel + "</a> &nbsp;•&nbsp; " +
            "<a href=\"synapse-link://copy?url=" + escapeHtml(encodeURIComponent(url)) + "\" style=\"color: #71717a; text-decoration: none;\">" + (copiedUrl === url ? "Copied" : "Copy URL") + "</a>" +
            "</font></p>"
    }

    var toggleNotesUrl = "synapse-link://toggle-notes?url=" + encodeURIComponent(url) +
        "&start=" + startVal + "&show=" + String(!showNotes)
    var menuUrl = "synapse-link://menu?url=" + encodeURIComponent(url) +
        "&start=" + startVal + "&title=" + encodeURIComponent(title)

    var noteBtnBg = showNotes ? "#2e1a47" : (hasNotes ? "#231f3d" : "#1e1d28")
    var noteBtnBorder = showNotes ? "#8b5cf6" : (hasNotes ? "#6366f1" : "#2f2d3d")
    var noteBtnText = showNotes ? "#c4b5fd" : (hasNotes ? "#a5b4fc" : "#94a3b8")
    var noteIndicator = hasNotes && !showNotes ? " <font color=\"#818cf8\">•</font>" : ""

    var buttonsCell = "<td width=\"68\" align=\"right\" valign=\"middle\" style=\"padding: 6px 12px 6px 0;\">" +
        "<table border=\"0\" cellpadding=\"0\" cellspacing=\"4\" align=\"right\">" +
        "<tr>" +
        "<td bgcolor=\"" + noteBtnBg + "\" style=\"border: 1px solid " + noteBtnBorder + "; padding: 4px 6px; border-radius: 6px;\">" +
        "<a href=\"" + escapeHtml(toggleNotesUrl) + "\" style=\"text-decoration:none;\"><font color=\"" + noteBtnText + "\" size=\"2\"><b>📄" + noteIndicator + "</b></font></a>" +
        "</td>" +
        "<td bgcolor=\"#1e1d28\" style=\"border: 1px solid #2f2d3d; padding: 4px 6px; border-radius: 6px;\">" +
        "<a href=\"" + escapeHtml(menuUrl) + "\" style=\"text-decoration:none;\"><font color=\"#94a3b8\" size=\"2\"><b>•••</b></font></a>" +
        "</td>" +
        "</tr>" +
        "</table>" +
        "</td>"

    var notesSection = ""
    if (showNotes) {
        var noteContent = notes.length > 0
            ? escapeHtml(notes).replace(/\r\n|\r|\n/g, "<br/>")
            : "<font color=\"#71717a\">No link notes yet. Choose Edit link notes to add one.</font>"
        var editNotesUrl = "synapse-link://edit-notes?url=" + encodeURIComponent(url) + "&start=" + startVal
        notesSection = "<tr><td colspan=\"3\" bgcolor=\"#12111a\" style=\"border-top: 1px solid " + cardBorder + "; padding: 8px 12px;\">" +
            "<table width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">" +
            "<tr>" +
            "<td valign=\"middle\"><p style=\"margin: 0;\"><font color=\"#a7a9be\" size=\"2\"><b>Link notes</b></font></p></td>" +
            "<td align=\"right\" valign=\"middle\">" +
            "<a href=\"" + escapeHtml(editNotesUrl) + "\" style=\"color: #818cf8; text-decoration: none;\"><font color=\"#818cf8\" size=\"2\"><b>Editar</b></font></a>" +
            "&nbsp;&nbsp;" +
            "<a href=\"" + escapeHtml(toggleNotesUrl) + "\" style=\"color: #71717a; text-decoration: none;\"><font color=\"#71717a\" size=\"2\">Recolher</font></a>" +
            "</td>" +
            "</tr>" +
            "</table>" +
            "<p style=\"margin: 4px 0 0 0;\"><font color=\"#f4f4f5\" size=\"2\">" + noteContent + "</font></p>" +
            "</td></tr>"
    }

    return "<table width=\"100%\" border=\"1\" bordercolor=\"" + cardBorder + "\" cellpadding=\"8\" cellspacing=\"0\" bgcolor=\"" + cardBackground + "\" style=\"border-collapse: collapse; margin: 8px 0;\">" +
        "<tr>" +
        "<td width=\"36\" valign=\"middle\" align=\"center\" bgcolor=\"" + iconBg + "\" style=\"border: 1px solid " + iconBorder + "; padding: 8px;\">" +
        "<a href=\"" + escapeHtml(url) + "\" style=\"text-decoration:none;\"><font size=\"4\" color=\"" + iconColor + "\"><b>" + iconChar + "</b></font></a>" +
        "</td>" +
        "<td valign=\"middle\" style=\"padding: 8px 12px;\">" +
        "<p style=\"margin: 0;\"><a href=\"" + escapeHtml(url) + "\" style=\"color: #ffffff; text-decoration: none;\"><font color=\"#ffffff\" size=\"3\"><b>" + escapeHtml(title) + "</b></font></a></p>" +
        "<p style=\"margin: 2px 0 0 0;\">" + hostLine + "</p>" +
        actionsLine +
        "</td>" +
        buttonsCell +
        "</tr>" +
        notesSection +
        "</table>"
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
        actions.push({label: "Delete link card: " + title,
                      url: "synapse-link://delete?url=" + encodeURIComponent(url) + "&start=" + block.start})
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
    var blocks = previewBlocks(html)
    if (blocks.length === 0) return html
    for (var i = blocks.length - 1; i >= 0; i--) {
        var block = blocks[i]
        var renderedCard = cardForTag(block.markup, metadataProvider, metadataCache, entityCache, copiedUrl, block.start)
        html = html.substring(0, block.start) + renderedCard + html.substring(block.start + block.markup.length)
    }
    return html
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
