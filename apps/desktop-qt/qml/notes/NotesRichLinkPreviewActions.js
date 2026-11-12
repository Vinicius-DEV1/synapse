.pragma library

function parseAction(link) {
    var match = String(link || "").match(/^synapse-link:\/\/(status|copy|convert)\?(.+)$/i)
    if (!match) return null
    var actionType = String(match[1]).toLowerCase()
    var values = ({})
    var pairs = match[2].replace(/&amp;/gi, "&").split("&")
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
    if (!values.url) {
        return { handled: true, success: false }
    }
    if (actionType === "copy") return { handled: true, type: actionType, url: values.url }
    if (actionType === "convert") {
        var blockStart = Number(values.start)
        if (!isFinite(blockStart) || blockStart < 0 || Math.floor(blockStart) !== blockStart) {
            return { handled: true, success: false }
        }
        return { handled: true, type: actionType, url: values.url, start: blockStart }
    }
    if ((values.watched !== "true" && values.watched !== "false") ||
            (values.watching !== "true" && values.watching !== "false")) {
        return { handled: true, success: false }
    }
    return { handled: true, type: actionType, url: values.url,
             watched: values.watched === "true", watching: values.watching === "true" }
}

function activate(link, source, controller, renderer) {
    var action = parseAction(link)
    if (!action) return { handled: false }
    if (action.success === false) return action
    if (action.type === "copy") {
        if (!controller || typeof controller.copyLinkUrlToClipboard !== "function" ||
                !controller.copyLinkUrlToClipboard(action.url)) return { handled: true, success: false }
        return { handled: true, success: true, type: "copy", copiedUrl: action.url }
    }
    if (action.type === "convert") {
        if (!renderer || typeof renderer.replacePreviewWithText !== "function") {
            return { handled: true, success: false }
        }
        var replacement = renderer.replacePreviewWithText(source, action.url, action.start)
        if (!replacement.success) return { handled: true, success: false }
        return { handled: true, success: true, type: "convert", start: replacement.start,
                 end: replacement.end, replacement: replacement.replacement }
    }
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
    return { handled: true, success: true, type: "status", content: updatedContent }
}
