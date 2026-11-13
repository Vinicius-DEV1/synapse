import QtQuick 2.15
import QtQuick.Layouts 1.15

ListView {
    id: vaultListView
    Layout.fillWidth: true
    Layout.fillHeight: true
    clip: true
    spacing: 10

    property var items: []
    property var revealedPasswords: ({})
    property string copiedId: ""

    signal toggleRevealRequested(string itemId)
    signal copyPasswordRequested(string password, string itemId)
    signal deleteRequested(string itemId)
    signal editRequested(var item)

    model: items

    delegate: Rectangle {
        id: vaultCardDelegate
        width: vaultListView.width
        height: 76
        radius: 12
        color: vaultCardMouse.containsMouse ? "#211f30" : "#1a1924" // bg-dark-card
        border.color: vaultCardMouse.containsMouse ? "#668b5cf6" : "#0fffffff"
        border.width: 1

        Behavior on color { ColorAnimation { duration: 150 } }
        Behavior on border.color { ColorAnimation { duration: 150 } }

        RowLayout {
            anchors.fill: parent
            anchors.margins: 16
            spacing: 16

            Rectangle {
                width: 44; height: 44; radius: 10
                color: "#1a8b5cf6"
                border.color: "#338b5cf6"

                Text {
                    anchors.centerIn: parent
                    text: "🔑"
                    font.pixelSize: 18
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 3

                Text {
                    text: modelData.label
                    color: vaultCardMouse.containsMouse ? "#c4b5fd" : "#fffffe"
                    font.pixelSize: 15
                    font.bold: true
                }

                Text {
                    text: (modelData.username || modelData.email || "Sem usuário") + (modelData.url ? " • " + modelData.url : "")
                    color: "#a7a9be"
                    font.pixelSize: 12
                    elide: Text.ElideRight
                }
            }

            // Password Box with Reveal and Copy Buttons
            Rectangle {
                width: 270
                height: 38
                radius: 8
                color: "#15141b"
                border.color: "#12ffffff"

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 12
                    anchors.rightMargin: 8
                    spacing: 6

                    Text {
                        Layout.fillWidth: true
                        text: vaultListView.revealedPasswords[modelData.id] ? modelData.password : "••••••••••••"
                        color: "#fffffe"
                        font.pixelSize: 13
                        font.family: "Monospace"
                        elide: Text.ElideRight
                    }

                    // Ver / Ocultar
                    Rectangle {
                        width: 50; height: 26; radius: 6
                        color: "#0affffff"

                        Text {
                            anchors.centerIn: parent
                            text: vaultListView.revealedPasswords[modelData.id] ? "Ocultar" : "Ver"
                            color: "#c4b5fd"
                            font.pixelSize: 11
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: vaultListView.toggleRevealRequested(modelData.id)
                        }
                    }

                    // Copiar Senha
                    Rectangle {
                        width: 56; height: 26; radius: 6
                        color: vaultListView.copiedId === modelData.id ? "#2610b981" : "#0affffff"
                        border.color: vaultListView.copiedId === modelData.id ? "#10b981" : "transparent"

                        Text {
                            anchors.centerIn: parent
                            text: vaultListView.copiedId === modelData.id ? "Copiado!" : "Copiar"
                            color: vaultListView.copiedId === modelData.id ? "#34d399" : "#a7a9be"
                            font.pixelSize: 11
                            font.bold: vaultListView.copiedId === modelData.id
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: vaultListView.copyPasswordRequested(modelData.password, modelData.id)
                        }
                    }
                }
            }

            // Edit Button
            Rectangle {
                width: 32; height: 32; radius: 8
                color: editCredMouse.containsMouse ? "#268b5cf6" : "#1a8b5cf6"
                border.color: editCredMouse.containsMouse ? "#668b5cf6" : "#338b5cf6"

                Text {
                    anchors.centerIn: parent
                    text: "✎"
                    color: "#c4b5fd"
                    font.pixelSize: 13
                }

                MouseArea {
                    id: editCredMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: vaultListView.editRequested(modelData)
                }
            }

            // Delete Button
            Rectangle {
                width: 68; height: 32; radius: 8
                color: delCredMouse.containsMouse ? "#26f43f5e" : "#1af43f5e"
                border.color: delCredMouse.containsMouse ? "#66f43f5e" : "#33f43f5e"

                Text {
                    anchors.centerIn: parent
                    text: "Excluir"
                    color: "#fb7185"
                    font.pixelSize: 11
                    font.bold: true
                }

                MouseArea {
                    id: delCredMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: vaultListView.deleteRequested(modelData.id)
                }
            }
        }

        MouseArea {
            id: vaultCardMouse
            anchors.fill: parent
            hoverEnabled: true
            z: -1
        }
    }

    Text {
        anchors.centerIn: parent
        visible: vaultListView.items.length === 0
        text: "Nenhuma credencial encontrada no cofre."
        color: "#64748b"
        font.pixelSize: 15
    }
}
