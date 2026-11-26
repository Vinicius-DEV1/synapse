pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesHtmlEscaping.js" as HtmlEscaping

ColumnLayout {
    id: alarmForm
    objectName: "notesAlarmSetupForm"

    property var controller: null
    property var alarmItems: []
    property string errorMessage: ""
    property bool alarmLinksExpanded: false

    signal insertWidgetRequested(string html)
    signal closeRequested()

    Layout.fillWidth: true
    spacing: 14

    function openForTime(time) {
        alarmTimeField.text = String(time || "12:00")
        alarmLabelField.text = ""
        alarmLinksExpanded = false
        errorMessage = ""
    }

    function createAlarm() {
        if (!alarmTimeField.acceptableInput) {
            errorMessage = qsTr("Informe um horário válido no formato HH:mm.")
            return
        }
        var c = alarmForm.controller
        if (!c || typeof c.createAlarm !== "function") {
            errorMessage = qsTr("O serviço de alarmes não está disponível.")
            return
        }
        if (!c.createAlarm(alarmTimeField.text.trim(), alarmLabelField.text.trim() || "Alarme", "", true, "")) {
            errorMessage = qsTr("Não foi possível salvar o alarme.")
            return
        }
        closeRequested()
    }

    Rectangle {
        Layout.fillWidth: true
        Layout.preferredHeight: 164
        radius: 16
        color: "#161522"
        border.color: "#0dffffff"
        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 20
            spacing: 10
            Text {
                objectName: "notesAlarmTimeLabel"
                text: qsTr("HORÁRIO")
                color: "#a7a9be"
                font.pixelSize: 12
                font.weight: Font.Bold
                font.letterSpacing: 1.2
            }
            TextField {
                id: alarmTimeField
                objectName: "notesAlarmTimeField"
                Layout.fillWidth: true
                Layout.fillHeight: true
                text: "12:00"
                placeholderText: "12:00"
                validator: RegularExpressionValidator { regularExpression: /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/ }
                color: "#fffffe"
                font.pixelSize: 52
                font.weight: Font.Bold
                font.family: "monospace"
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: TextInput.AlignVCenter
                background: Rectangle { radius: 12; color: "#0f0e17"; border.color: "#15ffffff" }
                onTextEdited: alarmForm.errorMessage = ""
            }
        }
    }

    Rectangle {
        Layout.fillWidth: true
        Layout.preferredHeight: 126
        radius: 16
        color: "#161522"
        border.color: "#0dffffff"
        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 20
            spacing: 10
            Text {
                objectName: "notesAlarmOptionalLabel"
                text: qsTr("RÓTULO (OPCIONAL)")
                color: "#a7a9be"
                font.pixelSize: 12
                font.weight: Font.Bold
                font.letterSpacing: 1.2
            }
            TextField {
                id: alarmLabelField
                objectName: "notesAlarmLabelField"
                Layout.fillWidth: true
                Layout.preferredHeight: 52
                placeholderText: qsTr("Ex: Acordar, Almoço")
                maximumLength: 30
                color: "#fffffe"
                font.pixelSize: 18
                background: Rectangle { radius: 12; color: "#0f0e17"; border.color: "#15ffffff" }
                onTextEdited: alarmForm.errorMessage = ""
            }
        }
    }

    Text {
        visible: alarmForm.errorMessage.length > 0
        Layout.fillWidth: true
        text: alarmForm.errorMessage
        color: "#fda4af"
        font.pixelSize: 12
        wrapMode: Text.WordWrap
    }

    Button {
        id: saveAlarmButton
        objectName: "notesAlarmSaveButton"
        Layout.fillWidth: true
        Layout.preferredHeight: 48
        text: qsTr("SALVAR ALARME")
        enabled: alarmTimeField.acceptableInput
        onClicked: alarmForm.createAlarm()
        background: Rectangle { radius: 12; color: "#8b5cf6" }
        contentItem: Text {
            text: saveAlarmButton.text
            color: "#ffffff"
            font.pixelSize: 15
            font.weight: Font.Bold
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }

    Button {
        objectName: "notesAlarmLinkExistingButton"
        Layout.fillWidth: true
        Layout.preferredHeight: 38
        onClicked: alarmForm.alarmLinksExpanded = !alarmForm.alarmLinksExpanded
        background: Rectangle {
            radius: 10
            color: alarmForm.alarmLinksExpanded ? "#1d1c2e" : "transparent"
            border.color: "#33ffffff"
        }
        contentItem: Text {
            text: alarmForm.alarmLinksExpanded
                ? qsTr("Ocultar alarmes existentes") : qsTr("Vincular alarme existente à nota")
            color: "#c4b5fd"
            font.pixelSize: 11
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }

    ScrollView {
        objectName: "notesAlarmExistingList"
        visible: alarmForm.alarmLinksExpanded
        Layout.fillWidth: true
        Layout.preferredHeight: Math.min(220, alarmForm.alarmItems.length * 42 + 8)
        clip: true
        ColumnLayout {
            width: parent.width
            spacing: 6
            Repeater {
                model: alarmForm.alarmItems
                delegate: Button {
                    id: existingAlarmButton
                    objectName: "notesAlarmExistingItem"
                    required property var modelData
                    Layout.fillWidth: true
                    Layout.preferredHeight: 36
                    onClicked: {
                        var label = HtmlEscaping.escapeHtmlAttribute(modelData.label || "Alarme")
                        var id = HtmlEscaping.escapeHtmlAttribute(modelData.id)
                        var time = HtmlEscaping.escapeHtmlAttribute(modelData.time || "08:00")
                        alarmForm.insertWidgetRequested(
                            "<span class=\"alarm-widget\" data-type=\"alarm-widget\" data-alarm-id=\"" + id +
                            "\" data-time=\"" + time + "\" data-label=\"" + label + "\" data-status=\"pending\"></span>")
                        alarmForm.closeRequested()
                    }
                    background: Rectangle { radius: 8; color: "#1d1c2e"; border.color: "#15ffffff" }
                    contentItem: Text {
                        text: existingAlarmButton.modelData.label || existingAlarmButton.modelData.time || ""
                        color: "#fffffe"
                        font.pixelSize: 12
                        elide: Text.ElideRight
                    }
                }
            }
            Text {
                visible: alarmForm.alarmItems.length === 0
                Layout.fillWidth: true
                text: qsTr("Nenhum alarme existente.")
                color: "#a7a9be"
                font.pixelSize: 12
                horizontalAlignment: Text.AlignHCenter
            }
        }
    }
}
