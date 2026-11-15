import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: callBarRoot
    height: 64
    radius: 12
    color: "#161524"
    border.color: "#38354d"
    border.width: 1

    property bool isCallActive: false
    property bool isMuted: false
    property bool isSpeakerMuted: false
    property int callSeconds: 0
    property string activeModeName: "Voz com IA"

    signal toggleMuteRequested()
    signal toggleSpeakerRequested()
    signal endCallRequested()

    Timer {
        id: callDurationTimer
        interval: 1000
        running: callBarRoot.isCallActive
        repeat: true
        onTriggered: callBarRoot.callSeconds++
    }

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 20
        anchors.rightMargin: 20
        spacing: 16

        // Live status & timer
        RowLayout {
            spacing: 10

            Rectangle {
                width: 10
                height: 10
                radius: 5
                color: "#10b981"
            }

            ColumnLayout {
                spacing: 1
                Text {
                    text: callBarRoot.activeModeName
                    color: "#fffffe"
                    font.pixelSize: 13
                    font.bold: true
                }
                Text {
                    text: {
                        var m = Math.floor(callBarRoot.callSeconds / 60)
                        var s = callBarRoot.callSeconds % 60
                        return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s
                    }
                    color: "#94a1b2"
                    font.family: "Monospace"
                    font.pixelSize: 11
                }
            }
        }

        // Audio visualizer
        PracticeAudioVisualizer {
            Layout.alignment: Qt.AlignVCenter
            isActive: callBarRoot.isCallActive && !callBarRoot.isMuted
            barColor: "#8b5cf6"
        }

        Item { Layout.fillWidth: true }

        // Mute Mic Button
        Button {
            text: callBarRoot.isMuted ? "🔇 Microfone Mudo" : "🎙️ Microfone Ativo"
            background: Rectangle {
                color: callBarRoot.isMuted ? "#f43f5e" : "#232135"
                radius: 8
            }
            contentItem: Text {
                text: parent.text
                color: "#fffffe"
                font.pixelSize: 12
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: {
                callBarRoot.isMuted = !callBarRoot.isMuted
                callBarRoot.toggleMuteRequested()
            }
        }

        // Speaker Toggle Button
        Button {
            text: callBarRoot.isSpeakerMuted ? "🔈 Áudio Mudo" : "🔊 Áudio Ativo"
            background: Rectangle {
                color: "#232135"
                radius: 8
            }
            contentItem: Text {
                text: parent.text
                color: "#fffffe"
                font.pixelSize: 12
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: {
                callBarRoot.isSpeakerMuted = !callBarRoot.isSpeakerMuted
                callBarRoot.toggleSpeakerRequested()
            }
        }

        // End Call Button
        Button {
            text: "Encerrar Chamada"
            background: Rectangle {
                color: "#e11d48"
                radius: 8
            }
            contentItem: Text {
                text: parent.text
                color: "#ffffff"
                font.bold: true
                font.pixelSize: 12
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: {
                callBarRoot.isCallActive = false
                callBarRoot.endCallRequested()
            }
        }
    }
}
