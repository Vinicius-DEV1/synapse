import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: createDeckRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: isOpen
    z: 120

    property bool isOpen: false
    property string parentId: ""
    property string parentName: ""

    signal closed()
    signal deckCreated(string name, string description, string color, string parentId)

    onIsOpenChanged: {
        if (isOpen) {
            deckNameField.text = ""
            deckDescField.text = ""
            deckNameField.forceActiveFocus()
        }
    }

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
                text: createDeckRoot.parentId !== ""
                    ? "Novo Sub-baralho de " + createDeckRoot.parentName
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
                    onClicked: createDeckRoot.closed()
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
                                createDeckRoot.deckCreated(
                                    deckNameField.text.trim(),
                                    deckDescField.text.trim(),
                                    "#6366f1",
                                    createDeckRoot.parentId
                                )
                                createDeckRoot.closed()
                            }
                        }
                    }
                }
            }
        }
    }
}
