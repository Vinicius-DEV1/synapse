.pragma library

var MAX_LCS_CELLS = 500000
var MAX_INLINE_LCS_CELLS = 10000

function compute(originalText, proposedText) {
    var original = String(originalText || "").split("\n")
    var proposed = String(proposedText || "").split("\n")
    if (original.join("\n") === proposed.join("\n"))
        return original.map(function(text) { return { kind: "same", text: text } })

    if (original.length * proposed.length > MAX_LCS_CELLS)
        return compactDiff(original, proposed)

    var width = proposed.length + 1
    var scores = new Uint32Array((original.length + 1) * width)
    for (var oldIndex = original.length - 1; oldIndex >= 0; --oldIndex) {
        for (var newIndex = proposed.length - 1; newIndex >= 0; --newIndex) {
            var cell = oldIndex * width + newIndex
            scores[cell] = original[oldIndex] === proposed[newIndex]
                ? scores[(oldIndex + 1) * width + newIndex + 1] + 1
                : Math.max(scores[(oldIndex + 1) * width + newIndex], scores[cell + 1])
        }
    }

    var result = []
    var removed = []
    var added = []
    oldIndex = 0
    newIndex = 0
    while (oldIndex < original.length && newIndex < proposed.length) {
        if (original[oldIndex] === proposed[newIndex]) {
            appendChanges(result, removed, added)
            removed = []
            added = []
            result.push({ kind: "same", text: original[oldIndex++] })
            newIndex++
        } else if (scores[(oldIndex + 1) * width + newIndex] >= scores[oldIndex * width + newIndex + 1]) {
            removed.push(original[oldIndex++])
        } else {
            added.push(proposed[newIndex++])
        }
    }
    while (oldIndex < original.length) removed.push(original[oldIndex++])
    while (newIndex < proposed.length) added.push(proposed[newIndex++])
    appendChanges(result, removed, added)
    return result
}

function appendChanges(result, removed, added) {
    if (removed.length === added.length) {
        for (var i = 0; i < removed.length; ++i) {
            result.push({
                kind: "modified",
                originalText: removed[i],
                text: added[i],
                html: inlineDiff(removed[i], added[i])
            })
        }
        return
    }
    for (var oldIndex = 0; oldIndex < removed.length; ++oldIndex)
        result.push({ kind: "removed", text: removed[oldIndex] })
    for (var newIndex = 0; newIndex < added.length; ++newIndex)
        result.push({ kind: "added", text: added[newIndex] })
}

function compactDiff(original, proposed) {
    var prefix = 0
    var suffix = 0
    while (prefix < original.length && prefix < proposed.length && original[prefix] === proposed[prefix]) prefix++
    while (suffix < original.length - prefix && suffix < proposed.length - prefix &&
           original[original.length - suffix - 1] === proposed[proposed.length - suffix - 1]) suffix++

    var removed = original.slice(prefix, original.length - suffix)
    var added = proposed.slice(prefix, proposed.length - suffix)
    var result = []
    for (var i = 0; i < prefix; ++i) result.push({ kind: "same", text: original[i] })
    appendChanges(result, removed, added)
    for (i = suffix; i > 0; --i) result.push({ kind: "same", text: original[original.length - i] })
    return result
}

function inlineDiff(originalLine, proposedLine) {
    var original = String(originalLine).match(/\s+|[^\s]+/g) || [""]
    var proposed = String(proposedLine).match(/\s+|[^\s]+/g) || [""]
    if (original.length * proposed.length > MAX_INLINE_LCS_CELLS)
        return marked(original.join(""), "removed") + " → " + marked(proposed.join(""), "added")

    var width = proposed.length + 1
    var scores = new Uint16Array((original.length + 1) * width)
    for (var oldIndex = original.length - 1; oldIndex >= 0; --oldIndex) {
        for (var newIndex = proposed.length - 1; newIndex >= 0; --newIndex) {
            var cell = oldIndex * width + newIndex
            scores[cell] = original[oldIndex] === proposed[newIndex]
                ? scores[(oldIndex + 1) * width + newIndex + 1] + 1
                : Math.max(scores[(oldIndex + 1) * width + newIndex], scores[cell + 1])
        }
    }

    var html = ""
    oldIndex = 0
    newIndex = 0
    while (oldIndex < original.length && newIndex < proposed.length) {
        if (original[oldIndex] === proposed[newIndex]) {
            html += escapeHtml(original[oldIndex++])
            newIndex++
        } else if (scores[(oldIndex + 1) * width + newIndex] >= scores[oldIndex * width + newIndex + 1]) {
            html += marked(original[oldIndex++], "removed")
        } else {
            html += marked(proposed[newIndex++], "added")
        }
    }
    while (oldIndex < original.length) html += marked(original[oldIndex++], "removed")
    while (newIndex < proposed.length) html += marked(proposed[newIndex++], "added")
    return html
}

function marked(text, kind) {
    var color = kind === "added" ? "#a7f3d0" : "#fecdd3"
    var background = kind === "added" ? "#2634d399" : "#26fb7185"
    return "<span style=\"color:" + color + ";background-color:" + background + "\">" +
        escapeHtml(text) + "</span>"
}

function escapeHtml(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;")
}
