import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesHtmlEscaping.js" as HtmlEscaping

ColumnLayout {
    id: pickerPanel

    property var controller: null
    property string mode: ""
    property var listItems: []
    property string searchFilter: ""
    property bool alarmLinksExpanded: false
    property string alarmErrorMessage: ""
    readonly property var filteredListItems: {
        var query = searchFilter.trim().toLowerCase()
        var items = !query.length ? listItems : listItems.filter(function(item) {
            var label = String(item.title || item.label || item.name || "").toLowerCase()
            return label.indexOf(query) >= 0
        })
        return items.map(function(item) {
            var mapped = Object.assign({}, item)
            mapped.__picker = pickerPanel
            return mapped
        })
    }

    signal filterEdited(string value)
    signal insertWidgetRequested(string html)
    signal closeRequested()

    spacing: 8

    function setAlarmPrefill(time) {
        alarmTimeField.text = String(time || "12:00")
        alarmLabelField.text = ""
        alarmLinksExpanded = false
        alarmErrorMessage = ""
    }

    function createQuickRecord() {
        var title = searchFilter.trim()
        var c = pickerPanel.controller
        if (!c || !title) return

        if (mode === "habito" && typeof c.createHabit === "function") {
            var habitId = c.createHabit(title, 7)
            if (habitId) {
                var safeHabitId = HtmlEscaping.escapeHtmlAttribute(habitId)
                var safeTitle = HtmlEscaping.escapeHtmlAttribute(title)
                insertWidgetRequested(
                    "<span class=\"habit-widget\" data-type=\"habit-widget\" data-habit-id=\"" +
                    safeHabitId + "\" data-title=\"" + safeTitle + "\" data-streak=\"0\"></span>")
                closeRequested()
            }
        } else if (mode === "question" && typeof c.createQuizBattery === "function") {
            var batteryId = c.createQuizBattery(title, "")
            if (batteryId) {
                var safeBatteryId = HtmlEscaping.escapeHtmlAttribute(batteryId)
                var safeBatteryTitle = HtmlEscaping.escapeHtmlAttribute(title)
                insertWidgetRequested(
                    "<div class=\"question-block\" data-type=\"question-block\" data-battery-id=\"" +
                    safeBatteryId + "\" data-cached-title=\"" + safeBatteryTitle +
                    "\" data-title=\"" + safeBatteryTitle + "\"></div>")
                closeRequested()
            }
        }
    }

    function createAlarm() {
        if (!alarmTimeField.acceptableInput) {
            alarmErrorMessage = qsTr("Informe um horário válido no formato HH:mm.")
            return
        }
        var rawTime = alarmTimeField.text.trim()
        var rawLabel = alarmLabelField.text.trim() || "Alarme"
        var c = pickerPanel.controller
        if (!c || typeof c.createAlarm !== "function") {
            alarmErrorMessage = qsTr("O serviço de alarmes não está disponível.")
            return
        }
        if (!c.createAlarm(rawTime, rawLabel, "", true, "")) {
            alarmErrorMessage = qsTr("Não foi possível salvar o alarme.")
            return
        }
        closeRequested()
    }

    RowLayout {
        visible: pickerPanel.mode === "habito" || pickerPanel.mode === "question"
        Layout.fillWidth: true
        spacing: 6
        TextField {
            Layout.fillWidth: true
            Layout.preferredHeight: 32
            text: pickerPanel.searchFilter
            placeholderText: pickerPanel.mode === "habito"
                ? qsTr("Buscar ou digitar novo hábito...") : qsTr("Buscar ou criar nova bateria...")
            color: "#fffffe"
            font.pixelSize: 12
            onTextEdited: pickerPanel.filterEdited(text)
            background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
        }
        Button {
            visible: pickerPanel.searchFilter.trim().length > 0
            Layout.preferredHeight: 32
            leftPadding: 10
            rightPadding: 10
            onClicked: pickerPanel.createQuickRecord()
            background: Rectangle { radius: 8; color: "#7c3aed" }
            contentItem: Text { text: qsTr("+ Criar"); color: "#fff"; font.pixelSize: 11 }
        }
    }

    RowLayout {
        visible: pickerPanel.mode === "alarme"
        Layout.fillWidth: true
        spacing: 6
        TextField {
            id: alarmTimeField
            Layout.preferredWidth: 84
            Layout.preferredHeight: 32
            text: "12:00"
            placeholderText: "HH:mm"
            validator: RegularExpressionValidator { regularExpression: /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/ }
            onTextEdited: pickerPanel.alarmErrorMessage = ""
            color: "#fffffe"
            font.pixelSize: 12
            horizontalAlignment: Text.AlignHCenter
            background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
        }
        TextField {
            id: alarmLabelField
            Layout.fillWidth: true
            Layout.preferredHeight: 32
            placeholderText: qsTr("Rótulo do novo alarme...")
            maximumLength: 30
            onTextEdited: pickerPanel.alarmErrorMessage = ""
            color: "#fffffe"
            font.pixelSize: 12
            background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
        }
        Button {
            Layout.preferredHeight: 32
            leftPadding: 10
            rightPadding: 10
            enabled: alarmTimeField.acceptableInput
            onClicked: pickerPanel.createAlarm()
            background: Rectangle { radius: 8; color: "#7c3aed" }
            contentItem: Text { text: qsTr("Salvar Alarme"); color: "#fff"; font.pixelSize: 11; font.bold: true }
        }
    }

    Text {
        visible: pickerPanel.mode === "alarme" && pickerPanel.alarmErrorMessage.length > 0
        text: pickerPanel.alarmErrorMessage
        color: "#fda4af"
        font.pixelSize: 11
        wrapMode: Text.Wrap
        Layout.fillWidth: true
    }

    Button {
        visible: pickerPanel.mode === "alarme"
        Layout.fillWidth: true
        Layout.preferredHeight: 32
        onClicked: pickerPanel.alarmLinksExpanded = !pickerPanel.alarmLinksExpanded
        background: Rectangle { radius: 8; color: "#1d1c2e"; border.color: "#2e2e38" }
        contentItem: Text {
            text: pickerPanel.alarmLinksExpanded
                ? qsTr("Ocultar alarmes existentes") : qsTr("Vincular alarme existente à nota")
            color: "#e2e8f0"
            font.pixelSize: 11
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }

    ScrollView {
        visible: pickerPanel.mode === "question" || pickerPanel.mode === "habito" ||
            (pickerPanel.mode === "alarme" && pickerPanel.alarmLinksExpanded)
        Layout.fillWidth: true
        Layout.preferredHeight: 220
        clip: true

        ColumnLayout {
            width: parent.width
            spacing: 6
            Button {
                visible: pickerPanel.mode === "habito"
                Layout.fillWidth: true
                Layout.preferredHeight: 36
                onClicked: {
                    pickerPanel.insertWidgetRequested("<span data-type=\"habit-widget\" data-habit-id=\"all\"></span>")
                    pickerPanel.closeRequested()
                }
                background: Rectangle { radius: 8; color: "#2210b981"; border.color: "#4410b981" }
                contentItem: Text { text: qsTr("Todos os hábitos do dia"); color: "#6ee7b7"; font.pixelSize: 12; font.bold: true }
            }
            Repeater {
                model: pickerPanel.filteredListItems
                delegate: Button {
                    id: eventItemButton
                    required property var modelData
                    Layout.fillWidth: true
                    Layout.preferredHeight: 40
                    onClicked: {
                        if (eventItemButton.modelData.__picker.mode === "question") {
                            var safeTitle = HtmlEscaping.escapeHtmlAttribute(eventItemButton.modelData.title || "Bateria")
                            var safeId = HtmlEscaping.escapeHtmlAttribute(eventItemButton.modelData.id)
                            eventItemButton.modelData.__picker.insertWidgetRequested(
                                "<div class=\"question-block\" data-type=\"question-block\" data-battery-id=\"" +
                                safeId + "\" data-cached-title=\"" + safeTitle + "\" data-title=\"" + safeTitle + "\"></div>")
                        } else if (eventItemButton.modelData.__picker.mode === "habito") {
                            var habitTitle = HtmlEscaping.escapeHtmlAttribute(eventItemButton.modelData.title || eventItemButton.modelData.name || "Hábito")
                            var streak = Number(eventItemButton.modelData.current_streak || 0)
                            var habitId = HtmlEscaping.escapeHtmlAttribute(eventItemButton.modelData.id)
                            eventItemButton.modelData.__picker.insertWidgetRequested(
                                "<span class=\"habit-widget\" data-type=\"habit-widget\" data-habit-id=\"" +
                                habitId + "\" data-title=\"" + habitTitle + "\" data-streak=\"" + streak + "\"></span>")
                        } else if (eventItemButton.modelData.__picker.mode === "alarme") {
                            var label = HtmlEscaping.escapeHtmlAttribute(eventItemButton.modelData.label || "Alarme")
                            var alarmId = HtmlEscaping.escapeHtmlAttribute(eventItemButton.modelData.id)
                            var alarmTime = HtmlEscaping.escapeHtmlAttribute(eventItemButton.modelData.time || "08:00")
                            eventItemButton.modelData.__picker.insertWidgetRequested(
                                "<span class=\"alarm-widget\" data-type=\"alarm-widget\" data-alarm-id=\"" + alarmId +
                                "\" data-time=\"" + alarmTime + "\" data-label=\"" + label + "\" data-status=\"pending\"></span>")
                        }
                        eventItemButton.modelData.__picker.closeRequested()
                    }
                    background: Rectangle { radius: 8; color: eventItemButton.hovered ? "#228b5cf6" : "#1d1c2e"; border.color: "#15ffffff" }
                    contentItem: Text {
                        text: eventItemButton.modelData.title || eventItemButton.modelData.label ||
                            (eventItemButton.modelData.time || "")
                        color: "#fffffe"
                        font.pixelSize: 12
                        elide: Text.ElideRight
                    }
                }
            }
        }
    }
}
