import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: evolutionModalRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 99

    property string mode: "register" // "register" or "login"
    property bool isSubmitting: false
    property string statusText: ""
    property string errorText: ""
    property bool isSuccess: false

    signal closed()
    signal accountEvolved(string email)

    MouseArea {
        anchors.fill: parent
        onClicked: evolutionModalRoot.closed()
    }

    Rectangle {
        width: Math.min(480, parent.width - 40)
        height: Math.min(540, parent.height - 40)
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
                    text: "✨ Evolução de Conta em Nuvem"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕"
                    flat: true
                    onClicked: evolutionModalRoot.closed()
                    contentItem: Text {
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 16
                    }
                }
            }

            Text {
                text: "Sincronize seus cadernos, cartões e arquivos com Zero-Knowledge. Seus dados continuam 100% criptografados ponta a ponta."
                color: "#a7a9be"
                font.pixelSize: 12
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }

            // Mode Selector Tabs
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Button {
                    Layout.fillWidth: true
                    height: 36
                    flat: true
                    background: Rectangle {
                        color: evolutionModalRoot.mode === "register" ? "#8b5cf6" : "#211f30"
                        radius: 8
                    }
                    contentItem: Text {
                        text: "Criar Nova Conta"
                        color: evolutionModalRoot.mode === "register" ? "#ffffff" : "#a7a9be"
                        font.pixelSize: 12
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: evolutionModalRoot.mode = "register"
                }

                Button {
                    Layout.fillWidth: true
                    height: 36
                    flat: true
                    background: Rectangle {
                        color: evolutionModalRoot.mode === "login" ? "#8b5cf6" : "#211f30"
                        radius: 8
                    }
                    contentItem: Text {
                        text: "Entrar em Conta Existente"
                        color: evolutionModalRoot.mode === "login" ? "#ffffff" : "#a7a9be"
                        font.pixelSize: 12
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: evolutionModalRoot.mode = "login"
                }
            }

            // Inputs
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 10

                // Display Name (if register)
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    visible: evolutionModalRoot.mode === "register"

                    Text { text: "NOME DE EXIBIÇÃO"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true }
                    TextField {
                        id: nameField
                        Layout.fillWidth: true
                        height: 38
                        placeholderText: "Seu nome..."
                        color: "#fffffe"
                        background: Rectangle { color: "#0f0e17"; radius: 8; border.color: "#2e2f3e"; border.width: 1 }
                    }
                }

                // Email
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    Text { text: "EMAIL"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true }
                    TextField {
                        id: emailField
                        Layout.fillWidth: true
                        height: 38
                        placeholderText: "seu-email@dominio.com"
                        color: "#fffffe"
                        background: Rectangle { color: "#0f0e17"; radius: 8; border.color: "#2e2f3e"; border.width: 1 }
                    }
                }

                // Password
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    Text { text: "SENHA DA CONTA"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true }
                    TextField {
                        id: passwordField
                        Layout.fillWidth: true
                        height: 38
                        echoMode: TextInput.Password
                        placeholderText: "Mínimo 6 caracteres..."
                        color: "#fffffe"
                        background: Rectangle { color: "#0f0e17"; radius: 8; border.color: "#2e2f3e"; border.width: 1 }
                    }
                }
            }

            // Error or Status text
            Text {
                visible: evolutionModalRoot.errorText.length > 0
                text: evolutionModalRoot.errorText
                color: "#ef4444"
                font.pixelSize: 11
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
            }

            Text {
                visible: evolutionModalRoot.statusText.length > 0
                text: evolutionModalRoot.statusText
                color: "#10b981"
                font.pixelSize: 11
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
            }

            Item { Layout.fillHeight: true }

            // Submit Button
            Button {
                Layout.fillWidth: true
                height: 44
                flat: true
                background: Rectangle {
                    color: "#8b5cf6"
                    radius: 10
                }
                contentItem: Text {
                    text: evolutionModalRoot.mode === "register" ? "Criar Conta & Sincronizar" : "Conectar Conta & Sincronizar"
                    color: "#ffffff"
                    font.pixelSize: 13
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: {
                    var email = emailField.text.trim()
                    var pass = passwordField.text.trim()
                    if (email.length < 3 || pass.length < 6) {
                        evolutionModalRoot.errorText = "Preencha um email válido e senha de pelo menos 6 caracteres."
                        return
                    }
                    evolutionModalRoot.errorText = ""
                    evolutionModalRoot.statusText = "Conectando ao serviço em nuvem Zero-Knowledge..."
                    evolutionModalRoot.accountEvolved(email)
                    evolutionModalRoot.statusText = "Conta conectada com sucesso! Sincronização inicial agendada."
                }
            }
        }
    }
}
