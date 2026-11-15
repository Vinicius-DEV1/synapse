import QtQuick 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: listeningCardRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 380
    radius: 16
    color: "#1a1924"
    border.color: isAnswerRevealed ? "#44818cf8" : "#12ffffff"
    border.width: 1

    property var card: null
    property bool isAnswerRevealed: false
    property string userTypedAnswer: ""
    property bool isPlayingAudio: false

    signal revealRequested()
    signal typedAnswerChanged(string text)
    signal playAudioRequested(string audioPath)

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 28
        spacing: 16

        // Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Rectangle {
                height: 22
                width: badgeText.implicitWidth + 16
                radius: 11
                color: "#14532d"
                border.color: "#22c55e"

                Text {
                    id: badgeText
                    anchors.centerIn: parent
                    text: qsTr("Compreensão Auditiva")
                    color: "#86efac"
                    font.pixelSize: 10
                    font.bold: true
                }
            }

            Item { Layout.fillWidth: true }

            Text {
                text: card && card.reps !== undefined ? qsTr("Repetição #") + card.reps : ""
                color: "#71717a"
                font.pixelSize: 11
            }
        }

        // Audio Trigger Button
        Rectangle {
            Layout.alignment: Qt.AlignHCenter
            width: 180
            height: 52
            radius: 26
            color: playMouse.containsMouse ? "#22c55e" : "#16a34a"

            RowLayout {
                anchors.centerIn: parent
                spacing: 10

                Text {
                    text: listeningCardRoot.isPlayingAudio ? "⏸" : "🔊"
                    color: "#ffffff"
                    font.pixelSize: 18
                }

                Text {
                    text: listeningCardRoot.isPlayingAudio ? qsTr("Ouvindo...") : qsTr("Ouvir Áudio")
                    color: "#ffffff"
                    font.pixelSize: 13
                    font.bold: true
                }
            }

            MouseArea {
                id: playMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    listeningCardRoot.isPlayingAudio = !listeningCardRoot.isPlayingAudio
                    if (listeningCardRoot.card && listeningCardRoot.card.audio_path) {
                        listeningCardRoot.playAudioRequested(listeningCardRoot.card.audio_path)
                    }
                }
            }
        }

        // Transcription Input
        Rectangle {
            visible: !listeningCardRoot.isAnswerRevealed
            Layout.fillWidth: true
            height: 48
            radius: 8
            color: "#100f1c"
            border.color: textInput.activeFocus ? "#22c55e" : "#27272a"

            TextInput {
                id: textInput
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                verticalAlignment: TextInput.AlignVCenter
                color: "#ffffff"
                font.pixelSize: 15
                text: listeningCardRoot.userTypedAnswer
                onTextChanged: listeningCardRoot.typedAnswerChanged(text)
                onAccepted: listeningCardRoot.revealRequested()

                Text {
                    visible: !textInput.text && !textInput.activeFocus
                    anchors.fill: parent
                    verticalAlignment: Text.AlignVCenter
                    text: qsTr("Transcreva o que você ouviu e pressione Enter...")
                    color: "#52525b"
                    font.pixelSize: 13
                }
            }
        }

        Item { Layout.fillHeight: true }

        // Back / Answer
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 8
            visible: listeningCardRoot.isAnswerRevealed

            Rectangle { Layout.fillWidth: true; height: 1; color: "#1affffff" }

            Text {
                text: qsTr("TRANSCRIÇÃO E TRADUÇÃO")
                color: "#22c55e"
                font.pixelSize: 11
                font.bold: true
                font.letterSpacing: 1.2
            }

            Text {
                Layout.fillWidth: true
                text: card ? (card.front || "") : ""
                color: "#ffffff"
                font.pixelSize: 16
                font.bold: true
                wrapMode: Text.Wrap
            }

            Text {
                Layout.fillWidth: true
                text: card ? (card.back || "") : ""
                color: "#a1a1aa"
                font.pixelSize: 14
                wrapMode: Text.Wrap
            }
        }
    }
}
