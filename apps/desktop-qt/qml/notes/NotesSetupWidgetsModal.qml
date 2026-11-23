import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: setupRoot
    anchors.fill: parent
    visible: activeMode.length > 0
    z: 140

    property string activeMode: "" // "question" | "foco" | "alarme" | "evento" | "habito"
    property var listItems: []

    signal insertWidgetRequested(string html)
    signal closed()

    function openMode(mode) {
        activeMode = mode
        listItems = []
        if (typeof dataController === "undefined" || !dataController) return
        if (mode === "question" && typeof dataController.getQuizBatteries === "function") {
            listItems = dataController.getQuizBatteries() || []
        } else if (mode === "habito" && typeof dataController.getHabits === "function") {
            listItems = dataController.getHabits() || []
        } else if (mode === "alarme" && typeof dataController.getAlarms === "function") {
            listItems = dataController.getAlarms() || []
        }
    }

    function close() { activeMode = ""; closed() }

    Rectangle {
        anchors.fill: parent
        color: "#b0000000"
        MouseArea { anchors.fill: parent; onClicked: setupRoot.close() }
    }

    Rectangle {
        width: 440
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
                    text: setupRoot.activeMode === "question" ? qsTr("Inserir Bateria de Questões")
                        : setupRoot.activeMode === "foco" ? qsTr("Configurar Timer de Foco")
                        : setupRoot.activeMode === "alarme" ? qsTr("Inserir Alarme")
                        : setupRoot.activeMode === "evento" ? qsTr("Criar Evento na Nota")
                        : qsTr("Inserir Widget de Hábitos")
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

            // Battery or Habit Picker list
            ScrollView {
                visible: setupRoot.activeMode === "question" || setupRoot.activeMode === "habito" || setupRoot.activeMode === "alarme"
                Layout.fillWidth: true
                Layout.preferredHeight: 240
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
                        model: setupRoot.listItems
                        delegate: Button {
                            required property var modelData
                            Layout.fillWidth: true
                            Layout.preferredHeight: 40
                            onClicked: {
                                if (setupRoot.activeMode === "question") {
                                    var t = String(modelData.title || "Bateria").replace(/"/g, "&quot;")
                                    setupRoot.insertWidgetRequested("<div data-type=\"question-block\" data-battery-id=\"" + modelData.id + "\" data-cached-title=\"" + t + "\"></div>")
                                } else if (setupRoot.activeMode === "habito") {
                                    setupRoot.insertWidgetRequested("<span data-type=\"habit-widget\" data-habit-id=\"" + modelData.id + "\"></span>")
                                } else if (setupRoot.activeMode === "alarme") {
                                    var lbl = String(modelData.label || "Alarme").replace(/"/g, "&quot;")
                                    setupRoot.insertWidgetRequested("<span data-type=\"alarm-widget\" data-alarm-id=\"" + modelData.id + "\" data-time=\"" + (modelData.time || "08:00") + "\" data-label=\"" + lbl + "\" data-status=\"pending\"></span>")
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

            // Focus / Event quick form
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
                    id: secondaryField
                    Layout.fillWidth: true
                    placeholderText: setupRoot.activeMode === "foco" ? qsTr("Duração em minutos (ex: 25)") : qsTr("Data YYYY-MM-DD (ex: 2026-11-23)")
                    text: setupRoot.activeMode === "foco" ? "25" : new Date().toISOString().substring(0, 10)
                    color: "#fffffe"
                    background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
                }
                Button {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 36
                    onClicked: {
                        var title = (mainTitleField.text.trim() || (setupRoot.activeMode === "foco" ? "Sessão de Foco" : "Evento")).replace(/"/g, "&quot;")
                        if (setupRoot.activeMode === "foco") {
                            var mins = Math.max(1, parseInt(secondaryField.text || "25", 10) || 25)
                            setupRoot.insertWidgetRequested("<span data-type=\"focus-widget\" data-duration=\"" + mins + "\" data-tag=\"Estudo\" data-description=\"" + title + "\" data-status=\"paused\"></span>")
                        } else {
                            var dt = secondaryField.text.trim() || new Date().toISOString().substring(0, 10)
                            if (typeof dataController !== "undefined" && dataController && typeof dataController.createCalendarEvent === "function") {
                                dataController.createCalendarEvent(title, "", dt, dt, "event", "#3b82f6")
                            }
                            setupRoot.insertWidgetRequested("<span data-type=\"calendar-event-widget\" data-title=\"" + title + "\" data-date=\"" + dt + "\" data-color=\"#3b82f6\" data-status=\"pending\"></span>")
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
