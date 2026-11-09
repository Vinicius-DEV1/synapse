import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: masterPassModalRoot
    anchors.fill: parent
    color: "#e6000000" // backdrop
    z: 100
    visible: false

    property string mode: "setup" // "setup", "change", "remove"
    property string localError: ""

    signal closed()
    signal success()

    function getStrengthColor(score) {
        var colors = ["#ef4444", "#f97316", "#eab308", "#10b981", "#8b5cf6"]
        return colors[Math.min(score, 4)]
    }

    function getStrengthLabel(score) {
        var labels = ["Muito Fraca", "Fraca", "Média", "Forte", "Excelente"]
        return labels[Math.min(score, 4)]
    }

    function submit() {
        localError = ""
        if (mode === "setup") {
            var p1 = newPassInput.text
            var p2 = confirmPassInput.text
            if (p1.length < 6) {
                localError = "A senha mestra deve conter ao menos 6 caracteres."
                return
            }
            if (p1 !== p2) {
                localError = "A confirmação de senha não confere."
                return
            }
            var ok = dataController.setupMasterPassword(p1)
            if (ok) {
                closeModal()
                masterPassModalRoot.success()
            } else {
                localError = dataController.vaultLockError || "Erro ao configurar senha mestra."
            }
        } else if (mode === "change") {
            var oldP = curPassInput.text
            var newP = newPassInput.text
            var confP = confirmPassInput.text
            if (oldP.length === 0) {
                localError = "Digite a senha mestra atual."
                return
            }
            if (newP.length < 6) {
                localError = "A nova senha mestra deve conter ao menos 6 caracteres."
                return
            }
            if (newP !== confP) {
                localError = "A confirmação da nova senha não confere."
                return
            }
            var okChange = dataController.changeMasterPassword(oldP, newP)
            if (okChange) {
                closeModal()
                masterPassModalRoot.success()
            } else {
                localError = dataController.vaultLockError || "Senha mestra atual incorreta."
            }
        } else if (mode === "remove") {
            var curP = curPassInput.text
            if (curP.length === 0) {
                localError = "Digite a senha mestra atual para confirmar."
                return
            }
            var okRem = dataController.removeMasterPassword(curP)
            if (okRem) {
                closeModal()
                masterPassModalRoot.success()
            } else {
                localError = dataController.vaultLockError || "Senha mestra incorreta."
            }
        }
    }

    function closeModal() {
        curPassInput.text = ""
        newPassInput.text = ""
        confirmPassInput.text = ""
        localError = ""
        masterPassModalRoot.visible = false
        masterPassModalRoot.closed()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: masterPassModalRoot.closeModal()
    }

    Rectangle {
        width: 480
        height: modalLayout.implicitHeight + 64
        anchors.centerIn: parent
        radius: 16
        color: "#1a1924"
        border.color: "#ffffff12"
        border.width: 1

        MouseArea { anchors.fill: parent } // Prevent backdrop close

        ColumnLayout {
            id: modalLayout
            anchors.fill: parent
            anchors.margins: 28
            spacing: 16

            // Header Row
            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: mode === "setup" ? "🔒 Configurar Senha Mestra" :
                          mode === "change" ? "🔑 Alterar Senha Mestra" :
                          "⚠️ Remover Senha Mestra"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕"
                    flat: true
                    background: null
                    contentItem: Text { text: "✕"; color: "#a7a9be"; font.pixelSize: 16; horizontalAlignment: Text.AlignHCenter }
                    onClicked: masterPassModalRoot.closeModal()
                }
            }

            // Description / Warning
            Text {
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
                color: "#a7a9be"
                font.pixelSize: 13
                lineHeight: 1.3
                text: mode === "setup"
                    ? "Crie uma senha mestra forte. Seus dados serão criptografados localmente com AES-256-GCM. Conhecimento Zero: não há recuperação se você esquecer."
                    : mode === "change"
                    ? "Digite a senha atual e defina a nova chave de envelope criptográfico."
                    : "Todos os dados confidenciais serão descriptografados para armazenamento em texto simples no SQLite local."
            }

            // Error banner
            Rectangle {
                Layout.fillWidth: true
                height: 36
                radius: 8
                visible: masterPassModalRoot.localError.length > 0
                color: "#ef44441a"
                border.color: "#ef444440"
                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 12
                    anchors.rightMargin: 12
                    spacing: 8
                    Text { text: "⚠️"; font.pixelSize: 13 }
                    Text {
                        Layout.fillWidth: true
                        text: masterPassModalRoot.localError
                        color: "#fca5a5"
                        font.pixelSize: 12
                        elide: Text.ElideRight
                    }
                }
            }

            // Current Password Input (for change or remove)
            ColumnLayout {
                Layout.fillWidth: true; spacing: 4
                visible: mode === "change" || mode === "remove"
                Text { text: "Senha Mestra Atual"; color: "#c4b5fd"; font.pixelSize: 12; font.bold: true }
                Rectangle {
                    Layout.fillWidth: true; height: 40; radius: 8; color: "#201e30"; border.color: "#ffffff18"
                    TextField {
                        id: curPassInput; anchors.fill: parent; anchors.margins: 8; echoMode: TextInput.Password
                        color: "#fffffe"; font.pixelSize: 13; placeholderText: "Digite a senha atual..."; placeholderTextColor: "#ffffff35"; background: null
                    }
                }
            }

            // New Password Input (for setup or change)
            ColumnLayout {
                Layout.fillWidth: true; spacing: 4
                visible: mode === "setup" || mode === "change"
                Text { text: mode === "change" ? "Nova Senha Mestra" : "Senha Mestra"; color: "#c4b5fd"; font.pixelSize: 12; font.bold: true }
                Rectangle {
                    Layout.fillWidth: true; height: 40; radius: 8; color: "#201e30"; border.color: "#ffffff18"
                    TextField {
                        id: newPassInput; anchors.fill: parent; anchors.margins: 8; echoMode: TextInput.Password
                        color: "#fffffe"; font.pixelSize: 13; placeholderText: "Mínimo 6 caracteres..."; placeholderTextColor: "#ffffff35"; background: null
                    }
                }

                // Strength bar
                RowLayout {
                    Layout.fillWidth: true; spacing: 6; visible: newPassInput.text.length > 0
                    property int score: dataController.checkPasswordStrength(newPassInput.text)
                    Repeater {
                        model: 5
                        Rectangle {
                            Layout.fillWidth: true; height: 4; radius: 2
                            color: modelData <= parent.score ? masterPassModalRoot.getStrengthColor(parent.score) : "#ffffff15"
                        }
                    }
                    Text {
                        text: masterPassModalRoot.getStrengthLabel(parent.score)
                        color: masterPassModalRoot.getStrengthColor(parent.score)
                        font.pixelSize: 11; font.bold: true
                    }
                }
            }

            // Confirm Password Input (for setup or change)
            ColumnLayout {
                Layout.fillWidth: true; spacing: 4
                visible: mode === "setup" || mode === "change"
                Text { text: "Confirmar Senha Mestra"; color: "#c4b5fd"; font.pixelSize: 12; font.bold: true }
                Rectangle {
                    Layout.fillWidth: true; height: 40; radius: 8; color: "#201e30"; border.color: "#ffffff18"
                    TextField {
                        id: confirmPassInput; anchors.fill: parent; anchors.margins: 8; echoMode: TextInput.Password
                        color: "#fffffe"; font.pixelSize: 13; placeholderText: "Repita a senha mestra..."; placeholderTextColor: "#ffffff35"; background: null
                        Keys.onReturnPressed: masterPassModalRoot.submit()
                    }
                }
            }

            // Actions Buttons Row
            RowLayout {
                Layout.fillWidth: true
                Layout.topMargin: 8
                spacing: 12

                Button {
                    text: "Cancelar"
                    Layout.fillWidth: true
                    height: 42
                    flat: true
                    background: Rectangle {
                        radius: 8
                        color: "#201e30"
                        border.color: "#ffffff12"
                    }
                    contentItem: Text {
                        text: "Cancelar"
                        color: "#a7a9be"
                        font.pixelSize: 13
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: masterPassModalRoot.closeModal()
                }

                Button {
                    Layout.fillWidth: true
                    height: 42
                    background: Rectangle {
                        radius: 8
                        color: mode === "remove" ? "#ef4444" : "#8b5cf6"
                    }
                    contentItem: Text {
                        text: mode === "setup" ? "Ativar Criptografia" :
                              mode === "change" ? "Salvar Nova Senha" :
                              "Remover Proteção"
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: masterPassModalRoot.submit()
                }
            }
        }
    }
}
