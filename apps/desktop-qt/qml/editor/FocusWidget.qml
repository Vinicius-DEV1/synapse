import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: focusWidgetRoot
    implicitWidth: 320
    implicitHeight: 140
    radius: 12
    color: "#161524"
    border.color: "#ffffff12"
    border.width: 1

    property int totalSeconds: 25 * 60
    property int remainingSeconds: totalSeconds
    property bool isRunning: false

    function formatTime(s) {
        var mins = Math.floor(s / 60);
        var secs = s % 60;
        return (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs;
    }

    Timer {
        id: pomodoroTimer
        interval: 1000
        repeat: true
        running: focusWidgetRoot.isRunning
        onTriggered: {
            if (focusWidgetRoot.remainingSeconds > 0) {
                focusWidgetRoot.remainingSeconds--;
            } else {
                focusWidgetRoot.isRunning = false;
            }
        }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 14
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            Text {
                text: "⏱️ Foco Pomodoro"
                color: "#a1a1aa"
                font.pixelSize: 13
                font.weight: Font.Medium
            }
            Item { Layout.fillWidth: true }
            Text {
                text: focusWidgetRoot.isRunning ? "Em andamento" : "Pausado"
                color: focusWidgetRoot.isRunning ? "#34d399" : "#71717a"
                font.pixelSize: 11
            }
        }

        // Large time display
        Text {
            Layout.alignment: Qt.AlignHCenter
            text: focusWidgetRoot.formatTime(focusWidgetRoot.remainingSeconds)
            color: "#ffffff"
            font.pixelSize: 32
            font.bold: true
            font.family: "Monospace"
        }

        RowLayout {
            Layout.alignment: Qt.AlignHCenter
            spacing: 12

            Button {
                implicitHeight: 28
                implicitWidth: 80
                background: Rectangle {
                    color: focusWidgetRoot.isRunning ? "#27272a" : "#6366f1"
                    radius: 6
                }
                contentItem: Text {
                    text: focusWidgetRoot.isRunning ? "Pausar" : "Iniciar"
                    color: "#ffffff"
                    font.pixelSize: 12
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: focusWidgetRoot.isRunning = !focusWidgetRoot.isRunning
            }

            Button {
                implicitHeight: 28
                implicitWidth: 80
                background: Rectangle {
                    color: "#27272a"
                    radius: 6
                }
                contentItem: Text {
                    text: "Resetar"
                    color: "#a1a1aa"
                    font.pixelSize: 12
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: {
                    focusWidgetRoot.isRunning = false;
                    focusWidgetRoot.remainingSeconds = focusWidgetRoot.totalSeconds;
                }
            }
        }
    }
}

