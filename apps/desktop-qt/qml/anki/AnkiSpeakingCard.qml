import QtQuick 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: speakingCardRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 380
    radius: 16
    color: "#1a1924"
    border.color: isAnswerRevealed ? "#44818cf8" : "#12ffffff"
    border.width: 1

    property var card: null
    property bool isAnswerRevealed: false
    property bool isRecording: false
    property bool hasRecorded: false
    property int recordingDuration: 0

    signal revealRequested()
    signal recordToggleRequested()
    signal playbackRecordingRequested()

    Timer {
        id: recTimer
        interval: 1000
        repeat: true
        running: speakingCardRoot.isRecording
        onTriggered: speakingCardRoot.recordingDuration += 1
    }

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
                color: "#701a75"
                border.color: "#c026d3"

                Text {
                    id: badgeText
                    anchors.centerIn: parent
                    text: qsTr("Prática Oral (Speaking)")
                    color: "#f0abfc"
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

        // Prompt
        Text {
            Layout.fillWidth: true
            text: card ? (card.front || "") : ""
            color: "#ffffff"
            font.pixelSize: 20
            font.bold: true
            wrapMode: Text.Wrap
        }

        // Recording Controls
        RowLayout {
            Layout.alignment: Qt.AlignHCenter
            spacing: 16

            Rectangle {
                width: 170
                height: 48
                radius: 24
                color: speakingCardRoot.isRecording ? "#dc2626" : (recMouse.containsMouse ? "#c026d3" : "#a21caf")

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 8

                    Text {
                        text: speakingCardRoot.isRecording ? "⏹" : "🎙️"
                        color: "#ffffff"
                        font.pixelSize: 16
                    }

                    Text {
                        text: speakingCardRoot.isRecording ? qsTr("Parar") + " (" + speakingCardRoot.recordingDuration + "s)" : qsTr("Gravar Voz")
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                    }
                }

                MouseArea {
                    id: recMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        if (!speakingCardRoot.isRecording) {
                            speakingCardRoot.recordingDuration = 0
                            speakingCardRoot.isRecording = true
                        } else {
                            speakingCardRoot.isRecording = false
                            speakingCardRoot.hasRecorded = true
                        }
                        speakingCardRoot.recordToggleRequested()
                    }
                }
            }

            // Playback User Recording Button
            Rectangle {
                visible: speakingCardRoot.hasRecorded
                width: 140
                height: 48
                radius: 24
                color: playRecMouse.containsMouse ? "#3f3f46" : "#27272a"
                border.color: "#3f3f46"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 8

                    Text {
                        text: "▶"
                        color: "#f4f4f5"
                        font.pixelSize: 13
                    }

                    Text {
                        text: qsTr("Ouvir Minha Voz")
                        color: "#f4f4f5"
                        font.pixelSize: 12
                        font.bold: true
                    }
                }

                MouseArea {
                    id: playRecMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: speakingCardRoot.playbackRecordingRequested()
                }
            }
        }

        Item { Layout.fillHeight: true }

        // Back / Reference Answer
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 8
            visible: speakingCardRoot.isAnswerRevealed

            Rectangle { Layout.fillWidth: true; height: 1; color: "#1affffff" }

            Text {
                text: qsTr("RESPOSTA MODELO")
                color: "#e879f9"
                font.pixelSize: 11
                font.bold: true
                font.letterSpacing: 1.2
            }

            Text {
                Layout.fillWidth: true
                text: card ? (card.back || "") : ""
                color: "#e4e4e7"
                font.pixelSize: 16
                wrapMode: Text.Wrap
            }
        }
    }
}
