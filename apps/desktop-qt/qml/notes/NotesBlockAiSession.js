.pragma library

var sessions = ({})
var configuredController = null
var configuredDatabasePath = ""
var storageKey = "notes_block_ai_sessions_v1"

function validMessages(value) {
    if (!Array.isArray(value)) return []
    return value.filter(function(message) {
        return message && (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string"
    }).map(function(message) {
        return { role: message.role, content: message.content }
    })
}

function configure(controller) {
    var databasePath = controller && controller.dbPath ? String(controller.dbPath) : ""
    if (controller === configuredController && databasePath === configuredDatabasePath) return
    configuredController = controller || null
    configuredDatabasePath = databasePath
    sessions = ({})
    if (!configuredController || typeof configuredController.getConfig !== "function") return

    try {
        var raw = configuredController.getConfig(storageKey, "{}")
        var parsed = JSON.parse(String(raw || "{}"))
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return
        Object.keys(parsed).forEach(function(sessionId) {
            var messages = validMessages(parsed[sessionId])
            if (messages.length > 0) sessions[sessionId] = messages
        })
    } catch (error) {
        console.warn("Could not restore Notes block AI conversations.", error)
    }
}

function persist() {
    if (!configuredController || typeof configuredController.setConfig !== "function") return false
    try {
        if (configuredController.setConfig(storageKey, JSON.stringify(sessions))) return true
        console.warn("Could not save Notes block AI conversations.")
    } catch (error) {
        console.warn("Could not save Notes block AI conversations.", error)
    }
    return false
}

function load(sessionId) {
    var messages = sessions[String(sessionId || "")]
    return Array.isArray(messages) ? messages.slice() : []
}

function save(sessionId, messages) {
    if (!sessionId || !Array.isArray(messages)) return
    sessions[String(sessionId)] = validMessages(messages)
    persist()
}

function clear(sessionId) {
    if (!sessionId) return
    delete sessions[String(sessionId)]
    persist()
}
