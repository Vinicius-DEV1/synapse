.pragma library
.import "NotesBlockAiMarkdown.js" as BlockAiMarkdown

function cloneBlock(block) {
    return Object.assign({}, block, { attrs: Object.assign({}, block && block.attrs ? block.attrs : ({})) })
}

function stripProposalFence(value) { return BlockAiMarkdown.stripProposalFence(value) }
function markdownToHtml(value) { return BlockAiMarkdown.markdownToHtml(value) }
function richContentHtml(value) { return BlockAiMarkdown.richContentHtml(value) }

function plainTextFromHtml(value) {
    return String(value || "")
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)\s*>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&amp;/gi, "&")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

function applySearchReplace(source, proposal, controller) {
    if (!controller || typeof controller.applyNoteSearchReplace !== "function")
        return { found: false, success: false, result: "", parsedCount: 0, replacedCount: 0, error: "Core search/replace is unavailable." }
    var result = controller.applyNoteSearchReplace(String(source || ""), String(proposal || ""))
    if (!result || typeof result.success !== "boolean")
        return { found: false, success: false, result: "", parsedCount: 0, replacedCount: 0, error: "Core returned an invalid search/replace result." }
    var parsedCount = Number(result.parsedCount || 0)
    var replacedCount = Number(result.replacedCount || 0)
    return {
        found: replacedCount > 0 || !result.success,
        success: result.success,
        result: String(result.result || ""),
        parsedCount: parsedCount,
        replacedCount: replacedCount,
        error: String(result.error || "")
    }
}

function decodeCodeHtml(value) {
    return String(value || "")
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;/gi, "'")
        .replace(/&amp;/gi, "&")
}

function codeProposal(value) {
    var content = String(value || "").trim()
    var fence = /```([a-zA-Z0-9_+.-]+)?\s*\n([\s\S]*?)\n?```/.exec(content)
    if (fence) return { code: fence[2].replace(/\n+$/, ""), language: fence[1] || "" }

    var htmlCode = /<pre\b[^>]*>\s*<code\b([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/i.exec(content)
    if (htmlCode) {
        var languageMatch = /class\s*=\s*["'][^"']*language-([^\s"']+)/i.exec(htmlCode[1])
        return { code: decodeCodeHtml(htmlCode[2]), language: languageMatch ? languageMatch[1] : "" }
    }
    return { code: content, language: "" }
}

function replacementForBlock(block, reply, controller, searchReplaceResult) {
    if (!block || !block.id) return null
    var next = cloneBlock(block)
    var content = stripProposalFence(reply)
    if (block.blockType === "codeBlock") {
        var sourceCode = block.attrs && block.attrs.code !== undefined
            ? String(block.attrs.code)
            : String(block.innerHtml || "")
        var codeChange = searchReplaceResult || applySearchReplace(sourceCode, content, controller)
        var proposal = codeProposal(content)
        next.attrs.code = codeChange.found ? (codeChange.success ? codeChange.result : "") : proposal.code
        if (codeChange.found && !codeChange.success) return null
        if (proposal.language && (!next.attrs.language || next.attrs.language === "auto"))
            next.attrs.language = proposal.language
        return next
    }

    var body = content
    var rawBody = plainTextFromHtml(block.innerHtml || block.html || "")
    var bodyChange = searchReplaceResult || applySearchReplace(rawBody, body, controller)
    if (bodyChange.found) {
        if (!bodyChange.success) return null
        body = bodyChange.result
    }
    if (block.blockType === "toggleBlock" || block.blockType === "blockquoteToggle") {
        var titleMatch = /^(?:T\u00edtulo|Titulo|Title):\s*(.+)$/im.exec(body)
        if (titleMatch) {
            next.attrs["data-title"] = titleMatch[1].trim().replace(/^\*+|\*+$/g, "")
            body = body.replace(titleMatch[0], "").replace(/^\s+/, "")
        }
    }
    var html = richContentHtml(body)
    if (block.blockType === "blockquote" || block.blockType === "toggleBlock" || block.blockType === "blockquoteToggle") {
        next.innerHtml = html
        next.html = ""
        return next
    }
    if (block.blockType === "richText") {
        next.html = html
        next.innerHtml = html
        return next
    }
    return null
}
