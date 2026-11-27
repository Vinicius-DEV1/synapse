.pragma library
.import "NotesBlockAiOperations.js" as BlockAiOperations

function searchReplaceCount(proposal) {
    var marker = /<<<<<<< SEARCH\s*\n([\s\S]*?)\n=======\s*\n([\s\S]*?)\n>>>>>>>/g
    var count = 0
    while (marker.exec(String(proposal || "")) !== null) count++
    return count
}

function plainTextFromHtml(value) {
    return String(value || "")
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)\s*>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&amp;/gi, "&")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

function details(block, reply) {
    if (!block || !block.id) return { valid: false, cleanText: "", searchReplaceCount: 0, diffAvailable: false }
    var raw = String(reply || "")
    var type = String(block.blockType || "")
    var codeBlock = type === "codeBlock"
    var sourceText = codeBlock
        ? String(block.attrs && block.attrs.code !== undefined ? block.attrs.code : block.innerHtml || "")
        : plainTextFromHtml(block.innerHtml || block.html || "")
    var replacement = BlockAiOperations.replacementForBlock(block, raw)
    var replacementText = !replacement ? "" : (codeBlock
        ? String(replacement.attrs.code || "")
        : plainTextFromHtml(replacement.innerHtml || replacement.html || ""))
    var surgicalCount = searchReplaceCount(raw)
    var cleanText = raw
    var title = ""
    if (codeBlock) {
        var surgical = BlockAiOperations.applySearchReplace(sourceText, raw)
        cleanText = surgical.found ? raw : BlockAiOperations.codeProposal(raw).code
    } else {
        var titleMatch = /^(?:T\u00edtulo|Titulo|Title):\s*(.+)$/im.exec(raw)
        if (titleMatch) title = titleMatch[1].trim().replace(/^\*+|\*+$/g, "")
        var surgical = BlockAiOperations.applySearchReplace(sourceText, raw)
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
