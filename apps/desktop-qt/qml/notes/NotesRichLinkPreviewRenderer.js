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

function cardForTag(tag, provider, cache) {
    var attributes = attributesFromTag(tag)
    var url = safeHttpUrl(attributes.url)
    if (!url) {
        return "<p><font color=\"#a7a9be\">Unsupported link preview</font></p>"
    }

    var metadata = metadataFor(url, provider, cache)
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

    return "<table width=\"100%\" border=\"1\" cellpadding=\"10\" cellspacing=\"0\" bgcolor=\"#1c1b24\"><tr><td>" +
        "<p><font color=\"#a7a9be\" size=\"2\">↗ " + escapeHtml(host) + "</font></p>" +
        "<p><font color=\"#f4f4f5\" size=\"4\"><b>" + escapeHtml(title) + "</b></font></p>" +
        details +
        "<p><a href=\"" + escapeHtml(url) + "\">" + escapeHtml(url) + "</a></p>" +
        "</td></tr></table>"
}

function render(source, metadataProvider) {
    var html = String(source || "")
    var cache = ({})
    var blockPattern = /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\blink-preview-block[^\"]*"|'[^']*\blink-preview-block[^']*'))[^>]*>\s*<\/div\s*>/gi
    var selfClosingPattern = /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\blink-preview-block[^\"]*"|'[^']*\blink-preview-block[^']*'))[^>]*\/\s*>/gi
    html = html.replace(blockPattern, function(tag) { return cardForTag(tag, metadataProvider, cache) })
    return html.replace(selfClosingPattern, function(tag) { return cardForTag(tag, metadataProvider, cache) })
}
