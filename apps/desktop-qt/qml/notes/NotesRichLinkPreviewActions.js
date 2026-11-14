.pragma library

function parseAction(link) {
    var match = String(link || "").match(/^synapse-link:\/\/(status|copy|convert|toggle-notes|edit-notes|color|delete|open-confirm|menu|info)\?(.+)$/i)
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
        console.warn("[NotesLinkPreview] Could not decode a link action URL", error)
        return { handled: true, success: false }
    }
    if (!values.url) {
        return { handled: true, success: false }
    }
    if (actionType === "open-confirm") {
        return { handled: true, type: actionType, url: values.url, title: values.title || "" }
    }
    if (actionType === "copy") return { handled: true, type: actionType, url: values.url }
    if (actionType === "convert") {
        var blockStart = Number(values.start)
        if (!isFinite(blockStart) || blockStart < 0 || Math.floor(blockStart) !== blockStart) {
            return { handled: true, success: false }
        }
        return { handled: true, type: actionType, url: values.url, start: blockStart }
    }
    if (actionType === "delete") {
        var deleteBlockStart = Number(values.start)
        if (!isFinite(deleteBlockStart) || deleteBlockStart < 0 || Math.floor(deleteBlockStart) !== deleteBlockStart) {
            return { handled: true, success: false }
        }
        return { handled: true, type: actionType, url: values.url, start: deleteBlockStart }
    }
    if (actionType === "color") {
        var colorBlockStart = Number(values.start)
        if (!isFinite(colorBlockStart) || colorBlockStart < 0 || Math.floor(colorBlockStart) !== colorBlockStart) {
            return { handled: true, success: false }
        }
        return { handled: true, type: actionType, url: values.url, start: colorBlockStart }
    }
    if (actionType === "menu" || actionType === "info") {
        var menuStart = Number(values.start)
        return {
            handled: true,
            type: actionType,
            url: values.url,
            start: isFinite(menuStart) ? menuStart : -1,
            title: values.title || ""
        }
    }
    if (actionType === "toggle-notes" || actionType === "edit-notes") {
        var notesBlockStart = Number(values.start)
        if (!isFinite(notesBlockStart) || notesBlockStart < 0 || Math.floor(notesBlockStart) !== notesBlockStart) {
            return { handled: true, success: false }
        }
        if (actionType === "toggle-notes" && values.show !== "true" && values.show !== "false") {
            return { handled: true, success: false }
        }
        return { handled: true, type: actionType, url: values.url, start: notesBlockStart,
                 showNotes: values.show === "true" }
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
    if (action.type === "open-confirm") {
        return { handled: true, success: true, type: "open-confirm", url: action.url, title: action.title }
    }
    if (action.type === "menu") {
        var menuData = renderer && typeof renderer.linkPreviewData === "function"
            ? renderer.linkPreviewData(source, action.url, action.start, controller)
            : {}
        return {
            handled: true,
            success: true,
            type: "menu",
            url: action.url,
            start: action.start,
            title: action.title,
            color: menuData.color || "default",
            notes: menuData.notes || "",
            showNotes: menuData.showNotes === true
        }
    }
    if (action.type === "info") {
        var infoData = renderer && typeof renderer.linkPreviewData === "function"
            ? renderer.linkPreviewData(source, action.url, action.start, controller)
            : {}
        return {
            handled: true,
            success: true,
            type: "info",
            url: action.url,
            start: action.start,
            title: action.title,
            notes: infoData.notes || ""
        }
    }
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
    if (action.type === "delete") {
        return { handled: true, success: true, type: "delete", url: action.url, start: action.start }
    }
    if (action.type === "color") {
        if (!renderer || typeof renderer.linkPreviewData !== "function") {
            return { handled: true, success: false }
        }
        var colorData = renderer.linkPreviewData(source, action.url, action.start, controller)
        if (!colorData.success) return { handled: true, success: false }
        return { handled: true, success: true, type: action.type, url: action.url,
                 start: action.start, color: colorData.color }
    }
    if (action.type === "toggle-notes") {
        if (!renderer || typeof renderer.replacePreviewAttributes !== "function") {
            return { handled: true, success: false }
        }
        var visibilityUpdate = renderer.replacePreviewAttributes(
                    source, action.url, action.start, {showNotes: action.showNotes}, controller)
        if (!visibilityUpdate.success) return { handled: true, success: false }
        return { handled: true, success: true, type: action.type, start: visibilityUpdate.start,
                 end: visibilityUpdate.end, replacement: visibilityUpdate.replacement }
    }
    if (action.type === "edit-notes") {
        if (!renderer || typeof renderer.linkPreviewData !== "function") {
            return { handled: true, success: false }
        }
        var linkData = renderer.linkPreviewData(source, action.url, action.start, controller)
        if (!linkData.success) return { handled: true, success: false }
        return { handled: true, success: true, type: action.type, url: action.url,
                 start: action.start, notes: linkData.notes }
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
