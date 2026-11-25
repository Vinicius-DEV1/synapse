import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesHtmlEscaping.js" as HtmlEscaping
import "../ui"

Item {
    id: setupRoot
    anchors.fill: parent
    visible: activeMode.length > 0
    z: 140

    property var controller: null
    property string activeMode: "" // "question" | "foco" | "alarme" | "evento" | "habito"
    property var listItems: []
    property string searchFilter: ""
    property string eventType: "event"
    property string eventColor: "#3b82f6"
    property string eventRecurrence: "none"
    property int eventReminderMins: 10

    signal insertWidgetRequested(string html)
    signal closed()

    function openMode(mode, prefill) {
        activeMode = mode
        listItems = []
        searchFilter = ""
        var pf = (typeof prefill === "string") ? ({ query: prefill, title: prefill, desc: prefill }) : (prefill || ({}))
        if (mode === "foco") {
            mainTitleField.text = pf.desc || ""
            secondaryField.text = String(pf.time || 30)
            tagField.text = pf.tag || ""
        } else if (mode === "evento") {
            mainTitleField.text = pf.title || ""
            secondaryField.text = new Date().toISOString().substring(0, 10)
        } else if (mode === "alarme") {
            alarmTimeField.text = pf.timeStr || "12:00"
            alarmLabelField.text = ""
        } else if (mode === "habito") {
            searchFilter = pf.query || ""
        }
        var c = setupRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
        if (!c) return
        if (mode === "question" && typeof c.getQuizBatteries === "function") {
            listItems = c.getQuizBatteries() || []
        } else if (mode === "habito" && typeof c.getHabits === "function") {
            listItems = c.getHabits() || []
        } else if (mode === "alarme" && typeof c.getAlarms === "function") {
            listItems = c.getAlarms() || []
        }
    }

    function close() { activeMode = ""; closed() }

    readonly property var filteredListItems: {
        var q = searchFilter.trim().toLowerCase()
        if (q.length === 0) return listItems
        return listItems.filter(function(item) {
            var lbl = String(item.title || item.label || item.name || "").toLowerCase()
            return lbl.indexOf(q) >= 0
        })
    }

    Rectangle {
        anchors.fill: parent
        color: "#b0000000"
        MouseArea { anchors.fill: parent; onClicked: setupRoot.close() }
    }

    Rectangle {
        width: 450
        height: Math.min(parent.height - 48, cardCol.implicitHeight + 40)
        anchors.centerIn: parent
        radius: 16
        color: "#161522"
        border.color: "#338b5cf6"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: cardCol
            anchors.fill: parent
            anchors.margins: 20
            spacing: 12

            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: setupRoot.activeMode === "question" ? qsTr("Criar / Inserir Questão")
                        : setupRoot.activeMode === "foco" ? qsTr("Configurar Timer de Foco")
                        : setupRoot.activeMode === "alarme" ? qsTr("Criar / Inserir Alarme")
                        : setupRoot.activeMode === "evento" ? qsTr("Criar Evento na Nota")
                        : qsTr("Vincular ou Criar Hábito")
                    color: "#fffffe"
                    font.pixelSize: 15
                    font.bold: true
                    Layout.fillWidth: true
                }
                ToolButton {
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 26
                    onClicked: setupRoot.close()
                    background: Rectangle { radius: 6; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#94a1b2"; width: 12; height: 12 }
                }
            }

            // Search / Quick-create bar for Habit & Question
            RowLayout {
                visible: setupRoot.activeMode === "habito" || setupRoot.activeMode === "question"
                Layout.fillWidth: true
                spacing: 6
                TextField {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 32
                    text: setupRoot.searchFilter
                    placeholderText: setupRoot.activeMode === "habito" ? qsTr("Buscar ou digitar novo hábito...") : qsTr("Buscar ou criar nova bateria...")
                    color: "#fffffe"
                    font.pixelSize: 12
                    onTextEdited: setupRoot.searchFilter = text
                    background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
                }
                Button {
                    visible: setupRoot.searchFilter.trim().length > 0
                    Layout.preferredHeight: 32
                    leftPadding: 10
                    rightPadding: 10
                    onClicked: {
                        var title = setupRoot.searchFilter.trim()
                        var c = setupRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
                        if (!c) return
                        if (setupRoot.activeMode === "habito" && typeof c.createHabit === "function") {
                            var hid = c.createHabit(title, 7)
                            if (hid) {
                                var escH = HtmlEscaping.escapeHtmlAttribute(title)
                                var safeHabitId = HtmlEscaping.escapeHtmlAttribute(hid)
                                setupRoot.insertWidgetRequested("<span class=\"habit-widget\" data-type=\"habit-widget\" data-habit-id=\"" + safeHabitId + "\" data-title=\"" + escH + "\" data-streak=\"0\"></span>")
                                setupRoot.close()
                            }
                        } else if (setupRoot.activeMode === "question" && typeof c.createQuizBattery === "function") {
                            var bid = c.createQuizBattery(title, "")
                            if (bid) {
                                var escB = HtmlEscaping.escapeHtmlAttribute(title)
                                var safeBatteryId = HtmlEscaping.escapeHtmlAttribute(bid)
                                setupRoot.insertWidgetRequested("<div class=\"question-block\" data-type=\"question-block\" data-battery-id=\"" + safeBatteryId + "\" data-cached-title=\"" + escB + "\" data-title=\"" + escB + "\"></div>")
                                setupRoot.close()
                            }
                        }
                    }
                    background: Rectangle { radius: 8; color: "#7c3aed" }
                    contentItem: Text { text: qsTr("+ Criar"); color: "#fff"; font.pixelSize: 11; font.bold: true }
                }
            }

            // New Alarm form when in alarm mode
            RowLayout {
                visible: setupRoot.activeMode === "alarme"
                Layout.fillWidth: true
                spacing: 6
                TextField {
                    id: alarmTimeField
                    Layout.preferredWidth: 84
                    Layout.preferredHeight: 32
                    text: "12:00"
                    placeholderText: "HH:mm"
                    validator: RegularExpressionValidator { regularExpression: /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/ }
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
                    color: "#fffffe"
                    font.pixelSize: 12
                    background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
                }
                Button {
                    Layout.preferredHeight: 32
                    leftPadding: 10
                    rightPadding: 10
                    enabled: alarmTimeField.acceptableInput
                    onClicked: {
                        var rawTime = alarmTimeField.text.trim()
                        var tStr = HtmlEscaping.escapeHtmlAttribute(rawTime)
                        var rawLabel = alarmLabelField.text.trim() || "Alarme"
                        var lbl = HtmlEscaping.escapeHtmlAttribute(rawLabel)
                        var aid = ""
                        var c = setupRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
                        if (c && typeof c.createAlarm === "function") {
                            aid = c.createAlarm(rawTime, rawLabel, true) || ""
                        }
                        var safeAlarmId = HtmlEscaping.escapeHtmlAttribute(aid)
                        setupRoot.insertWidgetRequested("<span class=\"alarm-widget\" data-type=\"alarm-widget\" data-alarm-id=\"" + safeAlarmId + "\" data-time=\"" + tStr + "\" data-label=\"" + lbl + "\" data-status=\"pending\"></span>")
                        setupRoot.close()
                    }
                    background: Rectangle { radius: 8; color: "#7c3aed" }
                    contentItem: Text { text: qsTr("Criar"); color: "#fff"; font.pixelSize: 11; font.bold: true }
                }
            }

            // Battery, Habit, or Alarm Picker list
            ScrollView {
                visible: setupRoot.activeMode === "question" || setupRoot.activeMode === "habito" || setupRoot.activeMode === "alarme"
                Layout.fillWidth: true
                Layout.preferredHeight: 220
                clip: true

                ColumnLayout {
                    width: parent.width
                    spacing: 6

                    Button {
                        visible: setupRoot.activeMode === "habito"
                        Layout.fillWidth: true
                        Layout.preferredHeight: 36
                        onClicked: {
                            setupRoot.insertWidgetRequested("<span data-type=\"habit-widget\" data-habit-id=\"all\"></span>")
                            setupRoot.close()
                        }
                        background: Rectangle { radius: 8; color: "#2210b981"; border.color: "#4410b981" }
                        contentItem: Text { text: qsTr("Todos os hábitos do dia"); color: "#6ee7b7"; font.pixelSize: 12; font.bold: true }
                    }

                    Repeater {
                        model: setupRoot.filteredListItems
                        delegate: Button {
                            required property var modelData
                            Layout.fillWidth: true
                            Layout.preferredHeight: 40
                            onClicked: {
                                if (setupRoot.activeMode === "question") {
                                    var t = HtmlEscaping.escapeHtmlAttribute(modelData.title || "Bateria")
                                    var batteryId = HtmlEscaping.escapeHtmlAttribute(modelData.id)
                                    setupRoot.insertWidgetRequested("<div class=\"question-block\" data-type=\"question-block\" data-battery-id=\"" + batteryId + "\" data-cached-title=\"" + t + "\" data-title=\"" + t + "\"></div>")
                                } else if (setupRoot.activeMode === "habito") {
                                    var hTitle = HtmlEscaping.escapeHtmlAttribute(modelData.title || modelData.name || "Hábito")
                                    var hStreak = Number(modelData.current_streak || 0)
                                    var habitId = HtmlEscaping.escapeHtmlAttribute(modelData.id)
                                    setupRoot.insertWidgetRequested("<span class=\"habit-widget\" data-type=\"habit-widget\" data-habit-id=\"" + habitId + "\" data-title=\"" + hTitle + "\" data-streak=\"" + hStreak + "\"></span>")
                                } else if (setupRoot.activeMode === "alarme") {
                                    var lbl = HtmlEscaping.escapeHtmlAttribute(modelData.label || "Alarme")
                                    var alarmId = HtmlEscaping.escapeHtmlAttribute(modelData.id)
                                    var alarmTime = HtmlEscaping.escapeHtmlAttribute(modelData.time || "08:00")
                                    setupRoot.insertWidgetRequested("<span class=\"alarm-widget\" data-type=\"alarm-widget\" data-alarm-id=\"" + alarmId + "\" data-time=\"" + alarmTime + "\" data-label=\"" + lbl + "\" data-status=\"pending\"></span>")
                                }
                                setupRoot.close()
                            }
                            background: Rectangle { radius: 8; color: parent.hovered ? "#228b5cf6" : "#1d1c2e"; border.color: "#15ffffff" }
                            contentItem: Text {
                                text: modelData.title || modelData.label || (modelData.time || "")
                                color: "#fffffe"
                                font.pixelSize: 12
                                elide: Text.ElideRight
                            }
                        }
                    }
                }
            }

            // Focus / Event quick form with preset pills & tag
            ColumnLayout {
                visible: setupRoot.activeMode === "foco" || setupRoot.activeMode === "evento"
                Layout.fillWidth: true
                spacing: 8

                TextField {
                    id: mainTitleField
                    Layout.fillWidth: true
                    placeholderText: setupRoot.activeMode === "foco" ? qsTr("Descrição (ex: Revisão)") : qsTr("Título do evento")
                    color: "#fffffe"
                    background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
                }
                TextField {
                    id: tagField
                    visible: setupRoot.activeMode === "foco"
                    Layout.fillWidth: true
                    placeholderText: qsTr("Tag (ex: Estudo, Código)")
                    text: ""
                    color: "#fffffe"
                    background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
                }
                RowLayout {
                    visible: setupRoot.activeMode === "foco"
                    Layout.fillWidth: true
                    spacing: 6
                    Repeater {
                        model: [15, 25, 30, 45, 60]
                        delegate: Button {
                            required property int modelData
                            Layout.fillWidth: true
                            Layout.preferredHeight: 28
                            onClicked: secondaryField.text = String(modelData)
                            background: Rectangle {
                                radius: 6
                                color: secondaryField.text === String(modelData) ? "#338b5cf6" : "#0f0e17"
                                border.color: secondaryField.text === String(modelData) ? "#8b5cf6" : "#2e2e38"
                            }
                            contentItem: Text { text: modelData + "m"; color: "#e2e8f0"; font.pixelSize: 11; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                        }
                    }
                }
                TextField {
                    id: secondaryField
                    Layout.fillWidth: true
                    placeholderText: setupRoot.activeMode === "foco" ? qsTr("Duração em minutos (ex: 25)") : qsTr("Data YYYY-MM-DD (ex: 2026-11-24)")
                    text: setupRoot.activeMode === "foco" ? "30" : new Date().toISOString().substring(0, 10)
                    color: "#fffffe"
                    background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
                }

                // Event type, recurrence, reminder & color presets
                RowLayout {
                    visible: setupRoot.activeMode === "evento"
                    Layout.fillWidth: true
                    spacing: 6
                    Repeater {
                        model: [
                            { id: "event", label: qsTr("Evento") },
                            { id: "task", label: qsTr("Tarefa") },
                            { id: "reminder", label: qsTr("Lembrete") }
                        ]
                        delegate: Button {
                            required property var modelData
                            Layout.fillWidth: true
                            Layout.preferredHeight: 28
                            onClicked: setupRoot.eventType = modelData.id
                            background: Rectangle {
                                radius: 6
                                color: setupRoot.eventType === modelData.id ? "#338b5cf6" : "#0f0e17"
                                border.color: setupRoot.eventType === modelData.id ? "#8b5cf6" : "#2e2e38"
                            }
                            contentItem: Text { text: modelData.label; color: "#e2e8f0"; font.pixelSize: 11; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                        }
                    }
                }

                RowLayout {
                    visible: setupRoot.activeMode === "evento"
                    Layout.fillWidth: true
                    spacing: 6
                    ComboBox {
                        id: recurrenceBox
                        Layout.fillWidth: true
                        Layout.preferredHeight: 30
                        model: ["none", "daily", "weekly", "monthly", "yearly"]
                        onActivated: setupRoot.eventRecurrence = currentText
                    }
                    ComboBox {
                        id: reminderBox
                        Layout.fillWidth: true
                        Layout.preferredHeight: 30
                        model: [qsTr("Sem aviso"), qsTr("10 min antes"), qsTr("30 min antes"), qsTr("1h antes")]
                        currentIndex: 1
                        onActivated: {
                            var mins = [0, 10, 30, 60]
                            setupRoot.eventReminderMins = mins[currentIndex] || 0
                        }
                    }
                }

                RowLayout {
                    visible: setupRoot.activeMode === "evento"
                    Layout.fillWidth: true
                    spacing: 8
                    Text { text: qsTr("Cor:"); color: "#a7a9be"; font.pixelSize: 11 }
                    Repeater {
                        model: ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"]
                        delegate: Rectangle {
                            required property string modelData
                            width: 18; height: 18; radius: 9
                            color: modelData
                            border.color: setupRoot.eventColor === modelData ? "#ffffff" : "#33ffffff"
                            border.width: setupRoot.eventColor === modelData ? 2 : 1
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: setupRoot.eventColor = parent.modelData }
                        }
                    }
                    Item { Layout.fillWidth: true }
                }

                Button {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 36
                    enabled: setupRoot.activeMode !== "foco" ||
                        (mainTitleField.text.trim().length > 0 && tagField.text.trim().length > 0 &&
                         Number(secondaryField.text) >= 1 && Number(secondaryField.text) % 1 === 0)
                    onClicked: {
                        var rawTitle = mainTitleField.text.trim() || (setupRoot.activeMode === "foco" ? "Sessão de Foco" : "Evento")
                        var title = HtmlEscaping.escapeHtmlAttribute(rawTitle)
                        if (setupRoot.activeMode === "foco") {
                            var mins = Math.max(1, parseInt(secondaryField.text || "30", 10) || 30)
                            var tag = HtmlEscaping.escapeHtmlAttribute(tagField.text.trim() || "Estudo")
                            setupRoot.insertWidgetRequested("<span data-type=\"focus-widget\" data-duration=\"" + mins + "\" data-tag=\"" + tag + "\" data-description=\"" + title + "\" data-status=\"paused\"></span>")
                        } else {
                            var rawDate = secondaryField.text.trim() || new Date().toISOString().substring(0, 10)
                            var dt = HtmlEscaping.escapeHtmlAttribute(rawDate)
                            var rems = setupRoot.eventReminderMins > 0 ? [setupRoot.eventReminderMins] : []
                            var c = setupRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
                            if (c && typeof c.createCalendarEvent === "function") {
                                c.createCalendarEvent(rawTitle, "", rawDate, rawDate, setupRoot.eventType, setupRoot.eventColor, "", rems, setupRoot.eventRecurrence)
                            }
                            setupRoot.insertWidgetRequested("<span data-type=\"calendar-event-widget\" data-title=\"" + title + "\" data-date=\"" + dt + "\" data-color=\"" + setupRoot.eventColor + "\" data-status=\"pending\"></span>")
                        }
                        setupRoot.close()
                    }
                    background: Rectangle { radius: 8; color: "#7c3aed" }
                    contentItem: Text { text: qsTr("Inserir na Nota"); color: "#ffffff"; font.pixelSize: 12; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }
            }
        }
    }
}
