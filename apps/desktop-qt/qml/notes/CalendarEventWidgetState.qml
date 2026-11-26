import QtQuick 2.15

QtObject {
    id: eventState

    property var controller: null
    property var blockData: ({})
    readonly property var attrs: blockData.attrs || ({})
    property string eventId: attrs["data-event-id"] || attrs["event-id"] || attrs["eventId"] || ""
    property string title: attrs["data-title"] || attrs["title"] || qsTr("Novo Evento")
    property string dateStr: attrs["data-date"] || attrs["data-start-date"] || attrs["dateStr"] || ""
    property string eventColor: attrs["data-color"] || attrs["color"] || "default"
    property string status: attrs["data-status"] || attrs["status"] || "pending"
    property string statusErrorMessage: ""
    property var eventRecord: ({})
    property bool eventLookupComplete: false
    property bool initializationComplete: false
    property double currentTimestamp: Date.now()
    readonly property int liveStartLeadMs: 15 * 60 * 1000
    readonly property int liveEndGraceMs: 60 * 60 * 1000
    readonly property int maxLiveTimerIntervalMs: 2147483647

    readonly property bool isCompleted: status === "completed"
    readonly property bool isMissingEvent: eventLookupComplete && eventId.length > 0 && !eventRecord.id
    readonly property bool hasLinkedEvent: eventId.length > 0 && !!eventRecord.id
    readonly property double eventStartTimestamp: Date.parse(String(eventRecord.start_date || ""))
    readonly property double nextLiveTransitionTimestamp: {
        if (!Number.isFinite(eventStartTimestamp) || isCompleted || isMissingEvent) return 0
        var liveStart = eventStartTimestamp - liveStartLeadMs
        var liveEnd = eventStartTimestamp + liveEndGraceMs
        if (currentTimestamp < liveStart) return liveStart
        if (currentTimestamp <= liveEnd) return liveEnd
        return 0
    }
    readonly property bool isLive: !isCompleted && !isMissingEvent &&
        Number.isFinite(eventStartTimestamp) && currentTimestamp >= eventStartTimestamp - liveStartLeadMs &&
        currentTimestamp <= eventStartTimestamp + liveEndGraceMs
    readonly property bool hasCustomColor: eventColor.length > 0 &&
        eventColor !== "default" && eventColor.toLowerCase() !== "#8b5cf6"

    signal attrsUpdated(var newAttrs)
    signal removeRequested()

    function syncFromCore() {
        var c = eventState.controller
        if (!eventId || !c || typeof c.getCalendarEvent !== "function") {
            eventLookupComplete = !!eventId
            eventRecord = ({})
            return
        }
        var found = c.getCalendarEvent(eventId)
        if (found && found.id) {
            title = found.title || title
            dateStr = String(found.start_date || dateStr)
            status = found.status || (found.completed ? "completed" : status)
        } else {
            found = null
        }
        eventRecord = found || ({})
        eventLookupComplete = true
        statusErrorMessage = found ? "" : qsTr("Este evento não está mais disponível na agenda.")
    }

    function toggleStatus() {
        statusErrorMessage = ""
        if (isMissingEvent) {
            statusErrorMessage = qsTr("Este evento não está mais disponível na agenda.")
            return false
        }
        var nextStatus = isCompleted ? "pending" : "completed"
        var c = eventState.controller
        if (eventId && (!c || typeof c.toggleEventStatus !== "function" || !c.toggleEventStatus(eventId))) {
            statusErrorMessage = qsTr("Não foi possível atualizar o status do evento.")
            return false
        }
        status = nextStatus
        var next = Object.assign({}, attrs)
        next["data-status"] = status
        next["data-title"] = title
        next["data-date"] = dateStr
        if (hasCustomColor) next["data-color"] = eventColor
        attrsUpdated(next)
        return true
    }

    function eventHasExpired() {
        var dateValue = eventRecord.end_date || eventRecord.start_date || dateStr
        var timestamp = Date.parse(String(dateValue || ""))
        return Number.isFinite(timestamp) && timestamp < Date.now()
    }

    function isRecurringEvent() {
        return String(eventRecord.recurrence_rule || "").indexOf("group_") === 0
    }

    function formatRemindersLabel(reminders) {
        var values = reminders
        if (typeof values === "string") {
            try {
                values = JSON.parse(values)
            } catch (error) {
                console.warn("[Notes:CalendarEvent] Could not parse event reminders:", error)
                return ""
            }
        }
        if (!Array.isArray(values) || values.length === 0) return ""
        var labels = []
        for (var i = 0; i < values.length; i++) {
            var minutes = Number(values[i])
            if (minutes === 1440) labels.push(qsTr("1 dia antes"))
            else if (minutes >= 60 && minutes % 60 === 0) labels.push(qsTr("%1h antes").arg(minutes / 60))
            else if (minutes >= 0) labels.push(qsTr("%1m antes").arg(minutes))
        }
        return labels.join(", ")
    }

    function setWidgetColor(color) {
        eventColor = color || "default"
        var next = Object.assign({}, attrs)
        if (eventColor === "default") {
            delete next["data-color"]
            delete next["color"]
        } else {
            next["data-color"] = eventColor
            delete next["color"]
        }
        attrsUpdated(next)
    }

    function requestDeleteConfirmation(dialog) {
        var eventTitle = eventRecord.title || title || qsTr("Evento")
        var expired = hasLinkedEvent && eventHasExpired()
        var recurring = hasLinkedEvent && isRecurringEvent()
        var message = isMissingEvent
            ? qsTr("O evento \"%1\" não existe mais na agenda. Deseja remover apenas este widget da nota?").arg(eventTitle)
            : (!hasLinkedEvent
                ? qsTr("Este widget não está vinculado a um registro da agenda. Deseja removê-lo apenas da nota?")
                : (expired
                    ? qsTr("Deseja remover o widget \"%1\" da nota? Como o evento já expirou, ele será mantido na agenda.").arg(eventTitle)
                    : (recurring
                        ? qsTr("Deseja remover o widget \"%1\" da nota e excluir toda a série recorrente da agenda?").arg(eventTitle)
                        : qsTr("Deseja remover o widget \"%1\" da nota e excluir o evento correspondente da agenda?").arg(eventTitle))))
        dialog.showDialog(
            isMissingEvent ? qsTr("Evento Excluído") : qsTr("Remover Widget de Evento"),
            message,
            function() {
                if (hasLinkedEvent && !expired) {
                    var c = eventState.controller
                    var deleteSucceeded = false
                    if (c && recurring && typeof c.deleteCalendarEventSeries === "function") {
                        deleteSucceeded = c.deleteCalendarEventSeries(eventState.eventId)
                    } else if (c && !recurring && typeof c.deleteCalendarEvent === "function") {
                        deleteSucceeded = c.deleteCalendarEvent(eventState.eventId)
                    }
                    if (!deleteSucceeded) {
                        eventState.statusErrorMessage = recurring
                            ? qsTr("Não foi possível excluir a série de eventos da agenda.")
                            : qsTr("Não foi possível excluir o evento da agenda.")
                        return
                    }
                }
                eventState.removeRequested()
            },
            "error",
            isMissingEvent ? qsTr("Remover Widget") : qsTr("Confirmar Exclusão"),
            qsTr("Cancelar"))
    }

    function saveEventDetails(newTitle, newDate) {
        var c = eventState.controller
        var rawDate = String(newDate || "").trim()
        var nextTitle = String(newTitle || "").trim()
        if (!c || !eventId || !eventRecord.id || !nextTitle || !rawDate ||
            typeof c.updateCalendarEvent !== "function") {
            statusErrorMessage = qsTr("Não foi possível salvar os dados do evento.")
            return false
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) rawDate += "T00:00"
        var parsedStart = new Date(rawDate)
        if (Number.isNaN(parsedStart.getTime())) {
            statusErrorMessage = qsTr("Informe uma data válida para o evento.")
            return false
        }
        var oldStartTime = Date.parse(String(eventRecord.start_date || ""))
        var oldEndTime = Date.parse(String(eventRecord.end_date || ""))
        var duration = Number.isFinite(oldStartTime) && Number.isFinite(oldEndTime)
            ? Math.max(0, oldEndTime - oldStartTime) : 0
        var normalizedStart = parsedStart.toISOString()
        var normalizedEnd = new Date(parsedStart.getTime() + duration).toISOString()
        var reminders = eventRecord.reminders || []
        if (typeof reminders === "string") {
            try {
                reminders = JSON.parse(reminders)
            } catch (error) {
                console.warn("[Notes:CalendarEvent] Could not preserve event reminders:", error)
                reminders = []
            }
        }
        if (!Array.isArray(reminders)) reminders = []
        if (!c.updateCalendarEvent(
                eventId, nextTitle, eventRecord.description || "", normalizedStart, normalizedEnd,
                eventRecord.color || "#8b5cf6", eventRecord.type || "geral",
                eventRecord.page_id || "", reminders)) {
            statusErrorMessage = qsTr("Não foi possível salvar os dados do evento.")
            return false
        }
        title = nextTitle
        dateStr = normalizedStart
        eventRecord = Object.assign({}, eventRecord, {
            title: nextTitle,
            start_date: normalizedStart,
            end_date: normalizedEnd
        })
        var next = Object.assign({}, attrs)
        next["data-title"] = title
        next["data-date"] = dateStr
        attrsUpdated(next)
        statusErrorMessage = ""
        return true
    }

    onBlockDataChanged: {
        if (initializationComplete) syncFromCore()
    }
    onControllerChanged: {
        if (initializationComplete) syncFromCore()
    }
    Component.onCompleted: {
        initializationComplete = true
        syncFromCore()
    }

}
