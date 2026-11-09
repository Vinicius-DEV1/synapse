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

    signal closed()
    signal requestAddCard()
    signal requestOpenSettings()
    signal requestDeleteCard(string cardId)

    MouseArea { anchors.fill: parent }

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
                        text: browserRoot.deck ? browserRoot.deck.name : "Navegador de Cartões"
                        color: "#fffffe"
                        font.pixelSize: 18
                        font.bold: true
                    }
                    Text {
                        text: browserRoot.cards.length + " cartão(ões) cadastrado(s)"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                }

                Item { Layout.fillWidth: true }

                // "+ Novo Cartão" Button
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
                        onClicked: browserRoot.requestAddCard()
                    }
                }

                // "⚙ Ajustes" Button
                Rectangle {
                    width: 96; height: 36; radius: 8
                    color: "#211f30"
                    border.color: "#ffffff15"

                    RowLayout {
                        anchors.centerIn: parent; spacing: 6
                        Text { text: "⚙"; color: "#a7a9be"; font.pixelSize: 12 }
                        Text { text: "Ajustes"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: browserRoot.requestOpenSettings()
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
                        onClicked: browserRoot.closed()
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
                    model: browserRoot.cards

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
                                    onClicked: browserRoot.requestDeleteCard(modelData.id)
                                }
                            }
                        }
                    }

                    // Empty Cards Placeholder
                    Text {
                        anchors.centerIn: parent
                        visible: browserRoot.cards.length === 0
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
