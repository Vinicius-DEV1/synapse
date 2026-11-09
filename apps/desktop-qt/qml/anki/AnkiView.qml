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

    // Modals
    property bool isCreatingDeck: false
    property string createDeckParentId: ""
    property string createDeckParentName: ""
    property bool isDeckBrowserOpen: false
    property var browserDeck: null
    property var browserCards: []
    property string browserSearchQuery: ""
    property bool isCreatingCard: false
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

    function isDeckVisible(deck) {
        if (!deck) return false
        if (!deck.depth || deck.depth === 0) return true
        
        // Check if any ancestor is collapsed
        var pid = deck.parent_id
        while (pid && pid !== "" && pid !== "null") {
            if (collapsedDeckMap[pid]) {
                return false
            }
            // Find parent's parent
            var found = false
            for (var i = 0; i < hierarchicalDecks.length; ++i) {
                if (hierarchicalDecks[i].id === pid) {
                    pid = hierarchicalDecks[i].parent_id
                    found = true
                    break
                }
            }
            if (!found) break
        }
        return true
    }

    function isClozeCard(card) {
        if (!card) return false
        if (card.card_type === "cloze") return true
        return (typeof card.front === "string") && card.front.indexOf("{{c") !== -1
    }

    function getTargetClozeAnswer(card) {
        if (!card || !card.front) return ""
        var match = card.front.match(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/)
        return match ? match[1] : ""
    }

    function formatClozeText(text, revealed, typed) {
        if (!text) return ""
        var clean = text.replace(/<br\s*[\/]?>/gi, "<br/>").replace(/<\/?p[^>]*>/gi, "")
        if (!revealed) {
            return clean.replace(/\{\{c\d+::(.*?)(?:::([^}]+))?\}\}/g, function(match, ans, hint) {
                var hintLabel = hint ? hint : "..."
                return "<span style='color: #818cf8; font-weight: bold; background-color: rgba(99,102,241,0.2); padding: 2px 8px; border-radius: 6px; border: 1px dashed #818cf8;'>[" + hintLabel + "]</span>"
            })
        } else {
            return clean.replace(/\{\{c\d+::(.*?)(?:::([^}]+))?\}\}/g, function(match, ans) {
                var color = "#34d399" // emerald
                if (typed && typed.length > 0) {
                    var matchOk = (typed.trim().toLowerCase() === ans.trim().toLowerCase())
                    color = matchOk ? "#34d399" : "#fb7185" // emerald or rose
                }
                return "<span style='color: " + color + "; font-weight: bold; background-color: rgba(99,102,241,0.15); padding: 2px 8px; border-radius: 6px; border-bottom: 2px solid " + color + ";'>" + ans + "</span>"
            })
        }
    }

    function revealAnswer() {
        if (deckCards.length > 0 && currentCardIndex < deckCards.length) {
            var card = deckCards[currentCardIndex]
            if (isClozeCard(card) || card.card_type === "typing") {
                var target = getTargetClozeAnswer(card)
                exactMatch = (userTypedAnswer.trim().toLowerCase() === target.trim().toLowerCase())
            }
        }
        isAnswerRevealed = true
    }

    function startStudy(deck) {
        selectedDeck = deck
        var due = dataController.getDueCards(deck.id)
        if (due.length === 0) {
            // Also try fallback deck cards
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

    // Keyboard navigation during study
    Shortcut {
        sequence: "Space"
        enabled: ankiRoot.isStudying && !ankiRoot.isStudyFinished && !ankiRoot.isAnswerRevealed
        onActivated: ankiRoot.revealAnswer()
    }
    Shortcut {
        sequence: "Return"
        enabled: ankiRoot.isStudying && !ankiRoot.isStudyFinished && !ankiRoot.isAnswerRevealed
        onActivated: ankiRoot.revealAnswer()
    }
    Shortcut {
        sequence: "1"
        enabled: ankiRoot.isStudying && !ankiRoot.isStudyFinished && ankiRoot.isAnswerRevealed
        onActivated: ankiRoot.rateCard(1)
    }
    Shortcut {
        sequence: "2"
        enabled: ankiRoot.isStudying && !ankiRoot.isStudyFinished && ankiRoot.isAnswerRevealed
        onActivated: ankiRoot.rateCard(2)
    }
    Shortcut {
        sequence: "3"
        enabled: ankiRoot.isStudying && !ankiRoot.isStudyFinished && ankiRoot.isAnswerRevealed
        onActivated: ankiRoot.rateCard(3)
    }
    Shortcut {
        sequence: "4"
        enabled: ankiRoot.isStudying && !ankiRoot.isStudyFinished && ankiRoot.isAnswerRevealed
        onActivated: ankiRoot.rateCard(4)
    }
    Shortcut {
        sequence: "Esc"
        enabled: ankiRoot.isStudying
        onActivated: {
            ankiRoot.isStudying = false
            ankiRoot.isStudyFinished = false
            ankiRoot.reloadDecks()
        }
    }

    // ===================================================================
    // 1. Deck Explorer View (Hierarchical Tree)
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

                // Top Header with BrainCircuit and Action Buttons
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 16

                    ColumnLayout {
                        spacing: 4

                        RowLayout {
                            spacing: 10
                            Text {
                                text: "⚡"
                                font.pixelSize: 28
                                color: "#818cf8"
                            }
                            Text {
                                text: "Flashcards"
                                color: "#fffffe"
                                font.pixelSize: 28
                                font.bold: true
                            }
                        }

                        Text {
                            text: "FSRS Spaced Repetition System • Repetição espaçada determinística com algoritmo nativo em Rust"
                            color: "#a7a9be"
                            font.pixelSize: 13
                        }
                    }

                    Item { Layout.fillWidth: true }

                    // "Estatísticas" Button
                    Rectangle {
                        width: 130
                        height: 40
                        radius: 10
                        color: ankiRoot.isShowingStats ? "#6366f126" : "#1a1924"
                        border.color: ankiRoot.isShowingStats ? "#818cf8" : "#ffffff15"
                        border.width: 1

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 8
                            Text { text: "📊"; font.pixelSize: 14 }
                            Text {
                                text: ankiRoot.isShowingStats ? "Baralhos" : "Estatísticas"
                                color: ankiRoot.isShowingStats ? "#a78bfa" : "#fffffe"
                                font.pixelSize: 13
                                font.bold: true
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                if (!ankiRoot.isShowingStats) {
                                    ankiRoot.globalStats = dataController.getGlobalAnkiStats()
                                }
                                ankiRoot.isShowingStats = !ankiRoot.isShowingStats
                            }
                        }
                    }

                    // "+ Criar Baralho" Button
                    Rectangle {
                        width: 144
                        height: 40
                        radius: 10
                        color: "#6366f1" // indigo-600

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 8
                            Text { text: "+"; color: "#ffffff"; font.pixelSize: 18; font.bold: true }
                            Text { text: "Criar Baralho"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            hoverEnabled: true
                            onEntered: parent.color = "#4f46e5"
                            onExited: parent.color = "#6366f1"
                            onClicked: ankiRoot.openCreateRootDeck()
                        }
                    }
                }

                // Table Header (BARALHO | ESTATÍSTICAS | AÇÕES)
                Rectangle {
                    visible: !ankiRoot.isShowingStats
                    Layout.fillWidth: true
                    height: 36
                    radius: 8
                    color: "#15141b"
                    border.color: "#ffffff0a"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 16
                        anchors.rightMargin: 16
                        spacing: 16

                        Text {
                            Layout.fillWidth: true
                            text: "BARALHO"
                            color: "#64748b"
                            font.pixelSize: 11
                            font.bold: true
                            font.letterSpacing: 1.2
                        }

                        Text {
                            Layout.preferredWidth: 200
                            text: "ESTATÍSTICAS"
                            color: "#64748b"
                            font.pixelSize: 11
                            font.bold: true
                            font.letterSpacing: 1.2
                            horizontalAlignment: Text.AlignHCenter
                        }

                        Text {
                            Layout.preferredWidth: 220
                            text: "AÇÕES"
                            color: "#64748b"
                            font.pixelSize: 11
                            font.bold: true
                            font.letterSpacing: 1.2
                            horizontalAlignment: Text.AlignRight
                        }
                    }
                }

                // Decks Repeater (Hierarchical Rows)
                ColumnLayout {
                    visible: !ankiRoot.isShowingStats
                    Layout.fillWidth: true
                    spacing: 8

                    Repeater {
                        model: ankiRoot.hierarchicalDecks

                        delegate: Item {
                            id: deckDelegate
                            property bool isVisibleInTree: ankiRoot.isDeckVisible(modelData)
                            property bool isCollapsed: ankiRoot.collapsedDeckMap[modelData.id] === true
                            property int depth: modelData.depth || 0

                            visible: isVisibleInTree
                            Layout.fillWidth: true
                            Layout.preferredHeight: isVisibleInTree ? 64 : 0

                            Rectangle {
                                anchors.left: parent.left
                                anchors.right: parent.right
                                anchors.top: parent.top
                                anchors.bottom: parent.bottom
                                anchors.leftMargin: deckDelegate.depth * 24
                                radius: 12
                                color: rowMouse.containsMouse ? "#211f30" : "#1a1924"
                                border.color: rowMouse.containsMouse ? "#6366f166" : "#ffffff0d"
                                border.width: 1

                                Behavior on color { ColorAnimation { duration: 150 } }
                                Behavior on border.color { ColorAnimation { duration: 150 } }

                                RowLayout {
                                    anchors.fill: parent
                                    anchors.leftMargin: 12
                                    anchors.rightMargin: 14
                                    spacing: 12

                                    // Chevron expand/collapse button
                                    Item {
                                        width: 24
                                        height: 24

                                        Text {
                                            anchors.centerIn: parent
                                            text: deckDelegate.isCollapsed ? "▶" : "▼"
                                            font.pixelSize: 11
                                            color: "#a7a9be"
                                            visible: modelData.has_children === true
                                        }

                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            enabled: modelData.has_children === true
                                            onClicked: ankiRoot.toggleCollapse(modelData.id)
                                        }
                                    }

                                    // Layers Icon (Indigo)
                                    Text {
                                        text: "🗂️"
                                        font.pixelSize: 16
                                    }

                                    // Title & Description
                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        spacing: 2

                                        Text {
                                            Layout.fillWidth: true
                                            text: modelData.name || "Sem título"
                                            color: rowMouse.containsMouse ? "#ffffff" : "#fffffeee"
                                            font.pixelSize: 15
                                            font.bold: true
                                            elide: Text.ElideRight
                                        }

                                        Text {
                                            Layout.fillWidth: true
                                            text: modelData.description || (modelData.card_count ? modelData.card_count + " cartões no total" : "Sem descrição")
                                            color: "#a7a9be"
                                            font.pixelSize: 12
                                            elide: Text.ElideRight
                                        }
                                    }

                                    // Stats Pill (Novos / Aprendendo / A Revisar)
                                    Rectangle {
                                        Layout.preferredWidth: 200
                                        height: 32
                                        radius: 8
                                        color: "#0f0e17"
                                        border.color: "#ffffff0f"
                                        border.width: 1

                                        RowLayout {
                                            anchors.centerIn: parent
                                            spacing: 16

                                            // Novos (Blue)
                                            RowLayout {
                                                spacing: 5
                                                Rectangle { width: 7; height: 7; radius: 3.5; color: "#38bdf8" }
                                                Text { text: "" + (modelData.novos || 0); color: "#38bdf8"; font.pixelSize: 12; font.bold: true }
                                            }

                                            // Aprendendo (Orange)
                                            RowLayout {
                                                spacing: 5
                                                Rectangle { width: 7; height: 7; radius: 3.5; color: "#f59e0b" }
                                                Text { text: "" + (modelData.aprender || 0); color: "#f59e0b"; font.pixelSize: 12; font.bold: true }
                                            }

                                            // A Revisar (Green)
                                            RowLayout {
                                                spacing: 5
                                                Rectangle { width: 7; height: 7; radius: 3.5; color: "#10b981" }
                                                Text { text: "" + (modelData.revisar || 0); color: "#10b981"; font.pixelSize: 12; font.bold: true }
                                            }
                                        }
                                    }

                                    // Action Buttons: [+] Criar Subbaralho | [⚙] Gerenciar | [Estudar ▶]
                                    RowLayout {
                                        Layout.preferredWidth: 220
                                        spacing: 8
                                        Layout.alignment: Qt.AlignRight

                                        // [+] Add Sub-deck button
                                        Rectangle {
                                            width: 32
                                            height: 32
                                            radius: 8
                                            color: subMouse.containsMouse ? "#ffffff18" : "#ffffff0a"

                                            Text {
                                                anchors.centerIn: parent
                                                text: "+"
                                                color: "#a7a9be"
                                                font.pixelSize: 16
                                                font.bold: true
                                            }

                                            MouseArea {
                                                id: subMouse
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                hoverEnabled: true
                                                onClicked: ankiRoot.openCreateSubDeck(modelData)
                                            }
                                        }

                                        // [⚙] Manage Deck / DeckBrowser button
                                        Rectangle {
                                            width: 32
                                            height: 32
                                            radius: 8
                                            color: gearMouse.containsMouse ? "#ffffff18" : "#ffffff0a"

                                            Text {
                                                anchors.centerIn: parent
                                                text: "⚙"
                                                color: "#a7a9be"
                                                font.pixelSize: 14
                                            }

                                            MouseArea {
                                                id: gearMouse
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                hoverEnabled: true
                                                onClicked: ankiRoot.openDeckBrowser(modelData)
                                            }
                                        }

                                        // [Estudar ▶] Button
                                        Rectangle {
                                            width: 104
                                            height: 34
                                            radius: 8
                                            color: studyBtnMouse.containsMouse ? "#4338ca" : "#4f46e5"

                                            RowLayout {
                                                anchors.centerIn: parent
                                                spacing: 6
                                                Text { text: "▶"; color: "#ffffff"; font.pixelSize: 10 }
                                                Text { text: "Estudar"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                                            }

                                            MouseArea {
                                                id: studyBtnMouse
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                hoverEnabled: true
                                                onClicked: ankiRoot.startStudy(modelData)
                                            }
                                        }
                                    }
                                }

                                MouseArea {
                                    id: rowMouse
                                    anchors.fill: parent
                                    z: -1
                                    hoverEnabled: true
                                }
                            }
                        }
                    }
                }

                // Empty state when no decks exist
                Rectangle {
                    visible: !ankiRoot.isShowingStats && ankiRoot.hierarchicalDecks.length === 0
                    Layout.fillWidth: true
                    height: 240
                    radius: 16
                    color: "#161524"
                    border.color: "#ffffff0a"

                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 12
                        Text { Layout.alignment: Qt.AlignHCenter; text: "🎴"; font.pixelSize: 40; opacity: 0.5 }
                        Text { Layout.alignment: Qt.AlignHCenter; text: "Nenhum baralho encontrado"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                        Text { Layout.alignment: Qt.AlignHCenter; text: "Crie um baralho para começar a estudar."; color: "#a7a9be"; font.pixelSize: 13 }
                    }
                }

                // ===================================================================
                // FSRS Statistics Dashboard
                // ===================================================================
                ColumnLayout {
                    visible: ankiRoot.isShowingStats
                    Layout.fillWidth: true
                    spacing: 20

                    // 4 Overview KPI Cards
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 16

                        // 1. Total Cards
                        Rectangle {
                            Layout.fillWidth: true
                            height: 104
                            radius: 14
                            color: "#1a1924"
                            border.color: "#ffffff0d"
                            border.width: 1

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 16
                                RowLayout {
                                    spacing: 8
                                    Rectangle {
                                        width: 28; height: 28; radius: 6; color: "#6366f120"
                                        Text { anchors.centerIn: parent; text: "🧠"; font.pixelSize: 14 }
                                    }
                                    Text { text: "Total de Cartões"; color: "#a7a9be"; font.pixelSize: 12 }
                                }
                                Text {
                                    text: (ankiRoot.globalStats.total_cards || 0).toString()
                                    color: "#fffffe"
                                    font.pixelSize: 24
                                    font.bold: true
                                }
                            }
                        }

                        // 2. Total Reviews
                        Rectangle {
                            Layout.fillWidth: true
                            height: 104
                            radius: 14
                            color: "#1a1924"
                            border.color: "#ffffff0d"
                            border.width: 1

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 16
                                RowLayout {
                                    spacing: 8
                                    Rectangle {
                                        width: 28; height: 28; radius: 6; color: "#38bdf820"
                                        Text { anchors.centerIn: parent; text: "⚡"; font.pixelSize: 14 }
                                    }
                                    Text { text: "Total de Revisões"; color: "#a7a9be"; font.pixelSize: 12 }
                                }
                                Text {
                                    text: (ankiRoot.globalStats.total_reviews || 0).toString()
                                    color: "#fffffe"
                                    font.pixelSize: 24
                                    font.bold: true
                                }
                            }
                        }

                        // 3. Retention Rate
                        Rectangle {
                            Layout.fillWidth: true
                            height: 104
                            radius: 14
                            color: "#1a1924"
                            border.color: "#ffffff0d"
                            border.width: 1

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 16
                                RowLayout {
                                    spacing: 8
                                    Rectangle {
                                        width: 28; height: 28; radius: 6; color: "#10b98120"
                                        Text { anchors.centerIn: parent; text: "🎯"; font.pixelSize: 14 }
                                    }
                                    Text { text: "Taxa de Retenção"; color: "#a7a9be"; font.pixelSize: 12 }
                                }
                                Text {
                                    text: Number(ankiRoot.globalStats.retention_rate || 90.0).toFixed(1) + "%"
                                    color: "#34d399"
                                    font.pixelSize: 24
                                    font.bold: true
                                }
                            }
                        }

                        // 4. Avg Stability
                        Rectangle {
                            Layout.fillWidth: true
                            height: 104
                            radius: 14
                            color: "#1a1924"
                            border.color: "#ffffff0d"
                            border.width: 1

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 16
                                RowLayout {
                                    spacing: 8
                                    Rectangle {
                                        width: 28; height: 28; radius: 6; color: "#f59e0b20"
                                        Text { anchors.centerIn: parent; text: "⏱️"; font.pixelSize: 14 }
                                    }
                                    Text { text: "Estabilidade Média"; color: "#a7a9be"; font.pixelSize: 12 }
                                }
                                RowLayout {
                                    spacing: 6
                                    Text {
                                        text: Number(ankiRoot.globalStats.avg_stability || 0.0).toFixed(1)
                                        color: "#fffffe"
                                        font.pixelSize: 24
                                        font.bold: true
                                    }
                                    Text { text: "dias"; color: "#a7a9be"; font.pixelSize: 12 }
                                }
                            }
                        }
                    }

                    // Detailed 2-Card Row: Maturity & FSRS Distribution
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 16

                        // Maturity Distribution Card
                        Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 220
                            radius: 14
                            color: "#1a1924"
                            border.color: "#ffffff0d"
                            border.width: 1

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 20
                                spacing: 14

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: "Distribuição de Maturidade"
                                        color: "#fffffe"
                                        font.pixelSize: 14
                                        font.bold: true
                                    }
                                    Item { Layout.fillWidth: true }
                                    Text {
                                        text: "Dificuldade Média: " + Number(ankiRoot.globalStats.avg_difficulty || 0).toFixed(1) + "/10"
                                        color: "#a7a9be"
                                        font.pixelSize: 12
                                    }
                                }

                                // Status Bars (Novos, Aprendendo, Jovens, Maduros)
                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 10

                                    // Novos
                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 10
                                        Text { text: "Novos"; color: "#38bdf8"; font.pixelSize: 12; Layout.preferredWidth: 90 }
                                        Rectangle {
                                            Layout.fillWidth: true
                                            height: 8
                                            radius: 4
                                            color: "#ffffff10"
                                            Rectangle {
                                                width: parent.width * Math.min(1.0, (ankiRoot.globalStats.novos || 0) / Math.max(1, ankiRoot.globalStats.total_cards || 1))
                                                height: parent.height
                                                radius: 4
                                                color: "#38bdf8"
                                            }
                                        }
                                        Text { text: (ankiRoot.globalStats.novos || 0).toString(); color: "#fffffe"; font.pixelSize: 12; font.bold: true; Layout.preferredWidth: 35; horizontalAlignment: Text.AlignRight }
                                    }

                                    // Aprendendo
                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 10
                                        Text { text: "Aprendendo"; color: "#f59e0b"; font.pixelSize: 12; Layout.preferredWidth: 90 }
                                        Rectangle {
                                            Layout.fillWidth: true
                                            height: 8
                                            radius: 4
                                            color: "#ffffff10"
                                            Rectangle {
                                                width: parent.width * Math.min(1.0, (ankiRoot.globalStats.aprendendo || 0) / Math.max(1, ankiRoot.globalStats.total_cards || 1))
                                                height: parent.height
                                                radius: 4
                                                color: "#f59e0b"
                                            }
                                        }
                                        Text { text: (ankiRoot.globalStats.aprendendo || 0).toString(); color: "#fffffe"; font.pixelSize: 12; font.bold: true; Layout.preferredWidth: 35; horizontalAlignment: Text.AlignRight }
                                    }

                                    // Jovens (< 21 dias)
                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 10
                                        Text { text: "Jovens (<21d)"; color: "#34d399"; font.pixelSize: 12; Layout.preferredWidth: 90 }
                                        Rectangle {
                                            Layout.fillWidth: true
                                            height: 8
                                            radius: 4
                                            color: "#ffffff10"
                                            Rectangle {
                                                width: parent.width * Math.min(1.0, (ankiRoot.globalStats.jovens || 0) / Math.max(1, ankiRoot.globalStats.total_cards || 1))
                                                height: parent.height
                                                radius: 4
                                                color: "#34d399"
                                            }
                                        }
                                        Text { text: (ankiRoot.globalStats.jovens || 0).toString(); color: "#fffffe"; font.pixelSize: 12; font.bold: true; Layout.preferredWidth: 35; horizontalAlignment: Text.AlignRight }
                                    }

                                    // Maduros (>= 21 dias)
                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 10
                                        Text { text: "Maduros (≥21d)"; color: "#818cf8"; font.pixelSize: 12; Layout.preferredWidth: 90 }
                                        Rectangle {
                                            Layout.fillWidth: true
                                            height: 8
                                            radius: 4
                                            color: "#ffffff10"
                                            Rectangle {
                                                width: parent.width * Math.min(1.0, (ankiRoot.globalStats.maduros || 0) / Math.max(1, ankiRoot.globalStats.total_cards || 1))
                                                height: parent.height
                                                radius: 4
                                                color: "#818cf8"
                                            }
                                        }
                                        Text { text: (ankiRoot.globalStats.maduros || 0).toString(); color: "#fffffe"; font.pixelSize: 12; font.bold: true; Layout.preferredWidth: 35; horizontalAlignment: Text.AlignRight }
                                    }
                                }
                            }
                        }

                        // Rating Distribution Card (Errei, Difícil, Bom, Fácil)
                        Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 220
                            radius: 14
                            color: "#1a1924"
                            border.color: "#ffffff0d"
                            border.width: 1

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 20
                                spacing: 14

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: "Histórico de Avaliações FSRS"
                                        color: "#fffffe"
                                        font.pixelSize: 14
                                        font.bold: true
                                    }
                                    Item { Layout.fillWidth: true }
                                    Text {
                                        text: (ankiRoot.globalStats.total_reviews || 0) + " respostas"
                                        color: "#a7a9be"
                                        font.pixelSize: 12
                                    }
                                }

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 10

                                    // Errei (Rating 1)
                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 10
                                        Text { text: "Errei (1)"; color: "#f43f5e"; font.pixelSize: 12; Layout.preferredWidth: 80 }
                                        Rectangle {
                                            Layout.fillWidth: true
                                            height: 8
                                            radius: 4
                                            color: "#ffffff10"
                                            Rectangle {
                                                width: parent.width * Math.min(1.0, (ankiRoot.globalStats.errei || 0) / Math.max(1, ankiRoot.globalStats.total_reviews || 1))
                                                height: parent.height
                                                radius: 4
                                                color: "#f43f5e"
                                            }
                                        }
                                        Text { text: (ankiRoot.globalStats.errei || 0).toString(); color: "#fffffe"; font.pixelSize: 12; font.bold: true; Layout.preferredWidth: 35; horizontalAlignment: Text.AlignRight }
                                    }

                                    // Difícil (Rating 2)
                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 10
                                        Text { text: "Difícil (2)"; color: "#fb923c"; font.pixelSize: 12; Layout.preferredWidth: 80 }
                                        Rectangle {
                                            Layout.fillWidth: true
                                            height: 8
                                            radius: 4
                                            color: "#ffffff10"
                                            Rectangle {
                                                width: parent.width * Math.min(1.0, (ankiRoot.globalStats.dificil || 0) / Math.max(1, ankiRoot.globalStats.total_reviews || 1))
                                                height: parent.height
                                                radius: 4
                                                color: "#fb923c"
                                            }
                                        }
                                        Text { text: (ankiRoot.globalStats.dificil || 0).toString(); color: "#fffffe"; font.pixelSize: 12; font.bold: true; Layout.preferredWidth: 35; horizontalAlignment: Text.AlignRight }
                                    }

                                    // Bom (Rating 3)
                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 10
                                        Text { text: "Bom (3)"; color: "#38bdf8"; font.pixelSize: 12; Layout.preferredWidth: 80 }
                                        Rectangle {
                                            Layout.fillWidth: true
                                            height: 8
                                            radius: 4
                                            color: "#ffffff10"
                                            Rectangle {
                                                width: parent.width * Math.min(1.0, (ankiRoot.globalStats.bom || 0) / Math.max(1, ankiRoot.globalStats.total_reviews || 1))
                                                height: parent.height
                                                radius: 4
                                                color: "#38bdf8"
                                            }
                                        }
                                        Text { text: (ankiRoot.globalStats.bom || 0).toString(); color: "#fffffe"; font.pixelSize: 12; font.bold: true; Layout.preferredWidth: 35; horizontalAlignment: Text.AlignRight }
                                    }

                                    // Fácil (Rating 4)
                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 10
                                        Text { text: "Fácil (4)"; color: "#10b981"; font.pixelSize: 12; Layout.preferredWidth: 80 }
                                        Rectangle {
                                            Layout.fillWidth: true
                                            height: 8
                                            radius: 4
                                            color: "#ffffff10"
                                            Rectangle {
                                                width: parent.width * Math.min(1.0, (ankiRoot.globalStats.facil || 0) / Math.max(1, ankiRoot.globalStats.total_reviews || 1))
                                                height: parent.height
                                                radius: 4
                                                color: "#10b981"
                                            }
                                        }
                                        Text { text: (ankiRoot.globalStats.facil || 0).toString(); color: "#fffffe"; font.pixelSize: 12; font.bold: true; Layout.preferredWidth: 35; horizontalAlignment: Text.AlignRight }
                                    }
                                }
                            }
                        }
                    }
                }

                Item { height: 48 } // Bottom breathing room
            }
        }
    }

    // ===================================================================
    // 2. Study Session View (Zen Focus Canvas + FSRS Rating Dock)
    // ===================================================================
    Rectangle {
        id: studyOverlay
        anchors.fill: parent
        color: "#0f0e17" // Pure Zen Canvas
        visible: ankiRoot.isStudying
        z: 100

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
                    font.pixelSize: 17
                    font.bold: true
                }

                Text { text: "•"; color: "#64748b" }

                Text {
                    text: ankiRoot.isStudyFinished
                        ? "Sessão Concluída"
                        : "Cartão " + (ankiRoot.currentCardIndex + 1) + " de " + ankiRoot.deckCards.length
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
                        onClicked: {
                            ankiRoot.isStudying = false
                            ankiRoot.isStudyFinished = false
                            ankiRoot.reloadDecks()
                        }
                    }
                }
            }

            // Normal Study Card View
            Item {
                visible: !ankiRoot.isStudyFinished && ankiRoot.deckCards.length > 0
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
                        border.color: ankiRoot.isAnswerRevealed ? "#818cf844" : "#ffffff12"
                        border.width: 1

                        transform: Rotation {
                            id: cardFlip
                            origin.x: cardSurface.width / 2
                            origin.y: cardSurface.height / 2
                            axis { x: 0; y: 1; z: 0 }
                            angle: ankiRoot.isAnswerRevealed ? 360 : 0
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
                                    property var currentCard: (ankiRoot.deckCards.length > 0 && ankiRoot.currentCardIndex < ankiRoot.deckCards.length)
                                        ? ankiRoot.deckCards[ankiRoot.currentCardIndex] : null
                                    property bool isCloze: ankiRoot.isClozeCard(currentCard)
                                    visible: isCloze || (currentCard && currentCard.card_type === "typing")
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
                                    property var currentCard: (ankiRoot.deckCards.length > 0 && ankiRoot.currentCardIndex < ankiRoot.deckCards.length)
                                        ? ankiRoot.deckCards[ankiRoot.currentCardIndex] : null
                                    text: (currentCard && currentCard.reps !== undefined) ? ("Repetição #" + currentCard.reps) : ""
                                    color: "#64748b"
                                    font.pixelSize: 11
                                }
                            }

                            // Question / Cloze Text
                            Text {
                                Layout.fillWidth: true
                                property var currentCard: (ankiRoot.deckCards.length > 0 && ankiRoot.currentCardIndex < ankiRoot.deckCards.length)
                                    ? ankiRoot.deckCards[ankiRoot.currentCardIndex] : null
                                property bool isCloze: ankiRoot.isClozeCard(currentCard)
                                textFormat: isCloze ? Text.RichText : Text.PlainText
                                text: {
                                    if (!currentCard) return ""
                                    if (isCloze) {
                                        return ankiRoot.formatClozeText(currentCard.front, ankiRoot.isAnswerRevealed, ankiRoot.userTypedAnswer)
                                    }
                                    return currentCard.front
                                }
                                color: "#fffffe"
                                font.pixelSize: 21
                                font.bold: true
                                wrapMode: Text.Wrap
                            }

                            // Typing Input Field (for cloze or typing cards before reveal)
                            Rectangle {
                                property var currentCard: (ankiRoot.deckCards.length > 0 && ankiRoot.currentCardIndex < ankiRoot.deckCards.length)
                                    ? ankiRoot.deckCards[ankiRoot.currentCardIndex] : null
                                visible: !ankiRoot.isAnswerRevealed && (ankiRoot.isClozeCard(currentCard) || (currentCard && currentCard.card_type === "typing"))
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
                                    text: ankiRoot.userTypedAnswer
                                    onTextChanged: ankiRoot.userTypedAnswer = text
                                    onAccepted: ankiRoot.revealAnswer()

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

                            // Match Feedback Badge (if user typed an answer)
                            Rectangle {
                                property var currentCard: (ankiRoot.deckCards.length > 0 && ankiRoot.currentCardIndex < ankiRoot.deckCards.length)
                                    ? ankiRoot.deckCards[ankiRoot.currentCardIndex] : null
                                visible: ankiRoot.isAnswerRevealed && (ankiRoot.userTypedAnswer.length > 0) && (ankiRoot.isClozeCard(currentCard) || (currentCard && currentCard.card_type === "typing"))
                                Layout.fillWidth: true
                                height: 38
                                radius: 8
                                color: ankiRoot.exactMatch ? "#10b98115" : "#f43f5e15"
                                border.color: ankiRoot.exactMatch ? "#10b98144" : "#f43f5e44"
                                border.width: 1

                                RowLayout {
                                    anchors.fill: parent
                                    anchors.leftMargin: 12
                                    anchors.rightMargin: 12
                                    spacing: 8
                                    Text {
                                        text: ankiRoot.exactMatch ? "✓ Exato:" : "✕ Sua Resposta:"
                                        color: ankiRoot.exactMatch ? "#34d399" : "#fb7185"
                                        font.pixelSize: 12
                                        font.bold: true
                                    }
                                    Text {
                                        text: "\"" + ankiRoot.userTypedAnswer + "\""
                                        color: "#fffffe"
                                        font.pixelSize: 12
                                        font.bold: true
                                    }
                                    Item { Layout.fillWidth: true }
                                    Text {
                                        visible: !ankiRoot.exactMatch
                                        property var currentCard: (ankiRoot.deckCards.length > 0 && ankiRoot.currentCardIndex < ankiRoot.deckCards.length)
                                            ? ankiRoot.deckCards[ankiRoot.currentCardIndex] : null
                                        text: "Esperado: \"" + ankiRoot.getTargetClozeAnswer(currentCard) + "\""
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
                                visible: ankiRoot.isAnswerRevealed

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
                                    text: (ankiRoot.deckCards.length > 0 && ankiRoot.currentCardIndex < ankiRoot.deckCards.length)
                                        ? ankiRoot.deckCards[ankiRoot.currentCardIndex].back
                                        : ""
                                    color: "#a7a9be"
                                    font.pixelSize: 16
                                    wrapMode: Text.Wrap
                                }

                                // Extra Note if present
                                Rectangle {
                                    property var currentCard: (ankiRoot.deckCards.length > 0 && ankiRoot.currentCardIndex < ankiRoot.deckCards.length)
                                        ? ankiRoot.deckCards[ankiRoot.currentCardIndex] : null
                                    property string noteText: (currentCard && currentCard.extra_note) ? currentCard.extra_note : ""
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
                            visible: !ankiRoot.isAnswerRevealed
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
                                onClicked: ankiRoot.revealAnswer()
                            }
                        }

                        // 4 FSRS Rating Buttons Dock
                        RowLayout {
                            visible: ankiRoot.isAnswerRevealed
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
                                MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: ankiRoot.rateCard(1) }
                            }

                            // 2: Difícil (Hard)
                            Rectangle {
                                Layout.fillWidth: true; height: 56; radius: 12
                                color: "#1a1924"; border.color: "#f59e0b55"; border.width: 1
                                ColumnLayout { anchors.centerIn: parent; spacing: 2
                                    Text { Layout.alignment: Qt.AlignHCenter; text: "Difícil [2]"; color: "#fbbf24"; font.pixelSize: 13; font.bold: true }
                                    Text { Layout.alignment: Qt.AlignHCenter; text: "1.2 dias"; color: "#64748b"; font.pixelSize: 10 }
                                }
                                MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: ankiRoot.rateCard(2) }
                            }

                            // 3: Bom (Good)
                            Rectangle {
                                Layout.fillWidth: true; height: 56; radius: 12
                                color: "#1a1924"; border.color: "#10b98155"; border.width: 1
                                ColumnLayout { anchors.centerIn: parent; spacing: 2
                                    Text { Layout.alignment: Qt.AlignHCenter; text: "Bom [3]"; color: "#34d399"; font.pixelSize: 13; font.bold: true }
                                    Text { Layout.alignment: Qt.AlignHCenter; text: "3.5 dias"; color: "#64748b"; font.pixelSize: 10 }
                                }
                                MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: ankiRoot.rateCard(3) }
                            }

                            // 4: Fácil (Easy)
                            Rectangle {
                                Layout.fillWidth: true; height: 56; radius: 12
                                color: "#1a1924"; border.color: "#38bdf855"; border.width: 1
                                ColumnLayout { anchors.centerIn: parent; spacing: 2
                                    Text { Layout.alignment: Qt.AlignHCenter; text: "Fácil [4]"; color: "#38bdf8"; font.pixelSize: 13; font.bold: true }
                                    Text { Layout.alignment: Qt.AlignHCenter; text: "7.0 dias"; color: "#64748b"; font.pixelSize: 10 }
                                }
                                MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: ankiRoot.rateCard(4) }
                            }
                        }
                    }
                }
            }

            // Session Finished Summary View
            Rectangle {
                visible: ankiRoot.isStudyFinished || ankiRoot.deckCards.length === 0
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
                        text: ankiRoot.cardsReviewedThisSession > 0
                            ? "Você revisou " + ankiRoot.cardsReviewedThisSession + " cartão(ões) hoje de acordo com o algoritmo FSRS v5."
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
                            onClicked: {
                                ankiRoot.isStudying = false
                                ankiRoot.isStudyFinished = false
                                ankiRoot.reloadDecks()
                            }
                        }
                    }
                }
            }
        }
    }

    // ===================================================================
    // 3. Deck Browser Modal (Manage Cards, Search, Add, Delete)
    // ===================================================================
    Rectangle {
        id: browserModal
        anchors.fill: parent
        color: "#b3000000"
        visible: ankiRoot.isDeckBrowserOpen
        z: 110

        MouseArea { anchors.fill: parent } // Block background clicks

        Rectangle {
            anchors.centerIn: parent
            width: Math.min(parent.width - 64, 860)
            height: Math.min(parent.height - 64, 600)
            radius: 16
            color: "#161524"
            border.color: "#ffffff18"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 24
                spacing: 16

                // Browser Header
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    ColumnLayout {
                        spacing: 2
                        Text {
                            text: ankiRoot.browserDeck ? ankiRoot.browserDeck.name : "Navegador de Cartões"
                            color: "#fffffe"
                            font.pixelSize: 18
                            font.bold: true
                        }
                        Text {
                            text: ankiRoot.browserCards.length + " cartão(ões) cadastrado(s)"
                            color: "#a7a9be"
                            font.pixelSize: 12
                        }
                    }

                    Item { Layout.fillWidth: true }

                    // "+ Adicionar Cartão" Button
                    Rectangle {
                        width: 130; height: 36; radius: 8
                        color: "#6366f1"

                        RowLayout {
                            anchors.centerIn: parent; spacing: 6
                            Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                            Text { text: "Novo Cartão"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: ankiRoot.isCreatingCard = true
                        }
                    }

                    // Close Button
                    Rectangle {
                        width: 32; height: 32; radius: 8
                        color: "#ffffff10"

                        Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 14 }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: ankiRoot.isDeckBrowserOpen = false
                        }
                    }
                }

                // Cards List Table
                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    radius: 10
                    color: "#0f0e17"
                    border.color: "#ffffff0f"
                    clip: true

                    ListView {
                        id: browserCardsList
                        anchors.fill: parent
                        anchors.margins: 8
                        spacing: 6
                        model: ankiRoot.browserCards

                        delegate: Rectangle {
                            width: browserCardsList.width
                            height: 60
                            radius: 8
                            color: "#1a1924"
                            border.color: "#ffffff0a"

                            RowLayout {
                                anchors.fill: parent
                                anchors.margins: 12
                                spacing: 16

                                // Question Front Preview
                                ColumnLayout {
                                    Layout.preferredWidth: 300
                                    spacing: 2
                                    Text { text: "FRENTE"; color: "#818cf8"; font.pixelSize: 9; font.bold: true }
                                    Text {
                                        Layout.fillWidth: true
                                        text: modelData.front || ""
                                        color: "#fffffe"
                                        font.pixelSize: 13
                                        font.bold: true
                                        elide: Text.ElideRight
                                    }
                                }

                                // Answer Back Preview
                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 2
                                    Text { text: "VERSO"; color: "#34d399"; font.pixelSize: 9; font.bold: true }
                                    Text {
                                        Layout.fillWidth: true
                                        text: modelData.back || ""
                                        color: "#a7a9be"
                                        font.pixelSize: 12
                                        elide: Text.ElideRight
                                    }
                                }

                                // Reps Count
                                Text {
                                    Layout.preferredWidth: 70
                                    text: (modelData.reps || 0) + " reps"
                                    color: "#64748b"
                                    font.pixelSize: 11
                                }

                                // Delete Card Button
                                Rectangle {
                                    width: 28; height: 28; radius: 6
                                    color: "#f43f5e1a"

                                    Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 12 }

                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            dataController.deleteCard(modelData.id)
                                            ankiRoot.loadBrowserCards(ankiRoot.browserDeck.id)
                                            ankiRoot.reloadDecks()
                                        }
                                    }
                                }
                            }
                        }

                        // Empty Cards Placeholder
                        Text {
                            anchors.centerIn: parent
                            visible: ankiRoot.browserCards.length === 0
                            text: "Nenhum cartão cadastrado neste baralho.\nClique em '+ Novo Cartão' acima para começar."
                            color: "#64748b"
                            font.pixelSize: 13
                            horizontalAlignment: Text.AlignHCenter
                        }
                    }
                }
            }
        }
    }

    // ===================================================================
    // 4. Create Deck / Create Sub-deck Modal
    // ===================================================================
    Rectangle {
        id: createDeckModal
        anchors.fill: parent
        color: "#b3000000"
        visible: ankiRoot.isCreatingDeck
        z: 120

        MouseArea { anchors.fill: parent }

        Rectangle {
            anchors.centerIn: parent
            width: 440
            height: 300
            radius: 16
            color: "#161524"
            border.color: "#ffffff18"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 24
                spacing: 16

                Text {
                    text: ankiRoot.createDeckParentId !== ""
                        ? "Novo Sub-baralho de " + ankiRoot.createDeckParentName
                        : "Criar Novo Baralho"
                    color: "#fffffe"
                    font.pixelSize: 17
                    font.bold: true
                }

                TextField {
                    id: deckNameField
                    Layout.fillWidth: true
                    placeholderText: "Nome do baralho..."
                    color: "#ffffff"
                    background: Rectangle {
                        color: "#0f0e17"
                        border.color: "#ffffff1a"
                        radius: 8
                    }
                }

                TextField {
                    id: deckDescField
                    Layout.fillWidth: true
                    placeholderText: "Descrição opcional..."
                    color: "#ffffff"
                    background: Rectangle {
                        color: "#0f0e17"
                        border.color: "#ffffff1a"
                        radius: 8
                    }
                }

                Item { Layout.fillHeight: true }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    Button {
                        text: "Cancelar"
                        Layout.fillWidth: true
                        onClicked: {
                            ankiRoot.isCreatingDeck = false
                            deckNameField.text = ""
                            deckDescField.text = ""
                        }
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        height: 40
                        radius: 8
                        color: "#6366f1"

                        Text {
                            anchors.centerIn: parent
                            text: "Criar Baralho"
                            color: "#ffffff"
                            font.pixelSize: 13
                            font.bold: true
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                if (deckNameField.text.trim().length > 0) {
                                    dataController.createDeck(
                                        deckNameField.text.trim(),
                                        deckDescField.text.trim(),
                                        "#6366f1",
                                        ankiRoot.createDeckParentId
                                    )
                                    deckNameField.text = ""
                                    deckDescField.text = ""
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

    // ===================================================================
    // 5. Create Card Modal
    // ===================================================================
    Rectangle {
        id: createCardModal
        anchors.fill: parent
        color: "#b3000000"
        visible: ankiRoot.isCreatingCard
        z: 130

        MouseArea { anchors.fill: parent }

        Rectangle {
            anchors.centerIn: parent
            width: 480
            height: 380
            radius: 16
            color: "#161524"
            border.color: "#ffffff18"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 24
                spacing: 14

                Text {
                    text: "Novo Cartão"
                    color: "#fffffe"
                    font.pixelSize: 17
                    font.bold: true
                }

                TextField {
                    id: cardFrontField
                    Layout.fillWidth: true
                    placeholderText: "Frente do cartão (pergunta)..."
                    color: "#ffffff"
                    background: Rectangle {
                        color: "#0f0e17"
                        border.color: "#ffffff1a"
                        radius: 8
                    }
                }

                TextArea {
                    id: cardBackField
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    placeholderText: "Verso do cartão (resposta)..."
                    color: "#ffffff"
                    wrapMode: Text.Wrap
                    background: Rectangle {
                        color: "#0f0e17"
                        border.color: "#ffffff1a"
                        radius: 8
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    Button {
                        text: "Cancelar"
                        Layout.fillWidth: true
                        onClicked: {
                            ankiRoot.isCreatingCard = false
                            cardFrontField.text = ""
                            cardBackField.text = ""
                        }
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        height: 40
                        radius: 8
                        color: "#6366f1"

                        Text {
                            anchors.centerIn: parent
                            text: "Salvar Cartão"
                            color: "#ffffff"
                            font.pixelSize: 13
                            font.bold: true
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                if (cardFrontField.text.trim().length > 0 && ankiRoot.browserDeck) {
                                    dataController.createCard(ankiRoot.browserDeck.id, cardFrontField.text.trim(), cardBackField.text.trim(), "")
                                    cardFrontField.text = ""
                                    cardBackField.text = ""
                                    ankiRoot.isCreatingCard = false
                                    ankiRoot.loadBrowserCards(ankiRoot.browserDeck.id)
                                    ankiRoot.reloadDecks()
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
