.pragma library

function extract(rawResponse) {
    var response = String(rawResponse || "").trim()
    var blocks = []
    var blockRegex = /```([^\r\n]*)\r?\n([\s\S]*?)\r?\n```/g
    var match
    while ((match = blockRegex.exec(response)) !== null) {
        var language = String(match[1] || "").trim().toLowerCase()
        var block = { full: match[0], index: match.index, language: language, content: match[2] }
        if (language === "json" || language.length === 0) block.questions = parseQuestions(block.content)
        blocks.push(block)
    }

    var proposalBlock = null
    var questionBlock = null
    for (var i = 0; i < blocks.length; ++i) {
        var candidate = blocks[i]
        if (!proposalBlock && (candidate.language === "markdown" || candidate.language === "md")) proposalBlock = candidate
        else if (!questionBlock && candidate.questions && candidate.questions.length > 0) questionBlock = candidate
        else if (!proposalBlock && candidate.language.length === 0) proposalBlock = candidate
    }
    var proposal = proposalBlock ? proposalBlock.content : ""
    var questions = questionBlock ? questionBlock.questions : []
    if (!proposalBlock && !questionBlock) return { answer: response, proposal: "", generatedQuestions: [] }

    var answer = response
    if (proposalBlock) answer = answer.replace(proposalBlock.full, "")
    if (questionBlock) answer = answer.replace(questionBlock.full, "")
    answer = answer.trim()
    return {
        answer: answer || (questions.length > 0
            ? "Gerei " + questions.length + " questões fundamentadas no documento."
            : "A IA preparou uma proposta de atualização para o documento."),
        proposal: proposal,
        generatedQuestions: questions
    }
}

function parseQuestions(rawJson) {
    var parsed
    try { parsed = JSON.parse(String(rawJson || "")) } catch (error) { return [] }
    var list = Array.isArray(parsed) ? parsed : [parsed]
    var questions = []
    for (var i = 0; i < list.length && questions.length < 15; ++i) {
        var source = list[i]
        if (!source || typeof source !== "object") continue
        var question = String(source.question || "").trim()
        if (question.length === 0 || question.length > 1500) continue
        var type = source.type === "open" ? "open" : "multiple_choice"
        var options = Array.isArray(source.options)
            ? source.options.map(function(option) { return String(option).trim() }).filter(function(option) { return option.length > 0 }).slice(0, 6)
            : []
        var correctIndex = Number(source.correctIndex)
        var expectedAnswer = String(source.expectedAnswer || "").trim()
        if (type === "open" && expectedAnswer.length === 0) continue
        if (type === "multiple_choice" && (options.length < 2 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length)) continue
        questions.push({
            id: "document-ai-" + Date.now().toString(36) + "-" + i,
            type: type,
            question: question,
            options: type === "open" ? [] : options,
            correctIndex: type === "open" ? -1 : correctIndex,
            expectedAnswer: expectedAnswer,
            explanation: String(source.explanation || "").trim().slice(0, 4000),
            tags: Array.isArray(source.tags) ? source.tags.map(String).slice(0, 20) : [],
            selectedIndex: null,
            userTypedAnswer: "",
            aiFeedback: null,
            showExplanation: false,
            answered: false
        })
    }
    return questions
}
