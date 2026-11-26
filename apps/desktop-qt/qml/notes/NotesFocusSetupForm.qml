pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesHtmlEscaping.js" as HtmlEscaping
import "../ui"

ColumnLayout {
    id: focusForm

    property var controller: null
    property string selectedDuration: "30"
    property string errorMessage: ""
    readonly property var presetTimes: [15, 25, 30, 45, 60]

    signal closeRequested()
    signal insertWidgetRequested(string html)

    Layout.fillWidth: true
    spacing: 8

    function openForPrefill(prefill) {
        var values = prefill || ({})
        tagField.text = String(values.tag || "")
        descriptionField.text = String(values.desc || "")
        selectedDuration = String(values.time || 30)
        errorMessage = ""
    }

    ColumnLayout {
        Layout.fillWidth: true
        spacing: 4
        RowLayout {
            spacing: 6
            AppIcon { name: "tag"; color: "#a78bfa"; Layout.preferredWidth: 14; Layout.preferredHeight: 14 }
            Text { objectName: "notesFocusTagLabel"; text: qsTr("Tag da Sessão"); color: "#a7a9be"; font.pixelSize: 12; font.weight: Font.Medium }
        }
        TextField {
            id: tagField
            objectName: "notesFocusTagField"
            Layout.fillWidth: true
            Layout.preferredHeight: 40
            placeholderText: qsTr("Ex: Estudo, Trabalho, Leitura")
            onTextEdited: focusForm.errorMessage = ""
            color: "#fffffe"
            background: Rectangle { radius: 10; color: "#0f0e17"; border.color: "#2e2e38" }
        }
    }

    ColumnLayout {
        Layout.fillWidth: true
        spacing: 4
        RowLayout {
            spacing: 6
            AppIcon { name: "align-left"; color: "#a78bfa"; Layout.preferredWidth: 14; Layout.preferredHeight: 14 }
            Text { objectName: "notesFocusDescriptionLabel"; text: qsTr("Descrição"); color: "#a7a9be"; font.pixelSize: 12; font.weight: Font.Medium }
        }
        TextField {
            id: descriptionField
            objectName: "notesFocusDescriptionField"
            Layout.fillWidth: true
            Layout.preferredHeight: 40
            placeholderText: qsTr("Ex: Estudando Cálculo Capítulo 4")
            onTextEdited: focusForm.errorMessage = ""
            color: "#fffffe"
            background: Rectangle { radius: 10; color: "#0f0e17"; border.color: "#2e2e38" }
        }
    }

    RowLayout {
        spacing: 6
        AppIcon { name: "clock"; color: "#a78bfa"; Layout.preferredWidth: 14; Layout.preferredHeight: 14 }
        Text { objectName: "notesFocusDurationLabel"; text: qsTr("Tempo Alvo (minutos)"); color: "#a7a9be"; font.pixelSize: 12; font.weight: Font.Medium }
    }

    RowLayout {
        Layout.fillWidth: true
        spacing: 6
        Repeater {
            model: focusForm.presetTimes
            delegate: Button {
                id: durationPreset
                required property var modelData
                Layout.fillWidth: true
                Layout.preferredHeight: 28
                onClicked: focusForm.selectedDuration = String(durationPreset.modelData)
                background: Rectangle {
                    radius: 6
                    color: focusForm.selectedDuration === String(durationPreset.modelData) ? "#338b5cf6" : "#0f0e17"
                    border.color: focusForm.selectedDuration === String(durationPreset.modelData) ? "#8b5cf6" : "#2e2e38"
                }
                contentItem: Text {
                    text: durationPreset.modelData + "m"
                    color: "#e2e8f0"
                    font.pixelSize: 11
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }
    }

    TextField {
        id: durationField
        objectName: "notesFocusDurationField"
        Layout.fillWidth: true
        Layout.preferredHeight: 40
        placeholderText: qsTr("Minutos")
        text: focusForm.selectedDuration
        validator: IntValidator { bottom: 1; top: 240 }
        onTextEdited: {
            focusForm.selectedDuration = text
            focusForm.errorMessage = ""
        }
        color: "#fffffe"
        background: Rectangle { radius: 10; color: "#0f0e17"; border.color: "#2e2e38" }
    }

    Button {
        Layout.fillWidth: true
        Layout.preferredHeight: 36
        enabled: tagField.text.trim().length > 0 && descriptionField.text.trim().length > 0 &&
            Number(focusForm.selectedDuration) >= 1 && Number(focusForm.selectedDuration) <= 240 &&
            Number(focusForm.selectedDuration) % 1 === 0
        onClicked: {
            var c = focusForm.controller
            if (!c || typeof c.startFocusTimer !== "function") {
                focusForm.errorMessage = qsTr("O timer de foco não está disponível.")
                return
            }
            c.startFocusTimer(Math.max(1, parseInt(focusForm.selectedDuration, 10)),
                tagField.text.trim(), descriptionField.text.trim())
            focusForm.closeRequested()
        }
        background: Rectangle { radius: 8; color: "#7c3aed" }
        contentItem: Text {
            text: qsTr("Iniciar Foco")
            color: "#ffffff"
            font.pixelSize: 12
            font.bold: true
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }

    Button {
        Layout.fillWidth: true
        Layout.preferredHeight: 36
        enabled: tagField.text.trim().length > 0 && descriptionField.text.trim().length > 0 &&
            Number(focusForm.selectedDuration) >= 1 && Number(focusForm.selectedDuration) <= 240 &&
            Number(focusForm.selectedDuration) % 1 === 0
        onClicked: {
            var title = HtmlEscaping.escapeHtmlAttribute(descriptionField.text.trim())
            var duration = Math.max(1, parseInt(focusForm.selectedDuration, 10))
            var tag = HtmlEscaping.escapeHtmlAttribute(tagField.text.trim())
            focusForm.insertWidgetRequested(
                "<span data-type=\"focus-widget\" data-duration=\"" + duration +
                "\" data-tag=\"" + tag + "\" data-description=\"" + title +
                "\" data-status=\"paused\"></span>")
            focusForm.closeRequested()
        }
        background: Rectangle { radius: 8; color: "#1d1c2e"; border.color: "#2e2e38" }
        contentItem: Text {
            text: qsTr("Inserir timer na nota")
            color: "#e2e8f0"
            font.pixelSize: 11
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }

    Text {
        visible: focusForm.errorMessage.length > 0
        text: focusForm.errorMessage
        color: "#fda4af"
        font.pixelSize: 11
        wrapMode: Text.Wrap
        Layout.fillWidth: true
    }
}
