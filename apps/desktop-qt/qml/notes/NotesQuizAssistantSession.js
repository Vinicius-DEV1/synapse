.pragma library

function questionId(question, index) {
    return String(question && (question.id || question.questionId) || "index:" + index)
}

function replaceQuestions(root, nextQuestions) {
    var previous = root.questions || []
    var selectedById = ({})
    var answeredById = ({})
    previous.forEach(function(question, index) {
        var id = questionId(question, index)
        selectedById[id] = index < root.selectedAnswers.length ? root.selectedAnswers[index] : -1
        answeredById[id] = index < root.answeredQuestions.length && root.answeredQuestions[index] === true
    })
    var activeId = questionId(previous[root.currentIndex], root.currentIndex)
    var next = Array.isArray(nextQuestions) ? nextQuestions.slice() : []
    root.questions = next
    var newIndex = next.findIndex(function(question, index) { return questionId(question, index) === activeId })
    if (newIndex < 0) newIndex = Math.min(root.currentIndex, Math.max(0, next.length - 1))
    root.currentIndex = newIndex
    root.selectedAnswers = next.map(function(question, index) {
        return selectedById[questionId(question, index)] !== undefined
            ? selectedById[questionId(question, index)] : -1
    })
    root.answeredQuestions = next.map(function(question, index) {
        return answeredById[questionId(question, index)] === true || Boolean(question && question.answered)
    })
    var score = 0
    next.forEach(function(question, index) {
        if (!root.answeredQuestions[index]) return
        if (question && question.type === "open") {
            var feedback = question.aiFeedback || root.openFeedbackByQuestion[questionId(question, index)]
            if (feedback && feedback.verdict === "Correto") score++
        } else if (Number(root.selectedAnswers[index]) === Number(question.correctIndex)) {
            score++
        }
    })
    root.score = score
    var current = next[newIndex]
    root.selectedOption = current && root.selectedAnswers[newIndex] >= 0 ? root.selectedAnswers[newIndex] : -1
    root.openAnswer = String((current && current.userTypedAnswer)
        || root.openAnswersByQuestion[questionId(current, newIndex)] || "")
    root.isConfirmed = Boolean(root.answeredQuestions[newIndex])
    root.showExplanation = root.isConfirmed
}
