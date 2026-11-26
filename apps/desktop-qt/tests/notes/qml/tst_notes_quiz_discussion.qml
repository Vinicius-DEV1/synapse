import QtQuick
import QtTest
import "../../../qml/notes" as Notes
import "../../../qml/notes/NotesQuizDiscussionPrompt.js" as DiscussionPrompt

TestCase {
    id: testCase
    name: "NotesQuizDiscussion"
    when: windowShown
    width: 980
    height: 720

    property var dialog: null

    QtObject {
        id: mockEvaluator
        property int calls: 0
        property bool autoComplete: true
        property bool nextSuccess: true
        property string nextReply: "Vamos revisar o conceito passo a passo."
        property string lastTitle: ""
        property string lastUserMessage: ""
        property var lastQuestion: null
        property var lastHistory: []
        property var pendingCallback: null

        function modelName() { return "gemini-flash-test" }

        function evaluate(title, question, index, history, userMessage, callback) {
            calls++
            lastTitle = title
            lastQuestion = question
            lastHistory = history
            lastUserMessage = userMessage
            pendingCallback = callback
            if (autoComplete) callback(nextSuccess, nextSuccess ? nextReply : "", nextSuccess ? "" : "Provider offline")
        }
    }

    Component {
        id: dialogComponent
        Notes.NotesQuizDiscussionDialog { evaluator: mockEvaluator }
    }

    SignalSpy {
        id: closeSpy
        target: testCase.dialog
        signalName: "closeRequested"
    }

    function questionFixture() {
        return {
            id: "question-1",
            type: "open",
            question: "Explain active recall",
            userTypedAnswer: "It means remembering without looking.",
            expectedAnswer: "Retrieval practice strengthens memory.",
            aiFeedback: { verdict: "Parcial", feedback: "Inclua a ideia de recuperação ativa." }
        }
    }

    function init() {
        mockEvaluator.calls = 0
        mockEvaluator.autoComplete = true
        mockEvaluator.nextSuccess = true
        mockEvaluator.nextReply = "Vamos revisar o conceito passo a passo."
        mockEvaluator.pendingCallback = null
        dialog = createTemporaryObject(dialogComponent, testCase)
        verify(dialog !== null)
        closeSpy.clear()
    }

    function test_openSendsQuestionAnswerEvaluationAndReferenceContext() {
        dialog.openForQuestion("Biologia", questionFixture(), 0)

        compare(mockEvaluator.calls, 1)
        compare(mockEvaluator.lastTitle, "Biologia")
        compare(mockEvaluator.lastUserMessage.indexOf("Explain active recall") >= 0, true)
        compare(mockEvaluator.lastUserMessage.indexOf("It means remembering without looking.") >= 0, true)
        compare(mockEvaluator.lastUserMessage.indexOf("Parcial") >= 0, true)
        compare(mockEvaluator.lastUserMessage.indexOf("Retrieval practice strengthens memory.") >= 0, true)
        compare(dialog.chatHistory.length, 2)
        compare(dialog.chatHistory[0].role, "user")
        compare(dialog.chatHistory[1].text, mockEvaluator.nextReply)
        compare(dialog.activeModel, "gemini-flash-test")
        verify(dialog.isOpen)
    }

    function test_followUpUsesHistoryAndClearStartsFreshConversation() {
        dialog.openForQuestion("Biologia", questionFixture(), 0)
        dialog.sendMessage("Pode dar outro exemplo?")

        compare(mockEvaluator.calls, 2)
        compare(mockEvaluator.lastUserMessage, "Pode dar outro exemplo?")
        compare(mockEvaluator.lastHistory.length, 3)
        compare(dialog.chatHistory.length, 4)

        dialog.clearHistory()
        compare(dialog.chatHistory.length, 0)
        dialog.sendMessage("Explique de novo")
        compare(mockEvaluator.calls, 3)
        compare(mockEvaluator.lastHistory.length, 1)
    }

    function test_providerFailureAddsRetryableErrorMessage() {
        mockEvaluator.nextSuccess = false
        dialog.openForQuestion("Biologia", questionFixture(), 0)

        compare(mockEvaluator.calls, 1)
        compare(dialog.isSending, false)
        compare(dialog.chatHistory.length, 2)
        verify(dialog.chatHistory[1].text.indexOf("Provider offline") >= 0)
        compare(dialog.errorText, "Provider offline")
    }

    function test_promptMatchesReactChoiceAndOptionalReferenceContext() {
        var prompt = DiscussionPrompt.initialDiscussionMessage({
            question: "Choose one",
            options: ["First choice", "Second choice"],
            selectedIndex: 1,
            aiFeedback: { verdict: "Correto", feedback: "Boa escolha." }
        }, 2)

        verify(prompt.indexOf("Questão 3") >= 0)
        verify(prompt.indexOf("Second choice") >= 0)
        verify(prompt.indexOf("Gabarito de referência") < 0)
    }

    function test_dismissalInvalidatesPendingResponseAndNotifiesHost() {
        mockEvaluator.autoComplete = false
        dialog.openForQuestion("Biologia", questionFixture(), 0)
        var pending = mockEvaluator.pendingCallback
        var priorLength = dialog.chatHistory.length
        dialog.requestClose()
        pending(true, "late reply", "")

        compare(dialog.isOpen, false)
        compare(dialog.isSending, false)
        compare(dialog.chatHistory.length, priorLength)
        compare(closeSpy.count, 1)
    }

    function test_endingFocusSessionClearsChatContext() {
        dialog.openForQuestion("Biologia", questionFixture(), 0)
        verify(dialog.chatHistory.length > 0)
        dialog.closeSession()

        verify(!dialog.isOpen)
        compare(dialog.chatHistory.length, 0)
        compare(dialog.question, null)
    }
}
