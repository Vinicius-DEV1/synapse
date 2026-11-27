.pragma library

var sessions = ({})

function load(sessionId) {
    var messages = sessions[String(sessionId || "")]
    return Array.isArray(messages) ? messages.slice() : []
}

function save(sessionId, messages) {
    if (!sessionId || !Array.isArray(messages)) return
    sessions[String(sessionId)] = messages.slice()
}

function clear(sessionId) {
    if (sessionId) delete sessions[String(sessionId)]
}
