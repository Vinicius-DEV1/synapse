import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: triggerModalRoot
    anchors.fill: parent
    color: "#cc000000"
    z: 99

    property string timeStr: "08:00"
    property string label: "Alarme de Estudo"

    signal snooze(int minutes)
    signal dismiss()

    MouseArea {
        anchors.fill: parent
    }

    Rectangle {
        width: Math.min(420, parent.width - 40)
        height: Math.min(360, parent.height - 40)
        radius: 24
        color: "#161524"
        border.color: "#668b5cf6"
        border.width: 2
        anchors.centerIn: parent

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 28
            spacing: 16

            // Pulsing Bell Icon
            Rectangle {
                Layout.alignment: Qt.AlignHCenter
                width: 72
                height: 72
                radius: 36
                color: "#268b5cf6"

                Text {
                    anchors.centerIn: parent
                    text: "🔔"
                    font.pixelSize: 36
                }
            }

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: triggerModalRoot.timeStr
                color: "#ffffff"
                font.pixelSize: 42
                font.bold: true
                font.family: "Monospace"
            }

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: triggerModalRoot.label
                color: "#a78bfa"
                font.pixelSize: 15
                font.bold: true
                elide: Text.ElideRight
            }

            Item { Layout.fillHeight: true }

            // Snooze & Dismiss Controls
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    Layout.fillWidth: true
                    height: 44
                    flat: true
                    background: Rectangle {
                        color: "#211f30"
                        radius: 10
                        border.color: "#33ffffff"
                        border.width: 1
                    }
                    contentItem: Text {
                        text: "Soneca (+5m)"
                        color: "#a7a9be"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: triggerModalRoot.snooze(5)
                }

                Button {
                    Layout.fillWidth: true
                    height: 44
                    flat: true
                    background: Rectangle {
                        color: "#8b5cf6"
                        radius: 10
                    }
                    contentItem: Text {
                        text: "Desativar"
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: triggerModalRoot.dismiss()
                }
            }
        }
    }
}
