import QtQuick
import QtTest
import "../../../qml/notes/NotesQuestionSession.js" as QuestionSession

TestCase {
    id: testCase
    name: "NotesQuestionSessionLoading"
    when: windowShown
    width: 640
    height: 360

    QtObject {
        id: mockController
        property int batteryQuestionCalls: 0
        property int singleQuestionCalls: 0
        property int globalQuestionCalls: 0
        property int latestAttemptCalls: 0
        property string lastBatteryId: ""
        property string lastQuestionId: ""
        property string lastAttemptBatteryId: ""
        property string lastAttemptQuestionId: ""
        property var latestAttempts: ({})

        function getBatteryQuestions(batteryId) {
            batteryQuestionCalls += 1
            lastBatteryId = batteryId
            return [{
                id: "q-1",
                battery_id: batteryId,
                type: "multiple_choice",
                question: "Battery question",
                options: '["Choice A", "Choice B"]',
                correct_index: 1,
                expected_answer: "A model answer",
                explanation: "A short explanation"
            }]
        }

        function getQuizQuestion(questionId) {
            singleQuestionCalls += 1
            lastQuestionId = questionId
            return {
                id: questionId,
                type: "open",
                question: "Single question",
                options: "[]",
                expected_answer: "The open answer key"
            }
        }

        function getLatestQuizAttempts(batteryId, questionId) {
            latestAttemptCalls += 1
            lastAttemptBatteryId = batteryId
            lastAttemptQuestionId = questionId
            return latestAttempts
        }

        function getAllQuizQuestions() {
            globalQuestionCalls += 1
            return [{ id: "unrelated", battery_id: "other-battery" }]
        }
    }

    function init() {
        mockController.batteryQuestionCalls = 0
        mockController.singleQuestionCalls = 0
        mockController.globalQuestionCalls = 0
        mockController.latestAttemptCalls = 0
        mockController.lastBatteryId = ""
        mockController.lastQuestionId = ""
        mockController.lastAttemptBatteryId = ""
        mockController.lastAttemptQuestionId = ""
        mockController.latestAttempts = {
            "q-1": {
                selected_index: 1,
                is_correct: true,
                user_typed_answer: "Saved response",
                ai_feedback: { verdict: "Correto", feedback: "Saved feedback", model: "Gemini" }
            },
            "question-7": {
                selected_index: null,
                is_correct: false,
                user_typed_answer: "Persisted open response",
                ai_feedback: { verdict: "Parcial", feedback: "Add one detail", model: "Gemini" }
            }
        }
    }

    function test_batterySessionLoadsOnlyItsQuestions() {
        const questions = QuestionSession.loadQuestions(mockController, "battery-42", "")

        compare(mockController.batteryQuestionCalls, 1)
        compare(mockController.lastBatteryId, "battery-42")
        compare(mockController.singleQuestionCalls, 0)
        compare(mockController.globalQuestionCalls, 0)
        compare(mockController.latestAttemptCalls, 1)
        compare(mockController.lastAttemptBatteryId, "battery-42")
        compare(mockController.lastAttemptQuestionId, "")
        compare(questions.length, 1)
        compare(questions[0].id, "q-1")
        compare(questions[0].prompt, "Battery question")
        compare(questions[0].options.length, 2)
        compare(questions[0].options[0], "Choice A")
        compare(questions[0].correctIndex, 1)
        compare(questions[0].expectedAnswer, "A model answer")
        compare(questions[0].explanation, "A short explanation")
        compare(questions[0].selectedIndex, 1)
        compare(questions[0].answered, true)
    }

    function test_legacySingleQuestionSessionLoadsByQuestionId() {
        const questions = QuestionSession.loadQuestions(mockController, "", "question-7")

        compare(mockController.batteryQuestionCalls, 0)
        compare(mockController.singleQuestionCalls, 1)
        compare(mockController.lastQuestionId, "question-7")
        compare(mockController.globalQuestionCalls, 0)
        compare(mockController.latestAttemptCalls, 1)
        compare(mockController.lastAttemptBatteryId, "")
        compare(mockController.lastAttemptQuestionId, "question-7")
        compare(questions.length, 1)
        compare(questions[0].id, "question-7")
        compare(questions[0].prompt, "Single question")
        compare(questions[0].type, "open")
        compare(questions[0].expectedAnswer, "The open answer key")
        compare(questions[0].userTypedAnswer, "Persisted open response")
        compare(questions[0].aiFeedback.verdict, "Parcial")
        compare(questions[0].aiFeedback.feedback, "Add one detail")
        compare(questions[0].answered, true)
    }

    function test_missingTargetDoesNotReadAnyQuestionList() {
        const questions = QuestionSession.loadQuestions(mockController, "", "")

        compare(mockController.batteryQuestionCalls, 0)
        compare(mockController.singleQuestionCalls, 0)
        compare(mockController.globalQuestionCalls, 0)
        compare(questions.length, 0)
    }

    function test_malformedOptionsFailClosed() {
        const question = QuestionSession.normalizeQuestion({
            id: "broken-options",
            question: "Question statement",
            options: "{invalid json"
        })

        compare(question.prompt, "Question statement")
        compare(question.options.length, 0)
    }
}
