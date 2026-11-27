.pragma library
.import "NotesBlockAiOperations.js" as BlockAiOperations

function details(block, reply, controller) {
    if (!block || !block.id) return { valid: false, cleanText: "", searchReplaceCount: 0, diffAvailable: false }
    var raw = String(reply || "")
    var type = String(block.blockType || "")
    var codeBlock = type === "codeBlock"
    var sourceText = codeBlock
        ? String(block.attrs && block.attrs.code !== undefined ? block.attrs.code : block.innerHtml || "")
        : BlockAiOperations.plainTextFromHtml(block.innerHtml || block.html || "")
    var surgical = BlockAiOperations.applySearchReplace(sourceText, raw, controller)
    var surgicalCount = Number(surgical.parsedCount || 0)
    var replacement = BlockAiOperations.replacementForBlock(block, raw, controller, surgical)
    var replacementText = !replacement ? "" : (codeBlock
        ? String(replacement.attrs.code || "")
        : BlockAiOperations.plainTextFromHtml(replacement.innerHtml || replacement.html || ""))
    var cleanText = raw
    var title = ""
    if (codeBlock) {
        cleanText = surgical.found ? raw : BlockAiOperations.codeProposal(raw).code
    } else {
        var titleMatch = /^(?:T\u00edtulo|Titulo|Title):\s*(.+)$/im.exec(raw)
        if (titleMatch) title = titleMatch[1].trim().replace(/^\*+|\*+$/g, "")
        cleanText = surgical.found ? raw : BlockAiOperations.stripProposalFence(raw)
        if (title && !surgical.found)
            cleanText = cleanText.replace(/^(?:T\u00edtulo|Titulo|Title):\s*.+\n?/im, "").trim()
    }
    return {
        valid: Boolean(replacement),
        cleanText: cleanText,
        proposedTitle: title,
        isSearchReplace: surgicalCount > 0,
        searchReplaceCount: surgicalCount,
        sourceText: sourceText,
        replacementText: replacementText,
        diffAvailable: Boolean(replacement) && sourceText !== replacementText
    }
}
