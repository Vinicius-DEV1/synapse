import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: shareModalRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 110

    property string pageTitle: "Página Sem Título"
    property string pageId: ""
    property bool isShared: false
    property string shareUrl: "https://synapse.local/share/" + pageId
    property string permission: "view" // "view" or "edit"
    property bool isPasswordProtected: false
    property string password: ""
    property bool copiedToast: false

    signal closed()
    signal shareConfigured(string pageId, string permission, bool passwordProtected, string pass)
    signal shareRevoked(string pageId)

    MouseArea {
        anchors.fill: parent
        onClicked: shareModalRoot.closed()
    }

    Rectangle {
        width: Math.min(500, parent.width - 40)
        height: Math.min(560, parent.height - 40)
        radius: 20
        color: "#161524"
        border.color: "#338b5cf6"
        border.width: 1
        anchors.centerIn: parent

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: "🔗 Compartilhar Página"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕"
                    flat: true
                    onClicked: shareModalRoot.closed()
                    contentItem: Text {
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 16
                    }
                }
            }

            Text {
                text: "Gere links seguros com criptografia ponta a ponta para compartilhar \"" + shareModalRoot.pageTitle + "\"."
                color: "#a7a9be"
                font.pixelSize: 12
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }

            // Share URL Link Box
            Rectangle {
                Layout.fillWidth: true
                height: 48
                radius: 10
                color: "#0f0e17"
                border.color: "#1affffff"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 8
                    spacing: 8

                    Text {
                        text: shareModalRoot.shareUrl
                        color: "#c4b5fd"
                        font.pixelSize: 11
                        font.family: "Monospace"
                        elide: Text.ElideMiddle
                        Layout.fillWidth: true
                    }

                    Button {
                        height: 32
                        flat: true
                        background: Rectangle {
                            color: shareModalRoot.copiedToast ? "#10b981" : "#8b5cf6"
                            radius: 6
                        }
                        contentItem: Text {
                            text: shareModalRoot.copiedToast ? "Copiado! ✓" : "Copiar Link"
                            color: "#ffffff"
                            font.pixelSize: 11
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                            leftPadding: 8; rightPadding: 8
                        }
                        onClicked: {
                            shareModalRoot.copiedToast = true
                            toastTimer.restart()
                        }
                    }
                }
            }

            Timer {
                id: toastTimer
                interval: 2000
                onTriggered: shareModalRoot.copiedToast = false
            }

            // Permissions Selection
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6

                Text { text: "NÍVEL DE PERMISSÃO"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Button {
                        Layout.fillWidth: true
                        height: 36
                        flat: true
                        background: Rectangle {
                            color: shareModalRoot.permission === "view" ? "#8b5cf6" : "#211f30"
                            radius: 8
                        }
                        contentItem: Text {
                            text: "Apenas Leitura (Visualizar)"
                            color: shareModalRoot.permission === "view" ? "#ffffff" : "#a7a9be"
                            font.pixelSize: 11
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        onClicked: shareModalRoot.permission = "view"
                    }

                    Button {
                        Layout.fillWidth: true
                        height: 36
                        flat: true
                        background: Rectangle {
                            color: shareModalRoot.permission === "edit" ? "#8b5cf6" : "#211f30"
                            radius: 8
                        }
                        contentItem: Text {
                            text: "Permitir Edição Colaborativa"
                            color: shareModalRoot.permission === "edit" ? "#ffffff" : "#a7a9be"
                            font.pixelSize: 11
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        onClicked: shareModalRoot.permission = "edit"
                    }
                }
            }

            // Password Protection Toggle
            Rectangle {
                Layout.fillWidth: true
                height: 52
                radius: 10
                color: "#10101b"
                border.color: "#1affffff"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 12

                    ColumnLayout {
                        spacing: 2
                        Text { text: "Proteção por Senha"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                        Text { text: "Exige uma chave de acesso para visualizar o documento"; color: "#a7a9be"; font.pixelSize: 10 }
                    }

                    Item { Layout.fillWidth: true }

                    Switch {
                        checked: shareModalRoot.isPasswordProtected
                        onToggled: shareModalRoot.isPasswordProtected = checked
                    }
                }
            }

            // Password Field if protected
            TextField {
                id: passInput
                visible: shareModalRoot.isPasswordProtected
                Layout.fillWidth: true
                height: 38
                placeholderText: "Digite a senha de proteção..."
                echoMode: TextInput.Password
                color: "#fffffe"
                background: Rectangle { color: "#0f0e17"; radius: 8; border.color: "#2e2f3e"; border.width: 1 }
            }

            Item { Layout.fillHeight: true }

            // Bottom Actions
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    Layout.fillWidth: true
                    height: 44
                    flat: true
                    background: Rectangle { color: "#211f30"; radius: 10; border.color: "#33ffffff"; border.width: 1 }
                    contentItem: Text { text: "Revogar Compartilhamento"; color: "#f87171"; font.pixelSize: 12; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: {
                        shareModalRoot.shareRevoked(shareModalRoot.pageId)
                        shareModalRoot.closed()
                    }
                }

                Button {
                    Layout.fillWidth: true
                    height: 44
                    flat: true
                    background: Rectangle { color: "#8b5cf6"; radius: 10 }
                    contentItem: Text { text: "Salvar & Ativar Link"; color: "#ffffff"; font.pixelSize: 13; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: {
                        shareModalRoot.shareConfigured(shareModalRoot.pageId, shareModalRoot.permission, shareModalRoot.isPasswordProtected, passInput.text)
                        shareModalRoot.closed()
                    }
                }
            }
        }
    }
}
