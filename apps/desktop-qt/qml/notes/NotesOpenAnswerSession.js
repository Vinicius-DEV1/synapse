.pragma library

function questionKey(question, index) {
    if (!question) return "index:" + index
    return String(question.id || question.questionId || "index:" + index)
}

function setQuestionValue(source, key, value) {
    var updated = Object.assign({}, source)
    updated[key] = value
    return updated
}

function reset(root) {
    root.evaluationSessionToken++
    root.openAnswersByQuestion = ({})
    root.openFeedbackByQuestion = ({})
    root.evaluationErrorsByQuestion = ({})
    root.evaluatingByQuestion = ({})
    root.pendingEvaluationsByQuestion = ({})
}

function close(root) {
    root.evaluationSessionToken++
    root.sessionActive = false
    root.visible = false
    root.closed()
}

function restore(root) {
    var answers = ({})
    var feedback = ({})
    var selected = []
    var answered = []
    var score = 0
    for (var i = 0; i < root.questions.length; ++i) {
        var question = root.questions[i]
        var key = questionKey(question, i)
        if (question && question.userTypedAnswer) answers[key] = String(question.userTypedAnswer)
        if (question && question.aiFeedback) feedback[key] = question.aiFeedback
        if (question && question.answered) {
            answered[i] = true
            selected[i] = question.selectedIndex !== undefined && question.selectedIndex !== null
                ? Number(question.selectedIndex) : -1
            if (question.type === "open") {
                if (question.aiFeedback && question.aiFeedback.verdict === "Correto") score++
            } else if (selected[i] === Number(question.correctIndex)) {
                score++
            }
        }
    }
    root.openAnswersByQuestion = answers
    root.openFeedbackByQuestion = feedback
    root.selectedAnswers = selected
    root.answeredQuestions = answered
    root.selectedOption = selected.length > 0 && selected[0] >= 0 ? selected[0] : -1
    root.openAnswer = String(answers[questionKey(root.questions[0], 0)] || "")
    root.isConfirmed = answered.length > 0 && answered[0] === true
    root.showExplanation = root.isConfirmed
    root.score = score
}

function setAnswer(root, text) {
    root.openAnswer = String(text || "")
    if (!root.enableNotesOpenAnswerEvaluation) return
    if (!root.currentQuestion) return
    var key = questionKey(root.currentQuestion, root.currentIndex)
    var previousAnswer = root.openAnswersByQuestion[key] !== undefined
        ? String(root.openAnswersByQuestion[key]) : String(root.currentQuestion.userTypedAnswer || "")
    root.openAnswersByQuestion = setQuestionValue(root.openAnswersByQuestion, key, root.openAnswer)
    if (previousAnswer === root.openAnswer) return

    var pending = Object.assign({}, root.pendingEvaluationsByQuestion)
    delete pending[key]
    root.pendingEvaluationsByQuestion = pending
    var feedback = Object.assign({}, root.openFeedbackByQuestion)
    delete feedback[key]
    root.openFeedbackByQuestion = feedback
    var errors = Object.assign({}, root.evaluationErrorsByQuestion)
    delete errors[key]
    root.evaluationErrorsByQuestion = errors
    var updatedQuestions = root.questions.slice()
    updatedQuestions[root.currentIndex] = Object.assign({}, root.currentQuestion, {
        userTypedAnswer: root.openAnswer,
        answered: false,
        aiFeedback: null
    })
    root.questions = updatedQuestions
}

function handleInput(root, text) {
    if (root.enableNotesOpenAnswerEvaluation) {
        setAnswer(root, text)
    } else {
        root.openAnswer = String(text || "")
    }
}

function handleFocus(root, focused) {
    root.openAnswerInputFocused = root.enableNotesOpenAnswerEvaluation && Boolean(focused)
}

function persist(root, question, key, evaluation) {
    if (!root.notesController || typeof root.notesController.recordOpenQuizAttempt !== "function") {
        root.evaluationErrorsByQuestion = setQuestionValue(
            root.evaluationErrorsByQuestion,
            key,
            qsTr("Não foi possível salvar a avaliação no histórico. Tente novamente.")
        )
        return false
    }
    var answer = root.openAnswersByQuestion[key] || root.openAnswer
    var battery = String(question.batteryId || question.battery_id || root.batteryId || "")
    var questionId = String(question.id || question.questionId || "")
    var saved = root.notesController.recordOpenQuizAttempt(
        battery,
        questionId,
        answer,
        evaluation.verdict,
        evaluation.feedback,
        evaluation.model || ""
    )
    if (!saved || !saved.id) {
        root.evaluationErrorsByQuestion = setQuestionValue(
            root.evaluationErrorsByQuestion,
            key,
            qsTr("A avaliação terminou, mas não foi salva. Tente salvar novamente.")
        )
        return false
    }

    root.openFeedbackByQuestion = setQuestionValue(root.openFeedbackByQuestion, key, evaluation)
    var nextPending = Object.assign({}, root.pendingEvaluationsByQuestion)
    delete nextPending[key]
    root.pendingEvaluationsByQuestion = nextPending
    var nextErrors = Object.assign({}, root.evaluationErrorsByQuestion)
    delete nextErrors[key]
    root.evaluationErrorsByQuestion = nextErrors

    var questionIndex = -1
    for (var i = 0; i < root.questions.length; ++i) {
        if (questionKey(root.questions[i], i) === key) { questionIndex = i; break }
    }
    if (questionIndex >= 0) {
        var updatedQuestions = root.questions.slice()
        updatedQuestions[questionIndex] = Object.assign({}, root.questions[questionIndex], {
            userTypedAnswer: answer,
            aiFeedback: evaluation,
            answered: true,
            isCorrect: evaluation.verdict === "Correto",
            showExplanation: true
        })
        root.questions = updatedQuestions
        var answered = root.answeredQuestions.slice()
        answered[questionIndex] = true
        root.answeredQuestions = answered
        var selected = root.selectedAnswers.slice()
        selected[questionIndex] = -1
        root.selectedAnswers = selected
        if (evaluation.verdict === "Correto") root.score++
        if (questionIndex === root.currentIndex) {
            root.isConfirmed = true
            root.showExplanation = true
        }
    }
    return true
}

function evaluate(root) {
    if (!root.enableNotesOpenAnswerEvaluation || !root.currentQuestion || root.currentQuestion.type !== "open") return
    var key = questionKey(root.currentQuestion, root.currentIndex)
    if (root.evaluatingByQuestion[key]) return
    var answer = String(root.openAnswersByQuestion[key] || root.openAnswer || "").trim()
    if (answer.length === 0) return

    var pending = root.pendingEvaluationsByQuestion[key]
    if (pending) {
        persist(root, root.currentQuestion, key, pending)
        return
    }
    if (!root.openAnswerEvaluator || typeof root.openAnswerEvaluator.evaluate !== "function") {
        root.evaluationErrorsByQuestion = setQuestionValue(
            root.evaluationErrorsByQuestion,
            key,
            qsTr("O serviço de avaliação de respostas abertas está indisponível.")
        )
        return
    }

    var sessionToken = root.evaluationSessionToken
    var question = root.currentQuestion
    root.evaluatingByQuestion = setQuestionValue(root.evaluatingByQuestion, key, true)
    var errors = Object.assign({}, root.evaluationErrorsByQuestion)
    delete errors[key]
    root.evaluationErrorsByQuestion = errors
    root.openAnswerEvaluator.evaluate(
        String(question.question || question.prompt || qsTr("Questão sem enunciado")),
        String(question.expectedAnswer || question.expected_answer || qsTr("Gabarito não cadastrado")),
        answer,
        function(success, evaluation, errorMessage) {
            if (!root.sessionActive || sessionToken !== root.evaluationSessionToken) return
            var evaluating = Object.assign({}, root.evaluatingByQuestion)
            delete evaluating[key]
            root.evaluatingByQuestion = evaluating
            if (!success) {
                root.evaluationErrorsByQuestion = setQuestionValue(
                    root.evaluationErrorsByQuestion,
                    key,
                    errorMessage || qsTr("Falha ao avaliar a resposta. Tente novamente.")
                )
                return
            }
            if (!evaluation) {
                root.evaluationErrorsByQuestion = setQuestionValue(
                    root.evaluationErrorsByQuestion,
                    key,
                    qsTr("A IA não retornou uma avaliação válida. Tente novamente.")
                )
                return
            }
            root.pendingEvaluationsByQuestion = setQuestionValue(
                root.pendingEvaluationsByQuestion,
                key,
                evaluation
            )
            root.openFeedbackByQuestion = setQuestionValue(root.openFeedbackByQuestion, key, evaluation)
            persist(root, question, key, evaluation)
        }
    )
}
