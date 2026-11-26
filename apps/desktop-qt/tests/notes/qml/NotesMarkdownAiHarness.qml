import QtQuick 2.15
import "../../../qml/notes" as Notes

Item {
    id: harness
    width: 920
    height: 680

    property string capturedSystemPrompt: ""
    property string capturedUserPrompt: ""
    property var capturedHistory: []
    property var pendingCallback: null
    property int abortCount: 0
    property string appliedBatteryId: ""
    property var appliedActions: []
    property bool failQuestionInsert: false

    QtObject {
        id: fakeAiClient
        function promptText(systemPrompt, userPrompt, history, callback) {
            harness.capturedSystemPrompt = systemPrompt
            harness.capturedUserPrompt = userPrompt
            harness.capturedHistory = history
            harness.pendingCallback = callback
            return { abort: function() { harness.abortCount++ } }
        }
    }

    QtObject {
        id: fakeController
        function getQuizBatteries() {
            return [
                { id: "battery-history", title: "History Review", page_id: "page-history", page_title: "History" },
                { id: "battery-science", title: "Science Review", page_id: "page-science", page_title: "Science" }
            ]
        }
        function getBatteryQuestions(batteryId) {
            if (batteryId !== "battery-history") return []
            var questions = [{ id: "existing-1", type: "multiple_choice", question: "What is already covered?", options: '["A", "B"]', correct_index: 1, explanation: "Existing explanation" }]
            if (!harness.failQuestionInsert && harness.appliedBatteryId === batteryId) {
                harness.appliedActions.forEach(function(action, index) {
                    questions.push({ id: "created-" + index, type: action.type, question: action.question,
                                     options: action.options, correct_index: action.correctIndex,
                                     expected_answer: action.expectedAnswer, explanation: action.explanation })
                })
            }
            return questions
        }
        function applyQuizAssistantActions(batteryId, actions) {
            harness.appliedBatteryId = batteryId
            harness.appliedActions = actions
            return harness.failQuestionInsert ? { success: false, error: "Battery could not be updated." } : { success: true }
        }
    }

    Notes.NotesMarkdownAiModal {
        objectName: "notesMarkdownAiModal"
        anchors.fill: parent
        aiClient: fakeAiClient
        controller: fakeController
    }

    function resolveRequest(success, response, error) {
        if (pendingCallback) pendingCallback(success, response, error)
    }
}
