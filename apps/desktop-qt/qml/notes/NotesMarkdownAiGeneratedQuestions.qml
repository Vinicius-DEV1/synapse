import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: root
    objectName: "notesMarkdownAiGeneratedQuestions"

    property var battery: ({})
    property var questions: []
    property bool added: false
    property string errorText: ""
    property bool expanded: false
    property bool adding: false

    signal addRequested()

    implicitHeight: cardColumn.implicitHeight + 24
    Layout.fillWidth: true
    radius: 12
    color: "#1b171f2b"
    border.color: "#4d8b5cf6"

    ColumnLayout {
        id: cardColumn
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 8
            Rectangle {
                Layout.preferredWidth: 28; Layout.preferredHeight: 28
                radius: 8; color: "#268b5cf6"
                AppIcon { anchors.centerIn: parent; name: "layers"; color: "#a78bfa"; width: 15; height: 15 }
            }
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2
                Label { text: qsTr("%1 nova(s) questão(ões) gerada(s)").arg(root.questions.length); color: "#fffffe"; font.pixelSize: 11; font.bold: true }
                Label {
                    Layout.fillWidth: true
                    text: qsTr("Para a bateria: @%1 (%2)").arg(root.battery.title || "").arg(root.battery.pageTitle || "")
                    color: "#c4b5fd"; font.pixelSize: 10; elide: Text.ElideRight
                }
            }
            ToolButton {
                objectName: "notesMarkdownAiToggleQuestionsButton"
                Accessible.name: root.expanded ? qsTr("Recolher questões") : qsTr("Expandir prévia das questões")
                onClicked: root.expanded = !root.expanded
                contentItem: AppIcon { name: root.expanded ? "chevron-up" : "chevron-down"; color: "#a7a9be"; width: 15; height: 15 }
            }
        }

        ScrollView {
            objectName: "notesMarkdownAiQuestionPreviewList"
            Layout.fillWidth: true
            Layout.preferredHeight: Math.min(questionPreviewContent.implicitHeight, 220)
            visible: root.expanded
            clip: true
            ScrollBar.vertical.policy: ScrollBar.AsNeeded
            contentWidth: availableWidth
            ColumnLayout {
                id: questionPreviewContent
                width: parent.width
                spacing: 6
                Repeater {
                    model: root.questions
                    delegate: Rectangle {
                        required property var modelData
                        required property int index
                        Layout.fillWidth: true
                        implicitHeight: questionColumn.implicitHeight + 16
                        radius: 8
                        color: "#66000000"
                        border.color: "#14ffffff"
                        ColumnLayout {
                            id: questionColumn
                            anchors.fill: parent
                            anchors.margins: 8
                            spacing: 4
                            Label { text: qsTr("Questão %1 · %2").arg(index + 1).arg(modelData.type === "open" ? qsTr("Discursiva") : qsTr("Múltipla escolha")); color: "#c4b5fd"; font.pixelSize: 9; font.bold: true }
                            Label { Layout.fillWidth: true; text: modelData.question; color: "#fffffe"; font.pixelSize: 11; wrapMode: Text.Wrap }
                            Repeater {
                                model: modelData.options || []
                                delegate: Label {
                                    required property string modelData
                                    required property int index
                                    Layout.fillWidth: true
                                    text: String.fromCharCode(65 + index) + ") " + modelData + (index === Number(questionColumn.parent.modelData.correctIndex) ? "  ✓ " + qsTr("Gabarito") : "")
                                    color: index === Number(questionColumn.parent.modelData.correctIndex) ? "#6ee7b7" : "#a7a9be"
                                    font.pixelSize: 10
                                    wrapMode: Text.Wrap
                                }
                            }
                            Label {
                                visible: modelData.type === "open" && String(modelData.expectedAnswer || "").length > 0
                                Layout.fillWidth: true
                                text: qsTr("Gabarito modelo: %1").arg(modelData.expectedAnswer || "")
                                color: "#6ee7b7"; font.pixelSize: 10; wrapMode: Text.Wrap
                            }
                            Label {
                                visible: String(modelData.explanation || "").length > 0
                                Layout.fillWidth: true
                                text: modelData.explanation || ""
                                color: "#a7a9be"; font.pixelSize: 9; wrapMode: Text.Wrap
                            }
                        }
                    }
                }
            }
        }

        Label {
            visible: root.errorText.length > 0
            Layout.fillWidth: true
            text: root.errorText
            color: "#fda4af"; font.pixelSize: 10; wrapMode: Text.Wrap
        }

        RowLayout {
            Layout.fillWidth: true
            Label { Layout.fillWidth: true; text: qsTr("Serão anexadas ao final da bateria."); color: "#a7a9be"; font.pixelSize: 9; wrapMode: Text.Wrap }
            Button {
                objectName: "notesMarkdownAiAddQuestionsButton"
                text: root.added ? qsTr("Questões adicionadas") : (root.adding ? qsTr("Adicionando…") : qsTr("Adicionar %1 questões").arg(root.questions.length))
                enabled: !root.added && !root.adding
                onClicked: {
                    root.adding = true
                    root.errorText = ""
                    root.addRequested()
                    root.adding = false
                }
                background: Rectangle { radius: 9; color: root.added ? "#2634d399" : parent.enabled ? "#178b5cf6" : "#20242a33"; border.color: root.added ? "#5548c78e" : "#668b5cf6" }
                contentItem: Text { text: parent.text; color: root.added ? "#6ee7b7" : "#ddd6fe"; font.pixelSize: 10; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
    }
}
