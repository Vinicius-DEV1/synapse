import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: aiModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 120

    property string deckId: ""
    property string deckName: "Baralho"
    property bool isGenerating: false
    property var generatedCards: []

    signal closeRequested()
    signal importCardsRequested(string targetDeckId, var cardsList)

    Shortcut {
        sequence: "Escape"
        enabled: aiModalRoot.visible
        onActivated: aiModalRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: aiModalRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 760)
        height: Math.min(parent.height - 48, 580)
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    width: 32
                    height: 32
                    radius: 8
                    color: "#6366f1"
                    Text { anchors.centerIn: parent; text: "✨"; font.pixelSize: 16 }
                }

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: qsTr("Gerador de Flashcards com IA")
                        color: "#fffffe"
                        font.pixelSize: 16
                        font.bold: true
                    }
                    Text {
                        text: qsTr("Destino:") + " " + aiModalRoot.deckName
                        color: "#a7a9be"
                        font.pixelSize: 11
                    }
                }

                Item { Layout.fillWidth: true }

                ToolButton {
                    text: "✕"
                    onClicked: aiModalRoot.closeRequested()
                }
            }

            // Input form
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8
                visible: aiModalRoot.generatedCards.length === 0

                Text {
                    text: qsTr("Tema ou Texto Base para Extração:")
                    color: "#d4d4d8"
                    font.pixelSize: 12
                    font.bold: true
                }

                Rectangle {
                    Layout.fillWidth: true
                    height: 100
                    radius: 8
                    color: "#0f0e17"
                    border.color: "#27272a"

                    ScrollView {
                        anchors.fill: parent
                        anchors.margins: 8
                        TextArea {
                            id: topicInput
                            placeholderText: qsTr("Cole aqui um texto, resumo ou descreva os tópicos que deseja memorizar...")
                            color: "#ffffff"
                            font.pixelSize: 13
                            wrapMode: TextEdit.Wrap
                            background: null
                        }
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    Text { text: qsTr("Quantidade:"); color: "#a1a1aa"; font.pixelSize: 12 }
                    ComboBox {
                        id: cardCountCombo
                        model: ["5 cartões", "10 cartões", "15 cartões", "20 cartões"]
                        currentIndex: 0
                    }

                    Item { Layout.fillWidth: true }

                    Button {
                        text: aiModalRoot.isGenerating ? qsTr("Gerando...") : qsTr("✨ Gerar Flashcards")
                        enabled: !aiModalRoot.isGenerating && topicInput.text.trim().length > 0
                        onClicked: {
                            aiModalRoot.isGenerating = true
                            // Simulation/Generation helper: creates high-yield cards from topic text
                            var count = (cardCountCombo.currentIndex + 1) * 5
                            var mockGen = []
                            var lines = topicInput.text.split("\n").filter(function(l) { return l.trim().length > 0 })
                            for (var i = 0; i < Math.min(count, Math.max(3, lines.length)); i++) {
                                var line = lines[i % lines.length]
                                mockGen.push({
                                    front: "Conceito essencial: " + line.substring(0, 45) + (line.length > 45 ? "..." : ""),
                                    back: line,
                                    card_type: "reading",
                                    selected: true
                                })
                            }
                            aiModalRoot.generatedCards = mockGen
                            aiModalRoot.isGenerating = false
                        }
                    }
                }
            }

            // Review Generated Cards
            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 8
                visible: aiModalRoot.generatedCards.length > 0

                Text {
                    text: qsTr("Revise os cartões gerados antes de importar:")
                    color: "#d4d4d8"
                    font.pixelSize: 13
                    font.bold: true
                }

                ScrollView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true

                    ListView {
                        width: parent.width
                        model: aiModalRoot.generatedCards
                        spacing: 8

                        delegate: Rectangle {
                            required property var modelData
                            required property int index
                            width: ListView.view.width
                            height: 68
                            radius: 8
                            color: "#1a1928"
                            border.color: "#27272a"

                            RowLayout {
                                anchors.fill: parent
                                anchors.margins: 12
                                spacing: 10

                                CheckBox {
                                    checked: modelData.selected !== false
                                    onToggled: {
                                        var copy = aiModalRoot.generatedCards.slice()
                                        copy[index].selected = checked
                                        aiModalRoot.generatedCards = copy
                                    }
                                }

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 2
                                    Text {
                                        text: modelData.front
                                        color: "#ffffff"
                                        font.pixelSize: 12
                                        font.bold: true
                                        elide: Text.ElideRight
                                        Layout.fillWidth: true
                                    }
                                    Text {
                                        text: modelData.back
                                        color: "#a1a1aa"
                                        font.pixelSize: 11
                                        elide: Text.ElideRight
                                        Layout.fillWidth: true
                                    }
                                }
                            }
                        }
                    }
                }

                // Import Actions
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    Button {
                        text: qsTr("Recomeçar")
                        flat: true
                        onClicked: aiModalRoot.generatedCards = []
                        contentItem: Text { text: parent.text; color: "#a1a1aa"; font.pixelSize: 11 }
                    }

                    Item { Layout.fillWidth: true }

                    Button {
                        text: qsTr("Adicionar ao Baralho")
                        onClicked: {
                            var accepted = aiModalRoot.generatedCards.filter(function(c) { return c.selected !== false })
                            aiModalRoot.importCardsRequested(aiModalRoot.deckId, accepted)
                            aiModalRoot.closeRequested()
                        }
                    }
                }
            }
        }
    }
}
