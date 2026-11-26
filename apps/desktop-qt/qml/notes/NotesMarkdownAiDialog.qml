import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: root
    objectName: "notesMarkdownAiDialog"
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 896)
    height: Math.min(parent.height - 40, parent.height * 0.85)
    radius: 16
    color: "#1a1924"
    border.color: "#24ffffff"

    property string documentName: ""
    property string documentText: ""
    property string proposal: ""
    property string inputText: ""
    property string errorText: ""
    property string batteryLoadError: ""
    property string mentionQuery: ""
    property bool contextWasTrimmed: false
    property bool isGenerating: false
    property bool saving: false
    property bool showMentionMenu: false
    property int selectedMentionIndex: 0
    property var messages: []
    property var attachedBatteries: []
    property var filteredBatteries: []

    signal closeRequested()
    signal sendRequested(string prompt)
    signal cancelRequested()
    signal retryRequested()
    signal discardProposalRequested()
    signal applyProposalRequested()
    signal promptEdited(string value)
    signal batterySelected(string batteryId)
    signal batteryRemoved(string batteryId)
    signal mentionSelectionChanged(int index)
    signal mentionMenuDismissed()
    signal addQuestionsRequested(int messageIndex)
    signal viewProposalRequested(string markdown)

    function focusComposer() { composer.focusInput() }

    MouseArea { anchors.fill: parent }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 20
        spacing: 12

        RowLayout {
            Layout.fillWidth: true
            spacing: 10
            Rectangle {
                Layout.preferredWidth: 30; Layout.preferredHeight: 30
                radius: 9; color: "#1a8b5cf6"
                AppIcon { anchors.centerIn: parent; name: "sparkles"; color: "#c4b5fd"; width: 16; height: 16 }
            }
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2
                Label { text: qsTr("Assistente do documento"); color: "#fffffe"; font.pixelSize: 15; font.bold: true }
                Label { Layout.fillWidth: true; text: root.documentName; color: "#a7a9be"; font.pixelSize: 11; elide: Text.ElideMiddle }
            }
            ToolButton {
                objectName: "notesMarkdownAiCloseButton"
                text: "×"
                enabled: !root.saving
                onClicked: root.closeRequested()
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Fechar (Esc)")
            }
        }

        Label {
            visible: root.contextWasTrimmed
            Layout.fillWidth: true
            text: qsTr("O documento é longo. A IA recebeu o início e o final do texto (até 48 mil caracteres).")
            color: "#fbbf24"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }

        Label {
            visible: root.batteryLoadError.length > 0
            Layout.fillWidth: true
            text: root.batteryLoadError
            color: "#fda4af"
            font.pixelSize: 10
            wrapMode: Text.Wrap
        }

        Flow {
            Layout.fillWidth: true
            spacing: 6
            Repeater {
                model: [
                    { label: qsTr("Aprofundar tópico"), prompt: qsTr("Aprofunde o tópico principal com base no documento.") },
                    { label: qsTr("Melhorar clareza"), prompt: qsTr("Melhore clareza e estilo sem alterar o significado.") },
                    { label: qsTr("Remover redundâncias"), prompt: qsTr("Remova redundâncias e simplifique o documento.") },
                    { label: qsTr("Introdução e conclusão"), prompt: qsTr("Adicione uma introdução e uma conclusão ao documento.") },
                    { label: qsTr("Organizar conteúdo"), prompt: qsTr("Estruture o conteúdo em tópicos e tabelas quando apropriado.") }
                ]
                delegate: Button {
                    required property var modelData
                    height: 30
                    onClicked: root.sendRequested(modelData.prompt)
                    background: Rectangle { radius: 14; color: parent.hovered ? "#288b5cf6" : "#1f1e2e"; border.color: "#338b5cf6" }
                    contentItem: Text { text: modelData.label; color: "#ddd6fe"; font.pixelSize: 11 }
                }
            }
        }

        Rectangle { Layout.fillWidth: true; height: 1; color: "#0cffffff" }

        ListView {
            id: conversation
            objectName: "notesMarkdownAiConversation"
            Layout.fillWidth: true
            Layout.fillHeight: root.proposal.length === 0
            Layout.preferredHeight: root.proposal.length > 0 ? 138 : 0
            clip: true
            spacing: 8
            model: root.messages
            delegate: NotesMarkdownAiMessage {
                required property var modelData
                required property int index
                width: conversation.width
                message: modelData
                messageIndex: index
                questionAddError: String(modelData.questionAddError || "")
                onAddQuestionsRequested: root.addQuestionsRequested(index)
                onViewProposalRequested: function(markdown) { root.viewProposalRequested(markdown) }
            }
            onCountChanged: positionViewAtEnd()
        }

        RowLayout {
            visible: root.isGenerating
            Layout.fillWidth: true
            BusyIndicator { running: root.isGenerating; Layout.preferredWidth: 20; Layout.preferredHeight: 20 }
            Label { text: qsTr("Analisando o documento…"); color: "#c4b5fd"; font.pixelSize: 11 }
            Item { Layout.fillWidth: true }
            Button { objectName: "notesMarkdownAiCancelButton"; text: qsTr("Cancelar"); onClicked: root.cancelRequested() }
        }

        Label {
            visible: root.errorText.length > 0
            Layout.fillWidth: true
            text: root.errorText
            color: "#fda4af"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }
        Button {
            objectName: "notesMarkdownAiRetryButton"
            visible: root.errorText.length > 0
            text: qsTr("Tentar novamente")
            enabled: !root.isGenerating
            onClicked: root.retryRequested()
        }

        NotesMarkdownAiProposalPreview {
            currentText: root.documentText
            proposedText: root.proposal
            saving: root.saving
            onDiscardRequested: root.discardProposalRequested()
            onApplyRequested: root.applyProposalRequested()
        }

        NotesMarkdownAiComposer {
            id: composer
            Layout.fillWidth: true
            promptText: root.inputText
            mentionQuery: root.mentionQuery
            showMentionMenu: root.showMentionMenu
            selectedMentionIndex: root.selectedMentionIndex
            attachedBatteries: root.attachedBatteries
            filteredBatteries: root.filteredBatteries
            busy: root.isGenerating || root.saving
            onPromptEdited: function(value) { root.promptEdited(value) }
            onPromptSubmitted: root.sendRequested(root.inputText)
            onBatterySelected: function(batteryId) { root.batterySelected(batteryId) }
            onBatteryRemoved: function(batteryId) { root.batteryRemoved(batteryId) }
            onMentionSelectionChanged: function(index) { root.mentionSelectionChanged(index) }
            onMentionMenuDismissed: root.mentionMenuDismissed()
        }
    }
}
