.pragma library

var MAX_LCS_CELLS = 500000

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
    oldIndex = 0
    newIndex = 0
    while (oldIndex < original.length && newIndex < proposed.length) {
        if (original[oldIndex] === proposed[newIndex]) {
            result.push({ kind: "same", text: original[oldIndex++] })
            newIndex++
        } else if (scores[(oldIndex + 1) * width + newIndex] >= scores[oldIndex * width + newIndex + 1]) {
            result.push({ kind: "removed", text: original[oldIndex++] })
        } else {
            result.push({ kind: "added", text: proposed[newIndex++] })
        }
    }
    while (oldIndex < original.length) result.push({ kind: "removed", text: original[oldIndex++] })
    while (newIndex < proposed.length) result.push({ kind: "added", text: proposed[newIndex++] })
    return result
}

function compactDiff(original, proposed) {
    var prefix = 0
    var suffix = 0
    while (prefix < original.length && prefix < proposed.length && original[prefix] === proposed[prefix]) prefix++
    while (suffix < original.length - prefix && suffix < proposed.length - prefix &&
           original[original.length - suffix - 1] === proposed[proposed.length - suffix - 1]) suffix++

    var result = []
    for (var i = 0; i < prefix; ++i) result.push({ kind: "same", text: original[i] })
    for (i = prefix; i < original.length - suffix; ++i) result.push({ kind: "removed", text: original[i] })
    for (i = prefix; i < proposed.length - suffix; ++i) result.push({ kind: "added", text: proposed[i] })
    for (i = suffix; i > 0; --i) result.push({ kind: "same", text: original[original.length - i] })
    return result
}
