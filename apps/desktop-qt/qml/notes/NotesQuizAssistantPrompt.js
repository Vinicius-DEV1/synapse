.pragma library

function questionText(question, index) {
    var item = question || ({})
    var type = item.type === "open" ? "Open-ended" : "Multiple Choice"
    var text = "Question " + (index + 1) + " [Index " + (index + 1) + "] (" + type + "): " + String(item.question || item.prompt || "")
    var options = Array.isArray(item.options) ? item.options : []
    if (item.type === "multiple_choice" && options.length) {
        var correct = Number(item.correctIndex !== undefined ? item.correctIndex : item.correct_index)
        text += "\nOptions: " + options.join(" | ") + " (Correct: " + (correct >= 0 ? options[correct] || "" : "") + ")"
    } else if (item.expectedAnswer || item.expected_answer) {
        text += "\nModel answer: " + String(item.expectedAnswer || item.expected_answer)
    }
    if (item.explanation) text += "\nExplanation: " + String(item.explanation)
    return text
}

function buildAssistantPrompt(history, questions, userMessage, title, description) {
    var list = Array.isArray(questions) ? questions : []
    var prompt = "You are Synapse's pedagogical quiz assistant. Respond in the student's language, warmly and accurately.\n\n"
    prompt += "Quiz battery: " + String(title || "Exercise battery") + "\n"
    if (description) prompt += "Guidelines: " + String(description) + "\n"
    prompt += "\nCurrent questions (" + list.length + "):\n"
    prompt += list.length ? list.map(questionText).join("\n\n") : "(This battery is empty.)"
    prompt += "\n\nRecent conversation:\n"
    prompt += (history || []).slice(-10).map(function(entry) {
        return (entry.role === "user" ? "User: " : "Assistant: ") + String(entry.text || "")
    }).join("\n") || "(none)"
    prompt += "\n\nNew user message: " + String(userMessage || "") + "\n\n"
    prompt += "You can propose concrete actions only when useful. Never state that an action was applied; it requires the learner's approval.\n"
    prompt += "Action types: create (new question), edit (targetQuestionIndex is 1-based; changes contains only changed fields), delete (1-based targetQuestionIndex and reason), reorder (order is a complete sequence of 1-based question indexes). Multiple actions may be combined. Avoid duplicate questions. Keep questions, options, answers, tags and explanations in the student's language. Multiple-choice questions require at least two non-empty options and a zero-based correctIndex. Open questions use expectedAnswer.\n\n"
    prompt += 'Return only JSON: {"message":"Helpful markdown response","suggestedActions":[{"actionType":"create","type":"multiple_choice","question":"...","options":["...","..."],"correctIndex":0,"explanation":"...","tags":[]},{"actionType":"create","type":"open","question":"...","expectedAnswer":"...","explanation":"...","tags":[]},{"actionType":"edit","targetQuestionIndex":1,"changes":{"question":"..."}},{"actionType":"delete","targetQuestionIndex":1,"reason":"..."},{"actionType":"reorder","order":[2,1],"reason":"..."}],"validationSummary":"optional"}'
    prompt += '\nThe suggestedActions field is optional and should be omitted when no concrete changes are proposed. Return raw JSON without markdown fences.'
    return prompt
}

function buildValidationPrompt(actions, userMessage, title) {
    var questions = (actions || []).filter(function(action) { return action.actionType === "create" })
    var payload = questions.map(function(action) {
        return { type: action.type, question: action.question, options: action.options,
            correctIndex: action.correctIndex, expectedAnswer: action.expectedAnswer,
            explanation: action.explanation }
    })
    return "Fact-check these proposed study questions. Correct factual errors, ambiguous wording, wrong keys and weak explanations. Preserve the student's language and intent. Do not invent unsupported facts.\nBattery: "
        + String(title || "") + "\nUser request: " + String(userMessage || "")
        + '\nReturn only JSON with {"validatedQuestions":[{"type":"multiple_choice","question":"...","options":["...","..."],"correctIndex":0,"expectedAnswer":"...","explanation":"...","factCheckVerdict":"approved|corrected","improvements":"..."}],"validationSummary":"..."}'
        + "\nCandidates: " + JSON.stringify(payload)
}
