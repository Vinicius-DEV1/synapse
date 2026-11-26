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
        property string lastBatteryId: ""
        property string lastQuestionId: ""

        function getBatteryQuestions(batteryId) {
            batteryQuestionCalls += 1
            lastBatteryId = batteryId
            return [{ id: "q-1", battery_id: batteryId, question: "Battery question" }]
        }

        function getQuizQuestion(questionId) {
            singleQuestionCalls += 1
            lastQuestionId = questionId
            return { id: questionId, question: "Single question" }
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
        mockController.lastBatteryId = ""
        mockController.lastQuestionId = ""
    }

    function test_batterySessionLoadsOnlyItsQuestions() {
        const questions = QuestionSession.loadQuestions(mockController, "battery-42", "")

        compare(mockController.batteryQuestionCalls, 1)
        compare(mockController.lastBatteryId, "battery-42")
        compare(mockController.singleQuestionCalls, 0)
        compare(mockController.globalQuestionCalls, 0)
        compare(questions.length, 1)
        compare(questions[0].id, "q-1")
    }

    function test_legacySingleQuestionSessionLoadsByQuestionId() {
        const questions = QuestionSession.loadQuestions(mockController, "", "question-7")

        compare(mockController.batteryQuestionCalls, 0)
        compare(mockController.singleQuestionCalls, 1)
        compare(mockController.lastQuestionId, "question-7")
        compare(mockController.globalQuestionCalls, 0)
        compare(questions.length, 1)
        compare(questions[0].id, "question-7")
    }

    function test_missingTargetDoesNotReadAnyQuestionList() {
        const questions = QuestionSession.loadQuestions(mockController, "", "")

        compare(mockController.batteryQuestionCalls, 0)
        compare(mockController.singleQuestionCalls, 0)
        compare(mockController.globalQuestionCalls, 0)
        compare(questions.length, 0)
    }
}
