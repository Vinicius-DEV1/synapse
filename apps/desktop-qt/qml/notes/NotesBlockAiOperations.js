.pragma library

function cloneBlock(block) {
    return Object.assign({}, block, { attrs: Object.assign({}, block && block.attrs ? block.attrs : ({})) })
}

function escapeHtmlText(value) {
    return String(value === undefined || value === null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
}

function escapeHtmlAttribute(value) {
    return escapeHtmlText(value).replace(/"/g, "&quot;")
}

function safeLinkTarget(value) {
    var href = String(value || "").trim()
    return /^(https?:\/\/|mailto:|synapse-page:\/)/i.test(href) ? href : ""
}

function sanitizeRichHtml(value) {
    var content = String(value || "").replace(/<!--[\s\S]*?-->/g, "")
    content = content.replace(/<(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    var safeTags = {
        p: true, br: true, strong: true, b: true, em: true, i: true, u: true, s: true, del: true,
        ul: true, ol: true, li: true, blockquote: true, pre: true, code: true,
        h1: true, h2: true, h3: true, h4: true, h5: true, h6: true, hr: true,
        table: true, thead: true, tbody: true, tfoot: true, tr: true, th: true, td: true, a: true
    }
    return content.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, function(tag, rawName, attributes) {
        var name = String(rawName).toLowerCase()
        if (!safeTags[name]) return ""
        if (/^<\//.test(tag)) return "</" + name + ">"
        if (name === "br" || name === "hr") return "<" + name + "/>"
        if (name === "code") {
            var language = /class\s*=\s*["'][^"']*language-([a-zA-Z0-9_+.-]+)[^"']*["']/i.exec(attributes)
            return "<code" + (language ? " class=\"language-" + language[1] + "\"" : "") + ">"
        }
        if (name === "a") {
            var href = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attributes)
            var target = href ? safeLinkTarget(href[1] || href[2] || href[3]) : ""
            return "<a" + (target ? " href=\"" + escapeHtmlAttribute(target) + "\"" : "") + ">"
        }
        return "<" + name + ">"
    })
}

function stripProposalFence(value) {
    var content = String(value || "").trim()
    var outerFence = /(?:^|\n)(`{4,}|~{4,})(?:markdown|md)?\s*\n([\s\S]*?)\n\1(?:\n|$)/i.exec(content)
    var markdownFence = /(?:^|\n)(`{3}|~{3})(?:markdown|md)\s*\n([\s\S]*?)\n\1(?:\n|$)/i.exec(content)
    if (outerFence) return outerFence[2].trim()
    if (markdownFence) return markdownFence[2].trim()
    return content
}

function inlineMarkdown(value) {
    var text = escapeHtmlText(value)
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>")
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>")
    text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>")
    text = text.replace(/_([^_]+)_/g, "<em>$1</em>")
    text = text.replace(/~~([^~]+)~~/g, "<s>$1</s>")
    return text
}

function markdownToHtml(value) {
    var lines = stripProposalFence(value).replace(/\r\n?/g, "\n").split("\n")
    var output = []
    var paragraph = []
    var listType = ""
    var listItems = []
    var codeLines = []
    var codeLanguage = ""
    var inCode = false

    function flushParagraph() {
        if (paragraph.length > 0) {
            output.push("<p>" + paragraph.map(inlineMarkdown).join("<br/>") + "</p>")
            paragraph = []
        }
    }
    function flushList() {
        if (!listType) return
        var tag = listType === "ordered" ? "ol" : "ul"
        output.push("<" + tag + ">" + listItems.map(function(item) {
            return "<li><p>" + inlineMarkdown(item) + "</p></li>"
        }).join("") + "</" + tag + ">")
        listType = ""
        listItems = []
    }
    function flushTextBlocks() {
        flushParagraph()
        flushList()
    }

    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i]
        var fence = /^\s*(`{3,}|~{3,})([\w.+-]*)\s*$/.exec(line)
        if (fence) {
            if (inCode) {
                output.push("<pre><code" + (codeLanguage ? " class=\"language-" + escapeHtmlText(codeLanguage) + "\"" : "") + ">" +
                    escapeHtmlText(codeLines.join("\n")) + "</code></pre>")
                codeLines = []
                codeLanguage = ""
                inCode = false
            } else {
                flushTextBlocks()
                inCode = true
                codeLanguage = fence[2]
            }
            continue
        }
        if (inCode) {
            codeLines.push(line)
            continue
        }
        if (!line.trim()) {
            flushTextBlocks()
            continue
        }
        var heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
        var unordered = /^\s*[-+*]\s+(.+)$/.exec(line)
        var ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line)
        var quote = /^\s*>\s?(.*)$/.exec(line)
        if (unordered || ordered) {
            flushParagraph()
            var nextListType = unordered ? "unordered" : "ordered"
            if (listType && listType !== nextListType) flushList()
            listType = nextListType
            listItems.push((unordered || ordered)[1])
            continue
        }
        if (heading || quote || /^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)) {
            flushTextBlocks()
            if (heading) output.push("<h" + heading[1].length + ">" + inlineMarkdown(heading[2]) + "</h" + heading[1].length + ">")
            else if (quote) output.push("<blockquote><p>" + inlineMarkdown(quote[1]) + "</p></blockquote>")
            else output.push("<hr/>")
            continue
        }
        paragraph.push(line)
    }
    if (inCode) output.push("<pre><code" + (codeLanguage ? " class=\"language-" + escapeHtmlText(codeLanguage) + "\"" : "") + ">" +
        escapeHtmlText(codeLines.join("\n")) + "</code></pre>")
    flushTextBlocks()
    return output.join("") || "<p><br/></p>"
}

function applySearchReplace(source, proposal) {
    var blocks = []
    var marker = /<<<<<<< SEARCH\s*\n([\s\S]*?)\n=======\s*\n([\s\S]*?)\n>>>>>>>/g
    var match
    while ((match = marker.exec(String(proposal || ""))) !== null)
        blocks.push({ search: match[1], replace: match[2] })
    if (blocks.length === 0) return { found: false, success: false, result: "" }

    var result = String(source || "")
    for (var i = 0; i < blocks.length; ++i) {
        var position = result.indexOf(blocks[i].search)
        if (position < 0) return { found: true, success: false, result: "" }
        result = result.slice(0, position) + blocks[i].replace + result.slice(position + blocks[i].search.length)
    }
    return { found: true, success: true, result: result }
}

function richContentHtml(value) {
    var content = stripProposalFence(value)
    if (/<(?:p|div|ul|ol|li|pre|blockquote|h[1-6]|hr|table|img)\b/i.test(content))
        return sanitizeRichHtml(content)
    return sanitizeRichHtml(markdownToHtml(content))
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

function replacementForBlock(block, reply) {
    if (!block || !block.id) return null
    var next = cloneBlock(block)
    var content = stripProposalFence(reply)
    if (block.blockType === "codeBlock") {
        var codeChange = applySearchReplace(String(block.attrs.code || block.innerHtml || ""), content)
        var proposal = codeProposal(content)
        next.attrs.code = codeChange.found ? (codeChange.success ? codeChange.result : "") : proposal.code
        if (codeChange.found && !codeChange.success) return null
        if (proposal.language && (!next.attrs.language || next.attrs.language === "auto"))
            next.attrs.language = proposal.language
        return next
    }

    var body = content
    var rawBody = String(block.innerHtml || block.html || "").replace(/<[^>]*>/g, "")
    var bodyChange = applySearchReplace(rawBody, body)
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
