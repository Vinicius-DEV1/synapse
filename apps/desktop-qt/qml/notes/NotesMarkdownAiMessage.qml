import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: root
    objectName: "notesMarkdownAiMessage"
    property var message: ({})
    property int messageIndex: -1
    property bool isAddingQuestions: false
    property string questionAddError: ""
    readonly property bool isQuestionTargetAdded: Boolean(message.questionsAdded)

    signal addQuestionsRequested(int index)
    signal viewProposalRequested(string markdown)

    width: ListView.view ? ListView.view.width : 480
    spacing: 5

    Rectangle {
        Layout.alignment: root.message.role === "user" ? Qt.AlignRight : Qt.AlignLeft
        Layout.maximumWidth: root.width * 0.85
        Layout.preferredWidth: Math.min(Layout.maximumWidth, Math.max(120, messageText.implicitWidth + 28))
        implicitHeight: messageText.implicitHeight + 20
        radius: 12
        color: root.message.role === "user" ? "#4f46e5" : "#201f30"
        border.color: root.message.role === "user" ? "transparent" : "#18ffffff"

        Text {
            id: messageText
            anchors.fill: parent
            anchors.margins: 10
            text: root.message.text || ""
            color: "#fffffe"
            font.pixelSize: 12
            wrapMode: Text.Wrap
        }
    }

    RowLayout {
        visible: String(root.message.proposal || "").length > 0
        Layout.fillWidth: true
        spacing: 8
        Label { text: qsTr("Nova versão do documento gerada"); color: "#6ee7b7"; font.pixelSize: 10; Layout.fillWidth: true }
        Button {
            objectName: "notesMarkdownAiViewProposalButton"
            text: qsTr("Ver proposta")
            onClicked: root.viewProposalRequested(String(root.message.proposal || ""))
        }
    }

    NotesMarkdownAiGeneratedQuestions {
        visible: Array.isArray(root.message.generatedQuestions) && root.message.generatedQuestions.length > 0 && Boolean(root.message.targetBattery)
        battery: root.message.targetBattery || ({})
        questions: root.message.generatedQuestions || []
        added: root.isQuestionTargetAdded
        errorText: root.questionAddError
        adding: root.isAddingQuestions
        onAddRequested: root.addQuestionsRequested(root.messageIndex)
    }
}
