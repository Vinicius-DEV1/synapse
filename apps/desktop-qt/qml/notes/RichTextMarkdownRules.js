.pragma library

// Markdown line-prefix input rules matching TipTap StarterKit / Blockquote / CodeBlock / HR shortcuts.
function matchBlockInputRule(lineText) {
    if (lineText === "---" || lineText === "***") return { type: "hr", length: 3 }
    if (lineText === ">") return { type: "blockquote", length: 1 }
    if (lineText === "```") return { type: "codeBlock", length: 3 }
    if (lineText === "- [ ]" || lineText === "[]") return { type: "taskList", length: lineText.length }
    if (/^\d+\.$/.test(lineText)) return { type: "orderedList", length: lineText.length }
    return null
}

function currentLineBeforeCursor(plainText, cursorPos) {
    var before = String(plainText || "").substring(0, cursorPos)
    var lastNl = before.lastIndexOf("\n")
    var lineStart = lastNl >= 0 ? lastNl + 1 : 0
    return { start: lineStart, text: before.substring(lineStart) }
}
