import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: createCardRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: isOpen
    z: 130

    property bool isOpen: false
    property var deck: null

    signal closed()
    signal cardCreated(string deckId, string front, string back, string extraNote)

    onIsOpenChanged: {
        if (isOpen) {
            cardFrontField.text = ""
            cardBackField.text = ""
            cardFrontField.forceActiveFocus()
        }
    }

    MouseArea { anchors.fill: parent }

    Rectangle {
        anchors.centerIn: parent
        width: 480
        height: 380
        radius: 16
        color: "#161524"
        border.color: "#18ffffff"
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
                placeholderText: "Frente do cartão (pergunta ou texto com {{c1::cloze}})..."
                color: "#ffffff"
                background: Rectangle {
                    color: "#0f0e17"
                    border.color: "#1affffff"
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
                    border.color: "#1affffff"
                    radius: 8
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    text: "Cancelar"
                    Layout.fillWidth: true
                    onClicked: createCardRoot.closed()
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
                            if (cardFrontField.text.trim().length > 0 && createCardRoot.deck) {
                                createCardRoot.cardCreated(
                                    createCardRoot.deck.id,
                                    cardFrontField.text.trim(),
                                    cardBackField.text.trim(),
                                    ""
                                )
                                createCardRoot.closed()
                            }
                        }
                    }
                }
            }
        }
    }
}
