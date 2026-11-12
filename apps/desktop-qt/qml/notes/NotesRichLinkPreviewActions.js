.pragma library

function parseStatusAction(link) {
    var match = String(link || "").match(/^synapse-link:\/\/status\?(.+)$/i)
    if (!match) return null
    var values = ({})
    var pairs = match[1].replace(/&amp;/gi, "&").split("&")
    try {
        for (var index = 0; index < pairs.length; index++) {
            var separator = pairs[index].indexOf("=")
            if (separator < 1) continue
            var name = decodeURIComponent(pairs[index].substring(0, separator))
            var value = decodeURIComponent(pairs[index].substring(separator + 1).replace(/\+/g, "%20"))
            values[name] = value
        }
    } catch (error) {
        console.warn("[NotesLinkPreview] Could not decode a status action URL", error)
        return { handled: true, success: false }
    }
    if (!values.url || (values.watched !== "true" && values.watched !== "false") ||
            (values.watching !== "true" && values.watching !== "false")) {
        return { handled: true, success: false }
    }
    return { handled: true, url: values.url,
             watched: values.watched === "true", watching: values.watching === "true" }
}

function activate(link, source, controller, renderer) {
    var action = parseStatusAction(link)
    if (!action) return { handled: false }
    if (action.success === false) return action
    if (!controller || typeof controller.setLinkEntityStatus !== "function" ||
            !renderer || typeof renderer.replaceStatusAttributes !== "function") {
        return { handled: true, success: false }
    }

    var content = String(source || "")
    var updatedContent = renderer.replaceStatusAttributes(
                content, action.url, action.watched, action.watching)
    if (updatedContent === content) return { handled: true, success: false }
    var saved = controller.setLinkEntityStatus(action.url, action.watched, action.watching)
    if (!saved || saved.success !== true) return { handled: true, success: false }
    return { handled: true, success: true, content: updatedContent }
}
