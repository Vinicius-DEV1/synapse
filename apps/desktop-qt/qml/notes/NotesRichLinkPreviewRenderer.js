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

function cardForTag(tag) {
    var attributes = attributesFromTag(tag)
    var url = safeHttpUrl(attributes.url)
    if (!url) {
        return "<p><font color=\"#a7a9be\">Unsupported link preview</font></p>"
    }

    var host = hostForUrl(url)
    var title = String(attributes.title || "").trim() || host
    var channel = String(attributes.channel || "").trim()
    var details = channel.length > 0
        ? "<p><font color=\"#a7a9be\" size=\"2\">" + escapeHtml(channel) + "</font></p>" : ""

    return "<table width=\"100%\" border=\"1\" cellpadding=\"10\" cellspacing=\"0\" bgcolor=\"#1c1b24\"><tr><td>" +
        "<p><font color=\"#a7a9be\" size=\"2\">↗ " + escapeHtml(host) + "</font></p>" +
        "<p><font color=\"#f4f4f5\" size=\"4\"><b>" + escapeHtml(title) + "</b></font></p>" +
        details +
        "<p><a href=\"" + escapeHtml(url) + "\">" + escapeHtml(url) + "</a></p>" +
        "</td></tr></table>"
}

function render(source) {
    var html = String(source || "")
    var blockPattern = /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\blink-preview-block[^\"]*"|'[^']*\blink-preview-block[^']*'))[^>]*>\s*<\/div\s*>/gi
    var selfClosingPattern = /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\blink-preview-block[^\"]*"|'[^']*\blink-preview-block[^']*'))[^>]*\/\s*>/gi
    html = html.replace(blockPattern, function(tag) { return cardForTag(tag) })
    return html.replace(selfClosingPattern, function(tag) { return cardForTag(tag) })
}
