import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: typingCardRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 380
    radius: 16
    color: "#1a1924"
    border.color: isAnswerRevealed ? "#44818cf8" : "#12ffffff"
    border.width: 1

    property var card: null
    property bool isAnswerRevealed: false
    property string userTypedAnswer: ""

    signal revealRequested()
    signal typedAnswerChanged(string text)

    function renderDiffHtml(typed, target) {
        if (!target) return ""
        var t = typed || ""
        var result = ""
        var maxLen = Math.max(t.length, target.length)
        for (var i = 0; i < maxLen; i++) {
            var charTyped = i < t.length ? t.charAt(i) : ""
            var charTarget = i < target.length ? target.charAt(i) : ""
            if (charTyped === charTarget) {
                result += "<span style='color:#34d399;font-weight:bold;'>" + charTarget + "</span>"
            } else if (charTyped.length === 0) {
                result += "<span style='color:#f59e0b;text-decoration:underline;'>" + charTarget + "</span>"
            } else {
                result += "<span style='color:#f43f5e;text-decoration:line-through;background-color:rgba(244,63,94,0.2);'>" + charTyped + "</span>"
            }
        }
        return result
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 28
        spacing: 16

        // Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Rectangle {
                height: 22
                width: badgeText.implicitWidth + 16
                radius: 11
                color: "#1e3a8a"
                border.color: "#3b82f6"

                Text {
                    id: badgeText
                    anchors.centerIn: parent
                    text: qsTr("Digitação Ativa")
                    color: "#93c5fd"
                    font.pixelSize: 10
                    font.bold: true
                }
            }

            Item { Layout.fillWidth: true }

            Text {
                text: card && card.reps !== undefined ? qsTr("Repetição #") + card.reps : ""
                color: "#71717a"
                font.pixelSize: 11
            }
        }

        // Prompt
        Text {
            Layout.fillWidth: true
            text: card ? (card.front || "") : ""
            color: "#ffffff"
            font.pixelSize: 19
            font.bold: true
            wrapMode: Text.Wrap
        }

        // User Input Box
        Rectangle {
            visible: !typingCardRoot.isAnswerRevealed
            Layout.fillWidth: true
            height: 48
            radius: 8
            color: "#100f1c"
            border.color: textInput.activeFocus ? "#3b82f6" : "#27272a"

            TextInput {
                id: textInput
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                verticalAlignment: TextInput.AlignVCenter
                color: "#ffffff"
                font.pixelSize: 15
                text: typingCardRoot.userTypedAnswer
                onTextChanged: typingCardRoot.typedAnswerChanged(text)
                onAccepted: typingCardRoot.revealRequested()

                Text {
                    visible: !textInput.text && !textInput.activeFocus
                    anchors.fill: parent
                    verticalAlignment: Text.AlignVCenter
                    text: qsTr("Digite sua resposta em texto e pressione Enter...")
                    color: "#52525b"
                    font.pixelSize: 13
                }
            }
        }

        // Revealed Diff View
        Rectangle {
            visible: typingCardRoot.isAnswerRevealed
            Layout.fillWidth: true
            height: 54
            radius: 8
            color: "#12111c"
            border.color: "#27272a"

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 10
                spacing: 4

                Text {
                    text: qsTr("Comparação Caractere a Caractere:")
                    color: "#71717a"
                    font.pixelSize: 10
                }

                Text {
                    textFormat: Text.RichText
                    text: typingCardRoot.renderDiffHtml(typingCardRoot.userTypedAnswer, typingCardRoot.card ? typingCardRoot.card.back : "")
                    font.pixelSize: 15
                    font.family: "Monospace"
                }
            }
        }

        Item { Layout.fillHeight: true }

        // Back / Answer
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 6
            visible: typingCardRoot.isAnswerRevealed

            Rectangle { Layout.fillWidth: true; height: 1; color: "#1affffff" }

            Text {
                text: qsTr("RESPOSTA COMPLETA")
                color: "#34d399"
                font.pixelSize: 11
                font.bold: true
                font.letterSpacing: 1.2
            }

            Text {
                Layout.fillWidth: true
                text: card ? (card.back || "") : ""
                color: "#e4e4e7"
                font.pixelSize: 16
                wrapMode: Text.Wrap
            }
        }
    }
}
