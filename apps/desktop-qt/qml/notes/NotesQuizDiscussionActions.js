.pragma library

function replaceMessageActions(root, messageIndex, actionIds, status, error) {
    var history = root.chatHistory.slice()
    var message = Object.assign({}, history[messageIndex])
    message.actions = (message.actions || []).map(function(action) {
        if (actionIds.indexOf(String(action.id)) < 0) return action
        var updated = Object.assign({}, action)
        updated.status = status
        updated.applyError = error || ""
        return updated
    })
    history[messageIndex] = message
    root.chatHistory = history
}

function applyActions(root, messageIndex, requestedIds) {
    if (root.isApplying || !root.evaluator || typeof root.evaluator.applyActions !== "function") return
    var message = root.chatHistory[messageIndex]
    if (!message) return
    var ids = (message.actions || []).filter(function(action) {
        return requestedIds.indexOf(String(action.id)) >= 0 && action.status === "pending" && action.valid !== false
    }).map(function(action) { return String(action.id) })
    if (ids.length === 0) return
    var actions = (message.actions || []).filter(function(action) { return ids.indexOf(String(action.id)) >= 0 })
    root.isApplying = true
    root.evaluator.applyActions(root.batteryId, actions, function(success, questions, failure) {
        root.isApplying = false
        if (!root.isOpen) return
        if (!success) {
            replaceMessageActions(root, messageIndex, ids, "pending",
                failure || qsTr("Não foi possível aplicar. Tente novamente."))
            return
        }
        var currentId = String(root.question && (root.question.id || root.question.questionId) || "")
        replaceMessageActions(root, messageIndex, ids, "accepted", "")
        root.questions = Array.isArray(questions) ? questions : root.questions
        var currentIndex = root.questions.findIndex(function(question) {
            return String(question && (question.id || question.questionId) || "") === currentId
        })
        if (currentIndex < 0) currentIndex = Math.min(root.questionIndex, Math.max(0, root.questions.length - 1))
        if (root.questions.length > 0) {
            root.questionIndex = currentIndex
            root.question = root.questions[currentIndex]
        }
        root.questionsUpdated(root.questions)
    })
}

function applyAll(root, messageIndex) {
    var message = root.chatHistory[messageIndex]
    if (!message) return
    var ids = (message.actions || []).filter(function(action) {
        return action.status === "pending" && action.valid !== false
    }).map(function(action) { return String(action.id) })
    applyActions(root, messageIndex, ids)
}

function rejectActions(root, messageIndex, requestedIds) {
    var message = root.chatHistory[messageIndex]
    if (!message) return
    var ids = (message.actions || []).filter(function(action) {
        return requestedIds.indexOf(String(action.id)) >= 0 && action.status === "pending"
    }).map(function(action) { return String(action.id) })
    if (ids.length > 0) replaceMessageActions(root, messageIndex, ids, "rejected", "")
}

function rejectAll(root, messageIndex) {
    var message = root.chatHistory[messageIndex]
    if (!message) return
    rejectActions(root, messageIndex, (message.actions || []).map(function(action) { return String(action.id) }))
}
