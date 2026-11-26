import QtQuick
import QtTest
import "../../../qml/notes" as Notes
import "../../../qml/notes/NotesQuizDiscussionPrompt.js" as DiscussionPrompt
import "../../../qml/notes/NotesQuizDiscussionActionParser.js" as ActionParser
import "../../../qml/notes/NotesQuizAssistantPrompt.js" as AssistantPrompt
import "../../../qml/notes/NotesQuizAssistantSession.js" as AssistantSession
import "../../../qml/notes/NotesQuizAssistantResponseParser.js" as ResponseParser

TestCase {
    id: testCase
    name: "NotesQuizDiscussion"
    when: windowShown
    width: 980
    height: 720

    property var dialog: null
    property var discussionEvaluator: null

    QtObject {
        id: mockController
        property int actionCalls: 0
        property string lastBatteryId: ""
        property var lastCoreActions: []
        property bool nextCoreSuccess: true
        function getConfig(key, fallback) { return fallback }
        function applyQuizAssistantActions(batteryId, actions) {
            actionCalls++
            lastBatteryId = batteryId
            lastCoreActions = actions
            return nextCoreSuccess ? ({ success: true }) : ({ success: false, error: "Core failure" })
        }
        function getBatteryQuestions(batteryId) {
            return [{ id: "refreshed", question: "Updated from Core", type: "open" }]
        }
        function getLatestQuizAttempts(batteryId, questionId) { return ({}) }
    }

    QtObject {
        id: mockEvaluator
        property int calls: 0
        property bool autoComplete: true
        property bool nextSuccess: true
        property bool nextApplySuccess: true
        property string nextReply: "Vamos revisar o conceito passo a passo."
        property var nextActions: []
        property var lastAppliedActions: []
        property int applyCalls: 0
        property string lastTitle: ""
        property string lastUserMessage: ""
        property var lastQuestion: null
        property var lastHistory: []
        property var pendingCallback: null

        function modelName() { return "gemini-flash-test" }

        function evaluate(title, question, index, questions, history, userMessage, callback, progressCallback) {
            calls++
            lastTitle = title
            lastQuestion = question
            lastQuestions = questions
            lastHistory = history
            lastUserMessage = userMessage
            pendingCallback = callback
            if (progressCallback) progressCallback("generating", modelName())
            if (autoComplete) callback(nextSuccess, nextSuccess
                ? ({ message: nextReply, actions: nextActions, validationSummary: "" })
                : null, nextSuccess ? "" : "Provider offline")
        }

        property var lastQuestions: []

        function applyActions(batteryId, actions, callback) {
            applyCalls++
            lastAppliedActions = actions
            callback(nextApplySuccess, lastQuestions, nextApplySuccess ? "" : "Core rejected batch")
        }
    }

    Component {
        id: dialogComponent
        Notes.NotesQuizDiscussionDialog { evaluator: mockEvaluator }
    }

    Component {
        id: evaluatorComponent
        Notes.NotesQuizDiscussionEvaluator { controller: mockController }
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
        mockEvaluator.nextActions = []
        mockEvaluator.applyCalls = 0
        mockEvaluator.nextApplySuccess = true
        mockEvaluator.pendingCallback = null
        dialog = createTemporaryObject(dialogComponent, testCase)
        discussionEvaluator = createTemporaryObject(evaluatorComponent, testCase)
        verify(dialog !== null)
        verify(discussionEvaluator !== null)
        mockController.actionCalls = 0
        mockController.nextCoreSuccess = true
        closeSpy.clear()
    }

    function test_openSendsQuestionAnswerEvaluationAndReferenceContext() {
        dialog.openForQuestion("Biologia", "battery-1", questionFixture(), 0, [questionFixture()])

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
        dialog.openForQuestion("Biologia", "battery-1", questionFixture(), 0, [questionFixture()])
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
        dialog.openForQuestion("Biologia", "battery-1", questionFixture(), 0, [questionFixture()])

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
        dialog.openForQuestion("Biologia", "battery-1", questionFixture(), 0, [questionFixture()])
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
        dialog.openForQuestion("Biologia", "battery-1", questionFixture(), 0, [questionFixture()])
        verify(dialog.chatHistory.length > 0)
        dialog.closeSession()

        verify(!dialog.isOpen)
        compare(dialog.chatHistory.length, 0)
        compare(dialog.question, null)
    }

    function test_actionParserMapsStableTargetsAndRejectsInvalidSuggestions() {
        var questions = [
            { id: "q-one", type: "open", question: "First" },
            { id: "q-two", type: "multiple_choice", question: "Second", options: ["A", "B"] }
        ]
        var parsed = ActionParser.normalizeResponse({
            message: "Propostas",
            suggestedActions: [
                { actionType: "create", type: "multiple_choice", question: "Third", options: ["X", "Y"], correctIndex: 1 },
                { actionType: "edit", targetQuestionIndex: 2, changes: { question: "Improved" } },
                { actionType: "delete", targetQuestionIndex: 1, reason: "Duplicate" },
                { actionType: "reorder", order: [2, 1] },
                { actionType: "reorder", order: [2] },
                { actionType: "edit", targetQuestionIndex: 9, changes: { question: "Outside" } },
                { actionType: "create", type: "multiple_choice", question: "Broken", options: ["Only one"], correctIndex: 5 }
            ]
        }, questions)

        compare(parsed.actions.length, 6)
        compare(parsed.actions[1].targetQuestionId, "q-two")
        compare(parsed.actions[2].targetQuestionId, "q-one")
        compare(parsed.actions[3].order.join(","), "q-two,q-one")
        compare(parsed.actions[3].orderLabels.join(","), "Second,First")
        compare(parsed.actions[4].valid, false)
        compare(parsed.actions[4].validationError.indexOf("todas as questões") >= 0, true)
        compare(parsed.actions[5].valid, false)
    }

    function test_proposalAcceptPersistsAndRefreshesQuestions() {
        mockEvaluator.nextActions = [{ id: "create-1", actionType: "create", status: "pending", valid: true, question: "New", type: "open" }]
        dialog.openForQuestion("Biologia", "battery-1", questionFixture(), 0, [questionFixture()])

        dialog.applyActions(1, ["create-1"])

        compare(mockEvaluator.applyCalls, 1)
        compare(mockEvaluator.lastAppliedActions.length, 1)
        compare(dialog.chatHistory[1].actions[0].status, "accepted")
        compare(dialog.questions.length, 1)
    }

    function test_rejectedProposalHasNoPersistenceSideEffect() {
        mockEvaluator.nextActions = [{ id: "delete-1", actionType: "delete", status: "pending", valid: true }]
        dialog.openForQuestion("Biologia", "battery-1", questionFixture(), 0, [questionFixture()])

        dialog.rejectActions(1, ["delete-1"])

        compare(mockEvaluator.applyCalls, 0)
        compare(dialog.chatHistory[1].actions[0].status, "rejected")
    }

    function test_applyAllUsesOneBatchAndFailureLeavesActionsRetryable() {
        mockEvaluator.nextActions = [
            { id: "a1", actionType: "create", status: "pending", valid: true },
            { id: "a2", actionType: "edit", status: "pending", valid: true }
        ]
        mockEvaluator.nextApplySuccess = false
        dialog.openForQuestion("Biologia", "battery-1", questionFixture(), 0, [questionFixture()])

        dialog.applyAll(1)

        compare(mockEvaluator.applyCalls, 1)
        compare(mockEvaluator.lastAppliedActions.length, 2)
        compare(dialog.chatHistory[1].actions[0].status, "pending")
        compare(dialog.chatHistory[1].actions[0].applyError, "Core rejected batch")
        mockEvaluator.nextApplySuccess = true
        dialog.applyAll(1)
        compare(mockEvaluator.applyCalls, 2)
        compare(dialog.chatHistory[1].actions[1].status, "accepted")
    }

    function test_assistantPromptUsesCoreActionContractAndApprovalBoundary() {
        var prompt = AssistantPrompt.buildAssistantPrompt([], [questionFixture()], "Crie uma questão", "Biologia", "")
        verify(prompt.indexOf('"suggestedActions"') >= 0)
        verify(prompt.indexOf("targetQuestionIndex") >= 0)
        verify(prompt.indexOf("requires the learner's approval") >= 0)
    }

    function test_questionRefreshPreservesCurrentQuestionAndAnswersAcrossReorder() {
        var state = {
            questions: [{ id: "q-one" }, { id: "q-two", type: "open", userTypedAnswer: "Draft" }],
            currentIndex: 1,
            selectedAnswers: [1, -1],
            answeredQuestions: [true, false],
            openFeedbackByQuestion: ({}),
            openAnswersByQuestion: ({ "q-two": "Draft" })
        }

        AssistantSession.replaceQuestions(state, [
            { id: "q-two", type: "open", userTypedAnswer: "Draft" },
            { id: "q-one", type: "multiple_choice", correctIndex: 1 },
            { id: "q-three", type: "open" }
        ])

        compare(state.currentIndex, 0)
        compare(state.questions[state.currentIndex].id, "q-two")
        compare(state.openAnswer, "Draft")
        compare(state.selectedAnswers.join(","), "-1,1,-1")
        compare(state.answeredQuestions.join(","), "false,true,false")
    }

    function test_parserIgnoresMalformedAndEmptySuggestionPayloads() {
        var missing = ActionParser.normalizeResponse({ message: "Texto" }, [questionFixture()])
        var malformed = ActionParser.normalizeResponse({ suggestedActions: "not-an-array" }, [questionFixture()])

        compare(missing.actions.length, 0)
        compare(malformed.actions.length, 0)
        compare(malformed.message, "")
    }

    function test_responseParserRecoversCompleteActionFromTruncatedJson() {
        var raw = '{"message":"Sugestões para revisar","suggestedActions":[{"actionType":"create","type":"open","question":"What is recall?","expectedAnswer":"Retrieving learned information"},'
        var recovered = ResponseParser.parse(raw, [], ActionParser)

        compare(recovered.message, "Sugestões para revisar")
        compare(recovered.actions.length, 1)
        compare(recovered.actions[0].question, "What is recall?")
        compare(ResponseParser.parseJson('{"validatedQuestions":[{"question":"Checked"}]}').validatedQuestions.length, 1)
    }

    function test_dualValidationMergesApprovedQuestionButPreservesOriginalOnInvalidResponse() {
        var actions = ActionParser.normalizeResponse({
            suggestedActions: [
                { actionType: "create", type: "multiple_choice", question: "Invalid", options: ["One"], correctIndex: 0 },
                { actionType: "create", type: "multiple_choice", question: "Original", options: ["A", "B"], correctIndex: 0 }
            ]
        }, []).actions
        var validated = ActionParser.applyValidationResult(actions, {
            validatedQuestions: [{ type: "multiple_choice", question: "Verified", options: ["A", "B"],
                correctIndex: 1, factCheckVerdict: "corrected" }], validatedModel: "model-check"
        })

        compare(validated[0].valid, false)
        compare(validated[0].question, "Invalid")
        compare(validated[1].question, "Verified")
        compare(validated[1].correctIndex, 1)
        compare(validated[1].factCheckVerdict, "corrected")
        compare(validated[1].validatedByModel, "model-check")
    }

    function test_nativeEvaluatorDelegatesAcceptedActionsToCoreAndReloadsBattery() {
        var result = null
        discussionEvaluator.applyActions("battery-native", [
            { actionType: "create", type: "open", question: "Added", options: [], correctIndex: -1,
                expectedAnswer: "Answer", explanation: "Why", tags: [] }
        ], function(success, questions, error) {
            result = { success: success, questions: questions, error: error }
        })

        compare(mockController.actionCalls, 1)
        compare(mockController.lastBatteryId, "battery-native")
        compare(mockController.lastCoreActions[0].question, "Added")
        compare(result.success, true)
        compare(result.questions[0].prompt, "Updated from Core")
    }

    function test_nativeEvaluatorReturnsCoreFailureWithoutReloading() {
        mockController.nextCoreSuccess = false
        var result = null
        discussionEvaluator.applyActions("battery-native", [
            { actionType: "delete", targetQuestionId: "q1" }
        ], function(success, questions, error) {
            result = { success: success, questions: questions, error: error }
        })

        compare(result.success, false)
        compare(result.error, "Core failure")
        compare(result.questions.length, 0)
    }
}
