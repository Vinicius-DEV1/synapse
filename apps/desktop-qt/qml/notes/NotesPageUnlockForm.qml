import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: unlockRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 340
    color: "transparent"

    property var page: null
    property string encryptedContent: ""
    property bool isSubmitting: false
    property string errorMessage: ""

    signal unlocked(string decryptedContent)

    function attemptUnlock() {
        var pass = passInput.text.trim()
        if (pass.length === 0) {
            errorMessage = "Digite a senha para desbloquear."
            return
        }

        isSubmitting = true
        errorMessage = ""

        var ok = dataController.unlockVault(pass)
        if (ok) {
            var dec = ""
            if (encryptedContent && encryptedContent.length > 0) {
                // Decrypt using notes key if configured
                dec = encryptedContent
            }
            unlockRoot.unlocked(dec)
        } else {
            errorMessage = "Senha incorreta. Tente novamente."
        }
        isSubmitting = false
    }

    Rectangle {
        width: 400
        height: cardCol.implicitHeight + 48
        anchors.centerIn: parent
        radius: 20
        color: "#16161e"
        border.color: "#2e2e38"
        border.width: 1

        ColumnLayout {
            id: cardCol
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            Rectangle {
                Layout.preferredWidth: 48
                Layout.preferredHeight: 48
                Layout.alignment: Qt.AlignHCenter
                radius: 12
                color: "#281b38"
                border.color: "#7c3aed"
                border.width: 1

                AppIcon {
                    anchors.centerIn: parent
                    name: "vault"
                    color: "#a78bfa"
                    Layout.preferredWidth: 24
                    Layout.preferredHeight: 24
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4

                Text {
                    text: "Página Protegida"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.weight: Font.Bold
                    Layout.alignment: Qt.AlignHCenter
                }

                Text {
                    text: "Esta página possui conteúdo criptografado. Digite a senha mestra para desbloquear."
                    color: "#a7a9be"
                    font.pixelSize: 12
                    horizontalAlignment: Text.AlignHCenter
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
            }

            // Error Banner
            Rectangle {
                visible: unlockRoot.errorMessage.length > 0
                Layout.fillWidth: true
                Layout.preferredHeight: 32
                radius: 8
                color: "#2a151b"
                border.color: "#ef4444"
                border.width: 1

                Text {
                    anchors.centerIn: parent
                    text: unlockRoot.errorMessage
                    color: "#fca5a5"
                    font.pixelSize: 11
                }
            }

            TextField {
                id: passInput
                Layout.fillWidth: true
                Layout.preferredHeight: 40
                placeholderText: "Senha mestra"
                color: "#fffffe"
                placeholderTextColor: "#4b5563"
                font.pixelSize: 13
                echoMode: TextInput.Password
                background: Rectangle {
                    radius: 10
                    color: "#0f0e17"
                    border.color: passInput.activeFocus ? "#7c3aed" : "#2e2e38"
                    border.width: 1
                }
                onAccepted: unlockRoot.attemptUnlock()
            }

            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 40
                radius: 10
                color: unlockMouse.containsMouse ? "#6d28d9" : "#7c3aed"

                Text {
                    anchors.centerIn: parent
                    text: unlockRoot.isSubmitting ? "Desbloqueando..." : "Desbloquear Conteúdo"
                    color: "#ffffff"
                    font.pixelSize: 13
                    font.weight: Font.DemiBold
                }

                MouseArea {
                    id: unlockMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: unlockRoot.attemptUnlock()
                }
            }
        }
    }
}
