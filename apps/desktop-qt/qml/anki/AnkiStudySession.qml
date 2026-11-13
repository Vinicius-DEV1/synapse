import QtQuick 2.15
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
                color: "#10ffffff"

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

        // Active Study View
        Item {
            visible: !studyRoot.isStudyFinished && studyRoot.cards.length > 0
            Layout.fillWidth: true
            Layout.preferredHeight: 480

            ColumnLayout {
                anchors.fill: parent
                spacing: 24

                // Flashcard Canvas
                AnkiStudyCardCanvas {
                    currentCard: studyRoot.currentCard
                    isAnswerRevealed: studyRoot.isAnswerRevealed
                    userTypedAnswer: studyRoot.userTypedAnswer
                    exactMatch: studyRoot.exactMatch

                    onRevealRequested: studyRoot.requestReveal()
                    onTypedAnswerChanged: function(text) { studyRoot.userTypedAnswer = text }
                }

                // Rating Dock
                AnkiRatingDock {
                    isAnswerRevealed: studyRoot.isAnswerRevealed
                    onRevealRequested: studyRoot.requestReveal()
                    onRateRequested: function(rating) { studyRoot.requestRate(rating) }
                }
            }
        }

        // Session Finished Summary View
        AnkiCompletionCard {
            visible: studyRoot.isStudyFinished || studyRoot.cards.length === 0
            cardsReviewedCount: studyRoot.cardsReviewedThisSession
            onReturnToDecksRequested: studyRoot.sessionClosed()
        }
    }
}
