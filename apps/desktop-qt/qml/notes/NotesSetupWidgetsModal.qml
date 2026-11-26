import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: setupRoot
    anchors.fill: parent
    visible: activeMode.length > 0
    z: 140

    property var controller: null
    property string pageId: ""
    property string pageTitle: ""
    property string activeMode: "" // "question" | "foco" | "alarme" | "evento" | "habito"
    property var listItems: []
    property string searchFilter: ""

    signal insertWidgetRequested(string html)
    signal closed()

    function openMode(mode, prefill) {
        activeMode = mode
        listItems = []
        searchFilter = ""
        var pf = (typeof prefill === "string") ? ({ query: prefill, title: prefill, desc: prefill }) : (prefill || ({}))
        if (mode === "foco") {
            focusSetupForm.openForPrefill(pf)
        } else if (mode === "evento") {
            calendarEventForm.openForTitle(pf.title || qsTr("Novo Evento"))
        } else if (mode === "alarme") {
            alarmSetupForm.openForTime(pf.timeStr || "12:00")
        } else if (mode === "habito") {
            searchFilter = pf.query || ""
        }
        var c = setupRoot.controller
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

    Rectangle {
        anchors.fill: parent
        color: "#b0000000"
        MouseArea { anchors.fill: parent; onClicked: setupRoot.close() }
    }

    Rectangle {
        objectName: "notesSetupModalCard"
        width: setupRoot.activeMode === "alarme" ? Math.min(parent.width - 32, 672) : 450
        height: setupRoot.activeMode === "alarme"
            ? Math.min(parent.height - 32, cardCol.implicitHeight + 48)
            : Math.min(parent.height - 48, cardCol.implicitHeight + 40)
        anchors.centerIn: parent
        radius: 16
        color: setupRoot.activeMode === "alarme" ? "#0f0e17" : "#161522"
        border.color: setupRoot.activeMode === "alarme" ? "#0dffffff" : "#338b5cf6"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: cardCol
            anchors.fill: parent
            anchors.margins: setupRoot.activeMode === "alarme" ? 24 : 20
            spacing: setupRoot.activeMode === "alarme" ? 18 : 12

            RowLayout {
                Layout.fillWidth: true
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    AppIcon {
                        visible: setupRoot.activeMode === "alarme"
                        name: "clock"
                        color: "#a78bfa"
                        Layout.preferredWidth: 32
                        Layout.preferredHeight: 32
                    }
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        Text {
                            objectName: "notesSetupModalTitle"
                            text: setupRoot.activeMode === "question" ? qsTr("Criar / Inserir Questão")
                                : setupRoot.activeMode === "foco" ? qsTr("Configurar Timer de Foco")
                                : setupRoot.activeMode === "alarme" ? qsTr("Novo Alarme")
                                : setupRoot.activeMode === "evento" ? qsTr("Criar Evento na Agenda")
                                : qsTr("Vincular ou Criar Hábito")
                            color: "#fffffe"
                            font.pixelSize: setupRoot.activeMode === "alarme" ? 24 : 15
                            font.bold: true
                            Layout.fillWidth: true
                        }
                        Text {
                            visible: setupRoot.activeMode === "evento"
                            text: qsTr("Vínculo inline com avisos automáticos")
                            color: "#a7a9be"
                            font.pixelSize: 10
                        }
                    }
                }
                ToolButton {
                    id: setupCloseButton
                    Layout.preferredWidth: setupRoot.activeMode === "alarme" ? 48 : 26
                    Layout.preferredHeight: setupRoot.activeMode === "alarme" ? 48 : 26
                    onClicked: setupRoot.close()
                    background: Rectangle { radius: 6; color: setupCloseButton.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#94a1b2"; width: 12; height: 12 }
                }
            }

            NotesSetupWidgetPickerPanel {
                id: widgetPicker
                visible: setupRoot.activeMode !== "alarme" && setupRoot.activeMode !== "foco"
                mode: setupRoot.activeMode
                controller: setupRoot.controller
                listItems: setupRoot.listItems
                searchFilter: setupRoot.searchFilter
                Layout.fillWidth: true
                onFilterEdited: function(value) { setupRoot.searchFilter = value }
                onInsertWidgetRequested: function(html) { setupRoot.insertWidgetRequested(html) }
                onCloseRequested: setupRoot.close()
            }

            NotesAlarmSetupForm {
                id: alarmSetupForm
                visible: setupRoot.activeMode === "alarme"
                controller: setupRoot.controller
                alarmItems: setupRoot.listItems
                Layout.fillWidth: true
                onInsertWidgetRequested: function(html) { setupRoot.insertWidgetRequested(html) }
                onCloseRequested: setupRoot.close()
            }

            NotesFocusSetupForm {
                id: focusSetupForm
                visible: setupRoot.activeMode === "foco"
                controller: setupRoot.controller
                onCloseRequested: setupRoot.close()
                onInsertWidgetRequested: function(html) { setupRoot.insertWidgetRequested(html) }
            }

            NotesCalendarEventForm {
                id: calendarEventForm
                visible: setupRoot.activeMode === "evento"
                Layout.fillWidth: true
                controller: setupRoot.controller
                pageId: setupRoot.pageId
                pageTitle: setupRoot.pageTitle
                onInsertWidgetRequested: function(html) { setupRoot.insertWidgetRequested(html) }
                onCloseRequested: setupRoot.close()
            }

        }
    }
}
