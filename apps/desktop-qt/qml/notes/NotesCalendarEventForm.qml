import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesHtmlEscaping.js" as HtmlEscaping
import "../ui"

ColumnLayout {
    id: eventForm

    property var controller: null
    property string pageId: ""
    property string pageTitle: ""
    property string eventType: "mentoria"
    property string eventColor: "#8b5cf6"
    property string recurrence: "none"
    property var selectedReminders: [1440, 120, 15, 0]
    property string errorMessage: ""
    property bool isSubmitting: false
    readonly property var eventTypes: [
        { value: "mentoria", label: qsTr("🎯 Mentoria") },
        { value: "reuniao", label: qsTr("🤝 Reunião") },
        { value: "aula", label: qsTr("📚 Aula / Curso") },
        { value: "estudo", label: qsTr("✏️ Estudo") },
        { value: "geral", label: qsTr("📅 Geral") }
    ]
    readonly property var reminderOptions: [
        { value: 1440, label: qsTr("1 dia antes (24 horas)"), form: eventForm },
        { value: 120, label: qsTr("2 horas antes"), form: eventForm },
        { value: 15, label: qsTr("15 minutos antes"), form: eventForm },
        { value: 0, label: qsTr("No momento do evento"), form: eventForm }
    ]
    readonly property bool dateTimeValid: dateTimeFields.isValid

    signal insertWidgetRequested(string html)
    signal closeRequested()

    spacing: 10

    function tomorrowDateISO() {
        var date = new Date()
        date.setDate(date.getDate() + 1)
        return date.toISOString().split("T")[0]
    }

    function openForTitle(title) {
        titleField.text = String(title || qsTr("Novo Evento"))
        dateTimeFields.dateText = tomorrowDateISO()
        dateTimeFields.timeText = "14:00"
        eventType = "mentoria"
        eventColor = "#8b5cf6"
        recurrence = "none"
        selectedReminders = [1440, 120, 15, 0]
        errorMessage = ""
        isSubmitting = false
        Qt.callLater(function() { titleField.forceActiveFocus() })
    }

    function startDateISO() {
        if (!dateTimeValid) return ""
        var date = new Date(dateTimeFields.dateText + "T" + dateTimeFields.timeText + ":00")
        return Number.isNaN(date.getTime()) ? "" : date.toISOString()
    }

    function toggleReminder(minutes, checked) {
        var next = selectedReminders.slice()
        var index = next.indexOf(minutes)
        if (checked && index < 0) next.push(minutes)
        else if (!checked && index >= 0) next.splice(index, 1)
        next.sort(function(left, right) { return right - left })
        selectedReminders = next
    }

    function createEvent() {
        var rawTitle = titleField.text.trim()
        if (!rawTitle || !dateTimeValid || isSubmitting) return
        var c = eventForm.controller
        if (!c || typeof c.createNoteCalendarEvent !== "function") {
            errorMessage = qsTr("A criação de eventos não está disponível.")
            return
        }

        isSubmitting = true
        errorMessage = ""
        var startDate = startDateISO()
        var description = pageTitle.length > 0
            ? qsTr("Evento vinculado à página: %1").arg(pageTitle) : ""
        var createdEvent = ({})
        try {
            createdEvent = c.createNoteCalendarEvent(
                rawTitle, description, startDate, startDate, eventType, eventColor,
                pageId, selectedReminders.slice(), recurrence)
        } catch (error) {
            console.error("[Notes:CalendarEvent] Could not create linked event:", error)
        }
        if (!createdEvent || !createdEvent.id) {
            isSubmitting = false
            errorMessage = createdEvent && createdEvent.error
                ? String(createdEvent.error)
                : qsTr("Não foi possível criar o evento. Verifique os dados e tente novamente.")
            return
        }

        var eventId = HtmlEscaping.escapeHtmlAttribute(createdEvent.id)
        var safePageId = HtmlEscaping.escapeHtmlAttribute(pageId)
        var safeTitle = HtmlEscaping.escapeHtmlAttribute(createdEvent.title || rawTitle)
        var safeDate = HtmlEscaping.escapeHtmlAttribute(createdEvent.start_date || startDate)
        var safeStatus = HtmlEscaping.escapeHtmlAttribute(createdEvent.status || "pending")
        insertWidgetRequested(
            "<span class=\"calendar-event-widget\" data-type=\"calendar-event-widget\" data-event-id=\"" + eventId +
            "\" data-page-id=\"" + safePageId + "\" data-title=\"" + safeTitle +
            "\" data-date=\"" + safeDate + "\" data-status=\"" + safeStatus + "\"></span>")
        isSubmitting = false
        closeRequested()
    }

    Shortcut {
        sequence: "Return"
        context: Qt.WindowShortcut
        enabled: titleField.text.trim().length > 0 && eventForm.dateTimeValid && !eventForm.isSubmitting
        onActivated: eventForm.createEvent()
    }

    Rectangle {
        visible: eventForm.pageTitle.length > 0
        Layout.fillWidth: true
        Layout.preferredHeight: visible ? 38 : 0
        radius: 10
        color: "#1a8b5cf6"
        border.color: "#338b5cf6"
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 10
            anchors.rightMargin: 10
            spacing: 8
            AppIcon { name: "book-open"; color: "#c4b5fd"; Layout.preferredWidth: 14; Layout.preferredHeight: 14 }
            Text {
                Layout.fillWidth: true
                text: qsTr("Vinculado à página: %1").arg(eventForm.pageTitle)
                color: "#c4b5fd"
                font.pixelSize: 11
                elide: Text.ElideRight
            }
        }
    }

    NotesCalendarEventTitleField {
        id: titleField
    }

    NotesCalendarDateTimeFields {
        id: dateTimeFields
        Layout.fillWidth: true
    }

    NotesCalendarEventTypeField {
        eventTypes: eventForm.eventTypes
        selectedType: eventForm.eventType
        onTypeSelected: function(value) { eventForm.eventType = value }
    }

    ColumnLayout {
        Layout.fillWidth: true
        spacing: 5
        RowLayout {
            spacing: 6
            AppIcon { name: "bell"; color: "#a78bfa"; Layout.preferredWidth: 13; Layout.preferredHeight: 13 }
            Text { text: qsTr("Lembretes e Avisos Automáticos"); color: "#a7a9be"; font.pixelSize: 11 }
        }
        GridLayout {
            Layout.fillWidth: true
            columns: 2
            columnSpacing: 8
            rowSpacing: 2
            Repeater {
                model: eventForm.reminderOptions
                delegate: CheckBox {
                    id: reminderCheckbox
                    required property var modelData
                    Layout.fillWidth: true
                    checked: reminderCheckbox.modelData.form.selectedReminders.indexOf(reminderCheckbox.modelData.value) >= 0
                    text: reminderCheckbox.modelData.label
                    onToggled: reminderCheckbox.modelData.form.toggleReminder(reminderCheckbox.modelData.value, checked)
                    contentItem: Text {
                        leftPadding: 24
                        text: reminderCheckbox.text
                        color: reminderCheckbox.checked ? "#c4b5fd" : "#a7a9be"
                        font.pixelSize: 10
                        wrapMode: Text.WordWrap
                        verticalAlignment: Text.AlignVCenter
                    }
                    indicator: Rectangle {
                        implicitWidth: 16
                        implicitHeight: 16
                        x: 0
                        y: parent.height / 2 - height / 2
                        radius: 4
                        color: reminderCheckbox.checked ? "#7c3aed" : "#0f0e17"
                        border.color: reminderCheckbox.checked ? "#a78bfa" : "#4b4b58"
                        Text {
                            anchors.centerIn: parent
                            visible: reminderCheckbox.checked
                            text: "✓"
                            color: "white"
                            font.pixelSize: 11
                        }
                    }
                }
            }
        }
    }

    NotesCalendarEventOptions {
        Layout.fillWidth: true
        eventColor: eventForm.eventColor
        recurrence: eventForm.recurrence
        onEventColorSelected: function(color) { eventForm.eventColor = color }
        onRecurrenceSelected: function(value) { eventForm.recurrence = value }
    }

    Text {
        visible: eventForm.errorMessage.length > 0
        Layout.fillWidth: true
        text: eventForm.errorMessage
        color: "#fda4af"
        font.pixelSize: 11
        wrapMode: Text.WordWrap
    }

    RowLayout {
        Layout.fillWidth: true
        Layout.topMargin: 3
        spacing: 8

        Item { Layout.fillWidth: true }

        Button {
            id: cancelEventButton
            objectName: "notesCalendarEventCancelButton"
            Layout.preferredHeight: 34
            text: qsTr("Cancelar")
            enabled: !eventForm.isSubmitting
            onClicked: eventForm.closeRequested()
            background: Rectangle { radius: 8; color: cancelEventButton.hovered ? "#0dffffff" : "transparent" }
            contentItem: Text {
                text: cancelEventButton.text
                color: "#a7a9be"
                font.pixelSize: 11
                font.weight: Font.DemiBold
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                leftPadding: 12
                rightPadding: 12
            }
        }

        Button {
            id: createEventButton
            objectName: "notesCalendarEventCreateButton"
            Layout.preferredHeight: 34
            text: eventForm.isSubmitting ? qsTr("Criando...") : qsTr("Criar Evento Inline")
            enabled: titleField.text.trim().length > 0 && eventForm.dateTimeValid && !eventForm.isSubmitting
            onClicked: eventForm.createEvent()
            background: Rectangle { radius: 8; color: createEventButton.enabled ? "#8b5cf6" : "#7c8b5cf6" }
            contentItem: RowLayout {
                spacing: 6
                AppIcon {
                    name: "sparkles"
                    color: "#ffffff"
                    Layout.preferredWidth: 13
                    Layout.preferredHeight: 13
                }
                Text {
                    text: createEventButton.text
                    color: "#ffffff"
                    font.pixelSize: 11
                    font.weight: Font.DemiBold
                    Layout.alignment: Qt.AlignVCenter
                }
            }
        }
    }
}
