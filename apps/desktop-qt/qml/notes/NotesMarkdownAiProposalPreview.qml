import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root
    objectName: "notesMarkdownAiProposalPreview"
    property string currentText: ""
    property string proposedText: ""
    property bool saving: false

    signal discardRequested()
    signal applyRequested()

    visible: proposedText.length > 0
    Layout.fillWidth: true
    Layout.fillHeight: true
    Layout.minimumHeight: 180
    radius: 10
    color: "#111018"
    border.color: "#1affffff"

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 10
        spacing: 8
        RowLayout {
            Layout.fillWidth: true
            Label { text: qsTr("Documento atual"); color: "#a7a9be"; font.pixelSize: 10; Layout.fillWidth: true }
            Label { text: qsTr("Proposta da IA"); color: "#c4b5fd"; font.pixelSize: 10; Layout.fillWidth: true }
        }
        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 8
            ScrollView {
                Layout.fillWidth: true; Layout.fillHeight: true; clip: true
                TextArea {
                    readOnly: true; selectByMouse: true; wrapMode: TextEdit.Wrap
                    textFormat: TextEdit.PlainText; text: root.currentText
                    color: "#a7a9be"; font.family: "monospace"; font.pixelSize: 11
                    background: Rectangle { color: "transparent" }
                }
            }
            Rectangle { width: 1; Layout.fillHeight: true; color: "#14ffffff" }
            ScrollView {
                Layout.fillWidth: true; Layout.fillHeight: true; clip: true
                TextArea {
                    objectName: "notesMarkdownAiProposalText"
                    readOnly: true; selectByMouse: true; wrapMode: TextEdit.Wrap
                    textFormat: TextEdit.PlainText; text: root.proposedText
                    color: "#e4e4e7"; font.family: "monospace"; font.pixelSize: 11
                    background: Rectangle { color: "transparent" }
                }
            }
        }
        RowLayout {
            Layout.fillWidth: true
            Label { text: qsTr("A aplicação salva uma cópia criptografada do arquivo."); color: "#71717a"; font.pixelSize: 10; Layout.fillWidth: true }
            Button { objectName: "notesMarkdownAiDiscardProposalButton"; text: qsTr("Descartar proposta"); enabled: !root.saving; onClicked: root.discardRequested() }
            Button {
                objectName: "notesMarkdownAiApplyProposalButton"
                text: root.saving ? qsTr("Salvando…") : qsTr("Aplicar proposta")
                enabled: !root.saving
                highlighted: true
                onClicked: root.applyRequested()
            }
        }
    }
}
