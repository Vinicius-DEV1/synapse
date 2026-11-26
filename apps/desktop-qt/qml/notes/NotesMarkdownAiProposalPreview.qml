import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesMarkdownAiDiff.js" as MarkdownDiff

Rectangle {
    id: root
    objectName: "notesMarkdownAiProposalPreview"
    property string currentText: ""
    property string proposedText: ""
    property bool saving: false
    property bool showRawProposal: false
    readonly property var diffLines: MarkdownDiff.compute(currentText, proposedText)

    function wordCount(text) {
        var trimmed = String(text || "").trim()
        return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length
    }

    signal discardRequested()
    signal applyRequested()

    onProposedTextChanged: showRawProposal = false

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
            Label { text: qsTr("Revisão de alterações propostas pela IA"); color: "#c4b5fd"; font.pixelSize: 11; font.bold: true; Layout.fillWidth: true }
            Label {
                text: qsTr("Original: %1 pal. → Novo: %2 pal. (%3%4)")
                    .arg(root.wordCount(root.currentText)).arg(root.wordCount(root.proposedText))
                    .arg(root.wordCount(root.proposedText) - root.wordCount(root.currentText) > 0 ? "+" : "")
                    .arg(root.wordCount(root.proposedText) - root.wordCount(root.currentText))
                color: "#a7a9be"; font.pixelSize: 9
            }
            Button {
                objectName: "notesMarkdownAiToggleRawProposalButton"
                text: root.showRawProposal ? qsTr("Diff") : qsTr("Texto novo")
                onClicked: root.showRawProposal = !root.showRawProposal
            }
        }
        ListView {
            objectName: "notesMarkdownAiDiffList"
            Layout.fillWidth: true
            Layout.fillHeight: true
            visible: !root.showRawProposal
            clip: true
            model: root.diffLines
            delegate: Rectangle {
                required property var modelData
                required property int index
                width: ListView.view.width
                implicitHeight: diffLineText.implicitHeight + 6
                color: modelData.kind === "added" ? "#1834d399"
                    : modelData.kind === "removed" ? "#18fb7185" : "transparent"
                RowLayout {
                    anchors.fill: parent
                    spacing: 6
                    Label {
                        Layout.preferredWidth: 16
                        text: modelData.kind === "added" ? "+" : modelData.kind === "removed" ? "−" : " "
                        color: modelData.kind === "added" ? "#6ee7b7"
                            : modelData.kind === "removed" ? "#fda4af" : "#71717a"
                        font.family: "monospace"; font.pixelSize: 11
                    }
                    Text {
                        id: diffLineText
                        Layout.fillWidth: true
                        text: modelData.text.length > 0 ? modelData.text : " "
                        color: modelData.kind === "added" ? "#a7f3d0"
                            : modelData.kind === "removed" ? "#fecdd3" : "#e4e4e7"
                        font.family: "monospace"; font.pixelSize: 11
                        wrapMode: Text.WrapAnywhere
                        textFormat: Text.PlainText
                    }
                }
            }
            ScrollBar.vertical: ScrollBar { }
        }
        ScrollView {
            objectName: "notesMarkdownAiRawProposalView"
            Layout.fillWidth: true
            Layout.fillHeight: true
            visible: root.showRawProposal
            clip: true
            TextArea {
                objectName: "notesMarkdownAiProposalText"
                readOnly: true; selectByMouse: true; wrapMode: TextEdit.Wrap
                textFormat: TextEdit.PlainText; text: root.proposedText
                color: "#e4e4e7"; font.family: "monospace"; font.pixelSize: 11
                background: Rectangle { color: "transparent" }
            }
        }
        RowLayout {
            Layout.fillWidth: true
            RowLayout {
                Layout.fillWidth: true
                Label { text: "●"; color: "#6ee7b7"; font.pixelSize: 10 }
                Label { text: qsTr("Texto adicionado"); color: "#a7a9be"; font.pixelSize: 9 }
                Label { text: "●"; color: "#fda4af"; font.pixelSize: 10 }
                Label { text: qsTr("Texto removido"); color: "#a7a9be"; font.pixelSize: 9; Layout.fillWidth: true }
            }
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
