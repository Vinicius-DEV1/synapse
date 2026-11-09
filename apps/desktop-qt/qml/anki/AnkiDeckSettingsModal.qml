import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: deckSettingsRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: isOpen
    z: 130

    property bool isOpen: false
    property var currentDeck: null

    signal closed()
    signal deckUpdated(string deckId, string name, string description, string color)
    signal deckDeleted(string deckId)
    signal progressReset(string deckId)

    onIsOpenChanged: {
        if (isOpen && currentDeck) {
            deckEditNameInput.text = currentDeck.name || ""
            deckEditDescInput.text = currentDeck.description || ""
        }
    }

    MouseArea { anchors.fill: parent } // Block click-through

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

            RowLayout {
                Layout.fillWidth: true
                Text { text: "⚙ Configurações do Baralho"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                Item { Layout.fillWidth: true }
                Text {
                    text: "✕"; color: "#a7a9be"; font.pixelSize: 14
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: deckSettingsRoot.closed()
                    }
                }
            }

            TextField {
                id: deckEditNameInput
                Layout.fillWidth: true
                placeholderText: "Nome do baralho..."
                color: "#ffffff"
                background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 }
            }

            TextArea {
                id: deckEditDescInput
                Layout.fillWidth: true
                Layout.preferredHeight: 70
                placeholderText: "Descrição do baralho..."
                color: "#ffffff"
                wrapMode: Text.Wrap
                background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 }
            }

            // Reset Progress Action
            Rectangle {
                Layout.fillWidth: true
                height: 40
                radius: 8
                color: "#f59e0b1a"
                border.color: "#f59e0b44"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 8
                    Text { text: "🔄"; font.pixelSize: 12 }
                    Text { text: "Zerar Progresso FSRS deste Baralho"; color: "#fcd34d"; font.pixelSize: 12; font.bold: true }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        if (currentDeck) {
                            deckSettingsRoot.progressReset(currentDeck.id)
                            deckSettingsRoot.closed()
                        }
                    }
                }
            }

            // Delete Deck Action
            Rectangle {
                Layout.fillWidth: true
                height: 40
                radius: 8
                color: "#f43f5e1a"
                border.color: "#f43f5e44"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 8
                    Text { text: "🗑️"; font.pixelSize: 12 }
                    Text { text: "Excluir Baralho (Mover para Lixeira)"; color: "#fda4af"; font.pixelSize: 12; font.bold: true }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        if (currentDeck) {
                            deckSettingsRoot.deckDeleted(currentDeck.id)
                            deckSettingsRoot.closed()
                        }
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12
                Item { Layout.fillWidth: true }

                Rectangle {
                    width: 90; height: 36; radius: 8; color: "#211f30"
                    Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: deckSettingsRoot.closed()
                    }
                }

                Rectangle {
                    width: 120; height: 36; radius: 8; color: "#6366f1"
                    Text { anchors.centerIn: parent; text: "Salvar Alterações"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (currentDeck && deckEditNameInput.text.trim().length > 0) {
                                deckSettingsRoot.deckUpdated(
                                    currentDeck.id,
                                    deckEditNameInput.text.trim(),
                                    deckEditDescInput.text.trim(),
                                    currentDeck.color || "#6366f1"
                                )
                                deckSettingsRoot.closed()
                            }
                        }
                    }
                }
            }
        }
    }
}
