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
    property string pageId: ""
    property string pageTitle: ""
    property string activeMode: "" // "question" | "foco" | "alarme" | "evento" | "habito"
    property var listItems: []
    property string searchFilter: ""
    property string selectedFocusDuration: "30"
    readonly property var focusDurationOptions: [
        { duration: 15, setup: setupRoot },
        { duration: 25, setup: setupRoot },
        { duration: 30, setup: setupRoot },
        { duration: 45, setup: setupRoot },
        { duration: 60, setup: setupRoot }
    ]

    signal insertWidgetRequested(string html)
    signal closed()

    function openMode(mode, prefill) {
        activeMode = mode
        listItems = []
        searchFilter = ""
        var pf = (typeof prefill === "string") ? ({ query: prefill, title: prefill, desc: prefill }) : (prefill || ({}))
        if (mode === "foco") {
            mainTitleField.text = pf.desc || ""
            selectedFocusDuration = String(pf.time || 30)
            tagField.text = pf.tag || ""
        } else if (mode === "evento") {
            calendarEventForm.openForTitle(pf.title || qsTr("Novo Evento"))
        } else if (mode === "alarme") {
            widgetPicker.setAlarmPrefill(pf.timeStr || "12:00")
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
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text {
                        text: setupRoot.activeMode === "question" ? qsTr("Criar / Inserir Questão")
                            : setupRoot.activeMode === "foco" ? qsTr("Configurar Timer de Foco")
                            : setupRoot.activeMode === "alarme" ? qsTr("Criar / Inserir Alarme")
                            : setupRoot.activeMode === "evento" ? qsTr("Criar Evento na Agenda")
                            : qsTr("Vincular ou Criar Hábito")
                        color: "#fffffe"
                        font.pixelSize: 15
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
                ToolButton {
                    id: setupCloseButton
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 26
                    onClicked: setupRoot.close()
                    background: Rectangle { radius: 6; color: setupCloseButton.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#94a1b2"; width: 12; height: 12 }
                }
            }

            NotesSetupWidgetPickerPanel {
                id: widgetPicker
                mode: setupRoot.activeMode
                controller: setupRoot.controller
                listItems: setupRoot.listItems
                searchFilter: setupRoot.searchFilter
                Layout.fillWidth: true
                onFilterEdited: function(value) { setupRoot.searchFilter = value }
                onInsertWidgetRequested: function(html) { setupRoot.insertWidgetRequested(html) }
                onCloseRequested: setupRoot.close()
            }

            ColumnLayout {
                visible: setupRoot.activeMode === "foco"
                Layout.fillWidth: true
                spacing: 8

                TextField {
                    id: mainTitleField
                    Layout.fillWidth: true
                    placeholderText: qsTr("Descrição (ex: Revisão)")
                    color: "#fffffe"
                    background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
                }
                TextField {
                    id: tagField
                    Layout.fillWidth: true
                    placeholderText: qsTr("Tag (ex: Estudo, Código)")
                    text: ""
                    color: "#fffffe"
                    background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
                }
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Repeater {
                        model: setupRoot.focusDurationOptions
                        delegate: Button {
                            id: durationPreset
                            required property var modelData
                            Layout.fillWidth: true
                            Layout.preferredHeight: 28
                            onClicked: durationPreset.modelData.setup.selectedFocusDuration = String(durationPreset.modelData.duration)
                            background: Rectangle {
                                radius: 6
                                color: durationPreset.modelData.setup.selectedFocusDuration === String(durationPreset.modelData.duration) ? "#338b5cf6" : "#0f0e17"
                                border.color: durationPreset.modelData.setup.selectedFocusDuration === String(durationPreset.modelData.duration) ? "#8b5cf6" : "#2e2e38"
                            }
                            contentItem: Text {
                                text: durationPreset.modelData.duration + "m"
                                color: "#e2e8f0"
                                font.pixelSize: 11
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                            }
                        }
                    }
                }
                TextField {
                    Layout.fillWidth: true
                    placeholderText: qsTr("Duração em minutos (ex: 25)")
                    text: setupRoot.selectedFocusDuration
                    onTextEdited: setupRoot.selectedFocusDuration = text
                    color: "#fffffe"
                    background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
                }
                Button {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 36
                    enabled: mainTitleField.text.trim().length > 0 && tagField.text.trim().length > 0 &&
                        Number(setupRoot.selectedFocusDuration) >= 1 && Number(setupRoot.selectedFocusDuration) % 1 === 0
                    onClicked: {
                        var rawTitle = mainTitleField.text.trim()
                        var title = HtmlEscaping.escapeHtmlAttribute(rawTitle)
                        var mins = Math.max(1, parseInt(setupRoot.selectedFocusDuration || "30", 10) || 30)
                        var tag = HtmlEscaping.escapeHtmlAttribute(tagField.text.trim())
                        setupRoot.insertWidgetRequested(
                            "<span data-type=\"focus-widget\" data-duration=\"" + mins +
                            "\" data-tag=\"" + tag + "\" data-description=\"" + title +
                            "\" data-status=\"paused\"></span>")
                        setupRoot.close()
                    }
                    background: Rectangle { radius: 8; color: "#7c3aed" }
                    contentItem: Text {
                        text: qsTr("Inserir na Nota")
                        color: "#ffffff"
                        font.pixelSize: 12
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
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
