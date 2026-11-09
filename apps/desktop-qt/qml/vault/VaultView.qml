import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: vaultRoot
    color: "#0f0e17" // bg-dark-bg

    property var groups: []
    property var items: []
    property string selectedGroupId: ""
    property var revealedPasswords: ({})
    property bool isAddingItem: false

    function refreshVault() {
        groups = dataController.getVaultGroups()
        items = dataController.getVaultItems(selectedGroupId)
    }

    function toggleReveal(id) {
        var copy = Object.assign({}, revealedPasswords)
        copy[id] = !copy[id]
        revealedPasswords = copy
    }

    Component.onCompleted: {
        refreshVault()
    }

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
                    text: "🔒 Cofre E2EE & Credenciais"
                    color: "#fffffe"
                    font.pixelSize: 24
                    font.bold: true
                }
                Text {
                    text: vaultRoot.items.length + " credenciais protegidas com criptografia AES-256-GCM Two-Tier"
                    color: "#a7a9be"
                    font.pixelSize: 13
                }
            }

            Item { Layout.fillWidth: true }

            // Gerar Senha Segura Button
            Rectangle {
                width: 160; height: 38; radius: 10
                color: genPassMouse.containsMouse ? "#7c3aed33" : "#7c3aed26"
                border.color: "#8b5cf64d"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "⚡"; font.pixelSize: 13 }
                    Text { text: "Gerar Senha"; color: "#c4b5fd"; font.pixelSize: 13; font.bold: true }
                }

                MouseArea {
                    id: genPassMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        var pass = dataController.generateSecurePassword(18, true)
                        passwordDialogText.text = pass
                        passwordDialog.visible = true
                    }
                }
            }

            // + Nova Credencial Button
            Rectangle {
                width: 150; height: 38; radius: 10
                color: newCredMouse.containsMouse ? "#8b5cf6" : "#7c3aed"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                    Text { text: "Nova Credencial"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                }

                MouseArea {
                    id: newCredMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: vaultRoot.isAddingItem = true
                }
            }
        }

        // Credentials List
        ListView {
            id: vaultListView
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            model: vaultRoot.items
            spacing: 10

            delegate: Rectangle {
                width: vaultListView.width
                height: 76
                radius: 12
                color: "#1a1924" // bg-dark-card
                border.color: vaultCardMouse.containsMouse ? "#8b5cf64d" : "#ffffff0f"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 16
                    spacing: 16

                    Rectangle {
                        width: 44; height: 44; radius: 10
                        color: "#8b5cf61a"
                        border.color: "#8b5cf633"

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
                            color: "#fffffe"
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

                    // Password Box
                    Rectangle {
                        width: 220
                        height: 38
                        radius: 8
                        color: "#15141b"
                        border.color: "#ffffff12"

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 12
                            anchors.rightMargin: 8
                            spacing: 8

                            Text {
                                Layout.fillWidth: true
                                text: vaultRoot.revealedPasswords[modelData.id] ? modelData.password : "••••••••••••"
                                color: "#fffffe"
                                font.pixelSize: 13
                                font.family: "Monospace"
                                elide: Text.ElideRight
                            }

                            Rectangle {
                                width: 56; height: 26; radius: 6
                                color: "#ffffff0a"

                                Text {
                                    anchors.centerIn: parent
                                    text: vaultRoot.revealedPasswords[modelData.id] ? "Ocultar" : "Ver"
                                    color: "#c4b5fd"
                                    font.pixelSize: 11
                                }

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: vaultRoot.toggleReveal(modelData.id)
                                }
                            }
                        }
                    }

                    // Delete Button
                    Rectangle {
                        width: 70; height: 32; radius: 8
                        color: "#f43f5e1a"
                        border.color: "#f43f5e33"

                        Text {
                            anchors.centerIn: parent
                            text: "Excluir"
                            color: "#fb7185"
                            font.pixelSize: 11
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                dataController.deleteVaultItem(modelData.id)
                                vaultRoot.refreshVault()
                            }
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
                visible: vaultRoot.items.length === 0
                text: "Nenhuma credencial no cofre."
                color: "#64748b"
                font.pixelSize: 15
            }
        }
    }

    // Dialog: Senha Gerada
    Rectangle {
        id: passwordDialog
        anchors.fill: parent
        color: "#b3000000"
        visible: false

        MouseArea { anchors.fill: parent }

        Rectangle {
            anchors.centerIn: parent
            width: 440; height: 220; radius: 16
            color: "#1a1924"; border.color: "#ffffff1a"

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 28
                spacing: 16

                Text {
                    text: "Senha Gerada (Alta Entropia)"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }

                TextField {
                    id: passwordDialogText
                    Layout.fillWidth: true
                    readOnly: true
                    font.family: "Monospace"
                    font.pixelSize: 16
                    color: "#34d399"
                }

                RowLayout {
                    Layout.fillWidth: true
                    Item { Layout.fillWidth: true }
                    Rectangle {
                        width: 90; height: 34; radius: 8
                        color: "#7c3aed"
                        Text { anchors.centerIn: parent; text: "Fechar"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: passwordDialog.visible = false }
                    }
                }
            }
        }
    }

    // Modal: Nova Credencial
    Rectangle {
        anchors.fill: parent
        color: "#b3000000"
        visible: vaultRoot.isAddingItem

        MouseArea { anchors.fill: parent }

        Rectangle {
            anchors.centerIn: parent
            width: 460
            height: 400
            radius: 16
            color: "#1a1924"
            border.color: "#ffffff1a"

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 28
                spacing: 16

                Text {
                    text: "Nova Credencial"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }

                TextField {
                    id: vaultLabelInput
                    Layout.fillWidth: true
                    placeholderText: "Serviço (ex: GitHub, AWS, E-mail)..."
                }

                TextField {
                    id: vaultUserInput
                    Layout.fillWidth: true
                    placeholderText: "Usuário ou e-mail..."
                }

                TextField {
                    id: vaultPassInput
                    Layout.fillWidth: true
                    placeholderText: "Senha..."
                }

                TextField {
                    id: vaultUrlInput
                    Layout.fillWidth: true
                    placeholderText: "URL do site (opcional)..."
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Button {
                        text: "Cancelar"
                        Layout.fillWidth: true
                        onClicked: vaultRoot.isAddingItem = false
                    }
                    Button {
                        text: "Salvar no Cofre"
                        Layout.fillWidth: true
                        onClicked: {
                            if (vaultLabelInput.text.trim().length > 0 && vaultPassInput.text.length > 0) {
                                dataController.saveVaultItem("", "", vaultLabelInput.text, vaultUserInput.text, "", vaultPassInput.text, vaultUrlInput.text, "")
                                vaultLabelInput.text = ""
                                vaultUserInput.text = ""
                                vaultPassInput.text = ""
                                vaultUrlInput.text = ""
                                vaultRoot.isAddingItem = false
                                vaultRoot.refreshVault()
                            }
                        }
                    }
                }
            }
        }
    }
}
