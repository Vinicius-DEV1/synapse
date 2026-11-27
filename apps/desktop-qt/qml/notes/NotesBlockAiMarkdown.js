.pragma library

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
    if (!href || /[\u0000-\u0020\u007f]/.test(href)) return ""
    return /^(https?:\/\/|mailto:|synapse-page:\/)/i.test(href) ? href : ""
}

function sanitizeRichHtml(value, allowTaskMarkup) {
    var content = String(value || "").replace(/<!--[\s\S]*?-->/g, "")
    content = content.replace(/<(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    var safeTags = {
        p: true, br: true, strong: true, b: true, em: true, i: true, u: true, s: true, del: true,
        ul: true, ol: true, li: true, blockquote: true, pre: true, code: true,
        h1: true, h2: true, h3: true, h4: true, h5: true, h6: true, hr: true,
        table: true, thead: true, tbody: true, tfoot: true, tr: true, th: true, td: true, a: true
    }
    if (allowTaskMarkup) {
        safeTags.label = true
        safeTags.input = true
        safeTags.span = true
        safeTags.div = true
    }
    return content.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, function(tag, rawName, attributes) {
        var name = String(rawName).toLowerCase()
        if (!safeTags[name]) return ""
        if (/^<\//.test(tag)) return "</" + name + ">"
        if (name === "br" || name === "hr") return "<" + name + "/>"
        if (allowTaskMarkup && name === "ul" && /\bdata-type\s*=\s*["']taskList["']/i.test(attributes))
            return "<ul data-type=\"taskList\">"
        if (name === "li") {
            var checked = /\bdata-checked\s*=\s*["'](true|false)["']/i.exec(attributes)
            if (allowTaskMarkup && checked && /\bdata-type\s*=\s*["']taskItem["']/i.test(attributes))
                return "<li data-checked=\"" + checked[1].toLowerCase() + "\" data-type=\"taskItem\">"
        }
        if (name === "input" && /\btype\s*=\s*["']checkbox["']/i.test(attributes)) {
            var checkedInput = /\bchecked(?:\s*=\s*(?:["']checked["']|checked))?/i.test(attributes)
            return "<input type=\"checkbox\"" + (checkedInput ? " checked=\"checked\"" : "") + "/>"
        }
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
    var replacements = []
    var content = String(value || "")
    function hold(html) {
        var marker = "\u0001" + replacements.length + "\u0002"
        replacements.push(html)
        return marker
    }

    content = content.replace(/`([^`]+)`/g, function(match, code) {
        return hold("<code>" + escapeHtmlText(code) + "</code>")
    })
    content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(match, alt) { return hold(escapeHtmlText(alt)) })
    content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(match, label, href) {
        var target = safeLinkTarget(href)
        return hold(target
            ? "<a href=\"" + escapeHtmlAttribute(target) + "\">" + inlineMarkdown(label) + "</a>"
            : escapeHtmlText(label))
    })
    content = content.replace(/\b(?:https?:\/\/[^\s<>]+|www\.[^\s<>]+|[\w.+-]+@[\w.-]+\.[a-z]{2,})/gi, function(url) {
        var trailing = ""
        while (/[.,!?;:)]$/.test(url)) {
            trailing = url.slice(-1) + trailing
            url = url.slice(0, -1)
        }
        var target = safeLinkTarget(url.toLowerCase().indexOf("www.") === 0 ? "http://" + url :
            (url.indexOf("@") >= 0 && url.indexOf(":") < 0 ? "mailto:" + url : url))
        return target
            ? hold("<a href=\"" + escapeHtmlAttribute(target) + "\">" + escapeHtmlText(url) + "</a>") + escapeHtmlText(trailing)
            : escapeHtmlText(url + trailing)
    })

    var text = escapeHtmlText(content)
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>")
    text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>")
    text = text.replace(/_([^_]+)_/g, "<em>$1</em>")
    text = text.replace(/~~([^~]+)~~/g, "<s>$1</s>")
    for (var i = 0; i < replacements.length; ++i)
        text = text.replace("\u0001" + i + "\u0002", replacements[i])
    return text
}

function splitTableRow(line) {
    var value = String(line || "").trim().replace(/^\|/, "").replace(/\|$/, "")
    var cells = []
    var cell = ""
    var escaped = false
    for (var i = 0; i < value.length; ++i) {
        var character = value.charAt(i)
        if (escaped) {
            cell += character
            escaped = false
        } else if (character === "\\") {
            escaped = true
        } else if (character === "|") {
            cells.push(cell.trim())
            cell = ""
        } else {
            cell += character
        }
    }
    if (escaped) cell += "\\"
    cells.push(cell.trim())
    return cells
}

function tableAlignments(line, columnCount) {
    var cells = splitTableRow(line)
    if (cells.length !== columnCount) return null
    var alignments = []
    for (var i = 0; i < cells.length; ++i) {
        if (!/^:?-{3,}:?$/.test(cells[i])) return null
        alignments.push(cells[i].charAt(0) === ":"
            ? (cells[i].charAt(cells[i].length - 1) === ":" ? "center" : "left")
            : (cells[i].charAt(cells[i].length - 1) === ":" ? "right" : ""))
    }
    return alignments
}

function renderTableRow(cells, alignments, cellTag) {
    var output = "<tr>"
    for (var i = 0; i < alignments.length; ++i) {
        var alignment = alignments[i]
        output += "<" + cellTag + (alignment ? " style=\"text-align:" + alignment + "\"" : "") + ">" +
            inlineMarkdown(cells[i] || "") + "</" + cellTag + ">"
    }
    return output + "</tr>"
}

function orderedTaskPrefix(item, listType, enabled) { return enabled && listType === "ordered" && item.checked !== null ? "<span>" + (item.checked ? "☑" : "☐") + "</span> " : "" }

function markdownToHtml(value, showOrderedTaskState) {
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
            output.push("<p>" + paragraph.map(inlineMarkdown).join(" ") + "</p>")
            paragraph = []
        }
    }
    function flushList() {
        if (!listType) return
        var tag = listType === "ordered" ? "ol" : "ul"
        var segment = []
        var segmentIsTask = null
        function flushSegment() {
            if (segment.length === 0) return
            output.push("<" + tag + (segmentIsTask ? " data-type=\"taskList\">" : ">") + segment.map(function(item) {
                if (segmentIsTask) {
                    var checked = item.checked === true
                    return "<li data-checked=\"" + (checked ? "true" : "false") + "\" data-type=\"taskItem\">" +
                        "<label><input type=\"checkbox\"" + (checked ? " checked=\"checked\"" : "") +
                        "/><span></span></label><div><p>" + inlineMarkdown(item.text) + "</p></div></li>"
                }
                return "<li><p>" + orderedTaskPrefix(item, listType, showOrderedTaskState) + inlineMarkdown(item.text) + "</p></li>"
            }).join("") + "</" + tag + ">")
            segment = []
        }
        for (var i = 0; i < listItems.length; ++i) {
            var isTask = listType === "unordered" && listItems[i].checked !== null
            if (segmentIsTask !== null && segmentIsTask !== isTask) flushSegment()
            segmentIsTask = isTask
            segment.push(listItems[i])
        }
        flushSegment()
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
        if (i + 1 < lines.length && line.indexOf("|") >= 0 && lines[i + 1].indexOf("|") >= 0) {
            var headerCells = splitTableRow(line)
            var alignments = tableAlignments(lines[i + 1], headerCells.length)
            if (alignments) {
                flushTextBlocks()
                var tableHtml = "<table><thead>" + renderTableRow(headerCells, alignments, "th") + "</thead><tbody>"
                i += 2
                while (i < lines.length && lines[i].trim() && lines[i].indexOf("|") >= 0) {
                    var rowCells = splitTableRow(lines[i])
                    while (rowCells.length < headerCells.length) rowCells.push("")
                    tableHtml += renderTableRow(rowCells.slice(0, headerCells.length), alignments, "td")
                    ++i
                }
                --i
                output.push(tableHtml + "</tbody></table>")
                continue
            }
        }
        if (!line.trim()) {
            flushTextBlocks()
            continue
        }
        var heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
        var orderedTask = /^\s*\d+[.)]\s+\[([ xX])\]\s+(.+)$/.exec(line)
        var task = /^\s*[-+*]\s+\[([ xX])\]\s+(.+)$/.exec(line)
        var unordered = /^\s*[-+*]\s+(.+)$/.exec(line)
        var ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line)
        var quote = /^\s*>\s?(.*)$/.exec(line)
        if (task || unordered || ordered) {
            flushParagraph()
            var nextListType = ordered ? "ordered" : "unordered"
            if (listType && listType !== nextListType) flushList()
            listType = nextListType
            listItems.push({
                text: (task || orderedTask || unordered || ordered)[task || orderedTask ? 2 : 1],
                checked: task ? task[1].toLowerCase() === "x" : orderedTask ? orderedTask[1].toLowerCase() === "x" : null
            })
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

function richContentHtml(value) {
    var content = stripProposalFence(value)
    if (/<(?:p|div|ul|ol|li|pre|blockquote|h[1-6]|hr|table|img)\b/i.test(content))
        return sanitizeRichHtml(content)
    return sanitizeRichHtml(markdownToHtml(content), true)
}

function conversationHtml(value) {
    var content = stripProposalFence(value)
    return sanitizeRichHtml(/<(?:p|div|ul|ol|li|pre|blockquote|h[1-6]|hr|table|img)\b/i.test(content) ? content : markdownToHtml(content, true), true)
}
