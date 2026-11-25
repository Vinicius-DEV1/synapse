import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: lockoutRoot
    anchors.fill: parent
    color: "#0f0e17"
    z: 100

    property int lockoutSeconds: 60
    readonly property var phrases: [
        "Se você usar toda a energia do sol para tentar quebrar essa criptografia AES-256 GCM, o sol vai apagar antes de você conseguir.",
        "O universo vai atingir o zero absoluto e congelar antes de você passar dessa tela. Vá tomar um café.",
        "Força bruta? Sério? Estamos no século 21. A criptografia ri da sua tentativa.",
        "Sua persistência é admirável, mas sua ignorância criptográfica é deplorável. Não vai rolar.",
        "Desista logo. Vá fazer algo mais produtivo do que tentar quebrar o inquebrável."
    ]
    property string securityPhrase: phrases[Math.floor(Math.random() * phrases.length)]

    signal cooldownFinished()

    onVisibleChanged: {
        if (visible) {
            securityPhrase = phrases[Math.floor(Math.random() * phrases.length)]
        }
    }

    Timer {
        id: countdownTimer
        interval: 1000
        repeat: true
        running: lockoutRoot.visible && lockoutRoot.lockoutSeconds > 0
        onTriggered: {
            lockoutRoot.lockoutSeconds--
            if (lockoutRoot.lockoutSeconds <= 0) {
                countdownTimer.stop()
                lockoutRoot.cooldownFinished()
            }
        }
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(440, parent.width - 32)
        height: lockoutCol.implicitHeight + 64
        radius: 16
        color: "#1a0f0f"
        border.color: "#80ef4444"
        border.width: 1

        ColumnLayout {
            id: lockoutCol
            anchors.fill: parent
            anchors.margins: 32
            spacing: 18

            Rectangle {
                Layout.alignment: Qt.AlignHCenter
                width: 60
                height: 60
                radius: 30
                color: "#26ef4444"
                border.color: "#66ef4444"
                border.width: 1

                AppIcon {
                    anchors.centerIn: parent
                    name: "clock"
                    color: "#f87171"
                    width: 28
                    height: 28
                }
            }

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: {
                    var m = Math.floor(lockoutRoot.lockoutSeconds / 60)
                    var s = lockoutRoot.lockoutSeconds % 60
                    return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s)
                }
                color: "#ef4444"
                font.pixelSize: 40
                font.bold: true
                font.family: "monospace"
            }

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: qsTr("ACESSO BLOQUEADO TEMPORARIAMENTE")
                color: "#fffffe"
                font.pixelSize: 13
                font.bold: true
                font.letterSpacing: 1.4
            }

            Text {
                Layout.fillWidth: true
                text: qsTr("Múltiplas tentativas incorretas detectadas. O acesso foi pausado por segurança defensiva.")
                color: "#a7a9be"
                font.pixelSize: 12
                horizontalAlignment: Text.AlignHCenter
                wrapMode: Text.WordWrap
            }

            Rectangle {
                Layout.fillWidth: true
                height: phraseText.implicitHeight + 24
                radius: 12
                color: "#18ef4444"
                border.color: "#33ef4444"
                border.width: 1

                Text {
                    id: phraseText
                    anchors.centerIn: parent
                    width: parent.width - 24
                    text: "“" + lockoutRoot.securityPhrase + "”"
                    color: "#fca5a5"
                    font.pixelSize: 11
                    font.italic: true
                    horizontalAlignment: Text.AlignHCenter
                    wrapMode: Text.WordWrap
                }
            }
        }
    }
}
