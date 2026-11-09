import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: ankiRoot
    color: "#0f0e17" // bg-dark-bg

    property var hierarchicalDecks: []
    property var collapsedDeckMap: ({})
    property var selectedDeck: null
    property var deckCards: []
    property int currentCardIndex: 0
    property bool isAnswerRevealed: false
    property bool isStudying: false
    property bool isStudyFinished: false
    property int cardsReviewedThisSession: 0
    property string userTypedAnswer: ""
    property bool exactMatch: false

    // Modals & Navigation state
    property bool isCreatingDeck: false
    property string createDeckParentId: ""
    property string createDeckParentName: ""
    property bool isDeckBrowserOpen: false
    property var browserDeck: null
    property var browserCards: []
    property string browserSearchQuery: ""
    property bool isCreatingCard: false
    property bool isDeckSettingsOpen: false
    property bool isShowingStats: false
    property var globalStats: ({})

    Component.onCompleted: {
        reloadDecks()
    }

    function reloadDecks() {
        hierarchicalDecks = dataController.getHierarchicalDecks()
        if (browserDeck) {
            loadBrowserCards(browserDeck.id)
        }
    }

    function toggleCollapse(deckId) {
        var copy = Object.assign({}, collapsedDeckMap)
        if (copy[deckId]) {
            delete copy[deckId]
        } else {
            copy[deckId] = true
        }
        collapsedDeckMap = copy
    }

    function revealAnswer() {
        if (deckCards.length > 0 && currentCardIndex < deckCards.length) {
            var card = deckCards[currentCardIndex]
            if (studySession.isClozeCard(card) || card.card_type === "typing") {
                var target = studySession.getTargetClozeAnswer(card)
                exactMatch = (userTypedAnswer.trim().toLowerCase() === target.trim().toLowerCase())
            }
        }
        isAnswerRevealed = true
    }

    function startStudy(deck) {
        selectedDeck = deck
        var due = dataController.getDueCards(deck.id)
        if (due.length === 0) {
            due = dataController.getDeckCards(deck.id)
        }
        deckCards = due
        currentCardIndex = 0
        cardsReviewedThisSession = 0
        userTypedAnswer = ""
        exactMatch = false
        isAnswerRevealed = false
        isStudyFinished = false
        isStudying = true
    }

    function rateCard(rating) {
        if (deckCards.length === 0 || currentCardIndex >= deckCards.length) return
        var card = deckCards[currentCardIndex]
        dataController.recordCardReview(card.id, rating)
        cardsReviewedThisSession++

        if (currentCardIndex + 1 < deckCards.length) {
            currentCardIndex++
            userTypedAnswer = ""
            exactMatch = false
            isAnswerRevealed = false
        } else {
            isStudyFinished = true
            reloadDecks()
        }
    }

    function openDeckBrowser(deck) {
        browserDeck = deck
        browserSearchQuery = ""
        loadBrowserCards(deck.id)
        isDeckBrowserOpen = true
    }

    function loadBrowserCards(deckId) {
        browserCards = dataController.getDeckCards(deckId)
    }

    function openCreateSubDeck(parentDeck) {
        createDeckParentId = parentDeck.id
        createDeckParentName = parentDeck.name
        isCreatingDeck = true
    }

    function openCreateRootDeck() {
        createDeckParentId = ""
        createDeckParentName = ""
        isCreatingDeck = true
    }

    // Keyboard Shortcuts for Study Session
    AnkiStudyShortcuts {
        isStudying: ankiRoot.isStudying
        isStudyFinished: ankiRoot.isStudyFinished
        isAnswerRevealed: ankiRoot.isAnswerRevealed
        onRevealRequested: ankiRoot.revealAnswer()
        onRateRequested: function(rating) { ankiRoot.rateCard(rating) }
        onExitRequested: {
            ankiRoot.isStudying = false
            ankiRoot.isStudyFinished = false
            ankiRoot.reloadDecks()
        }
    }

    // ===================================================================
    // 1. Deck Explorer View (Hierarchical Tree or Stats)
    // ===================================================================
    Item {
        anchors.fill: parent
        visible: !ankiRoot.isStudying

        ScrollView {
            anchors.fill: parent
            clip: true
            contentWidth: width

            ColumnLayout {
                width: Math.min(parent.width - 64, 1024)
                anchors.horizontalCenter: parent.horizontalCenter
                spacing: 24

                Item { height: 16 } // Top breathing room

                // Top Header with Brain icon and Action Buttons
                AnkiHeaderBar {
                    isShowingStats: ankiRoot.isShowingStats
                    onToggleStatsRequested: {
                        if (!ankiRoot.isShowingStats) {
                            ankiRoot.globalStats = dataController.getGlobalAnkiStats()
                        }
                        ankiRoot.isShowingStats = !ankiRoot.isShowingStats
                    }
                    onCreateRootDeckRequested: ankiRoot.openCreateRootDeck()
                }

                // Decks List Section (When not in Stats mode)
                AnkiDeckListSection {
                    visible: !ankiRoot.isShowingStats
                    Layout.fillWidth: true
                    hierarchicalDecks: ankiRoot.hierarchicalDecks
                    collapsedDeckMap: ankiRoot.collapsedDeckMap
                    onRequestToggleCollapse: function(deckId) { ankiRoot.toggleCollapse(deckId) }
                    onRequestCreateSubDeck: function(parentDeck) { ankiRoot.openCreateSubDeck(parentDeck) }
                    onRequestOpenBrowser: function(deck) { ankiRoot.openDeckBrowser(deck) }
                    onRequestStartStudy: function(deck) { ankiRoot.startStudy(deck) }
                }

                // FSRS Statistics Dashboard (When in Stats mode)
                AnkiStatsDashboard {
                    visible: ankiRoot.isShowingStats
                    Layout.fillWidth: true
                    globalStats: ankiRoot.globalStats
                }

                Item { height: 48 } // Bottom breathing room
            }
        }
    }

    // ===================================================================
    // 2. Study Session View (Zen Focus Canvas + FSRS Rating Dock)
    // ===================================================================
    AnkiStudySession {
        id: studySession
        isStudying: ankiRoot.isStudying
        deck: ankiRoot.selectedDeck
        cards: ankiRoot.deckCards
        currentCardIndex: ankiRoot.currentCardIndex
        isAnswerRevealed: ankiRoot.isAnswerRevealed
        isStudyFinished: ankiRoot.isStudyFinished
        cardsReviewedThisSession: ankiRoot.cardsReviewedThisSession
        userTypedAnswer: ankiRoot.userTypedAnswer
        exactMatch: ankiRoot.exactMatch

        onSessionClosed: {
            ankiRoot.isStudying = false
            ankiRoot.isStudyFinished = false
            ankiRoot.reloadDecks()
        }
        onRequestReveal: ankiRoot.revealAnswer()
        onRequestRate: function(rating) { ankiRoot.rateCard(rating) }
    }

    // ===================================================================
    // 3. Deck Browser Modal (Manage Cards, Search, Add, Delete)
    // ===================================================================
    AnkiDeckBrowserModal {
        id: deckBrowserModal
        isOpen: ankiRoot.isDeckBrowserOpen
        deck: ankiRoot.browserDeck
        cards: ankiRoot.browserCards
        onClosed: ankiRoot.isDeckBrowserOpen = false
        onRequestAddCard: ankiRoot.isCreatingCard = true
        onRequestOpenSettings: ankiRoot.isDeckSettingsOpen = true
        onRequestDeleteCard: function(cardId) {
            dataController.deleteCard(cardId)
            ankiRoot.loadBrowserCards(ankiRoot.browserDeck.id)
            ankiRoot.reloadDecks()
        }
    }

    // ===================================================================
    // 4. Create Deck / Create Sub-deck Modal
    // ===================================================================
    AnkiCreateDeckModal {
        id: createDeckModal
        isOpen: ankiRoot.isCreatingDeck
        parentId: ankiRoot.createDeckParentId
        parentName: ankiRoot.createDeckParentName
        onClosed: ankiRoot.isCreatingDeck = false
        onDeckCreated: function(name, description, color, parentId) {
            dataController.createDeck(name, description, color, parentId)
            ankiRoot.reloadDecks()
        }
    }

    // ===================================================================
    // 5. Create Card Modal
    // ===================================================================
    AnkiCreateCardModal {
        id: createCardModal
        isOpen: ankiRoot.isCreatingCard
        deck: ankiRoot.browserDeck
        onClosed: ankiRoot.isCreatingCard = false
        onCardCreated: function(deckId, front, back, extraNote) {
            dataController.createCard(deckId, front, back, extraNote)
            ankiRoot.loadBrowserCards(deckId)
            ankiRoot.reloadDecks()
        }
    }

    // ===================================================================
    // 6. Deck Settings & Management Modal
    // ===================================================================
    AnkiDeckSettingsModal {
        id: deckSettingsModal
        isOpen: ankiRoot.isDeckSettingsOpen
        currentDeck: ankiRoot.browserDeck
        onClosed: ankiRoot.isDeckSettingsOpen = false
        onDeckUpdated: function(deckId, name, description, color) {
            dataController.updateDeck(deckId, name, description, color)
            ankiRoot.reloadDecks()
        }
        onDeckDeleted: function(deckId) {
            dataController.deleteDeck(deckId)
            ankiRoot.isDeckBrowserOpen = false
            ankiRoot.reloadDecks()
        }
        onProgressReset: function(deckId) {
            dataController.resetDeckProgress(deckId)
            ankiRoot.loadBrowserCards(deckId)
            ankiRoot.reloadDecks()
        }
    }
}
