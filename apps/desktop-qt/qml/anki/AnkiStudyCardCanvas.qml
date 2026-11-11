import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: cardSurface
    Layout.fillWidth: true
    Layout.preferredHeight: 400
    radius: 16
    color: "#1a1924"
    border.color: isAnswerRevealed ? "#44818cf8" : "#12ffffff"
    border.width: 1

    property var currentCard: null
    property bool isAnswerRevealed: false
    property string userTypedAnswer: ""
    property bool exactMatch: false

    signal revealRequested()
    signal typedAnswerChanged(string text)

    function isClozeCard(card) {
        if (!card || !card.front) return false;
        return card.front.indexOf("{{c") !== -1 || card.card_type === "cloze";
    }

    function getTargetClozeAnswer(card) {
        if (!card || !card.front) return "";
        var match = card.front.match(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/);
        return match ? match[1].trim() : "";
    }

    function formatClozeText(text, revealed, typed) {
        if (!text) return "";
        return text.replace(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/g, function(match, answer) {
            if (revealed) {
                return "<span style='color: #10b981; text-decoration: underline; font-weight: bold;'>" + answer + "</span>";
            } else if (typed && typed.length > 0) {
                return "<span style='color: #818cf8; text-decoration: underline;'>[" + typed + "]</span>";
            } else {
                return "<span style='color: #a78bfa; background-color: #256366f1; padding: 2px 6px; border-radius: 4px;'>[ ... ]</span>";
            }
        });
    }

    transform: Rotation {
        id: cardFlip
        origin.x: cardSurface.width / 2
        origin.y: cardSurface.height / 2
        axis { x: 0; y: 1; z: 0 }
        angle: cardSurface.isAnswerRevealed ? 360 : 0
        Behavior on angle {
            NumberAnimation { duration: 320; easing.type: Easing.OutCubic }
        }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 16

        // Card Top Meta Bar: Front Label & Type Tag
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Text {
                text: "FRENTE"
                color: "#8b5cf6"
                font.pixelSize: 11
                font.bold: true
                font.letterSpacing: 1.5
            }

            Rectangle {
                property bool isCloze: cardSurface.isClozeCard(cardSurface.currentCard)
                visible: isCloze || (cardSurface.currentCard && cardSurface.currentCard.card_type === "typing")
                height: 20
                width: typeLabel.contentWidth + 12
                radius: 10
                color: "#256366f1"
                border.color: "#55818cf8"
                border.width: 1

                Text {
                    id: typeLabel
                    anchors.centerIn: parent
                    text: parent.isCloze ? "Cloze Deletion" : "Digitação"
                    color: "#a78bfa"
                    font.pixelSize: 10
                    font.bold: true
                }
            }

            Item { Layout.fillWidth: true }

            Text {
                text: (cardSurface.currentCard && cardSurface.currentCard.reps !== undefined) ? ("Repetição #" + cardSurface.currentCard.reps) : ""
                color: "#64748b"
                font.pixelSize: 11
            }
        }

        // Question / Cloze Text
        Text {
            Layout.fillWidth: true
            property bool isCloze: cardSurface.isClozeCard(cardSurface.currentCard)
            textFormat: isCloze ? Text.RichText : Text.PlainText
            text: {
                if (!cardSurface.currentCard) return ""
                if (isCloze) {
                    return cardSurface.formatClozeText(cardSurface.currentCard.front, cardSurface.isAnswerRevealed, cardSurface.userTypedAnswer)
                }
                return cardSurface.currentCard.front
            }
            color: "#fffffe"
            font.pixelSize: 21
            font.bold: true
            wrapMode: Text.Wrap
        }

        // Typing Input Field
        Rectangle {
            visible: !cardSurface.isAnswerRevealed && (cardSurface.isClozeCard(cardSurface.currentCard) || (cardSurface.currentCard && cardSurface.currentCard.card_type === "typing"))
            Layout.fillWidth: true
            height: 46
            radius: 10
            color: "#0f0e17"
            border.color: typingInput.activeFocus ? "#818cf8" : "#15ffffff"
            border.width: 1

            TextInput {
                id: typingInput
                anchors.fill: parent
                anchors.leftMargin: 14
                anchors.rightMargin: 14
                verticalAlignment: TextInput.AlignVCenter
                color: "#fffffe"
                font.pixelSize: 15
                text: cardSurface.userTypedAnswer
                onTextChanged: cardSurface.typedAnswerChanged(text)
                onAccepted: cardSurface.revealRequested()

                Text {
                    visible: !typingInput.text && !typingInput.activeFocus
                    anchors.fill: parent
                    verticalAlignment: Text.AlignVCenter
                    text: "Digite a palavra que falta e pressione Enter..."
                    color: "#64748b"
                    font.pixelSize: 13
                }
            }
        }

        // Match Feedback Badge
        Rectangle {
            visible: cardSurface.isAnswerRevealed && (cardSurface.userTypedAnswer.length > 0) && (cardSurface.isClozeCard(cardSurface.currentCard) || (cardSurface.currentCard && cardSurface.currentCard.card_type === "typing"))
            Layout.fillWidth: true
            height: 38
            radius: 8
            color: cardSurface.exactMatch ? "#1510b981" : "#15f43f5e"
            border.color: cardSurface.exactMatch ? "#4410b981" : "#44f43f5e"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                spacing: 8
                Text {
                    text: cardSurface.exactMatch ? "✓ Exato:" : "✕ Sua Resposta:"
                    color: cardSurface.exactMatch ? "#34d399" : "#fb7185"
                    font.pixelSize: 12
                    font.bold: true
                }
                Text {
                    text: "\"" + cardSurface.userTypedAnswer + "\""
                    color: "#fffffe"
                    font.pixelSize: 12
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Text {
                    visible: !cardSurface.exactMatch
                    text: "Esperado: \"" + cardSurface.getTargetClozeAnswer(cardSurface.currentCard) + "\""
                    color: "#34d399"
                    font.pixelSize: 12
                }
            }
        }

        Item { Layout.fillHeight: true }

        // Back Section (revealed)
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 10
            visible: cardSurface.isAnswerRevealed

            Rectangle {
                Layout.fillWidth: true
                height: 1
                color: "#0fffffff"
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                Text {
                    text: "VERSO"
                    color: "#10b981"
                    font.pixelSize: 11
                    font.bold: true
                    font.letterSpacing: 1.5
                }
            }

            Text {
                Layout.fillWidth: true
                text: cardSurface.currentCard ? (cardSurface.currentCard.back || "") : ""
                color: "#a7a9be"
                font.pixelSize: 16
                wrapMode: Text.Wrap
            }

            // Extra Note if present
            Rectangle {
                property string noteText: (cardSurface.currentCard && cardSurface.currentCard.extra_note) ? cardSurface.currentCard.extra_note : ""
                visible: noteText.length > 0
                Layout.fillWidth: true
                height: noteCol.height + 16
                radius: 8
                color: "#06ffffff"
                border.color: "#0affffff"
                border.width: 1

                ColumnLayout {
                    id: noteCol
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.top: parent.top
                    anchors.margins: 8
                    spacing: 4

                    Text {
                        text: "💡 Anotação:"
                        color: "#fbbf24"
                        font.pixelSize: 11
                        font.bold: true
                    }
                    Text {
                        Layout.fillWidth: true
                        text: parent.parent.noteText
                        color: "#94a3b8"
                        font.pixelSize: 13
                        wrapMode: Text.Wrap
                    }
                }
            }
        }
    }
}
