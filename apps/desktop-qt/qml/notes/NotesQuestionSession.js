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

function toArray(value) {
    if (Array.isArray(value)) return value
    if (!value || typeof value.length !== "number") return []
    var result = []
    for (var i = 0; i < value.length; ++i) result.push(value[i])
    return result
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

function latestAttemptsByQuestion(controller, batteryId, questionId) {
    if (!controller || typeof controller.getLatestQuizAttempts !== "function") return ({})
    return controller.getLatestQuizAttempts(batteryId || "", questionId || "") || ({})
}

function applyLatestAttempt(question, attempt) {
    if (!attempt) return question
    var normalized = Object.assign({}, question)
    var feedback = attempt.ai_feedback || attempt.aiFeedback || null
    if (typeof feedback === "string") {
        try {
            feedback = JSON.parse(feedback)
        } catch (error) {
            console.warn("[NotesQuestionSession] Ignoring invalid saved quiz feedback JSON")
            feedback = null
        }
    }
    normalized.selectedIndex = attempt.selected_index !== undefined
        ? attempt.selected_index : (attempt.selectedIndex !== undefined ? attempt.selectedIndex : null)
    normalized.userTypedAnswer = String(attempt.user_typed_answer || attempt.userTypedAnswer || "")
    normalized.aiFeedback = feedback && typeof feedback === "object" ? feedback : null
    normalized.isCorrect = Boolean(attempt.is_correct !== undefined ? attempt.is_correct : attempt.isCorrect)
    normalized.answered = true
    normalized.showExplanation = true
    return normalized
}

function loadQuestions(controller, batteryId, questionId) {
    if (controller && batteryId && typeof controller.getBatteryQuestions === "function") {
        var batteryQuestions = toArray(controller.getBatteryQuestions(batteryId))
        var latestByQuestion = latestAttemptsByQuestion(controller, batteryId, "")
        return batteryQuestions.map(function(question) {
            var normalized = normalizeQuestion(question)
            if (!normalized) return null
            return applyLatestAttempt(normalized, latestByQuestion[normalized.id])
        }).filter(function(question) { return question !== null })
    }
    if (controller && questionId && typeof controller.getQuizQuestion === "function") {
        var question = controller.getQuizQuestion(questionId)
        var normalizedQuestion = normalizeQuestion(question)
        if (!normalizedQuestion || !normalizedQuestion.id) return []
        var latestByQuestion = latestAttemptsByQuestion(controller, "", questionId)
        return [applyLatestAttempt(normalizedQuestion, latestByQuestion[normalizedQuestion.id])]
    }
    return []
}
