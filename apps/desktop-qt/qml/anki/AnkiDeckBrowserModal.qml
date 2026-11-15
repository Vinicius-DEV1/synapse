import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: browserRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: isOpen
    z: 110

    property bool isOpen: false
    property var deck: null
    property var cards: []
    property string searchQuery: ""
    property string typeFilter: "all"
    property int viewMode: 0 // 0: List, 1: Grid, 2: Table
    property var selectedIds: ({})
    property int selectedCount: 0

    signal closed()
    signal requestAddCard()
    signal requestEditCard(var card)
    signal requestOpenSettings()
    signal requestDeleteCard(string cardId)
    signal requestOpenAI()
    signal requestBatchDelete(var cardIds)
    signal requestBatchReset(var cardIds)

    readonly property var filteredCards: {
        var query = searchQuery.trim().toLowerCase()
        var filter = typeFilter
        var list = cards || []
        return list.filter(function(card) {
            if (filter !== "all") {
                var ctype = card.card_type || "reading"
                if (ctype !== filter) return false
            }
            if (!query) return true
            var front = (card.front || "").toLowerCase()
            var back = (card.back || "").toLowerCase()
            var tags = (card.tags || "").toLowerCase()
            var extra = (card.extra_note || "").toLowerCase()
            return front.indexOf(query) !== -1 || back.indexOf(query) !== -1 ||
                   tags.indexOf(query) !== -1 || extra.indexOf(query) !== -1
        })
    }

    onIsOpenChanged: {
        if (isOpen) {
            searchQuery = ""
            typeFilter = "all"
            clearSelection()
        }
    }

    function toggleCardSelected(cardId) {
        var copy = Object.assign({}, selectedIds)
        if (copy[cardId]) delete copy[cardId]
        else copy[cardId] = true
        selectedIds = copy
        selectedCount = Object.keys(copy).length
    }

    function selectAllCards() {
        var copy = {}
        for (var i = 0; i < filteredCards.length; i++) {
            copy[filteredCards[i].id] = true
        }
        selectedIds = copy
        selectedCount = Object.keys(copy).length
    }

    function clearSelection() {
        selectedIds = ({})
        selectedCount = 0
    }

    MouseArea { anchors.fill: parent }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 880)
        height: Math.min(parent.height - 48, 620)
        radius: 16
        color: "#161524"
        border.color: "#18ffffff"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 20
            spacing: 12

            // Browser Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: browserRoot.deck ? browserRoot.deck.name : "Navegador de Cartões"
                        color: "#fffffe"
                        font.pixelSize: 18
                        font.bold: true
                    }
                    Text {
                        text: browserRoot.filteredCards.length + " de " + (browserRoot.cards ? browserRoot.cards.length : 0) + " cartão(ões)"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                }

                Item { Layout.fillWidth: true }

                // "+ Novo Cartão" Button
                Rectangle {
                    width: 120; height: 36; radius: 8
                    color: newCardMouse.containsMouse ? "#4f46e5" : "#6366f1"

                    RowLayout {
                        anchors.centerIn: parent; spacing: 6
                        Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                        Text { text: "Novo Cartão"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    }

                    MouseArea {
                        id: newCardMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: browserRoot.requestAddCard()
                    }
                }

                // "✨ Assistente IA" Button
                Rectangle {
                    width: 120; height: 36; radius: 8
                    color: aiMouse.containsMouse ? "#4338ca" : "#3730a3"

                    RowLayout {
                        anchors.centerIn: parent; spacing: 6
                        Text { text: "✨"; font.pixelSize: 13 }
                        Text { text: qsTr("Assistente IA"); color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    }

                    MouseArea {
                        id: aiMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: browserRoot.requestOpenAI()
                    }
                }

                // "⚙ Ajustes" Button
                Rectangle {
                    width: 90; height: 36; radius: 8
                    color: settingsMouse.containsMouse ? "#2d2a40" : "#211f30"
                    border.color: "#15ffffff"

                    RowLayout {
                        anchors.centerIn: parent; spacing: 6
                        Text { text: "⚙"; color: "#a7a9be"; font.pixelSize: 12 }
                        Text { text: "Ajustes"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    }

                    MouseArea {
                        id: settingsMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: browserRoot.requestOpenSettings()
                    }
                }

                // View Mode Switcher (List, Grid, Table)
                RowLayout {
                    spacing: 4
                    Rectangle {
                        width: 30; height: 30; radius: 6
                        color: browserRoot.viewMode === 0 ? "#4338ca" : "#1a1928"
                        Text { anchors.centerIn: parent; text: "☰"; color: browserRoot.viewMode === 0 ? "#ffffff" : "#71717a"; font.pixelSize: 13 }
                        MouseArea { anchors.fill: parent; onClicked: browserRoot.viewMode = 0 }
                    }
                    Rectangle {
                        width: 30; height: 30; radius: 6
                        color: browserRoot.viewMode === 1 ? "#4338ca" : "#1a1928"
                        Text { anchors.centerIn: parent; text: "▦"; color: browserRoot.viewMode === 1 ? "#ffffff" : "#71717a"; font.pixelSize: 13 }
                        MouseArea { anchors.fill: parent; onClicked: browserRoot.viewMode = 1 }
                    }
                    Rectangle {
                        width: 30; height: 30; radius: 6
                        color: browserRoot.viewMode === 2 ? "#4338ca" : "#1a1928"
                        Text { anchors.centerIn: parent; text: "𝄜"; color: browserRoot.viewMode === 2 ? "#ffffff" : "#71717a"; font.pixelSize: 13 }
                        MouseArea { anchors.fill: parent; onClicked: browserRoot.viewMode = 2 }
                    }
                }

                // Close Button
                Rectangle {
                    width: 32; height: 32; radius: 8
                    color: closeMouse.containsMouse ? "#20ffffff" : "#10ffffff"
                    Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 14 }
                    MouseArea {
                        id: closeMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: browserRoot.closed()
                    }
                }
            }

            // Search Bar & Type Filter Chips
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                // Search Input
                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 36
                    radius: 8
                    color: "#0f0e17"
                    border.color: "#1affffff"

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 10
                        anchors.rightMargin: 10
                        spacing: 8

                        Text { text: "🔍"; font.pixelSize: 12; color: "#71717a" }

                        TextField {
                            id: searchInput
                            Layout.fillWidth: true
                            placeholderText: "Buscar cartões por frente, verso ou tags..."
                            color: "#ffffff"
                            font.pixelSize: 12
                            background: null
                            text: browserRoot.searchQuery
                            onTextChanged: browserRoot.searchQuery = text
                        }

                        Text {
                            visible: browserRoot.searchQuery.length > 0
                            text: "✕"
                            color: "#a7a9be"
                            font.pixelSize: 11
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    browserRoot.searchQuery = ""
                                    searchInput.text = ""
                                }
                            }
                        }
                    }
                }

                // Type Filter Chips
                RowLayout {
                    spacing: 6

                    Repeater {
                        model: [
                            { key: "all", label: "Todos" },
                            { key: "reading", label: "Leitura" },
                            { key: "cloze", label: "Cloze" },
                            { key: "typing", label: "Digitação" },
                            { key: "listening", label: "Escuta" }
                        ]

                        delegate: Rectangle {
                            required property var modelData
                            readonly property bool isSelected: browserRoot.typeFilter === modelData.key
                            Layout.preferredHeight: 32
                            Layout.preferredWidth: chipText.contentWidth + 16
                            radius: 6
                            color: isSelected ? "#312e81" : "#1a1928"
                            border.color: isSelected ? "#818cf8" : "#14ffffff"
                            border.width: 1

                            Text {
                                id: chipText
                                anchors.centerIn: parent
                                text: modelData.label
                                color: parent.isSelected ? "#ffffff" : "#a7a9be"
                                font.pixelSize: 11
                                font.bold: parent.isSelected
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: browserRoot.typeFilter = modelData.key
                            }
                        }
                    }
                }
            }

            // Batch Actions Bar (visible when cards are selected)
            AnkiBatchActions {
                selectedCount: browserRoot.selectedCount
                onSelectAllRequested: browserRoot.selectAllCards()
                onClearSelectionRequested: browserRoot.clearSelection()
                onBatchDeleteRequested: {
                    var ids = Object.keys(browserRoot.selectedIds)
                    browserRoot.requestBatchDelete(ids)
                    browserRoot.clearSelection()
                }
                onBatchResetRequested: {
                    var ids = Object.keys(browserRoot.selectedIds)
                    browserRoot.requestBatchReset(ids)
                    browserRoot.clearSelection()
                }
            }

            // Cards Container
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                radius: 10
                color: "#0f0e17"
                border.color: "#0fffffff"
                clip: true

                // View Mode 0: Compact List
                ListView {
                    id: browserCardsList
                    visible: browserRoot.viewMode === 0
                    anchors.fill: parent
                    anchors.margins: 8
                    spacing: 6
                    model: browserRoot.filteredCards

                    delegate: Rectangle {
                        id: cardItemRect
                        required property var modelData
                        required property int index
                        width: browserCardsList.width
                        height: 68
                        radius: 8
                        color: cardMouse.containsMouse ? "#212030" : "#1a1924"
                        border.color: cardMouse.containsMouse ? "#20818cf8" : "#0affffff"

                        readonly property string cardType: modelData.card_type || "reading"
                        readonly property color typeColor: {
                            if (cardType === "cloze") return "#a855f7"
                            if (cardType === "typing") return "#10b981"
                            if (cardType === "listening") return "#f59e0b"
                            return "#6366f1"
                        }

                        MouseArea {
                            id: cardMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: browserRoot.requestEditCard(modelData)
                        }

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 12

                            // Type Badge
                            Rectangle {
                                Layout.preferredWidth: typeBadgeLabel.contentWidth + 10
                                Layout.preferredHeight: 20
                                radius: 4
                                color: Qt.rgba(cardItemRect.typeColor.r, cardItemRect.typeColor.g, cardItemRect.typeColor.b, 0.15)
                                border.color: Qt.rgba(cardItemRect.typeColor.r, cardItemRect.typeColor.g, cardItemRect.typeColor.b, 0.4)
                                border.width: 1

                                Text {
                                    id: typeBadgeLabel
                                    anchors.centerIn: parent
                                    text: cardItemRect.cardType.toUpperCase()
                                    color: cardItemRect.typeColor
                                    font.pixelSize: 9
                                    font.bold: true
                                }
                            }

                            // Question Front Preview
                            ColumnLayout {
                                Layout.preferredWidth: 260
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

                            // Tags / Extra preview if present
                            Text {
                                Layout.preferredWidth: 90
                                text: modelData.tags ? ("#" + modelData.tags) : ""
                                color: "#818cf8"
                                font.pixelSize: 10
                                elide: Text.ElideRight
                                visible: modelData.tags && modelData.tags.length > 0
                            }

                            // Reps Count & SRS State
                            ColumnLayout {
                                Layout.preferredWidth: 65
                                spacing: 2
                                Text {
                                    text: (modelData.reps || 0) + " reps"
                                    color: "#64748b"
                                    font.pixelSize: 11
                                }
                                Text {
                                    text: (modelData.state === "review") ? "Revisão" : ((modelData.state === "learning") ? "Aprender" : "Novo")
                                    color: (modelData.state === "review") ? "#10b981" : ((modelData.state === "learning") ? "#f59e0b" : "#60a5fa")
                                    font.pixelSize: 9
                                    font.bold: true
                                }
                            }

                            // Edit Button
                            Rectangle {
                                width: 28; height: 28; radius: 6
                                color: editMouse.containsMouse ? "#206366f1" : "#106366f1"

                                Text { anchors.centerIn: parent; text: "✏️"; font.pixelSize: 12 }

                                MouseArea {
                                    id: editMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: browserRoot.requestEditCard(modelData)
                                }
                            }

                            // Delete Card Button
                            Rectangle {
                                width: 28; height: 28; radius: 6
                                color: deleteMouse.containsMouse ? "#30f43f5e" : "#1af43f5e"

                                Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 12 }

                                MouseArea {
                                    id: deleteMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: browserRoot.requestDeleteCard(modelData.id)
                                }
                            }
                        }
                    }

                    // Empty Placeholder
                    Text {
                        anchors.centerIn: parent
                        visible: browserRoot.filteredCards.length === 0
                        text: (browserRoot.cards && browserRoot.cards.length > 0)
                            ? "Nenhum cartão encontrado para o filtro atual."
                            : "Nenhum cartão cadastrado neste baralho.\nClique em '+ Novo Cartão' acima para começar."
                        color: "#64748b"
                        font.pixelSize: 13
                        horizontalAlignment: Text.AlignHCenter
                    }
                }

                // View Mode 1: Grid View
                AnkiCardGridView {
                    anchors.fill: parent
                    visible: browserRoot.viewMode === 1
                    cards: browserRoot.filteredCards
                    selectedIds: browserRoot.selectedIds
                    onCardClicked: function(card) { browserRoot.requestEditCard(card) }
                    onToggleCardSelected: function(cardId) { browserRoot.toggleCardSelected(cardId) }
                }

                // View Mode 2: Table View
                AnkiCardTableView {
                    anchors.fill: parent
                    visible: browserRoot.viewMode === 2
                    cards: browserRoot.filteredCards
                    selectedIds: browserRoot.selectedIds
                    onCardEditRequested: function(card) { browserRoot.requestEditCard(card) }
                    onCardDeleteRequested: function(cardId) { browserRoot.requestDeleteCard(cardId) }
                    onToggleCardSelected: function(cardId) { browserRoot.toggleCardSelected(cardId) }
                }
            }
        }
    }
}
