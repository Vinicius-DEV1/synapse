.pragma library

function parseOptions(value) {
    if (Array.isArray(value)) return value
    if (typeof value !== "string" || value.trim().length === 0) return []
    try {
        var parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
    } catch (error) {
        console.warn("[NotesQuestionSession] Ignoring invalid question options JSON")
        return []
    }
}

function normalizeQuestion(question) {
    if (!question || typeof question !== "object") return null
    var normalized = Object.assign({}, question)
    var rawCorrectIndex = question.correctIndex !== undefined
        ? question.correctIndex : question.correct_index
    var numericCorrectIndex = Number(rawCorrectIndex)
    normalized.prompt = String(question.prompt || question.question || "")
    normalized.question = normalized.prompt
    normalized.options = parseOptions(question.options)
    normalized.correctIndex = Number.isInteger(numericCorrectIndex) ? numericCorrectIndex : -1
    normalized.expectedAnswer = String(question.expectedAnswer || question.expected_answer || "")
    normalized.explanation = String(question.explanation || "")
    normalized.type = String(question.type || "multiple_choice")
    return normalized
}

function loadQuestions(controller, batteryId, questionId) {
    if (controller && batteryId && typeof controller.getBatteryQuestions === "function") {
        var batteryQuestions = controller.getBatteryQuestions(batteryId) || []
        return batteryQuestions.map(normalizeQuestion).filter(function(question) { return question !== null })
    }
    if (controller && questionId && typeof controller.getQuizQuestion === "function") {
        var question = controller.getQuizQuestion(questionId)
        var normalizedQuestion = normalizeQuestion(question)
        return normalizedQuestion && normalizedQuestion.id ? [normalizedQuestion] : []
    }
    return []
}
