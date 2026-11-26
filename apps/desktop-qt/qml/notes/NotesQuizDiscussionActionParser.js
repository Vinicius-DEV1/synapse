.pragma library

function actionType(value) {
    var type = String(value || "").toLowerCase()
    if (type === "create" || type.indexOf("cria") >= 0) return "create"
    if (type === "edit" || type.indexOf("edit") >= 0 || type.indexOf("alter") >= 0) return "edit"
    if (type === "delete" || type.indexOf("delet") >= 0 || type.indexOf("excl") >= 0 || type.indexOf("remov") >= 0) return "delete"
    if (type === "reorder" || type.indexOf("reorden") >= 0 || type.indexOf("orden") >= 0) return "reorder"
    return ""
}

function questionType(value) {
    var type = String(value || "").toLowerCase()
    return type === "open" || type.indexOf("abert") >= 0 || type.indexOf("dissert") >= 0
        ? "open" : "multiple_choice"
}

function textValue(source, keys, fallback) {
    for (var i = 0; i < keys.length; ++i) {
        var value = source ? source[keys[i]] : undefined
        if (typeof value === "string") return value
    }
    return fallback || ""
}

function stringArray(value) {
    if (!Array.isArray(value)) return []
    return value.map(function(item) { return typeof item === "string" ? item : String(item || "") })
}

function correctIndex(value) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value)
    var raw = String(value || "").trim().toUpperCase()
    if (!raw) return -1
    var letter = ["A", "B", "C", "D", "E"].indexOf(raw)
    if (letter >= 0) return letter
    if (!/^\d+$/.test(raw)) return -1
    var parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : -1
}

function targetIndex(source, count) {
    var raw = source.targetQuestionIndex !== undefined ? source.targetQuestionIndex
            : source.indiceQuestao !== undefined ? source.indiceQuestao
            : source.targetIndex !== undefined ? source.targetIndex : source.indice
    if (raw === undefined || raw === null || String(raw).trim().length === 0) return -1
    var value = Number(raw)
    if (!Number.isFinite(value)) return -1
    value = Math.floor(value)
    if (value >= 1 && value <= count) return value - 1
    if (value === 0 && count > 0) return 0
    return -1
}

function normalizeChanges(raw, target) {
    var source = raw && typeof raw === "object" ? raw : ({})
    var changes = ({})
    var question = textValue(source, ["question", "enunciado", "pergunta", "texto"], "")
    if (question) changes.question = question
    var type = source.type !== undefined || source.tipo !== undefined
        ? questionType(source.type !== undefined ? source.type : source.tipo) : ""
    if (type) changes.type = type
    var options = source.options !== undefined ? source.options
                : source.opcoes !== undefined ? source.opcoes : source.alternativas
    if (options !== undefined) changes.options = stringArray(options)
    var correct = source.correctIndex !== undefined ? source.correctIndex
                : source.correta !== undefined ? source.correta
                : source.indiceCorreto !== undefined ? source.indiceCorreto : source.gabarito
    if (correct !== undefined) changes.correctIndex = correctIndex(correct)
    var answer = textValue(source, ["expectedAnswer", "respostaEsperada", "gabaritoEsperado", "resposta"], "")
    if (answer) changes.expectedAnswer = answer
    var explanation = textValue(source, ["explanation", "explicacao", "justificativa", "comentario"], "")
    if (explanation) changes.explanation = explanation
    var tags = source.tags !== undefined ? source.tags : source.etiquetas
    if (tags !== undefined) changes.tags = stringArray(tags)
    if (target && Object.keys(changes).length === 0) return null
    return changes
}

function normalizeAction(raw, actionIndex, questions) {
    if (!raw || typeof raw !== "object") return null
    var type = actionType(raw.actionType || raw.tipoAcao || raw.acao)
    if (!type) return null
    var action = {
        id: "assistant_action_" + Date.now() + "_" + actionIndex,
        actionType: type,
        status: "pending",
        reason: textValue(raw, ["reason", "motivo"], ""),
        factCheckVerdict: String(raw.factCheckVerdict || ""),
        validatedByModel: String(raw.validatedByModel || ""),
        valid: true,
        validationError: ""
    }
    if (type === "create") {
        var source = raw.changes && typeof raw.changes === "object" ? raw.changes : raw
        var fields = normalizeChanges(source, false) || ({})
        action.question = textValue(source, ["question", "enunciado", "pergunta", "texto"], "")
        action.type = questionType(source.type || source.tipo)
        action.options = stringArray(source.options !== undefined ? source.options
            : source.opcoes !== undefined ? source.opcoes : source.alternativas)
        action.correctIndex = correctIndex(source.correctIndex !== undefined ? source.correctIndex
            : source.correta !== undefined ? source.correta : source.indiceCorreto)
        action.expectedAnswer = fields.expectedAnswer || ""
        action.explanation = fields.explanation || ""
        action.tags = fields.tags || []
        if (action.type === "open") action.options = []
        if (!action.question.trim()) invalidate(action, "A sugestão não contém enunciado.")
        if (action.type === "multiple_choice" && (action.options.length < 2
            || action.options.some(function(option) { return !option.trim() })
            || action.correctIndex < 0 || action.correctIndex >= action.options.length)) {
            invalidate(action, "A questão de múltipla escolha precisa de alternativas válidas e gabarito.")
        }
        return action
    }
    if (type === "edit" || type === "delete") {
        var index = targetIndex(raw, questions.length)
        if (index < 0 || !questions[index] || !questions[index].id) return null
        action.targetQuestionIndex = index
        action.targetQuestionId = String(questions[index].id)
        action.targetQuestionText = String(questions[index].question || questions[index].prompt || "")
        action.targetQuestionType = String(questions[index].type || "multiple_choice")
        action.targetQuestionCorrectIndex = Number(questions[index].correctIndex !== undefined
            ? questions[index].correctIndex : questions[index].correct_index)
        if (type === "edit") {
            var changesSource = raw.changes || raw.alteracoes || raw.modificacoes || raw
            action.changes = normalizeChanges(changesSource, true)
            if (!action.changes) invalidate(action, "A sugestão de edição não contém alterações reconhecidas.")
            if (action.changes && action.changes.options && action.changes.options.length > 0
                && (action.changes.options.length < 2 || action.changes.options.some(function(option) { return !option.trim() }))) {
                invalidate(action, "As alternativas sugeridas estão incompletas.")
            }
            if (action.changes && action.changes.type === "multiple_choice"
                && action.targetQuestionType === "open" && !action.changes.options) {
                invalidate(action, "A conversão para múltipla escolha precisa sugerir alternativas.")
            }
            var resultingType = action.changes && action.changes.type || action.targetQuestionType
            var resultingOptions = action.changes && action.changes.options || questions[index].options || []
            var resultingCorrectIndex = action.changes && action.changes.correctIndex !== undefined
                ? action.changes.correctIndex : Number(questions[index].correctIndex)
            if (resultingType === "multiple_choice" && action.changes
                && (action.changes.options || action.changes.type === "multiple_choice")
                && (resultingOptions.length < 2 || resultingCorrectIndex < 0
                    || resultingCorrectIndex >= resultingOptions.length)) {
                invalidate(action, "A edição precisa manter alternativas e gabarito válidos.")
            }
        }
        return action
    }

    var order = raw.order !== undefined ? raw.order
              : raw.ordem !== undefined ? raw.ordem
              : raw.sequencia !== undefined ? raw.sequencia : raw.indices
    if (!Array.isArray(order) || order.length === 0) return null
    action.order = []
    action.orderLabels = []
    for (var position = 0; position < order.length; ++position) {
        var number = Number(order[position])
        if (!Number.isFinite(number)) return null
        number = Math.floor(number)
        var questionIndex = number >= 1 && number <= questions.length ? number - 1 : number
        if (questionIndex < 0 || questionIndex >= questions.length || !questions[questionIndex].id) return null
        var id = String(questions[questionIndex].id)
        if (action.order.indexOf(id) < 0) {
            action.order.push(id)
            action.orderLabels.push(String(questions[questionIndex].question || questions[questionIndex].prompt || id))
        }
    }
    if (action.order.length === 0) return null
    if (action.order.length !== questions.length)
        invalidate(action, "A reordenação precisa incluir todas as questões da bateria.")
    return action
}

function invalidate(action, message) {
    action.valid = false
    action.validationError = message
}

function normalizeResponse(response, questions) {
    if (!response || typeof response !== "object") return null
    var rawActions = Array.isArray(response.suggestedActions) ? response.suggestedActions
                   : Array.isArray(response.acoesSugeridas) ? response.acoesSugeridas : []
    var actions = []
    rawActions.forEach(function(raw, index) {
        var normalized = normalizeAction(raw, index, questions || [])
        if (normalized) actions.push(normalized)
    })
    return {
        message: typeof response.message === "string" ? response.message.trim() : "",
        actions: actions,
        validationSummary: typeof response.validationSummary === "string" ? response.validationSummary
            : typeof response.resumoValidacao === "string" ? response.resumoValidacao : ""
    }
}

function toCoreActions(actions) {
    return (actions || []).map(function(action) {
        if (action.actionType === "create") {
            return {
                actionType: "create", type: action.type, question: action.question,
                options: action.options, correctIndex: action.correctIndex,
                expectedAnswer: action.expectedAnswer, explanation: action.explanation, tags: action.tags
            }
        }
        if (action.actionType === "edit") {
            return { actionType: "edit", targetQuestionId: action.targetQuestionId, changes: action.changes }
        }
        if (action.actionType === "delete") {
            return { actionType: "delete", targetQuestionId: action.targetQuestionId }
        }
        return { actionType: "reorder", order: action.order }
    })
}

function applyValidationResult(actions, validation) {
    var validated = validation && Array.isArray(validation.validatedQuestions)
        ? validation.validatedQuestions : Array.isArray(validation) ? validation : []
    if (validated.length === 0) return actions
    var nextCreate = 0
    return actions.map(function(action) {
        if (action.actionType !== "create" || action.valid === false) return action
        var result = validated[nextCreate++]
        if (!result || typeof result !== "object") return action
        var normalized = normalizeAction(Object.assign({ actionType: "create" }, result), nextCreate, [])
        if (!normalized || !normalized.valid) return action
        action.type = normalized.type
        action.question = normalized.question || action.question
        action.options = normalized.type === "open" ? [] : normalized.options
        action.correctIndex = normalized.correctIndex
        action.expectedAnswer = normalized.expectedAnswer || action.expectedAnswer
        action.explanation = normalized.explanation || action.explanation
        var verdict = String(result.factCheckVerdict || "").toLowerCase()
        var improvement = String(result.improvements || "").toLowerCase()
        var hasImprovements = improvement.length > 0 && improvement.indexOf("sem inconsistências") < 0
            && improvement.indexOf("no inconsistencies") < 0
        action.factCheckVerdict = verdict === "corrected" || hasImprovements ? "corrected" : "approved"
        action.validatedByModel = String(result.validatedByModel || validation.validatedModel || "")
        return action
    })
}
