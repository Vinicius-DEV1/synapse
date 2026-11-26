import QtQuick 2.15
import "../ui"
import "NotesOpenAnswerEvaluation.js" as OpenAnswerEvaluation

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

    function evaluate(question, expectedAnswer, userAnswer, callback) {
        var prompt = OpenAnswerEvaluation.buildPrompt(question, expectedAnswer, userAnswer)
        aiClient.promptStructured("", prompt, function(success, result, errorMessage) {
            if (!success) {
                callback(false, null, errorMessage || qsTr("Falha ao avaliar a resposta. Tente novamente."))
                return
            }
            var evaluation = OpenAnswerEvaluation.parseEvaluation(result, aiClient.getModel())
            if (!evaluation) {
                callback(false, null, qsTr("A IA não retornou uma avaliação válida. Tente novamente."))
                return
            }
            callback(true, evaluation, "")
        })
    }
}
