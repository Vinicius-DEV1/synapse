import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: modalRoot
    anchors.fill: parent
    color: "#88000000"
    z: 95

    property string selectedColor: "#3b82f6"
    property string initialDateStr: ""
    property var initialEvent: null
    property string errorMessage: ""

    signal eventSubmitted(string title, string desc, string dateTime, string color)
    signal closed()

    function loadInitialEvent() {
        errorMessage = ""
        if (initialEvent) {
            eventTitleInput.text = initialEvent.title || ""
            eventDescInput.text = initialEvent.description || ""
            eventDateInput.text = initialEvent.start_date || initialEvent.start_time || ""
            selectedColor = initialEvent.color || "#3b82f6"
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
    }

    MouseArea {
        anchors.fill: parent
        onClicked: modalRoot.closed()
    }

    Rectangle {
        anchors.centerIn: parent
        width: 460
        height: 420
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

            // Color Tag Picker
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6
                Text { text: "Etiqueta de Cor"; color: "#a7a9be"; font.pixelSize: 12 }
                RowLayout {
                    spacing: 10
                    Repeater {
                        model: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#06b6d4"]
                        delegate: Rectangle {
                            width: 28; height: 28; radius: 14
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

            Item { Layout.fillHeight: true }

            // Actions Footer
            RowLayout {
                Layout.fillWidth: true
                spacing: 12
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
                            modalRoot.eventSubmitted(eventTitleInput.text, eventDescInput.text, eventDateInput.text, modalRoot.selectedColor)
                        }
                    }
                }
            }
        }
    }
}
