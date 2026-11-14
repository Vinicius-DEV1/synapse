.pragma library

function decodeAttribute(value) {
    return String(value || "")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&amp;/gi, "&")
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

function attributesFromTag(tag) {
    var attributes = ({})
    var pattern = /([a-zA-Z_:][a-zA-Z0-9_.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
    var match
    while ((match = pattern.exec(tag)) !== null) {
        var name = String(match[1] || "").toLowerCase()
        if (attributes[name] === undefined) {
            attributes[name] = decodeAttribute(match[2] !== undefined ? match[2]
                : match[3] !== undefined ? match[3] : match[4])
        }
    }
    return attributes
}

// 1. Question Blocks (Multiple-Choice Quiz & Batteries)
function renderQuestionBlocks(html) {
    var pattern = /<div\b(?=[^>]*\b(?:data-type="question-block"|class="[^"]*question-block[^"]*"))([^>]*)>([\s\S]*?)<\/div>/gi
    return html.replace(pattern, function(fullMatch, tagAttrs, innerContent) {
        var attrs = attributesFromTag("<div " + tagAttrs + ">")
        var title = String(attrs["data-title"] || attrs["data-cached-title"] || "Bateria de Exercícios").trim()
        var questions = []
        try {
            var raw = String(attrs["data-questions"] || "")
            if (raw.indexOf("%") >= 0) raw = decodeURIComponent(raw)
            if (raw.trim().length > 0) questions = JSON.parse(raw)
        } catch (e) {
            questions = []
        }

        var contentHtml = ""
        if (questions && questions.length > 0) {
            for (var i = 0; i < questions.length; i++) {
                var q = questions[i]
                var prompt = String(q.prompt || ("Questão " + (i + 1)))
                contentHtml += "<p><font color=\"#ffffff\" size=\"3\"><b>" + (i + 1) + ". " + escapeHtml(prompt) + "</b></font></p>"
                var options = q.options || []
                for (var o = 0; o < options.length; o++) {
                    var isCorrect = (q.correctIndex === o)
                    var optText = escapeHtml(String(options[o] || ""))
                    var letter = String.fromCharCode(65 + o)
                    var optColor = isCorrect ? "#34d399" : "#cbd5e1"
                    contentHtml += "<p><font color=\"" + optColor + "\" size=\"2\">&nbsp;&nbsp;<b>" + letter + ")</b> " + optText +
                                   (isCorrect ? " <font color=\"#10b981\"><b>(Gabarito ✓)</b></font>" : "") + "</font></p>"
                }
                if (q.explanation && String(q.explanation).trim().length > 0) {
                    contentHtml += "<p><font color=\"#fbbf24\" size=\"2\"><b>💡 Explicação:</b> " +
                                   escapeHtml(String(q.explanation)) + "</font></p>"
                }
                if (i < questions.length - 1) contentHtml += "<hr/>"
            }
        } else {
            contentHtml = innerContent.trim().length > 0 ? innerContent : "<p><font color=\"#a1a1aa\" size=\"2\">Nenhuma questão cadastrada neste bloco.</font></p>"
        }

        return "<table width=\"100%\" border=\"1\" bordercolor=\"#5b21b6\" cellpadding=\"12\" cellspacing=\"0\" bgcolor=\"#13111c\">" +
               "<tr><td>" +
               "<p><font color=\"#a78bfa\" size=\"2\"><b>❓ BATERIA DE EXERCÍCIOS / QUIZ: " + escapeHtml(title) + "</b></font></p>" +
               contentHtml +
               "</td></tr></table>"
    })
}

// 2. Focus / Pomodoro Timer Widgets
function renderFocusWidgets(html) {
    var pattern = /<span\b(?=[^>]*\bdata-type="focus-widget")([^>]*)>([\s\S]*?)<\/span>/gi
    return html.replace(pattern, function(fullMatch, tagAttrs, innerContent) {
        var attrs = attributesFromTag("<span " + tagAttrs + ">")
        var duration = attrs["data-duration"] || "25"
        var tag = attrs["data-tag"] || "Estudo"
        var desc = attrs["data-description"] || "Sessão de Foco"
        var status = attrs["data-status"] || "running"
        var statusLabel = status === "completed" ? "Concluído ✓" : (status === "running" ? "Em Andamento ⏱️" : status)

        return "<table width=\"100%\" border=\"1\" bordercolor=\"#065f46\" cellpadding=\"10\" cellspacing=\"0\" bgcolor=\"#08241c\">" +
               "<tr><td>" +
               "<p><font color=\"#34d399\" size=\"2\"><b>⏱️ FOCO POMODORO: " + escapeHtml(duration) + " MINUTOS</b></font> &nbsp; " +
               "<font color=\"#6ee7b7\" size=\"2\">#" + escapeHtml(tag) + "</font></p>" +
               "<p><font color=\"#ecfdf5\" size=\"2\">" + escapeHtml(desc) + " &nbsp;|&nbsp; <b>Status:</b> " + escapeHtml(statusLabel) + "</font></p>" +
               "</td></tr></table>"
    })
}

// 3. Alarm Widgets
function renderAlarmWidgets(html) {
    var pattern = /<span\b(?=[^>]*\bdata-type="alarm-widget")([^>]*)>([\s\S]*?)<\/span>/gi
    return html.replace(pattern, function(fullMatch, tagAttrs, innerContent) {
        var attrs = attributesFromTag("<span " + tagAttrs + ">")
        var time = attrs["data-time"] || "08:00"
        var label = attrs["data-label"] || "Alarme"
        var status = attrs["data-status"] || "pending"

        return "<table width=\"100%\" border=\"1\" bordercolor=\"#1e3a8a\" cellpadding=\"10\" cellspacing=\"0\" bgcolor=\"#0f1f38\">" +
               "<tr><td>" +
               "<p><font color=\"#60a5fa\" size=\"2\"><b>⏰ ALARME AGENDADO: " + escapeHtml(time) + "</b></font></p>" +
               "<p><font color=\"#dbeafe\" size=\"2\">" + escapeHtml(label) + " &nbsp;|&nbsp; <b>Status:</b> " + escapeHtml(status) + "</font></p>" +
               "</td></tr></table>"
    })
}

// 4. Calendar Event Widgets
function renderCalendarEventWidgets(html) {
    var pattern = /<span\b(?=[^>]*\bdata-type="calendar-event-widget")([^>]*)>([\s\S]*?)<\/span>/gi
    return html.replace(pattern, function(fullMatch, tagAttrs, innerContent) {
        var attrs = attributesFromTag("<span " + tagAttrs + ">")
        var title = attrs["data-title"] || "Evento"
        var date = attrs["data-date"] || ""
        var status = attrs["data-status"] || "pending"
        var statusText = status === "completed" ? "Concluído ✓" : "Pendente"

        return "<table width=\"100%\" border=\"1\" bordercolor=\"#0369a1\" cellpadding=\"10\" cellspacing=\"0\" bgcolor=\"#0c2338\">" +
               "<tr><td>" +
               "<p><font color=\"#38bdf8\" size=\"2\"><b>📅 EVENTO DA AGENDA: " + escapeHtml(title) + "</b></font></p>" +
               "<p><font color=\"#e0f2fe\" size=\"2\">" + (date ? "Data: " + escapeHtml(date) + " &nbsp;|&nbsp; " : "") +
               "<b>Status:</b> " + statusText + "</font></p>" +
               "</td></tr></table>"
    })
}

// 5. Habit Widgets
function renderHabitWidgets(html) {
    var pattern = /<span\b(?=[^>]*\bdata-type="habit-widget")([^>]*)>([\s\S]*?)<\/span>/gi
    return html.replace(pattern, function(fullMatch, tagAttrs, innerContent) {
        var attrs = attributesFromTag("<span " + tagAttrs + ">")
        var title = attrs["data-title"] || "Hábito Diário"
        var streak = attrs["data-streak"] || "0"

        return "<table width=\"100%\" border=\"1\" bordercolor=\"#047857\" cellpadding=\"10\" cellspacing=\"0\" bgcolor=\"#06281e\">" +
               "<tr><td>" +
               "<p><font color=\"#34d399\" size=\"2\"><b>⚡ HÁBITO DIÁRIO: " + escapeHtml(title) + "</b></font></p>" +
               "<p><font color=\"#a7f3d0\" size=\"2\">🔥 Consistência: " + escapeHtml(streak) + " dias consecutivos</font></p>" +
               "</td></tr></table>"
    })
}

// 6. Attached File Widgets
function renderFileWidgets(html) {
    var pattern = /<(?:div|span)\b(?=[^>]*\bdata-type="file-widget")([^>]*)>([\s\S]*?)<\/(?:div|span)>/gi
    return html.replace(pattern, function(fullMatch, tagAttrs, innerContent) {
        var attrs = attributesFromTag("<div " + tagAttrs + ">")
        var name = attrs["data-name"] || "Arquivo"
        var type = (attrs["data-file-type"] || "documento").toUpperCase()

        return "<table width=\"100%\" border=\"1\" bordercolor=\"#374151\" cellpadding=\"10\" cellspacing=\"0\" bgcolor=\"#161622\">" +
               "<tr><td>" +
               "<p><font color=\"#9ca3af\" size=\"2\"><b>📁 DOCUMENTO ANEXO</b></font></p>" +
               "<p><font color=\"#ffffff\" size=\"3\"><b>" + escapeHtml(name) + "</b></font> " +
               "<font color=\"#9ca3af\" size=\"2\">(" + escapeHtml(type) + ")</font></p>" +
               "</td></tr></table>"
    })
}

// 7. Toggle Collapsible Blocks
function renderToggleBlocks(html, toggleStates) {
    var pattern = /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\btoggle-block[^"]*"|'[^']*\btoggle-block[^']*'))([^>]*)>([\s\S]*?)<\/div>/gi
    var index = 0
    return html.replace(pattern, function(fullMatch, tagAttrs, innerContent) {
        var attrs = attributesFromTag("<div " + tagAttrs + ">")
        var title = attrs["data-title"] || "Lista Oculta"
        var toggleId = "toggle_" + (index++)
        var initialOpen = attrs["data-is-open"] !== "false"
        var isOpen = toggleStates && toggleStates[toggleId] !== undefined
            ? Boolean(toggleStates[toggleId])
            : initialOpen

        var headerHtml = isOpen
            ? "<p><a href=\"synapse-toggle://toggle?id=" + toggleId + "\" style=\"text-decoration:none;\"><font color=\"#c4b5fd\" size=\"2\"><b>▼ " + escapeHtml(title) + "</b></font></a></p>"
            : "<p><a href=\"synapse-toggle://toggle?id=" + toggleId + "\" style=\"text-decoration:none;\"><font color=\"#a1a1aa\" size=\"2\"><b>▶ " + escapeHtml(title) + "</b></font> <font color=\"#71717a\" size=\"1\">(clique para expandir)</font></a></p>"

        return "<table width=\"100%\" border=\"1\" bordercolor=\"#27272a\" cellpadding=\"10\" cellspacing=\"0\" bgcolor=\"#14141e\">" +
               "<tr><td>" +
               headerHtml +
               (isOpen ? "<div style=\"margin-left: 14px;\">" + innerContent + "</div>" : "") +
               "</td></tr></table>"
    })
}

// 8. Blockquote Toggle (Callouts with Dropdown)
function renderBlockquoteToggles(html, toggleStates) {
    var pattern = /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bblockquote-toggle[^"]*"|'[^']*\bblockquote-toggle[^']*'))([^>]*)>([\s\S]*?)<\/div>/gi
    var index = 0
    return html.replace(pattern, function(fullMatch, tagAttrs, innerContent) {
        var attrs = attributesFromTag("<div " + tagAttrs + ">")
        var title = attrs["data-title"] || "Destaque"
        var toggleId = "bktoggle_" + (index++)
        var initialOpen = attrs["data-is-open"] !== "false"
        var isOpen = toggleStates && toggleStates[toggleId] !== undefined
            ? Boolean(toggleStates[toggleId])
            : initialOpen

        var headerHtml = isOpen
            ? "<p><a href=\"synapse-toggle://toggle?id=" + toggleId + "\" style=\"text-decoration:none;\"><font color=\"#ddd6fe\" size=\"2\"><b>▼ " + escapeHtml(title) + "</b></font></a></p>"
            : "<p><a href=\"synapse-toggle://toggle?id=" + toggleId + "\" style=\"text-decoration:none;\"><font color=\"#a1a1aa\" size=\"2\"><b>▶ " + escapeHtml(title) + "</b></font> <font color=\"#71717a\" size=\"1\">(clique para expandir)</font></a></p>"

        return "<table width=\"100%\" border=\"1\" bordercolor=\"#7c3aed\" cellpadding=\"10\" cellspacing=\"0\" bgcolor=\"#1a1528\">" +
               "<tr><td>" +
               headerHtml +
               (isOpen ? "<div style=\"margin-left: 14px;\">" + innerContent + "</div>" : "") +
               "</td></tr></table>"
    })
}

// 9. Multi-Column Layout (2 or 3 Columns)
function renderColumnGroups(html) {
    if (!html || html.indexOf("data-type=\"columnGroup\"") === -1) return html

    var result = ""
    var currentPos = 0
    var groupTag = /<div\b[^>]*data-type="columnGroup"[^>]*>/gi
    var match
    while ((match = groupTag.exec(html)) !== null) {
        var startTagPos = match.index
        result += html.substring(currentPos, startTagPos)
        var contentStart = startTagPos + match[0].length
        var depth = 1
        var tagPattern = /<\/?div\b[^>]*>/gi
        tagPattern.lastIndex = contentStart
        var endPos = html.length
        var subMatch
        while ((subMatch = tagPattern.exec(html)) !== null) {
            if (subMatch[0].charAt(1) === '/') {
                depth--
                if (depth === 0) {
                    endPos = subMatch.index + subMatch[0].length
                    break
                }
            } else {
                depth++
            }
        }
        var innerContent = html.substring(contentStart, subMatch ? subMatch.index : endPos)
        currentPos = endPos
        groupTag.lastIndex = currentPos

        var colBlocks = []
        var blockTag = /<div\b[^>]*data-type="columnBlock"[^>]*>/gi
        var colMatch
        while ((colMatch = blockTag.exec(innerContent)) !== null) {
            var colStart = colMatch.index + colMatch[0].length
            var colDepth = 1
            var colTagPattern = /<\/?div\b[^>]*>/gi
            colTagPattern.lastIndex = colStart
            var colSubMatch
            while ((colSubMatch = colTagPattern.exec(innerContent)) !== null) {
                if (colSubMatch[0].charAt(1) === '/') {
                    colDepth--
                    if (colDepth === 0) break
                } else {
                    colDepth++
                }
            }
            if (colSubMatch) {
                colBlocks.push(innerContent.substring(colStart, colSubMatch.index))
                blockTag.lastIndex = colSubMatch.index + colSubMatch[0].length
            }
        }

        if (colBlocks.length === 0) {
            result += innerContent
        } else {
            var colWidth = Math.floor(100 / colBlocks.length)
            var rowHtml = "<tr>"
            for (var c = 0; c < colBlocks.length; c++) {
                rowHtml += "<td width=\"" + colWidth + "%\" valign=\"top\" style=\"padding: 8px;\">" + colBlocks[c] + "</td>"
            }
            rowHtml += "</tr>"
            result += "<table width=\"100%\" border=\"0\" cellpadding=\"8\" cellspacing=\"0\">" + rowHtml + "</table>"
        }
    }
    result += html.substring(currentPos)
    return result
}

// 10. Web Scraps (Offline Web Snapshots)
function renderScrapWidgets(html) {
    var pattern = /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bscrap-widget-block[^"]*"|'[^']*\bscrap-widget-block[^']*'))([^>]*)>([\s\S]*?)<\/div>/gi
    return html.replace(pattern, function(fullMatch, tagAttrs, innerContent) {
        var attrs = attributesFromTag("<div " + tagAttrs + ">")
        var url = attrs["data-url"] || ""
        var title = attrs["data-title"] || "Snapshot Web"
        var status = attrs["data-status"] || "ready"

        return "<table width=\"100%\" border=\"1\" bordercolor=\"#0284c7\" cellpadding=\"10\" cellspacing=\"0\" bgcolor=\"#081e30\">" +
               "<tr><td>" +
               "<p><font color=\"#38bdf8\" size=\"2\"><b>🌐 SNAPSHOT WEB OFFLINE</b></font></p>" +
               "<p><font color=\"#ffffff\" size=\"3\"><b>" + escapeHtml(title) + "</b></font></p>" +
               "<p><font color=\"#7dd3fc\" size=\"2\">" + escapeHtml(url) + " &nbsp;|&nbsp; <b>Status:</b> " + escapeHtml(status) + "</font></p>" +
               "</td></tr></table>"
    })
}

// 11. Document Bundles
function renderDocumentBundles(html) {
    var pattern = /<div\b(?=[^>]*\bdata-type="document-bundle")([^>]*)>([\s\S]*?)<\/div>/gi
    return html.replace(pattern, function(fullMatch, tagAttrs, innerContent) {
        var attrs = attributesFromTag("<div " + tagAttrs + ">")
        var title = attrs["data-title"] || "Pacote de Documentos"

        return "<table width=\"100%\" border=\"1\" bordercolor=\"#b45309\" cellpadding=\"10\" cellspacing=\"0\" bgcolor=\"#211708\">" +
               "<tr><td>" +
               "<p><font color=\"#fbbf24\" size=\"2\"><b>📦 PACOTE DE DOCUMENTOS: " + escapeHtml(title) + "</b></font></p>" +
               "<p><font color=\"#fde68a\" size=\"2\">Coleção de documentos agrupados nesta nota.</font></p>" +
               "</td></tr></table>"
    })
}

// 12. Spoilers (Hidden Text with Click-to-Reveal)
function renderSpoilers(html, revealedMap) {
    if (!html || (html.indexOf("data-type=\"spoiler\"") === -1 && html.indexOf("caderno-spoiler") === -1)) return html

    var pattern = /<span\b(?=[^>]*\b(?:data-type="spoiler"|class="[^"]*caderno-spoiler[^"]*"))([^>]*)>([\s\S]*?)<\/span>/gi
    var index = 0
    return html.replace(pattern, function(fullMatch, tagAttrs, innerContent) {
        var spoilerId = "spoiler_" + (index++)
        var isRevealed = revealedMap && Boolean(revealedMap[spoilerId])

        if (isRevealed) {
            return "<a href=\"synapse-spoiler://toggle?id=" + spoilerId + "\" style=\"text-decoration:none;\">" +
                   "<font color=\"#f3e8ff\" bgcolor=\"#3b0764\">&nbsp;👁️ <b>" + innerContent + "</b>&nbsp;</font></a>"
        } else {
            return "<a href=\"synapse-spoiler://toggle?id=" + spoilerId + "\" style=\"text-decoration:none;\">" +
                   "<font color=\"#c084fc\" bgcolor=\"#1e1430\">&nbsp;🌫️ <b>[ SPOILER OCULTO ]</b>&nbsp;</font></a>"
        }
    })
}

// Master rendering pipeline
function renderCustomWidgets(source, options) {
    if (!source || source.length === 0) return ""
    var revealedMap = (options && options.revealedSpoilers) ? options.revealedSpoilers : ({})
    var toggleStates = (options && options.toggleStates) ? options.toggleStates : ({})
    var html = String(source)
    html = renderSpoilers(html, revealedMap)
    html = renderQuestionBlocks(html)
    html = renderFocusWidgets(html)
    html = renderAlarmWidgets(html)
    html = renderCalendarEventWidgets(html)
    html = renderHabitWidgets(html)
    html = renderFileWidgets(html)
    html = renderToggleBlocks(html, toggleStates)
    html = renderBlockquoteToggles(html, toggleStates)
    html = renderColumnGroups(html)
    html = renderScrapWidgets(html)
    html = renderDocumentBundles(html)
    return html
}
