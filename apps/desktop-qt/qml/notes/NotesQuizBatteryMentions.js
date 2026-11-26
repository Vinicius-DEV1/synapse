.pragma library

.import "NotesQuestionSession.js" as QuestionSession

function normalizeBatteries(raw, currentBatteryId) {
    var currentId = String(currentBatteryId || "")
    return QuestionSession.toArray(raw).map(function(item) {
        var battery = item || ({})
        return {
            id: String(battery.id || ""),
            title: String(battery.title || qsTr("Bateria sem título")),
            description: String(battery.description || ""),
            pageId: String(battery.pageId || battery.page_id || ""),
            pageTitle: String(battery.pageTitle || battery.page_title || ""),
            questionCount: Number(battery.questionCount !== undefined
                ? battery.questionCount : battery.question_count) || 0
        }
    }).filter(function(item) {
        return item.id.length > 0 && item.id !== currentId && item.pageId.length > 0
    })
}

function filterBatteries(batteries, query, attached) {
    var search = String(query || "").trim().toLowerCase()
    var attachedIds = (attached || []).map(function(item) { return String(item.id) })
    return (batteries || []).filter(function(item) {
        if (attachedIds.indexOf(String(item.id)) >= 0) return false
        return !search || item.title.toLowerCase().indexOf(search) >= 0
            || item.pageTitle.toLowerCase().indexOf(search) >= 0
    }).slice(0, 8)
}

function mentionQuery(text) {
    var match = /(?:^|\s)@([^\s@]*)$/.exec(String(text || ""))
    return match ? match[1] : null
}

function removeMention(text) {
    return String(text || "").replace(/(?:^|\s)@([^\s@]*)$/, " ").replace(/^\s+/, "")
}

function attachBattery(controller, battery) {
    var questions = QuestionSession.loadQuestions(controller, String(battery.id || ""), "")
    return {
        id: String(battery.id || ""),
        title: String(battery.title || ""),
        description: String(battery.description || ""),
        pageId: String(battery.pageId || battery.page_id || ""),
        pageTitle: String(battery.pageTitle || battery.page_title || ""),
        questionCount: questions.length,
        questions: questions
    }
}
