import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: activeTimerRoot
    anchors.fill: parent
    color: "#0f0e17" // bg-dark-bg

    property string tag: "Estudo"
    property string description: "Sessão de foco"
    property int totalSeconds: 25 * 60
    property int remainingSeconds: 25 * 60
    property bool isPaused: false

    signal addMinutes(int mins)
    signal togglePause()
    signal requestCancel()

    function formatTime(sec) {
        var m = Math.floor(sec / 60)
        var s = sec % 60
        return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s)
    }

    ColumnLayout {
        anchors.centerIn: parent
        width: Math.min(540, parent.width - 40)
        spacing: 32

        // Session Metadata Card
        Rectangle {
            Layout.fillWidth: true
            height: 84
            radius: 16
            color: "#161524"
            border.color: "#1affffff"
            border.width: 1

            ColumnLayout {
                anchors.centerIn: parent
                spacing: 6

                Text {
                    Layout.alignment: Qt.AlignHCenter
                    text: "FOCO ATUAL"
                    color: "#8b5cf6"
                    font.pixelSize: 11
                    font.bold: true
                    font.letterSpacing: 1.5
                }

                Text {
                    Layout.alignment: Qt.AlignHCenter
                    text: activeTimerRoot.description
                    color: "#ffffff"
                    font.pixelSize: 18
                    font.bold: true
                    elide: Text.ElideRight
                    maximumLineCount: 1
                }

                Rectangle {
                    Layout.alignment: Qt.AlignHCenter
                    width: tagLabel.width + 16
                    height: 22
                    radius: 11
                    color: "#268b5cf6"
                    border.color: "#408b5cf6"
                    border.width: 1

                    Text {
                        id: tagLabel
                        anchors.centerIn: parent
                        text: activeTimerRoot.tag
                        color: "#a78bfa"
                        font.pixelSize: 11
                        font.bold: true
                    }
                }
            }
        }

        // Circular Timer Display
        Item {
            Layout.alignment: Qt.AlignHCenter
            width: 320
            height: 320

            Canvas {
                id: ringCanvas
                anchors.fill: parent

                onPaint: {
                    var ctx = getContext("2d")
                    ctx.reset()

                    var centerX = width / 2
                    var centerY = height / 2
                    var radius = Math.min(width, height) / 2 - 16
                    var progress = activeTimerRoot.totalSeconds > 0 
                        ? (activeTimerRoot.totalSeconds - activeTimerRoot.remainingSeconds) / activeTimerRoot.totalSeconds 
                        : 0

                    // Background Track Ring
                    ctx.beginPath()
                    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
                    ctx.lineWidth = 10
                    ctx.strokeStyle = "#1a1924"
                    ctx.stroke()

                    // Foreground Progress Ring
                    if (progress > 0) {
                        ctx.beginPath()
                        var startAngle = -Math.PI / 2
                        var endAngle = startAngle + (progress * 2 * Math.PI)
                        ctx.arc(centerX, centerY, radius, startAngle, endAngle)
                        ctx.lineWidth = 10
                        ctx.lineCap = "round"
                        ctx.strokeStyle = activeTimerRoot.remainingSeconds <= 60 ? "#ef4444" : "#8b5cf6"
                        ctx.stroke()
                    }
                }
            }

            Connections {
                target: activeTimerRoot
                function onRemainingSecondsChanged() { ringCanvas.requestPaint() }
                function onTotalSecondsChanged() { ringCanvas.requestPaint() }
            }

            ColumnLayout {
                anchors.centerIn: parent
                spacing: 8

                Text {
                    Layout.alignment: Qt.AlignHCenter
                    text: activeTimerRoot.formatTime(activeTimerRoot.remainingSeconds)
                    color: activeTimerRoot.remainingSeconds <= 60 ? "#ef4444" : "#ffffff"
                    font.pixelSize: 56
                    font.bold: true
                    font.family: "Monospace"
                }

                Text {
                    Layout.alignment: Qt.AlignHCenter
                    visible: activeTimerRoot.isPaused
                    text: "PAUSADO"
                    color: "#8b5cf6"
                    font.pixelSize: 12
                    font.bold: true
                    font.letterSpacing: 2
                }
            }
        }

        // Action Controls
        RowLayout {
            Layout.alignment: Qt.AlignHCenter
            spacing: 24

            // +5m Quick Extension
            Button {
                width: 56
                height: 56
                flat: true
                background: Rectangle {
                    color: "#161524"
                    radius: 28
                    border.color: "#33ffffff"
                    border.width: 1
                }
                contentItem: Text {
                    text: "+5m"
                    color: "#a7a9be"
                    font.pixelSize: 14
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: activeTimerRoot.addMinutes(5)
            }

            // Play / Pause Toggle
            Button {
                width: 72
                height: 72
                flat: true
                background: Rectangle {
                    color: "#8b5cf6"
                    radius: 36
                }
                contentItem: Text {
                    text: activeTimerRoot.isPaused ? "▶" : "❚❚"
                    color: "#ffffff"
                    font.pixelSize: 24
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: activeTimerRoot.togglePause()
            }

            // Cancel Button
            Button {
                width: 56
                height: 56
                flat: true
                background: Rectangle {
                    color: "#161524"
                    radius: 28
                    border.color: "#40ef4444"
                    border.width: 1
                }
                contentItem: Text {
                    text: "✕"
                    color: "#ef4444"
                    font.pixelSize: 18
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: activeTimerRoot.requestCancel()
            }
        }
    }
}
