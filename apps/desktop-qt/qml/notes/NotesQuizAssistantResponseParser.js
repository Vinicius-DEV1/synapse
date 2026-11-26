.pragma library

function cleanJsonBlock(text) {
    var cleaned = String(text || "").trim()
    if (cleaned.indexOf("```json") === 0) cleaned = cleaned.substring(7)
    else if (cleaned.indexOf("```") === 0) cleaned = cleaned.substring(3)
    if (cleaned.lastIndexOf("```") === cleaned.length - 3)
        cleaned = cleaned.substring(0, cleaned.length - 3)
    return cleaned.trim()
}

function extractMessage(text) {
    var match = /"message"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(text)
    if (!match) return ""
    try { return JSON.parse("\"" + match[1] + "\"") } catch (error) {
        return match[1].replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\"/g, "\"")
    }
}

function balancedObjects(text) {
    var objects = []
    for (var start = 0; start < text.length; ++start) {
        if (text[start] !== "{") continue
        var depth = 0
        var quoted = false
        var escaped = false
        for (var end = start; end < text.length; ++end) {
            var char = text[end]
            if (escaped) { escaped = false; continue }
            if (char === "\\" && quoted) { escaped = true; continue }
            if (char === "\"") { quoted = !quoted; continue }
            if (quoted) continue
            if (char === "{") depth++
            else if (char === "}") {
                depth--
                if (depth === 0) {
                    objects.push(text.slice(start, end + 1))
                    start = end
                    break
                }
            }
        }
    }
    return objects
}

function parseJson(rawText) {
    var clean = cleanJsonBlock(rawText)
    try { return JSON.parse(clean) } catch (error) {
        var questions = []
        balancedObjects(clean).forEach(function(chunk) {
            try {
                var item = JSON.parse(chunk)
                if (item && (item.question || item.enunciado || item.expectedAnswer)) questions.push(item)
            } catch (parseError) {
                // Keep malformed candidates out of the validator merge.
            }
        })
        return questions.length > 0 ? ({ validatedQuestions: questions }) : null
    }
}

function parse(rawText, questions, actionParser) {
    var clean = cleanJsonBlock(rawText)
    try {
        var parsed = JSON.parse(clean)
        var normalized = actionParser.normalizeResponse(parsed, questions)
        if (normalized) return normalized
    } catch (error) {
        console.warn("[NotesQuizAssistantResponseParser] Recovering partial structured response")
    }

    var candidates = []
    balancedObjects(clean).forEach(function(chunk) {
        try {
            var item = JSON.parse(chunk)
            if (item && (item.actionType || item.tipoAcao || item.acao
                || item.question || item.enunciado || item.pergunta)) candidates.push(item)
        } catch (error) {
            // Incomplete chunks are ignored; only complete JSON actions can be reviewed safely.
        }
    })
    var normalizedActions = actionParser.normalizeResponse({ suggestedActions: candidates }, questions)
    var message = extractMessage(clean)
    if (!message && normalizedActions.actions.length > 0)
        message = qsTr("Recuperei sugestões estruturadas para você revisar.")
    if (!message && normalizedActions.actions.length === 0) return null
    normalizedActions.message = message
    return normalizedActions
}
