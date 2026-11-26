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

    Notes.NotesMarkdownAiModal {
        objectName: "notesMarkdownAiModal"
        anchors.fill: parent
        aiClient: fakeAiClient
    }

    function resolveRequest(success, response, error) {
        if (pendingCallback) pendingCallback(success, response, error)
    }
}
