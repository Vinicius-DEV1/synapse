import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: lockoutRoot
    anchors.fill: parent
    color: "#0f0e17"
    z: 100

    property int lockoutSeconds: 60
    property string securityPhrase: "A criptografia de ponta a ponta protege seus dados contra tentativas automatizadas."

    signal cooldownFinished()

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

    ColumnLayout {
        anchors.centerIn: parent
        width: Math.min(420, parent.width - 40)
        spacing: 20

        // Pulsing Lockout Icon
        Rectangle {
            Layout.alignment: Qt.AlignHCenter
            width: 72
            height: 72
            radius: 36
            color: "#26ef4444"
            border.color: "#66ef4444"
            border.width: 1

            Text {
                anchors.centerIn: parent
                text: "⏱"
                font.pixelSize: 36
            }
        }

        // Countdown Timer Display
        Text {
            Layout.alignment: Qt.AlignHCenter
            text: {
                var m = Math.floor(lockoutRoot.lockoutSeconds / 60)
                var s = lockoutRoot.lockoutSeconds % 60
                return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s)
            }
            color: "#ef4444"
            font.pixelSize: 44
            font.bold: true
            font.family: "Monospace"
        }

        Text {
            Layout.alignment: Qt.AlignHCenter
            text: "ACESSO BLOQUEADO TEMPORARIAMENTE"
            color: "#fffffe"
            font.pixelSize: 13
            font.bold: true
            font.letterSpacing: 1.5
        }

        Text {
            Layout.fillWidth: true
            text: "Múltiplas tentativas incorretas detectadas. O acesso foi pausado por segurança defensiva."
            color: "#a7a9be"
            font.pixelSize: 12
            horizontalAlignment: Text.AlignHCenter
            wrapMode: Text.WordWrap
        }

        // Security Phrase Card
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
