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

    Shortcut {
        objectName: "notesAlarmEscapeShortcut"
        sequence: "Escape"
        enabled: setupRoot.activeMode === "alarme"
        onActivated: setupRoot.close()
    }

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
        if (!c) {
            if (mode === "habito") Qt.callLater(widgetPicker.focusSearchField)
            if (mode === "question") Qt.callLater(questionCreateForm.focusTitleField)
            return
        }
        if (mode === "question" && typeof c.getQuizBatteries === "function") {
            listItems = c.getQuizBatteries() || []
        } else if (mode === "habito" && typeof c.getHabits === "function") {
            listItems = c.getHabits() || []
        } else if (mode === "alarme" && typeof c.getAlarms === "function") {
            listItems = c.getAlarms() || []
        }
        if (mode === "habito") Qt.callLater(widgetPicker.focusSearchField)
        if (mode === "question") Qt.callLater(questionCreateForm.focusTitleField)
    }

    function close() { activeMode = ""; closed() }

    Rectangle {
        visible: setupRoot.activeMode !== "alarme"
        anchors.fill: parent
        color: "#b0000000"
        MouseArea { anchors.fill: parent; onClicked: setupRoot.close() }
    }

    Rectangle {
        objectName: "notesSetupModalCard"
        visible: setupRoot.activeMode !== "alarme"
        width: setupRoot.activeMode === "alarme" ? Math.min(parent.width - 32, 672)
            : setupRoot.activeMode === "evento" ? Math.max(0, Math.min(448, parent.width - 32)) : 450
        height: setupRoot.activeMode === "alarme"
            ? Math.min(parent.height - 32, cardCol.implicitHeight + 48)
            : Math.min(parent.height - 48, cardCol.implicitHeight + 40)
        anchors.centerIn: parent
        radius: 16
        color: setupRoot.activeMode === "alarme" ? "#0f0e17" : "#161522"
        border.color: setupRoot.activeMode === "alarme" || setupRoot.activeMode === "question" || setupRoot.activeMode === "evento"
            ? "#1affffff" : "#338b5cf6"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: cardCol
            anchors.fill: parent
            anchors.margins: setupRoot.activeMode === "alarme" ? 24
                : setupRoot.activeMode === "question" || setupRoot.activeMode === "evento" ? 16 : 20
            spacing: setupRoot.activeMode === "alarme" ? 18
                : setupRoot.activeMode === "question" ? 16 : 12

            NotesSetupModalHeader {
                mode: setupRoot.activeMode
                onCloseRequested: setupRoot.close()
            }

            NotesSetupWidgetPickerPanel {
                id: widgetPicker
                objectName: "notesSetupWidgetPickerPanel"
                visible: setupRoot.activeMode !== "alarme" && setupRoot.activeMode !== "foco"
                    && setupRoot.activeMode !== "question"
                mode: setupRoot.activeMode
                controller: setupRoot.controller
                listItems: setupRoot.listItems
                searchFilter: setupRoot.searchFilter
                Layout.fillWidth: true
                onFilterEdited: function(value) { setupRoot.searchFilter = value }
                onInsertWidgetRequested: function(html) { setupRoot.insertWidgetRequested(html) }
                onCloseRequested: setupRoot.close()
            }

            NotesQuestionCreateForm {
                id: questionCreateForm
                objectName: "notesQuestionCreateForm"
                visible: setupRoot.activeMode === "question"
                controller: setupRoot.controller
                pageId: setupRoot.pageId
                listItems: setupRoot.listItems
                searchFilter: setupRoot.searchFilter
                Layout.fillWidth: true
                onFilterEdited: function(value) { setupRoot.searchFilter = value }
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

    Rectangle {
        id: alarmCanvas
        objectName: "notesAlarmSetupCanvas"
        anchors.fill: parent
        visible: setupRoot.activeMode === "alarme"
        color: "#e60f0e17"
        z: 1

        TapHandler {
            acceptedButtons: Qt.LeftButton
            onTapped: function(eventPoint) {
                var localPoint = alarmContent.mapFromItem(alarmCanvas,
                    eventPoint.position.x, eventPoint.position.y)
                if (localPoint.x < 0 || localPoint.x > alarmContent.width)
                    setupRoot.close()
            }
        }

        Flickable {
            id: alarmScroll
            objectName: "notesAlarmSetupScroll"
            anchors.fill: parent
            clip: true
            contentWidth: width
            contentHeight: alarmContent.implicitHeight + 88
            boundsBehavior: Flickable.StopAtBounds

            ColumnLayout {
                id: alarmContent
                objectName: "notesAlarmSetupContent"
                x: Math.max(16, (alarmScroll.width - width) / 2)
                y: 24
                width: Math.max(0, Math.min(alarmScroll.width - 32, 672))
                spacing: 24

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 16

                    AppIcon {
                        name: "clock"
                        color: "#a78bfa"
                        Layout.preferredWidth: 32
                        Layout.preferredHeight: 32
                    }

                    Text {
                        objectName: "notesAlarmCanvasTitle"
                        Layout.fillWidth: true
                        text: qsTr("Novo Alarme")
                        color: "#fffffe"
                        font.pixelSize: alarmScroll.width < 640 ? 24 : 30
                        font.weight: Font.ExtraBold
                        elide: Text.ElideRight
                    }

                    ToolButton {
                        id: alarmCanvasCloseButton
                        objectName: "notesAlarmCanvasCloseButton"
                        Layout.preferredWidth: 48
                        Layout.preferredHeight: 48
                        Accessible.name: qsTr("Cancelar")
                        onClicked: setupRoot.close()
                        background: Rectangle {
                            radius: 12
                            color: alarmCanvasCloseButton.hovered ? "#1affffff" : "#161524"
                            border.color: "#0fffffff"
                        }
                        contentItem: AppIcon {
                            name: "close"
                            color: "#a7a9be"
                            width: 24
                            height: 24
                        }
                    }
                }

                NotesAlarmSetupForm {
                    id: alarmSetupForm
                    objectName: "notesAlarmSetupForm"
                    controller: setupRoot.controller
                    alarmItems: setupRoot.listItems
                    Layout.fillWidth: true
                    onInsertWidgetRequested: function(html) { setupRoot.insertWidgetRequested(html) }
                    onCloseRequested: setupRoot.close()
                }

                Item { Layout.fillWidth: true; Layout.preferredHeight: 40 }
            }
        }
    }
}
