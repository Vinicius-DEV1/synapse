import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: clozeCardRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 380
    radius: 16
    color: "#1a1924"
    border.color: isAnswerRevealed ? "#44818cf8" : "#12ffffff"
    border.width: 1

    property var card: null
    property bool isAnswerRevealed: false
    property string userTypedAnswer: ""
    property bool exactMatch: false

    signal revealRequested()
    signal typedAnswerChanged(string text)

    function formatCloze(text, revealed) {
        if (!text) return ""
        return text.replace(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/g, function(match, answer) {
            if (revealed) {
                return "<span style='color: #10b981; text-decoration: underline; font-weight: bold; background-color: rgba(16, 185, 129, 0.15); padding: 2px 6px; border-radius: 4px;'>" + answer + "</span>"
            } else {
                return "<span style='color: #a78bfa; background-color: rgba(99, 102, 241, 0.2); padding: 2px 8px; border-radius: 4px; border: 1px dashed #818cf8;'>[ ... ]</span>"
            }
        })
    }

    function extractAnswer(text) {
        if (!text) return ""
        var m = text.match(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/)
        return m ? m[1].trim() : ""
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 28
        spacing: 16

        // Meta Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Rectangle {
                height: 22
                width: clozeBadgeText.implicitWidth + 16
                radius: 11
                color: "#256366f1"
                border.color: "#818cf8"
                border.width: 1

                Text {
                    id: clozeBadgeText
                    anchors.centerIn: parent
                    text: "Cloze Deletion"
                    color: "#c4b5fd"
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

        // Question with Cloze Highlights
        Text {
            Layout.fillWidth: true
            textFormat: Text.RichText
            text: clozeCardRoot.formatCloze(card ? card.front : "", clozeCardRoot.isAnswerRevealed)
            color: "#fffffe"
            font.pixelSize: 18
            font.bold: true
            wrapMode: Text.Wrap
            lineHeight: 1.4
        }

        // Typing verification input
        Rectangle {
            visible: !clozeCardRoot.isAnswerRevealed
            Layout.fillWidth: true
            height: 44
            radius: 8
            color: "#12111c"
            border.color: textInput.activeFocus ? "#818cf8" : "#27272a"

            TextInput {
                id: textInput
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                verticalAlignment: TextInput.AlignVCenter
                color: "#ffffff"
                font.pixelSize: 14
                text: clozeCardRoot.userTypedAnswer
                onTextChanged: clozeCardRoot.typedAnswerChanged(text)
                onAccepted: clozeCardRoot.revealRequested()

                Text {
                    visible: !textInput.text && !textInput.activeFocus
                    anchors.fill: parent
                    verticalAlignment: Text.AlignVCenter
                    text: qsTr("Digite a palavra oculta e pressione Enter para conferir...")
                    color: "#52525b"
                    font.pixelSize: 12
                }
            }
        }

        // Result Comparison on Reveal
        Rectangle {
            visible: clozeCardRoot.isAnswerRevealed && clozeCardRoot.userTypedAnswer.length > 0
            Layout.fillWidth: true
            height: 38
            radius: 8
            color: clozeCardRoot.exactMatch ? "#1510b981" : "#15f43f5e"
            border.color: clozeCardRoot.exactMatch ? "#10b981" : "#f43f5e"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                spacing: 8

                Text {
                    text: clozeCardRoot.exactMatch ? qsTr("✓ Correto!") : qsTr("✕ Sua resposta:")
                    color: clozeCardRoot.exactMatch ? "#34d399" : "#fda4af"
                    font.pixelSize: 12
                    font.bold: true
                }
                Text {
                    text: "\"" + clozeCardRoot.userTypedAnswer + "\""
                    color: "#ffffff"
                    font.pixelSize: 12
                }
                Item { Layout.fillWidth: true }
                Text {
                    visible: !clozeCardRoot.exactMatch
                    text: qsTr("Gabarito:") + " \"" + clozeCardRoot.extractAnswer(clozeCardRoot.card ? clozeCardRoot.card.front : "") + "\""
                    color: "#34d399"
                    font.pixelSize: 12
                    font.bold: true
                }
            }
        }

        Item { Layout.fillHeight: true }

        // Back / Explanation
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 8
            visible: clozeCardRoot.isAnswerRevealed

            Rectangle { Layout.fillWidth: true; height: 1; color: "#1affffff" }

            Text {
                text: qsTr("EXPLICAÇÃO / VERSO")
                color: "#10b981"
                font.pixelSize: 11
                font.bold: true
                font.letterSpacing: 1.2
            }

            Text {
                Layout.fillWidth: true
                text: card ? (card.back || "") : ""
                color: "#d4d4d8"
                font.pixelSize: 15
                wrapMode: Text.Wrap
            }
        }
    }
}
