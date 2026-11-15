import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: recorderRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 70
    radius: 12
    color: "#161524"
    border.color: isRecording ? "#dc2626" : "#27272a"
    border.width: 1

    property bool isRecording: false
    property int recordedSeconds: 0
    property string recordedFilePath: ""

    signal recordingStarted()
    signal recordingStopped(string filePath)
    signal recordingDiscarded()

    Timer {
        id: recordTimer
        interval: 1000
        repeat: true
        running: recorderRoot.isRecording
        onTriggered: recorderRoot.recordedSeconds += 1
    }

    RowLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 12

        // Record Button
        Rectangle {
            width: 36
            height: 36
            radius: 18
            color: recorderRoot.isRecording ? "#dc2626" : "#4f46e5"

            Text {
                anchors.centerIn: parent
                text: recorderRoot.isRecording ? "⏹" : "🎙️"
                color: "#ffffff"
                font.pixelSize: 14
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    if (!recorderRoot.isRecording) {
                        recorderRoot.recordedSeconds = 0
                        recorderRoot.isRecording = true
                        recorderRoot.recordingStarted()
                    } else {
                        recorderRoot.isRecording = false
                        recorderRoot.recordingStopped(recorderRoot.recordedFilePath)
                    }
                }
            }
        }

        // Timer & Waveform Simulation
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4

            RowLayout {
                spacing: 8
                Text {
                    text: {
                        var m = Math.floor(recorderRoot.recordedSeconds / 60)
                        var s = recorderRoot.recordedSeconds % 60
                        return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s)
                    }
                    color: recorderRoot.isRecording ? "#ef4444" : "#ffffff"
                    font.pixelSize: 13
                    font.bold: true
                    font.family: "Monospace"
                }

                Text {
                    text: recorderRoot.isRecording ? qsTr("Gravando áudio...") : (recorderRoot.recordedSeconds > 0 ? qsTr("Áudio gravado") : qsTr("Pronto para gravar"))
                    color: "#71717a"
                    font.pixelSize: 11
                }
            }

            // Animated Visualizer Bars
            Row {
                spacing: 3
                visible: recorderRoot.isRecording

                Repeater {
                    model: 16
                    delegate: Rectangle {
                        required property int index
                        width: 4
                        height: Math.max(4, (index % 4 + 1) * 4)
                        radius: 2
                        color: "#ef4444"
                    }
                }
            }
        }

        // Discard button
        Rectangle {
            visible: !recorderRoot.isRecording && recorderRoot.recordedSeconds > 0
            width: 70
            height: 32
            radius: 6
            color: "#27272a"

            Text {
                anchors.centerIn: parent
                text: qsTr("Descartar")
                color: "#a1a1aa"
                font.pixelSize: 11
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    recorderRoot.recordedSeconds = 0
                    recorderRoot.recordedFilePath = ""
                    recorderRoot.recordingDiscarded()
                }
            }
        }
    }
}
