import QtQuick 2.15
import QtQuick.Controls 2.15
import "../ui"

// Page unlock gate mirroring apps/web-react/src/components/page-view/PageUnlockForm.tsx
Rectangle {
    id: unlockRoot
    color: "transparent"

    property var controller: null
    property var page: null
    property bool isSubmitting: false
    property string errorMessage: ""

    signal unlocked(string decryptedContent)

    function attemptUnlock() {
        var pass = passInput.text.trim()
        if (pass.length === 0) {
            errorMessage = qsTr("Digite a senha para desbloquear.")
            return
        }
        if (!controller || typeof controller.unlockVault !== "function") {
            errorMessage = qsTr("Controlador do cofre indisponível.")
            return
        }
        isSubmitting = true
        errorMessage = ""

        var ok = controller.unlockVault(pass)
        if (ok) {
            var decrypted = ""
            if (page && page.id && typeof controller.getPage === "function") {
                var refreshed = controller.getPage(page.id)
                if (refreshed && refreshed.decryption_error) {
                    errorMessage = qsTr("Falha ao descriptografar o conteúdo desta página.")
                    isSubmitting = false
                    return
                }
                decrypted = refreshed ? String(refreshed.content || "") : ""
            }
            passInput.text = ""
            unlockRoot.unlocked(decrypted)
        } else {
            errorMessage = qsTr("Senha incorreta. Tente novamente.")
        }
        isSubmitting = false
    }

    Connections {
        target: unlockRoot.controller
        ignoreUnknownSignals: true
        function onVaultUnlocked() {
            if (!unlockRoot.visible || !unlockRoot.page || !unlockRoot.page.id) return
            var refreshed = unlockRoot.controller.getPage(unlockRoot.page.id)
            if (refreshed && !refreshed.decryption_error) {
                unlockRoot.unlocked(String(refreshed.content || ""))
            }
        }
    }

    Theme { id: theme }

    Rectangle {
        width: Math.min(parent.width - 32, 400)
        height: cardCol.implicitHeight + 48
        anchors.centerIn: parent
        radius: 16
        color: theme.bgDarkCard
        border.color: theme.borderCard
        border.width: 1

        Column {
            id: cardCol
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            Rectangle {
                width: 48
                height: 48
                anchors.horizontalCenter: parent.horizontalCenter
                radius: 12
                color: theme.activePillBg
                border.color: theme.borderBrand
                border.width: 1

                AppIcon {
                    anchors.centerIn: parent
                    name: "vault"
                    color: theme.brand400
                    width: 22
                    height: 22
                }
            }

            Column {
                width: parent.width
                spacing: 4

                Text {
                    width: parent.width
                    text: qsTr("Página Protegida")
                    color: theme.textDark
                    font.pixelSize: 18
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                }

                Text {
                    width: parent.width
                    text: qsTr("Esta página possui conteúdo criptografado. Digite a senha mestra para desbloquear.")
                    color: theme.textSubtext
                    font.pixelSize: 12
                    horizontalAlignment: Text.AlignHCenter
                    wrapMode: Text.WordWrap
                }
            }

            Rectangle {
                visible: unlockRoot.errorMessage.length > 0
                width: parent.width
                height: errLbl.implicitHeight + 14
                radius: 8
                color: theme.errorBg
                border.color: theme.errorBorder
                border.width: 1

                Text {
                    id: errLbl
                    anchors.centerIn: parent
                    width: parent.width - 16
                    text: unlockRoot.errorMessage
                    color: "#fda4af"
                    font.pixelSize: 11
                    horizontalAlignment: Text.AlignHCenter
                    wrapMode: Text.WordWrap
                }
            }

            TextField {
                id: passInput
                width: parent.width
                height: 40
                placeholderText: qsTr("Senha mestra")
                color: theme.textDark
                placeholderTextColor: theme.textMuted
                font.pixelSize: 13
                echoMode: TextInput.Password
                enabled: !unlockRoot.isSubmitting
                background: Rectangle {
                    radius: 10
                    color: theme.bgDarkBg
                    border.color: passInput.activeFocus ? theme.brand500 : theme.borderCard
                    border.width: 1
                }
                onAccepted: unlockRoot.attemptUnlock()
            }

            Rectangle {
                width: parent.width
                height: 40
                radius: 10
                opacity: unlockRoot.isSubmitting ? 0.65 : 1.0
                color: unlockMouse.containsMouse ? theme.brand700 : theme.brand600

                Text {
                    anchors.centerIn: parent
                    text: unlockRoot.isSubmitting ? qsTr("Desbloqueando...") : qsTr("Desbloquear Conteúdo")
                    color: "#ffffff"
                    font.pixelSize: 13
                    font.weight: Font.DemiBold
                }

                MouseArea {
                    id: unlockMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    enabled: !unlockRoot.isSubmitting
                    cursorShape: Qt.PointingHandCursor
                    onClicked: unlockRoot.attemptUnlock()
                }
            }
        }
    }
}
