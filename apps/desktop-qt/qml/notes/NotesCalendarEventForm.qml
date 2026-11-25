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

    TextField {
        id: titleField
        Layout.fillWidth: true
        Layout.preferredHeight: 36
        placeholderText: qsTr("Título do evento")
        color: "#fffffe"
        font.pixelSize: 12
        background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
    }

    NotesCalendarDateTimeFields {
        id: dateTimeFields
        Layout.fillWidth: true
    }

    ComboBox {
        id: eventTypeSelector
        Layout.fillWidth: true
        Layout.preferredHeight: 36
        model: eventForm.eventTypes
        textRole: "label"
        currentIndex: {
            for (var typeIndex = 0; typeIndex < eventForm.eventTypes.length; ++typeIndex) {
                if (eventForm.eventTypes[typeIndex].value === eventForm.eventType) return typeIndex
            }
            return 0
        }
        onActivated: function(index) { eventForm.eventType = eventForm.eventTypes[index].value }
        background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
        contentItem: Text {
            leftPadding: 10
            text: eventTypeSelector.displayText
            color: "#fffffe"
            font.pixelSize: 12
            verticalAlignment: Text.AlignVCenter
        }
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

    Button {
        Layout.fillWidth: true
        Layout.preferredHeight: 36
        enabled: titleField.text.trim().length > 0 && eventForm.dateTimeValid && !eventForm.isSubmitting
        onClicked: eventForm.createEvent()
        background: Rectangle { radius: 8; color: "#7c3aed" }
        contentItem: Text {
            text: eventForm.isSubmitting ? qsTr("Criando...") : qsTr("Criar Evento Inline")
            color: "#ffffff"
            font.pixelSize: 12
            font.bold: true
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }
}
