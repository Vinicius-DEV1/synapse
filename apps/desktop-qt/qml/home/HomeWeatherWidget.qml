import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root
    Layout.fillWidth: true
    Layout.preferredHeight: 72
    radius: 14
    color: "#161524"
    border.color: "#18ffffff"
    border.width: 1

    property string currentTimeString: ""
    property string weatherTemp: "24°C"
    property string weatherDesc: "Parcialmente nublado"
    property string weatherCity: "Local"

    function updateTime() {
        var d = new Date()
        var h = d.getHours()
        var m = d.getMinutes()
        var s = d.getSeconds()
        currentTimeString = (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s
    }

    Timer {
        interval: 1000
        running: true
        repeat: true
        triggeredOnStart: true
        onTriggered: root.updateTime()
    }

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 20
        anchors.rightMargin: 20
        spacing: 16

        // Live Clock
        RowLayout {
            spacing: 10
            Text { text: "⏱️"; font.pixelSize: 22 }
            ColumnLayout {
                spacing: 2
                Text {
                    text: root.currentTimeString
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                    font.family: "Monospace"
                }
                Text {
                    text: "Horário Local"
                    color: "#94a3b8"
                    font.pixelSize: 11
                }
            }
        }

        Item { Layout.fillWidth: true }

        Rectangle { width: 1; height: 36; color: "#15ffffff" }

        Item { Layout.fillWidth: true }

        // Live Weather
        RowLayout {
            spacing: 12
            Text {
                text: {
                    var h = new Date().getHours()
                    if (h >= 18 || h < 6) return "🌙"
                    if (root.weatherDesc.indexOf("nublado") !== -1) return "⛅"
                    return "☀️"
                }
                font.pixelSize: 24
            }
            ColumnLayout {
                spacing: 2
                RowLayout {
                    spacing: 6
                    Text {
                        text: root.weatherTemp
                        color: "#fffffe"
                        font.pixelSize: 17
                        font.bold: true
                    }
                    Text {
                        text: "• " + root.weatherDesc
                        color: "#c4b5fd"
                        font.pixelSize: 12
                    }
                }
                Text {
                    text: root.weatherCity + " • Clima Atual"
                    color: "#94a3b8"
                    font.pixelSize: 11
                }
            }
        }

        Item { Layout.fillWidth: true }

        Rectangle { width: 1; height: 36; color: "#15ffffff" }

        Item { Layout.fillWidth: true }

        // Daily focus encouragement pill
        Rectangle {
            height: 34
            width: pillLayout.implicitWidth + 20
            radius: 8
            color: "#18818cf8"
            border.color: "#33818cf8"

            RowLayout {
                id: pillLayout
                anchors.centerIn: parent
                spacing: 6
                Text { text: "✨"; font.pixelSize: 12 }
                Text {
                    text: "Mantenha o foco e consistência hoje"
                    color: "#a78bfa"
                    font.pixelSize: 12
                    font.bold: true
                }
            }
        }
    }
}
