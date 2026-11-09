import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: studyRoot
    anchors.fill: parent
    color: "#0f0e17" // Pure Zen Canvas
    visible: isStudying
    z: 100

    property bool isStudying: false
    property var deck: null
    property var cards: []
    property int currentCardIndex: 0
    property bool isAnswerRevealed: false
    property bool isStudyFinished: false
    property int cardsReviewedThisSession: 0
    property string userTypedAnswer: ""
    property bool exactMatch: false

    signal sessionClosed()
    signal requestReveal()
    signal requestRate(int rating)

    // Current card helper
    readonly property var currentCard: (cards.length > 0 && currentCardIndex < cards.length) ? cards[currentCardIndex] : null

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
                return "<span style='color: #a78bfa; background-color: #6366f125; padding: 2px 6px; border-radius: 4px;'>[ ... ]</span>";
            }
        });
    }

    ColumnLayout {
        anchors.centerIn: parent
        width: Math.min(parent.width - 64, 760)
        spacing: 28

        // Top Header Bar
        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            Text {
                text: studyRoot.deck ? studyRoot.deck.name : "Estudo"
                color: "#a78bfa"
                font.pixelSize: 17
                font.bold: true
            }

            Text { text: "•"; color: "#64748b" }

            Text {
                text: studyRoot.isStudyFinished
                    ? "Sessão Concluída"
                    : "Cartão " + (studyRoot.currentCardIndex + 1) + " de " + studyRoot.cards.length
                color: "#a7a9be"
                font.pixelSize: 14
            }

            Item { Layout.fillWidth: true }

            // Exit Button [Esc]
            Rectangle {
                width: 64; height: 32; radius: 8
                color: "#ffffff10"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 4
                    Text { text: "Esc"; color: "#a7a9be"; font.pixelSize: 12; font.bold: true }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: studyRoot.sessionClosed()
                }
            }
        }

        // Normal Study Card View
        Item {
            visible: !studyRoot.isStudyFinished && studyRoot.cards.length > 0
            Layout.fillWidth: true
            Layout.preferredHeight: 460

            ColumnLayout {
                anchors.fill: parent
                spacing: 24

                // Flashcard Surface
                Rectangle {
                    id: cardSurface
                    Layout.fillWidth: true
                    Layout.preferredHeight: 400
                    radius: 16
                    color: "#1a1924"
                    border.color: studyRoot.isAnswerRevealed ? "#818cf844" : "#ffffff12"
                    border.width: 1

                    transform: Rotation {
                        id: cardFlip
                        origin.x: cardSurface.width / 2
                        origin.y: cardSurface.height / 2
                        axis { x: 0; y: 1; z: 0 }
                        angle: studyRoot.isAnswerRevealed ? 360 : 0
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
                                property bool isCloze: studyRoot.isClozeCard(studyRoot.currentCard)
                                visible: isCloze || (studyRoot.currentCard && studyRoot.currentCard.card_type === "typing")
                                height: 20
                                width: typeLabel.contentWidth + 12
                                radius: 10
                                color: "#6366f125"
                                border.color: "#818cf855"
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
                                text: (studyRoot.currentCard && studyRoot.currentCard.reps !== undefined) ? ("Repetição #" + studyRoot.currentCard.reps) : ""
                                color: "#64748b"
                                font.pixelSize: 11
                            }
                        }

                        // Question / Cloze Text
                        Text {
                            Layout.fillWidth: true
                            property bool isCloze: studyRoot.isClozeCard(studyRoot.currentCard)
                            textFormat: isCloze ? Text.RichText : Text.PlainText
                            text: {
                                if (!studyRoot.currentCard) return ""
                                if (isCloze) {
                                    return studyRoot.formatClozeText(studyRoot.currentCard.front, studyRoot.isAnswerRevealed, studyRoot.userTypedAnswer)
                                }
                                return studyRoot.currentCard.front
                            }
                            color: "#fffffe"
                            font.pixelSize: 21
                            font.bold: true
                            wrapMode: Text.Wrap
                        }

                        // Typing Input Field
                        Rectangle {
                            visible: !studyRoot.isAnswerRevealed && (studyRoot.isClozeCard(studyRoot.currentCard) || (studyRoot.currentCard && studyRoot.currentCard.card_type === "typing"))
                            Layout.fillWidth: true
                            height: 46
                            radius: 10
                            color: "#0f0e17"
                            border.color: typingInput.activeFocus ? "#818cf8" : "#ffffff15"
                            border.width: 1

                            TextInput {
                                id: typingInput
                                anchors.fill: parent
                                anchors.leftMargin: 14
                                anchors.rightMargin: 14
                                verticalAlignment: TextInput.AlignVCenter
                                color: "#fffffe"
                                font.pixelSize: 15
                                text: studyRoot.userTypedAnswer
                                onTextChanged: studyRoot.userTypedAnswer = text
                                onAccepted: studyRoot.requestReveal()

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
                            visible: studyRoot.isAnswerRevealed && (studyRoot.userTypedAnswer.length > 0) && (studyRoot.isClozeCard(studyRoot.currentCard) || (studyRoot.currentCard && studyRoot.currentCard.card_type === "typing"))
                            Layout.fillWidth: true
                            height: 38
                            radius: 8
                            color: studyRoot.exactMatch ? "#10b98115" : "#f43f5e15"
                            border.color: studyRoot.exactMatch ? "#10b98144" : "#f43f5e44"
                            border.width: 1

                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 12
                                anchors.rightMargin: 12
                                spacing: 8
                                Text {
                                    text: studyRoot.exactMatch ? "✓ Exato:" : "✕ Sua Resposta:"
                                    color: studyRoot.exactMatch ? "#34d399" : "#fb7185"
                                    font.pixelSize: 12
                                    font.bold: true
                                }
                                Text {
                                    text: "\"" + studyRoot.userTypedAnswer + "\""
                                    color: "#fffffe"
                                    font.pixelSize: 12
                                    font.bold: true
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    visible: !studyRoot.exactMatch
                                    text: "Esperado: \"" + studyRoot.getTargetClozeAnswer(studyRoot.currentCard) + "\""
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
                            visible: studyRoot.isAnswerRevealed

                            Rectangle {
                                Layout.fillWidth: true
                                height: 1
                                color: "#ffffff0f"
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
                                text: studyRoot.currentCard ? (studyRoot.currentCard.back || "") : ""
                                color: "#a7a9be"
                                font.pixelSize: 16
                                wrapMode: Text.Wrap
                            }

                            // Extra Note if present
                            Rectangle {
                                property string noteText: (studyRoot.currentCard && studyRoot.currentCard.extra_note) ? studyRoot.currentCard.extra_note : ""
                                visible: noteText.length > 0
                                Layout.fillWidth: true
                                height: noteCol.height + 16
                                radius: 8
                                color: "#ffffff06"
                                border.color: "#ffffff0a"
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

                // Study Dock (Reveal vs 4 FSRS Rating Buttons)
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 14

                    // Reveal Answer Button
                    Rectangle {
                        visible: !studyRoot.isAnswerRevealed
                        Layout.fillWidth: true
                        height: 52
                        radius: 12
                        color: "#6366f1"

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 8
                            Text { text: "Mostrar Resposta"; color: "#ffffff"; font.pixelSize: 15; font.bold: true }
                            Text { text: "[Espaço / Enter]"; color: "#c7d2fe"; font.pixelSize: 13 }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: studyRoot.requestReveal()
                        }
                    }

                    // 4 FSRS Rating Buttons Dock
                    RowLayout {
                        visible: studyRoot.isAnswerRevealed
                        Layout.fillWidth: true
                        spacing: 12

                        // 1: Errei (Again)
                        Rectangle {
                            Layout.fillWidth: true; height: 56; radius: 12
                            color: "#1a1924"; border.color: "#f43f5e55"; border.width: 1
                            ColumnLayout { anchors.centerIn: parent; spacing: 2
                                Text { Layout.alignment: Qt.AlignHCenter; text: "Errei [1]"; color: "#fb7185"; font.pixelSize: 13; font.bold: true }
                                Text { Layout.alignment: Qt.AlignHCenter; text: "< 10 min"; color: "#64748b"; font.pixelSize: 10 }
                            }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: studyRoot.requestRate(1) }
                        }

                        // 2: Difícil (Hard)
                        Rectangle {
                            Layout.fillWidth: true; height: 56; radius: 12
                            color: "#1a1924"; border.color: "#f59e0b55"; border.width: 1
                            ColumnLayout { anchors.centerIn: parent; spacing: 2
                                Text { Layout.alignment: Qt.AlignHCenter; text: "Difícil [2]"; color: "#fbbf24"; font.pixelSize: 13; font.bold: true }
                                Text { Layout.alignment: Qt.AlignHCenter; text: "1.2 dias"; color: "#64748b"; font.pixelSize: 10 }
                            }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: studyRoot.requestRate(2) }
                        }

                        // 3: Bom (Good)
                        Rectangle {
                            Layout.fillWidth: true; height: 56; radius: 12
                            color: "#1a1924"; border.color: "#10b98155"; border.width: 1
                            ColumnLayout { anchors.centerIn: parent; spacing: 2
                                Text { Layout.alignment: Qt.AlignHCenter; text: "Bom [3]"; color: "#34d399"; font.pixelSize: 13; font.bold: true }
                                Text { Layout.alignment: Qt.AlignHCenter; text: "3.5 dias"; color: "#64748b"; font.pixelSize: 10 }
                            }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: studyRoot.requestRate(3) }
                        }

                        // 4: Fácil (Easy)
                        Rectangle {
                            Layout.fillWidth: true; height: 56; radius: 12
                            color: "#1a1924"; border.color: "#38bdf855"; border.width: 1
                            ColumnLayout { anchors.centerIn: parent; spacing: 2
                                Text { Layout.alignment: Qt.AlignHCenter; text: "Fácil [4]"; color: "#38bdf8"; font.pixelSize: 13; font.bold: true }
                                Text { Layout.alignment: Qt.AlignHCenter; text: "7.0 dias"; color: "#64748b"; font.pixelSize: 10 }
                            }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: studyRoot.requestRate(4) }
                        }
                    }
                }
            }
        }

        // Session Finished Summary View
        Rectangle {
            visible: studyRoot.isStudyFinished || studyRoot.cards.length === 0
            Layout.fillWidth: true
            height: 360
            radius: 16
            color: "#1a1924"
            border.color: "#ffffff12"

            ColumnLayout {
                anchors.centerIn: parent
                spacing: 16

                Text { Layout.alignment: Qt.AlignHCenter; text: "🎉"; font.pixelSize: 48 }
                Text {
                    Layout.alignment: Qt.AlignHCenter
                    text: "Parabéns! Sessão de Estudos Concluída"
                    color: "#fffffe"
                    font.pixelSize: 20
                    font.bold: true
                }
                Text {
                    Layout.alignment: Qt.AlignHCenter
                    text: studyRoot.cardsReviewedThisSession > 0
                        ? "Você revisou " + studyRoot.cardsReviewedThisSession + " cartão(ões) hoje de acordo com o algoritmo FSRS v5."
                        : "Todos os cartões deste baralho estão em dia! Nenhum cartão pendente agora."
                    color: "#a7a9be"
                    font.pixelSize: 14
                }

                Item { height: 12 }

                Rectangle {
                    Layout.alignment: Qt.AlignHCenter
                    width: 180
                    height: 42
                    radius: 10
                    color: "#6366f1"

                    Text {
                        anchors.centerIn: parent
                        text: "Voltar aos Baralhos"
                        color: "#ffffff"
                        font.pixelSize: 14
                        font.bold: true
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: studyRoot.sessionClosed()
                    }
                }
            }
        }
    }
}
