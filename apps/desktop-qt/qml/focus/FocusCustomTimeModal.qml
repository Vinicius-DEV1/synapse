import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: modalRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 90

    signal timeSet(int minutes)
    signal closed()

    MouseArea {
        anchors.fill: parent
        onClicked: modalRoot.closed()
    }

    Rectangle {
        width: 380; height: 260; radius: 16
        color: "#1a1924"
        border.color: "#8b5cf655"
        border.width: 1
        anchors.centerIn: parent

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            RowLayout {
                Layout.fillWidth: true
                Text { text: "⏱️ Duração do Foco"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                Item { Layout.fillWidth: true }
                Rectangle {
                    width: 28; height: 28; radius: 6; color: "#ffffff10"
                    Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 13 }
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: modalRoot.closed() }
                }
            }

            Text {
                text: "Selecione ou digite a duração desejada da sua sessão em minutos:"
                color: "#a7a9be"
                font.pixelSize: 12
                wrapMode: Text.WordWrap
            }

            // Quick buttons: 15m, 30m, 45m, 60m, 90m
            RowLayout {
                Layout.fillWidth: true
                spacing: 6
                Repeater {
                    model: [15, 30, 45, 60, 90]
                    delegate: Rectangle {
                        Layout.fillWidth: true
                        height: 32; radius: 8
                        color: customMinInput.text === modelData.toString() ? "#8b5cf6" : "#ffffff10"
                        Text { anchors.centerIn: parent; text: modelData + "m"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: customMinInput.text = modelData.toString()
                        }
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                height: 40; radius: 8
                color: "#0f0e17"
                border.color: customMinInput.activeFocus ? "#8b5cf6" : "#ffffff18"
                border.width: 1

                TextInput {
                    id: customMinInput
                    anchors.fill: parent
                    anchors.margins: 8
                    color: "#fffffe"
                    font.pixelSize: 14
                    text: "30"
                    validator: IntValidator { bottom: 1; top: 360 }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Item { Layout.fillWidth: true }
                Rectangle {
                    width: 90; height: 36; radius: 8; color: "#211f30"
                    Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: modalRoot.closed() }
                }
                Rectangle {
                    width: 120; height: 36; radius: 8; color: "#8b5cf6"
                    Text { anchors.centerIn: parent; text: "Definir Tempo"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            var mins = parseInt(customMinInput.text) || 25
                            modalRoot.timeSet(mins)
                        }
                    }
                }
            }
        }
    }
}
