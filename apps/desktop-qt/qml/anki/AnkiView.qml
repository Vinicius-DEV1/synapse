import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: ankiRoot
    color: "#0f0e17" // bg-dark-bg

    property var decks: []
    property var selectedDeck: null
    property var deckCards: []
    property int currentCardIndex: 0
    property bool isAnswerRevealed: false
    property bool isStudying: false
    property bool isCreatingCard: false
    property bool isCreatingDeck: false

    function reloadDecks() {
        decks = dataController.getDecks()
        if (decks.length > 0 && !selectedDeck) {
            selectDeck(decks[0])
        }
    }

    function selectDeck(deck) {
        selectedDeck = deck
        isStudying = false
        isAnswerRevealed = false
        currentCardIndex = 0
        deckCards = dataController.getDeckCards(deck.id)
    }

    function startStudy() {
        if (deckCards.length > 0) {
            currentCardIndex = 0
            isAnswerRevealed = false
            isStudying = true
        }
    }

    function rateCard(rating) {
        if (deckCards.length === 0) return
        var card = deckCards[currentCardIndex]
        dataController.recordCardReview(card.id, rating)
        
        if (currentCardIndex + 1 < deckCards.length) {
            currentCardIndex++
            isAnswerRevealed = false
        } else {
            // Study finished
            isStudying = false
            isAnswerRevealed = false
            deckCards = dataController.getDeckCards(selectedDeck.id)
            reloadDecks()
        }
    }

    Component.onCompleted: {
        reloadDecks()
    }

    // Keyboard navigation during study
    Shortcut {
        sequence: "Space"
        enabled: ankiRoot.isStudying && !ankiRoot.isAnswerRevealed
        onActivated: ankiRoot.isAnswerRevealed = true
    }
    Shortcut {
        sequence: "Return"
        enabled: ankiRoot.isStudying && !ankiRoot.isAnswerRevealed
        onActivated: ankiRoot.isAnswerRevealed = true
    }
    Shortcut {
        sequence: "1"
        enabled: ankiRoot.isStudying && ankiRoot.isAnswerRevealed
        onActivated: ankiRoot.rateCard(1)
    }
    Shortcut {
        sequence: "2"
        enabled: ankiRoot.isStudying && ankiRoot.isAnswerRevealed
        onActivated: ankiRoot.rateCard(2)
    }
    Shortcut {
        sequence: "3"
        enabled: ankiRoot.isStudying && ankiRoot.isAnswerRevealed
        onActivated: ankiRoot.rateCard(3)
    }
    Shortcut {
        sequence: "4"
        enabled: ankiRoot.isStudying && ankiRoot.isAnswerRevealed
        onActivated: ankiRoot.rateCard(4)
    }
    Shortcut {
        sequence: "Esc"
        enabled: ankiRoot.isStudying
        onActivated: ankiRoot.isStudying = false
    }

    // ===================================================================
    // 1. Deck Management View
    // ===================================================================
    Item {
        anchors.fill: parent
        visible: !ankiRoot.isStudying

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 32
            spacing: 24

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 16

                ColumnLayout {
                    spacing: 4
                    Text {
                        text: "🎴 Flashcards (FSRS v5)"
                        color: "#fffffe"
                        font.pixelSize: 24
                        font.bold: true
                    }
                    Text {
                        text: "Free Spaced Repetition Scheduler • Repetição espaçada determinística com algoritmo nativo em Rust"
                        color: "#a7a9be"
                        font.pixelSize: 13
                    }
                }

                Item { Layout.fillWidth: true }

                Rectangle {
                    width: 140; height: 38; radius: 10
                    color: "#7c3aed" // brand-600

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 8
                        Text { text: "+"; color: "#ffffff"; font.pixelSize: 18; font.bold: true }
                        Text { text: "Criar Baralho"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: ankiRoot.isCreatingDeck = true
                    }
                }
            }

            // Decks Table Header
            Rectangle {
                Layout.fillWidth: true
                height: 36
                radius: 8
                color: "#15141b"
                border.color: "#ffffff0a"

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 16

                    Text {
                        Layout.preferredWidth: 320
                        text: "BARALHO"
                        color: "#64748b"
                        font.pixelSize: 11
                        font.bold: true
                        font.letterSpacing: 1.1
                    }

                    Text {
                        Layout.fillWidth: true
                        text: "DESCRIÇÃO"
                        color: "#64748b"
                        font.pixelSize: 11
                        font.bold: true
                        font.letterSpacing: 1.1
                    }

                    Text {
                        Layout.preferredWidth: 100
                        text: "CARTÕES"
                        color: "#64748b"
                        font.pixelSize: 11
                        font.bold: true
                        font.letterSpacing: 1.1
                    }

                    Text {
                        Layout.preferredWidth: 200
                        text: "AÇÕES"
                        color: "#64748b"
                        font.pixelSize: 11
                        font.bold: true
                        font.letterSpacing: 1.1
                    }
                }
            }

            // Decks List
            ListView {
                id: deckListView
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                model: ankiRoot.decks
                spacing: 8

                delegate: Rectangle {
                    width: deckListView.width
                    height: 64
                    radius: 12
                    color: (ankiRoot.selectedDeck && ankiRoot.selectedDeck.id === modelData.id) ? "#1f1d2e" : "#1a1924"
                    border.color: (ankiRoot.selectedDeck && ankiRoot.selectedDeck.id === modelData.id) ? "#8b5cf666" : "#ffffff0f"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 14
                        spacing: 16

                        // Deck Tag + Name
                        RowLayout {
                            Layout.preferredWidth: 320
                            spacing: 12

                            Rectangle {
                                width: 4
                                height: 28
                                radius: 2
                                color: modelData.color || "#6366f1"
                            }

                            Text {
                                Layout.fillWidth: true
                                text: modelData.name
                                color: "#fffffe"
                                font.pixelSize: 15
                                font.bold: true
                                elide: Text.ElideRight
                            }
                        }

                        // Description
                        Text {
                            Layout.fillWidth: true
                            text: modelData.description || "Sem descrição"
                            color: "#a7a9be"
                            font.pixelSize: 13
                            elide: Text.ElideRight
                        }

                        // Card Count Pill
                        Rectangle {
                            Layout.preferredWidth: 70
                            height: 24
                            radius: 12
                            color: "#8b5cf61a"
                            border.color: "#8b5cf633"

                            Text {
                                anchors.centerIn: parent
                                text: (modelData.card_count || 0) + " cards"
                                color: "#c4b5fd"
                                font.pixelSize: 11
                                font.bold: true
                            }
                        }

                        // Action Buttons
                        RowLayout {
                            Layout.preferredWidth: 200
                            spacing: 8

                            Rectangle {
                                width: 90
                                height: 32
                                radius: 8
                                color: (modelData.card_count > 0) ? "#7c3aed" : "#27273a"

                                Text {
                                    anchors.centerIn: parent
                                    text: "Estudar"
                                    color: (modelData.card_count > 0) ? "#ffffff" : "#64748b"
                                    font.pixelSize: 12
                                    font.bold: true
                                }

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: (modelData.card_count > 0) ? Qt.PointingHandCursor : Qt.ArrowCursor
                                    onClicked: {
                                        if (modelData.card_count > 0) {
                                            ankiRoot.selectDeck(modelData)
                                            ankiRoot.startStudy()
                                        }
                                    }
                                }
                            }

                            Rectangle {
                                width: 84
                                height: 32
                                radius: 8
                                color: "#ffffff0a"
                                border.color: "#ffffff1a"

                                Text {
                                    anchors.centerIn: parent
                                    text: "+ Cartão"
                                    color: "#fffffe"
                                    font.pixelSize: 12
                                }

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        ankiRoot.selectDeck(modelData)
                                        ankiRoot.isCreatingCard = true
                                    }
                                }
                            }
                        }
                    }

                    MouseArea {
                        anchors.fill: parent
                        z: -1
                        onClicked: ankiRoot.selectDeck(modelData)
                    }
                }
            }
        }
    }

    // ===================================================================
    // 2. Study Session View (Zen Focus Canvas + FSRS Rating Dock)
    // ===================================================================
    Item {
        anchors.fill: parent
        visible: ankiRoot.isStudying

        ColumnLayout {
            anchors.centerIn: parent
            width: Math.min(parent.width - 64, 760)
            spacing: 28

            // Top Header Bar
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Text {
                    text: ankiRoot.selectedDeck ? ankiRoot.selectedDeck.name : "Estudo"
                    color: "#a78bfa"
                    font.pixelSize: 16
                    font.bold: true
                }

                Text {
                    text: "•"
                    color: "#64748b"
                }

                Text {
                    text: "Cartão " + (ankiRoot.currentCardIndex + 1) + " de " + ankiRoot.deckCards.length
                    color: "#a7a9be"
                    font.pixelSize: 14
                }

                Item { Layout.fillWidth: true }

                Rectangle {
                    width: 32; height: 32; radius: 8
                    color: "#ffffff10"

                    Text {
                        anchors.centerIn: parent
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 14
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: ankiRoot.isStudying = false
                    }
                }
            }

            // Flashcard Surface (bg-dark-card rounded-2xl)
            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 340
                radius: 16
                color: "#1a1924"
                border.color: "#ffffff12"
                border.width: 1

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 36
                    spacing: 16

                    // Front Label
                    Text {
                        text: "FRENTE"
                        color: "#8b5cf6"
                        font.pixelSize: 11
                        font.bold: true
                        font.letterSpacing: 1.5
                    }

                    // Question Text
                    Text {
                        Layout.fillWidth: true
                        text: ankiRoot.deckCards.length > 0 ? ankiRoot.deckCards[ankiRoot.currentCardIndex].front : ""
                        color: "#fffffe"
                        font.pixelSize: 22
                        font.bold: true
                        wrapMode: Text.Wrap
                    }

                    Item { Layout.fillHeight: true }

                    // Back Section (revealed)
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 12
                        visible: ankiRoot.isAnswerRevealed

                        Rectangle {
                            Layout.fillWidth: true
                            height: 1
                            color: "#ffffff0f"
                        }

                        Text {
                            text: "VERSO"
                            color: "#10b981"
                            font.pixelSize: 11
                            font.bold: true
                            font.letterSpacing: 1.5
                        }

                        Text {
                            Layout.fillWidth: true
                            text: ankiRoot.deckCards.length > 0 ? ankiRoot.deckCards[ankiRoot.currentCardIndex].back : ""
                            color: "#a7a9be"
                            font.pixelSize: 17
                            wrapMode: Text.Wrap
                        }
                    }
                }
            }

            // Study Dock (Reveal vs 4 FSRS Rating Buttons)
            RowLayout {
                Layout.fillWidth: true
                Layout.alignment: Qt.AlignHCenter
                spacing: 14

                // Reveal Answer Button
                Rectangle {
                    visible: !ankiRoot.isAnswerRevealed
                    Layout.fillWidth: true
                    height: 52
                    radius: 26
                    color: "#7c3aed"

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 8
                        Text { text: "Mostrar Resposta"; color: "#ffffff"; font.pixelSize: 15; font.bold: true }
                        Text { text: "(Espaço)"; color: "#c4b5fd"; font.pixelSize: 13 }
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: ankiRoot.isAnswerRevealed = true
                    }
                }

                // 4 FSRS Rating Buttons
                RowLayout {
                    visible: ankiRoot.isAnswerRevealed
                    Layout.fillWidth: true
                    spacing: 12

                    // 1: Again (Errei)
                    Rectangle {
                        Layout.fillWidth: true; height: 56; radius: 12
                        color: "#1a1924"; border.color: "#f43f5e4d"; border.width: 1
                        ColumnLayout { anchors.centerIn: parent; spacing: 2
                            Text { Layout.alignment: Qt.AlignHCenter; text: "Errei (1)"; color: "#fb7185"; font.pixelSize: 13; font.bold: true }
                            Text { Layout.alignment: Qt.AlignHCenter; text: "Again"; color: "#64748b"; font.pixelSize: 10 }
                        }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: ankiRoot.rateCard(1) }
                    }

                    // 2: Hard (Difícil)
                    Rectangle {
                        Layout.fillWidth: true; height: 56; radius: 12
                        color: "#1a1924"; border.color: "#f59e0b4d"; border.width: 1
                        ColumnLayout { anchors.centerIn: parent; spacing: 2
                            Text { Layout.alignment: Qt.AlignHCenter; text: "Difícil (2)"; color: "#fbbf24"; font.pixelSize: 13; font.bold: true }
                            Text { Layout.alignment: Qt.AlignHCenter; text: "Hard"; color: "#64748b"; font.pixelSize: 10 }
                        }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: ankiRoot.rateCard(2) }
                    }

                    // 3: Good (Bom)
                    Rectangle {
                        Layout.fillWidth: true; height: 56; radius: 12
                        color: "#1a1924"; border.color: "#10b9814d"; border.width: 1
                        ColumnLayout { anchors.centerIn: parent; spacing: 2
                            Text { Layout.alignment: Qt.AlignHCenter; text: "Bom (3)"; color: "#34d399"; font.pixelSize: 13; font.bold: true }
                            Text { Layout.alignment: Qt.AlignHCenter; text: "Good"; color: "#64748b"; font.pixelSize: 10 }
                        }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: ankiRoot.rateCard(3) }
                    }

                    // 4: Easy (Fácil)
                    Rectangle {
                        Layout.fillWidth: true; height: 56; radius: 12
                        color: "#1a1924"; border.color: "#38bdf84d"; border.width: 1
                        ColumnLayout { anchors.centerIn: parent; spacing: 2
                            Text { Layout.alignment: Qt.AlignHCenter; text: "Fácil (4)"; color: "#38bdf8"; font.pixelSize: 13; font.bold: true }
                            Text { Layout.alignment: Qt.AlignHCenter; text: "Easy"; color: "#64748b"; font.pixelSize: 10 }
                        }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: ankiRoot.rateCard(4) }
                    }
                }
            }
        }
    }

    // Modal: Criar Novo Cartão
    Rectangle {
        anchors.fill: parent
        color: "#b3000000"
        visible: ankiRoot.isCreatingCard

        MouseArea { anchors.fill: parent }

        Rectangle {
            anchors.centerIn: parent
            width: 480
            height: 380
            radius: 16
            color: "#1a1924"
            border.color: "#ffffff1a"

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 24
                spacing: 16

                Text {
                    text: "Novo Cartão Anki"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }

                TextField {
                    id: cardFrontInput
                    Layout.fillWidth: true
                    placeholderText: "Frente do cartão (pergunta)..."
                }

                TextArea {
                    id: cardBackInput
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    placeholderText: "Verso do cartão (resposta)..."
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Button {
                        text: "Cancelar"
                        Layout.fillWidth: true
                        onClicked: ankiRoot.isCreatingCard = false
                    }
                    Button {
                        text: "Salvar Cartão"
                        Layout.fillWidth: true
                        onClicked: {
                            if (cardFrontInput.text.trim().length > 0 && ankiRoot.selectedDeck) {
                                dataController.createCard(ankiRoot.selectedDeck.id, cardFrontInput.text, cardBackInput.text, "")
                                cardFrontInput.text = ""
                                cardBackInput.text = ""
                                ankiRoot.isCreatingCard = false
                                ankiRoot.selectDeck(ankiRoot.selectedDeck)
                            }
                        }
                    }
                }
            }
        }
    }

    // Modal: Criar Novo Baralho
    Rectangle {
        anchors.fill: parent
        color: "#b3000000"
        visible: ankiRoot.isCreatingDeck

        MouseArea { anchors.fill: parent }

        Rectangle {
            anchors.centerIn: parent
            width: 440
            height: 280
            radius: 16
            color: "#1a1924"
            border.color: "#ffffff1a"

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 24
                spacing: 16

                Text {
                    text: "Novo Baralho de Flashcards"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }

                TextField {
                    id: deckNameInput
                    Layout.fillWidth: true
                    placeholderText: "Nome do baralho..."
                }

                TextField {
                    id: deckDescInput
                    Layout.fillWidth: true
                    placeholderText: "Descrição (opcional)..."
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Button {
                        text: "Cancelar"
                        Layout.fillWidth: true
                        onClicked: ankiRoot.isCreatingDeck = false
                    }
                    Button {
                        text: "Criar Baralho"
                        Layout.fillWidth: true
                        onClicked: {
                            if (deckNameInput.text.trim().length > 0) {
                                dataController.createDeck(deckNameInput.text, deckDescInput.text, "#6366f1")
                                deckNameInput.text = ""
                                deckDescInput.text = ""
                                ankiRoot.isCreatingDeck = false
                                ankiRoot.reloadDecks()
                            }
                        }
                    }
                }
            }
        }
    }
}
