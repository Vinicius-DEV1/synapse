import QtQuick 2.15
import "../ui"
import "NotesQuizAssistantPrompt.js" as AssistantPrompt
import "NotesQuizDiscussionActionParser.js" as ActionParser
import "NotesQuizAssistantResponseParser.js" as ResponseParser
import "NotesQuestionSession.js" as QuestionSession

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

    function evaluate(batteryTitle, question, questionIndex, questions, history, userMessage, callback, progressCallback) {
        if (progressCallback) progressCallback("generating", modelName())
        var prompt = AssistantPrompt.buildAssistantPrompt(history, questions, userMessage, batteryTitle, "")
        aiClient.promptText("", prompt, [], function(success, responseText, errorMessage) {
            if (!success) {
                callback(false, null, errorMessage || qsTr("Falha ao conversar com a IA. Tente novamente."))
                return
            }
            var result = ResponseParser.parse(responseText, questions, ActionParser)
            if (!result) {
                callback(false, null, qsTr("A IA não retornou uma estrutura válida. Tente novamente."))
                return
            }
            if (!result.message && result.actions.length > 0)
                result.message = qsTr("Preparei sugestões para esta bateria. Revise cada uma antes de aplicar.")
            if (!result.message) {
                callback(false, null, qsTr("A IA não retornou uma mensagem válida. Tente novamente."))
                return
            }
            validateCreateActions(result, userMessage, batteryTitle, callback, progressCallback)
        })
    }

    function validateCreateActions(result, userMessage, batteryTitle, callback, progressCallback) {
        var creates = result.actions.filter(function(action) {
            return action.actionType === "create" && action.valid
        })
        var validationEnabled = !controller || typeof controller.getConfig !== "function"
            || String(controller.getConfig("quiz_dual_ai_validation", "true")) !== "false"
        if (!validationEnabled || creates.length === 0) {
            callback(true, result, "")
            return
        }
        if (progressCallback) progressCallback("validating", modelName())
        aiClient.promptText("", AssistantPrompt.buildValidationPrompt(creates, userMessage, batteryTitle), [],
            function(success, validationText, errorMessage) {
                if (success) {
                    var validation = ResponseParser.parseJson(validationText)
                    if (!validation) success = false
                }
                if (success) {
                    validation.validatedModel = modelName()
                    result.actions = ActionParser.applyValidationResult(result.actions, validation)
                    result.validationSummary = validation && validation.validationSummary
                        ? String(validation.validationSummary) : result.validationSummary
                } else {
                    result.validationSummary = qsTr("A revisão adicional não foi concluída. As sugestões originais continuam disponíveis para revisão.")
                    console.warn("[NotesQuizDiscussionEvaluator] Assistant validation failed: " + String(errorMessage || "unknown error"))
                }
                callback(true, result, "")
            })
    }

    function applyActions(batteryId, actions, callback) {
        if (!controller || typeof controller.applyQuizAssistantActions !== "function") {
            callback(false, [], qsTr("A aplicação nativa de sugestões não está disponível."))
            return
        }
        var result = controller.applyQuizAssistantActions(batteryId, ActionParser.toCoreActions(actions))
        if (!result || !result.success) {
            callback(false, [], result && result.error ? String(result.error) : qsTr("Não foi possível salvar as sugestões."))
            return
        }
        callback(true, QuestionSession.loadQuestions(controller, batteryId, ""), "")
    }
}
