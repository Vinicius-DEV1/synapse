import QtQuick 2.15
import "../ui"
import "NotesQuizDiscussionPrompt.js" as DiscussionPrompt

Item {
    id: evaluatorRoot
    width: 0
    height: 0
    visible: false
    property var controller: null

    AiClient {
        id: aiClient
        dataController: evaluatorRoot.controller
    }

    function modelName() {
        return String(aiClient.getModel() || "gemini").replace(/^models\//, "")
    }

    function evaluate(batteryTitle, question, questionIndex, history, userMessage, callback) {
        var prompt = DiscussionPrompt.buildPrompt(
            batteryTitle,
            question,
            questionIndex,
            history,
            userMessage
        )
        aiClient.promptStructured("", prompt, function(success, response, errorMessage) {
            if (!success) {
                callback(false, "", errorMessage || qsTr("Falha ao conversar com a IA. Tente novamente."))
                return
            }
            var message = response && typeof response.message === "string" ? response.message.trim() : ""
            if (message.length === 0) {
                callback(false, "", qsTr("A IA não retornou uma mensagem válida. Tente novamente."))
                return
            }
            callback(true, message, "")
        })
    }
}
