import QtQuick
import QtTest
import "../../../qml/questions" as Questions
import "../../../qml/notes" as Notes
import "../../../qml/notes/NotesOpenAnswerEvaluation.js" as OpenAnswerEvaluation
import "../../../qml/notes/NotesOpenAnswerSession.js" as OpenAnswerSession

TestCase {
    id: testCase
    name: "NotesOpenAnswerFlow"
    when: windowShown
    width: 980
    height: 720

    property var quizModal: null
    property var questions: []

    QtObject {
        id: mockEvaluator
        property int calls: 0
        property string lastQuestion: ""
        property string lastExpectedAnswer: ""
        property string lastUserAnswer: ""
        property bool autoComplete: true
        property bool nextSuccess: true
        property var nextEvaluation: ({
            verdict: "Correto",
            feedback: "A resposta explica o conceito principal.",
            model: "gemini-flash-latest"
        })
        property var pendingCallback: null
        property var pendingCallbacks: []

        function evaluate(question, expectedAnswer, userAnswer, callback) {
            calls += 1
            lastQuestion = question
            lastExpectedAnswer = expectedAnswer
            lastUserAnswer = userAnswer
            pendingCallback = callback
            pendingCallbacks.push(callback)
            if (autoComplete) callback(nextSuccess, nextSuccess ? nextEvaluation : null, nextSuccess ? "" : "Gemini offline")
        }

        function finishPending(index) {
            var callback = index === undefined ? pendingCallback : pendingCallbacks[index]
            if (callback) callback(nextSuccess, nextSuccess ? nextEvaluation : null, nextSuccess ? "" : "Gemini offline")
        }
    }

    QtObject {
        id: mockController
        property int saveCalls: 0
        property bool failNextSave: false
        property string lastAnswer: ""
        property string lastVerdict: ""

        function recordOpenQuizAttempt(batteryId, questionId, answer, verdict, feedback, model) {
            saveCalls += 1
            lastAnswer = answer
            lastVerdict = verdict
            if (failNextSave) {
                failNextSave = false
                return ({})
            }
            return { id: "attempt-" + saveCalls, battery_id: batteryId, question_id: questionId }
        }
    }

    Component {
        id: modalComponent
        Questions.QuizSequentialFocusModal {
            enableNotesOpenAnswerEvaluation: true
            notesController: mockController
            openAnswerEvaluator: mockEvaluator
        }
    }

    Component {
        id: genericModalComponent
        Questions.QuizSequentialFocusModal {}
    }

    Component {
        id: evaluatorComponent
        Notes.NotesOpenAnswerEvaluator {
            controller: mockController
        }
    }

    SignalSpy {
        id: mcAttemptSpy
        target: testCase.quizModal
        signalName: "recordAttemptRequested"
    }

    function openQuestion(questionId, questionText) {
        return {
            id: questionId,
            battery_id: "battery-notes",
            type: "open",
            prompt: questionText === "Explain this idea" ? "Explain **this** idea" : questionText,
            question: questionText,
            expectedAnswer: "A full reference answer",
            explanation: "A detailed **concept** explanation.",
            correctIndex: -1,
            options: []
        }
    }

    function init() {
        mockEvaluator.calls = 0
        mockEvaluator.lastQuestion = ""
        mockEvaluator.lastExpectedAnswer = ""
        mockEvaluator.lastUserAnswer = ""
        mockEvaluator.autoComplete = true
        mockEvaluator.nextSuccess = true
        mockEvaluator.pendingCallback = null
        mockEvaluator.pendingCallbacks = []
        mockEvaluator.nextEvaluation = {
            verdict: "Correto",
            feedback: "A resposta explica o conceito principal.",
            model: "gemini-flash-latest"
        }
        mockController.saveCalls = 0
        mockController.failNextSave = false
        mockController.lastAnswer = ""
        mockController.lastVerdict = ""
        questions = [openQuestion("open-1", "Explain this idea")]
        quizModal = createTemporaryObject(modalComponent, testCase)
        verify(quizModal !== null)
        quizModal.startQuiz("battery-notes", "Notes battery", questions)
        mcAttemptSpy.clear()
    }

    function findVisualChild(parentItem, targetName) {
        if (!parentItem || !parentItem.children) return null
        for (var index = 0; index < parentItem.children.length; ++index) {
            var child = parentItem.children[index]
            if (child.objectName === targetName) return child
            var nested = findVisualChild(child, targetName)
            if (nested) return nested
        }
        return null
    }

    function test_evaluationPersistsTypedAnswerAndFeedback() {
        OpenAnswerSession.setAnswer(quizModal, "My response")
        quizModal.handleConfirmOrNext()

        compare(mockEvaluator.calls, 1)
        compare(mockEvaluator.lastQuestion, "Explain this idea")
        compare(mockEvaluator.lastExpectedAnswer, "A full reference answer")
        compare(mockEvaluator.lastUserAnswer, "My response")
        compare(mockController.saveCalls, 1)
        compare(mockController.lastAnswer, "My response")
        compare(mockController.lastVerdict, "Correto")
        compare(quizModal.currentQuestion.userTypedAnswer, "My response")
        compare(quizModal.currentQuestion.aiFeedback.feedback, "A resposta explica o conceito principal.")
        compare(quizModal.isConfirmed, true)
        compare(quizModal.answeredCount, 1)
        compare(quizModal.score, 1)
        compare(mcAttemptSpy.count, 0)

        var feedbackCard = findVisualChild(quizModal, "notesOpenAnswerFeedback")
        verify(feedbackCard !== null)
        compare(quizModal.currentOpenAnswerFeedback.verdict, "Correto")
        var referenceAnswer = findVisualChild(quizModal, "notesOpenAnswerReferenceAnswer")
        verify(referenceAnswer !== null)
        var explanationPanel = findVisualChild(quizModal, "notesOpenAnswerExplanationPanel")
        verify(explanationPanel !== null)
        compare(referenceAnswer.parent, explanationPanel.children[0])
        var explanationText = findChild(quizModal, "notesOpenAnswerDetailedExplanation")
        verify(explanationText !== null)
        compare(explanationText.textFormat, Text.MarkdownText)
        var questionPrompt = findChild(quizModal, "notesSequentialQuestionPrompt")
        verify(questionPrompt !== null)
        compare(questionPrompt.textFormat, Text.MarkdownText)
        var questionCard = findVisualChild(quizModal, "quizSequentialCard")
        verify(questionCard !== null)
        compare(questionCard.openAnswerEvaluationEnabled, true)
        compare(questionCard.isOpenAnswer, true)
        compare(questionCard.showExplanation, true)
        compare(referenceAnswer.hasAnswer, true)
        compare(referenceAnswer.answerText, "A full reference answer")
    }

    function test_altGShortcutAndInlineGabaritoControlShareExplanationState() {
        var plainShortcut = findChild(quizModal, "notesOpenAnswerPlainGExplanationShortcut")
        verify(plainShortcut !== null)
        compare(plainShortcut.sequence, "G")
        quizModal.openAnswerInputFocused = false
        compare(quizModal.enableNotesOpenAnswerEvaluation, true)
        compare(quizModal.isCompleted, false)
        compare(quizModal.discussionDialogOpen, false)
        compare(quizModal.openAnswerInputFocused, false)
        compare(quizModal.notesPlainGShortcutEnabled, true)
        quizModal.openAnswerInputFocused = true
        compare(quizModal.notesPlainGShortcutEnabled, false)
        quizModal.openAnswerInputFocused = false

        OpenAnswerSession.setAnswer(quizModal, "My response")
        quizModal.handleConfirmOrNext()

        compare(quizModal.showExplanation, true)
        var shortcut = findChild(quizModal, "notesOpenAnswerExplanationShortcut")
        verify(shortcut !== null)
        compare(shortcut.sequences.length, 2)
        compare(String(shortcut.sequences[0]), "Alt+G")
        compare(String(shortcut.sequences[1]), "Ctrl+G")
        var toggleButton = findChild(quizModal, "notesOpenAnswerExplanationButton")
        verify(toggleButton !== null)
        compare(toggleButton.text, "Ocultar Gabarito")
        quizModal.toggleExplanation()
        tryCompare(quizModal, "showExplanation", false)
        compare(toggleButton.text, "Gabarito")

        var referenceAnswer = findVisualChild(quizModal, "notesOpenAnswerReferenceAnswer")
        var explanationPanel = findVisualChild(quizModal, "notesOpenAnswerExplanationPanel")
        compare(explanationPanel.visible, false)
        compare(referenceAnswer.visible, false)
    }

    function test_providerFailureKeepsAnswerAndAllowsRetry() {
        mockEvaluator.nextSuccess = false
        OpenAnswerSession.setAnswer(quizModal, "Keep this answer")
        quizModal.handleConfirmOrNext()

        compare(quizModal.openAnswer, "Keep this answer")
        compare(quizModal.isConfirmed, false)
        compare(mockController.saveCalls, 0)
        compare(quizModal.currentOpenAnswerError, "Gemini offline")

        mockEvaluator.nextSuccess = true
        quizModal.handleConfirmOrNext()
        compare(mockEvaluator.calls, 2)
        compare(mockController.saveCalls, 1)
        compare(quizModal.isConfirmed, true)
    }

    function test_failedPersistenceRetriesWithoutCallingProviderAgain() {
        mockController.failNextSave = true
        OpenAnswerSession.setAnswer(quizModal, "Response to save")
        quizModal.handleConfirmOrNext()
        compare(mockEvaluator.calls, 1)
        compare(mockController.saveCalls, 1)
        compare(quizModal.isConfirmed, false)
        compare(quizModal.currentOpenAnswerFeedback.verdict, "Correto")

        quizModal.handleConfirmOrNext()
        compare(mockEvaluator.calls, 1)
        compare(mockController.saveCalls, 2)
        compare(quizModal.isConfirmed, true)
    }

    function test_answerDraftSurvivesQuestionNavigation() {
        questions = [openQuestion("open-1", "First"), openQuestion("open-2", "Second")]
        quizModal.startQuiz("battery-notes", "Notes battery", questions)
        OpenAnswerSession.setAnswer(quizModal, "First response")
        quizModal.goToQuestion(1)
        OpenAnswerSession.setAnswer(quizModal, "Second response")
        quizModal.goToQuestion(0)
        compare(quizModal.openAnswer, "First response")
        quizModal.goToQuestion(1)
        compare(quizModal.openAnswer, "Second response")
    }

    function test_evaluationsForDifferentQuestionsCanFinishOutOfOrder() {
        questions = [openQuestion("open-1", "First"), openQuestion("open-2", "Second")]
        quizModal.startQuiz("battery-notes", "Notes battery", questions)
        mockEvaluator.autoComplete = false

        OpenAnswerSession.setAnswer(quizModal, "First response")
        quizModal.handleConfirmOrNext()
        quizModal.goToQuestion(1)
        OpenAnswerSession.setAnswer(quizModal, "Second response")
        quizModal.handleConfirmOrNext()

        compare(mockEvaluator.calls, 2)
        compare(quizModal.currentQuestionIsEvaluating, true)
        mockEvaluator.finishPending(0)
        compare(mockController.saveCalls, 1)
        compare(quizModal.answeredQuestions[0], true)
        compare(quizModal.currentQuestionIsEvaluating, true)
        mockEvaluator.finishPending(1)
        compare(mockController.saveCalls, 2)
        compare(quizModal.answeredQuestions[1], true)
        compare(quizModal.currentQuestionIsEvaluating, false)
        compare(quizModal.answeredCount, 2)
    }

    function test_missingEvaluatorDoesNotLeaveQuestionBusy() {
        quizModal.openAnswerEvaluator = null
        OpenAnswerSession.setAnswer(quizModal, "Response without a service")
        quizModal.handleConfirmOrNext()
        compare(quizModal.currentQuestionIsEvaluating, false)
        verify(quizModal.currentOpenAnswerError.length > 0)
    }

    function test_nonNotesFocusKeepsItsExistingTransientAnswerBehavior() {
        var genericModal = createTemporaryObject(genericModalComponent, testCase)
        verify(genericModal !== null)
        genericModal.startQuiz("other-battery", "Other battery", [openQuestion("other-open", "Other question")])
        OpenAnswerSession.handleInput(genericModal, "Transient answer")
        compare(genericModal.openAnswer, "Transient answer")
        compare(Object.keys(genericModal.openAnswersByQuestion).length, 0)
        OpenAnswerSession.handleFocus(genericModal, true)
        compare(genericModal.openAnswerInputFocused, false)
        genericModal.goToQuestion(0)
        compare(genericModal.openAnswer, "")
    }

    function test_verdictParsingMatchesReactPrecedence() {
        compare(OpenAnswerEvaluation.parseEvaluation({ verdict: "Incorreto", feedback: "Not correct" }, "model").verdict, "Incorreto")
        compare(OpenAnswerEvaluation.parseEvaluation({ verdict: "Parcialmente correto", feedback: "Almost" }, "model").verdict, "Parcial")
        compare(OpenAnswerEvaluation.parseEvaluation({ verdict: "Correct", feedback: "Right" }, "model").verdict, "Correto")
        compare(OpenAnswerEvaluation.parseEvaluation({ verdict: "wrong answer", feedback: "No" }, "model").verdict, "Incorreto")
    }

    function test_notesEvaluatorAdapterLoadsAsANativeComponent() {
        var evaluator = createTemporaryObject(evaluatorComponent, testCase)
        verify(evaluator !== null)
        verify(typeof evaluator.evaluate === "function")
        compare(evaluator.width, 0)
        compare(evaluator.visible, false)
    }

    function test_referenceAnswerComponentDisplaysModelAnswer() {
        var reference = createTemporaryObject(referenceAnswerComponent, testCase)
        verify(reference !== null)
        reference.answerText = "A model response with the key concept."
        compare(reference.answerText, "A model response with the key concept.")
        verify(reference.implicitHeight > 28)
    }

    Component {
        id: referenceAnswerComponent
        Notes.NotesOpenAnswerReferenceAnswer {}
    }

    function test_startRestoresLatestOpenAttempt() {
        quizModal.startQuiz("battery-notes", "Notes battery", [{
            id: "open-1",
            battery_id: "battery-notes",
            type: "open",
            prompt: "Explain this idea",
            question: "Explain this idea",
            expectedAnswer: "A full reference answer",
            userTypedAnswer: "Previously saved response",
            aiFeedback: { verdict: "Parcial", feedback: "Add one detail", model: "Gemini" },
            answered: true,
            isCorrect: false,
            selectedIndex: null
        }])

        compare(quizModal.openAnswer, "Previously saved response")
        compare(quizModal.currentOpenAnswerFeedback.verdict, "Parcial")
        compare(quizModal.currentOpenAnswerFeedback.feedback, "Add one detail")
        compare(quizModal.isConfirmed, true)
        compare(quizModal.answeredCount, 1)
        compare(quizModal.score, 0)
    }

    function test_lateEvaluationIsIgnoredAfterSessionCloses() {
        mockEvaluator.autoComplete = false
        OpenAnswerSession.setAnswer(quizModal, "Pending response")
        quizModal.handleConfirmOrNext()
        compare(mockEvaluator.calls, 1)
        OpenAnswerSession.close(quizModal)
        mockEvaluator.finishPending()
        compare(mockController.saveCalls, 0)
        compare(quizModal.visible, false)
    }
}
