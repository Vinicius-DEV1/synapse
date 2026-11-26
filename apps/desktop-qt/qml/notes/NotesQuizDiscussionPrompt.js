.pragma library

function questionContext(question, index) {
    var currentQuestion = question || {}
    var type = currentQuestion.type === "open" ? "Questão aberta" : "Múltipla escolha"
    var parts = ["Questão " + (index + 1) + " (" + type + "):", String(currentQuestion.question || currentQuestion.prompt || "")]
    if (Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0) {
        parts.push("Alternativas: " + currentQuestion.options.join(" | "))
    }
    if (currentQuestion.expectedAnswer || currentQuestion.expected_answer) {
        parts.push("Gabarito de referência: " + (currentQuestion.expectedAnswer || currentQuestion.expected_answer))
    }
    if (currentQuestion.explanation) parts.push("Explicação: " + currentQuestion.explanation)
    if (currentQuestion.userTypedAnswer || currentQuestion.user_typed_answer) {
        parts.push("Resposta do estudante: " + (currentQuestion.userTypedAnswer || currentQuestion.user_typed_answer))
    }
    var feedback = currentQuestion.aiFeedback || currentQuestion.ai_feedback
    if (feedback) {
        parts.push("Avaliação da IA (" + (feedback.verdict || "") + "): " + (feedback.feedback || ""))
    }
    return parts.join("\n")
}

function initialDiscussionMessage(question, index) {
    var currentQuestion = question || {}
    var tag = "Questão " + (index + 1)
    var selected = currentQuestion.selectedIndex
    var selectedOption = Number.isInteger(selected) && selected >= 0
        && Array.isArray(currentQuestion.options) ? currentQuestion.options[selected] : ""
    var answer = currentQuestion.userTypedAnswer || selectedOption || ""
    var expected = currentQuestion.expectedAnswer || currentQuestion.expected_answer || ""
    var reference = expected ? "\nGabarito de referência: \"" + expected + "\"" : ""
    return `Olá! Gostaria de tirar dúvidas e aprofundar meu entendimento sobre a ${tag}:
"${currentQuestion.question || currentQuestion.prompt || ""}"

Minha resposta:
"${answer}"

Avaliação da IA (${currentQuestion.aiFeedback && currentQuestion.aiFeedback.verdict || "Resultado"}):
"${currentQuestion.aiFeedback && currentQuestion.aiFeedback.feedback || ""}"${reference}

Poderia me explicar detalhadamente os conceitos envolvidos, onde posso melhorar e me dar dicas práticas para fixar o aprendizado?`
}

function buildPrompt(batteryTitle, question, questionIndex, history, userMessage) {
    var historyItems = history || []
    var latest = historyItems.length > 0 ? historyItems[historyItems.length - 1] : null
    if (latest && latest.role === "user" && latest.text === userMessage) {
        historyItems = historyItems.slice(0, -1)
    }
    var conversation = historyItems.slice(-10).map(function(message) {
        return (message.role === "user" ? "Estudante: " : "Assistente: ") + message.text
    }).join("\n")
    return `You are the study assistant inside Synapse's question focus mode. Help the student understand the selected exercise and its evaluation in a friendly, accurate, didactic way. Respond in the natural language used by the student and question. Use markdown when useful. Do not claim that a question or answer was changed.

Exercise battery: "${batteryTitle || "Bateria de Exercícios"}"
${questionContext(question, questionIndex)}

Conversation history:
${conversation || "(no previous messages)"}

New student message:
"${userMessage}"

Return exactly one JSON object with this schema:
{"message":"Your helpful response to the student"}
Return raw JSON only, without markdown fences.`
}
