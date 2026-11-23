import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: modalRoot
    anchors.fill: parent
    color: "#88000000"
    z: 95

    property string selectedColor: "#3b82f6"
    property string selectedType: "event"
    property string selectedRecurrence: "none"
    property string initialDateStr: ""
    property var initialEvent: null
    property string errorMessage: ""

    signal eventSubmitted(string title, string desc, string dateTime, string color, string type, string pageId, var reminders, string recurrence)
    signal eventDeleted(string eventId, bool deleteAll)
    signal closed()

    function loadInitialEvent() {
        errorMessage = ""
        if (initialEvent) {
            eventTitleInput.text = initialEvent.title || ""
            eventDescInput.text = initialEvent.description || ""
            eventDateInput.text = initialEvent.start_date || initialEvent.start_time || ""
            selectedColor = initialEvent.color || "#3b82f6"
            selectedType = initialEvent.type || initialEvent.type_ || "event"
            selectedRecurrence = "none"
            var rems = initialEvent.reminders
            if (typeof rems === "string") {
                try { rems = JSON.parse(rems) } catch (e) { rems = [] }
            }
            remindersPicker.setFromMinutesArray(rems)
            return
        }
        resetFields()
        if (initialDateStr) eventDateInput.text = initialDateStr
    }

    onVisibleChanged: if (visible) loadInitialEvent()

    onInitialDateStrChanged: {
        if (initialDateStr && initialDateStr.length > 0) {
            eventDateInput.text = initialDateStr
        }
    }

    function resetFields() {
        eventTitleInput.text = ""
        eventDescInput.text = ""
        eventDateInput.text = Qt.formatDateTime(new Date(), "yyyy-MM-ddThh:mm:ss")
        selectedColor = "#3b82f6"
        selectedType = "event"
        selectedRecurrence = "none"
        remindersPicker.setFromMinutesArray([15])
    }

    MouseArea {
        anchors.fill: parent
        onClicked: modalRoot.closed()
    }

    Rectangle {
        anchors.centerIn: parent
        width: 480
        height: 500
        radius: 16
        color: "#161524"
        border.color: "#14ffffff"
        border.width: 1

        MouseArea {
            anchors.fill: parent
        }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 28
            spacing: 16

            RowLayout {
                Layout.fillWidth: true
                Text { text: modalRoot.initialEvent ? qsTr("Edit calendar event") : qsTr("New calendar event"); color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                Item { Layout.fillWidth: true }
                Text {
                    text: "✕"
                    color: "#a7a9be"
                    font.pixelSize: 16
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: modalRoot.closed()
                    }
                }
            }

            Label {
                Layout.fillWidth: true
                visible: modalRoot.errorMessage.length > 0
                text: modalRoot.errorMessage
                color: "#fda4af"
                font.pixelSize: 11
                wrapMode: Text.Wrap
            }

            // Type Selector
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Repeater {
                    model: [
                        { id: "event", label: "📅 Evento" },
                        { id: "task", label: "✓ Tarefa" },
                        { id: "reminder", label: "🔔 Lembrete" }
                    ]
                    delegate: Rectangle {
                        id: typeChip
                        property var itemData: modelData
                        Layout.fillWidth: true
                        height: 34
                        radius: 8
                        color: modalRoot.selectedType === typeChip.itemData.id ? "#263b82f6" : "#15141b"
                        border.color: modalRoot.selectedType === typeChip.itemData.id ? "#3b82f6" : "#15ffffff"
                        border.width: 1

                        Text {
                            anchors.centerIn: parent
                            text: typeChip.itemData.label
                            color: modalRoot.selectedType === typeChip.itemData.id ? "#ffffff" : "#a7a9be"
                            font.pixelSize: 12
                            font.bold: modalRoot.selectedType === typeChip.itemData.id
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: modalRoot.selectedType = typeChip.itemData.id
                        }
                    }
                }
            }

            // Title Input
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6
                Text { text: "Título do Compromisso"; color: "#a7a9be"; font.pixelSize: 12 }
                Rectangle {
                    Layout.fillWidth: true
                    height: 38
                    radius: 8
                    color: "#15141b"
                    border.color: eventTitleInput.activeFocus ? "#3b82f6" : "#15ffffff"
                    TextInput {
                        id: eventTitleInput
                        anchors.fill: parent
                        anchors.leftMargin: 12; anchors.rightMargin: 12
                        verticalAlignment: TextInput.AlignVCenter
                        color: "#fffffe"
                        font.pixelSize: 13
                        selectByMouse: true
                    }
                }
            }

            // Description Input
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6
                Text { text: "Descrição (opcional)"; color: "#a7a9be"; font.pixelSize: 12 }
                Rectangle {
                    Layout.fillWidth: true
                    height: 38
                    radius: 8
                    color: "#15141b"
                    border.color: eventDescInput.activeFocus ? "#3b82f6" : "#15ffffff"
                    TextInput {
                        id: eventDescInput
                        anchors.fill: parent
                        anchors.leftMargin: 12; anchors.rightMargin: 12
                        verticalAlignment: TextInput.AlignVCenter
                        color: "#fffffe"
                        font.pixelSize: 13
                        selectByMouse: true
                    }
                }
            }

            // Date / Time Input
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6
                Text { text: "Data e Hora"; color: "#a7a9be"; font.pixelSize: 12 }
                Rectangle {
                    Layout.fillWidth: true
                    height: 38
                    radius: 8
                    color: "#15141b"
                    border.color: eventDateInput.activeFocus ? "#3b82f6" : "#15ffffff"
                    TextInput {
                        id: eventDateInput
                        anchors.fill: parent
                        anchors.leftMargin: 12; anchors.rightMargin: 12
                        verticalAlignment: TextInput.AlignVCenter
                        color: "#fffffe"
                        font.pixelSize: 13
                        selectByMouse: true
                        text: Qt.formatDateTime(new Date(), "yyyy-MM-ddThh:mm:ss")
                    }
                }
            }

            // Color Tag Picker & Recurrence
            RowLayout {
                Layout.fillWidth: true
                spacing: 16

                ColumnLayout {
                    Layout.fillWidth: modalRoot.initialEvent !== null
                    spacing: 6
                    Text { text: "Etiqueta de Cor"; color: "#a7a9be"; font.pixelSize: 12 }
                    RowLayout {
                        spacing: 8
                        Repeater {
                            model: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#06b6d4"]
                            delegate: Rectangle {
                                width: 26; height: 26; radius: 13
                                color: modelData
                                border.color: modalRoot.selectedColor === modelData ? "#ffffff" : "transparent"
                                border.width: 2
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: modalRoot.selectedColor = modelData
                                }
                            }
                        }
                    }
                }

                // Recurrence Selector (visible when creating new event)
                ColumnLayout {
                    visible: modalRoot.initialEvent === null
                    Layout.fillWidth: true
                    spacing: 6
                    Text { text: "Repetição"; color: "#a7a9be"; font.pixelSize: 12 }
                    ComboBox {
                        id: recurrenceCombo
                        Layout.fillWidth: true
                        Layout.preferredHeight: 34
                        model: [
                            { key: "none", label: "Não repetir" },
                            { key: "daily", label: "Todos os dias" },
                            { key: "weekly", label: "Toda semana" },
                            { key: "monthly", label: "Todo mês" },
                            { key: "yearly", label: "Todo ano" }
                        ]
                        textRole: "label"
                        currentIndex: 0
                        onActivated: function(index) {
                            modalRoot.selectedRecurrence = model[index].key
                        }
                    }
                }
            }

            // Reminders Selector
            CalendarEventFormReminders {
                id: remindersPicker
            }

            Item { Layout.fillHeight: true }

            // Actions Footer
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                // Delete Button (when editing)
                Rectangle {
                    visible: modalRoot.initialEvent !== null
                    width: 75; height: 38; radius: 8; color: "#26f43f5e"
                    border.color: "#f43f5e"
                    Text { anchors.centerIn: parent; text: "Excluir"; color: "#f43f5e"; font.pixelSize: 12; font.bold: true }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (modalRoot.initialEvent && modalRoot.initialEvent.id) {
                                modalRoot.eventDeleted(modalRoot.initialEvent.id, false)
                            }
                            modalRoot.closed()
                        }
                    }
                }

                // Delete Series Button (when editing a recurring event)
                Rectangle {
                    visible: modalRoot.initialEvent !== null && modalRoot.initialEvent.recurrence_rule && modalRoot.initialEvent.recurrence_rule.indexOf("group_") === 0
                    width: 120; height: 38; radius: 8; color: "#33ef4444"
                    border.color: "#ef4444"
                    Text { anchors.centerIn: parent; text: "Excluir Série"; color: "#fca5a5"; font.pixelSize: 11; font.bold: true }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (modalRoot.initialEvent && modalRoot.initialEvent.id) {
                                modalRoot.eventDeleted(modalRoot.initialEvent.id, true)
                            }
                            modalRoot.closed()
                        }
                    }
                }

                Item { Layout.fillWidth: true }
                Rectangle {
                    width: 90; height: 38; radius: 8; color: "#211f30"
                    Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: modalRoot.closed()
                    }
                }
                Rectangle {
                    width: 120; height: 38; radius: 8; color: "#3b82f6"
                    Text { anchors.centerIn: parent; text: modalRoot.initialEvent ? qsTr("Save changes") : qsTr("Save event"); color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (eventTitleInput.text.trim().length === 0 || eventDateInput.text.trim().length === 0) {
                                modalRoot.errorMessage = qsTr("Enter a title and date.")
                                return
                            }
                            modalRoot.errorMessage = ""
                            modalRoot.eventSubmitted(
                                eventTitleInput.text,
                                eventDescInput.text,
                                eventDateInput.text,
                                modalRoot.selectedColor,
                                modalRoot.selectedType,
                                "",
                                remindersPicker.getMinutesArray(),
                                modalRoot.selectedRecurrence
                            )
                        }
                    }
                }
            }
        }
    }
}
