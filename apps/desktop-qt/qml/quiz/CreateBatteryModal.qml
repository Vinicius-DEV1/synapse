import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: createBatteryRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: isOpen
    z: 120

    property bool isOpen: false

    signal closed()
    signal batteryCreated(string title, string description)

    onIsOpenChanged: {
        if (isOpen) {
            batteryTitleInput.text = ""
            batteryDescInput.text = ""
            batteryTitleInput.forceActiveFocus()
        }
    }

    MouseArea { anchors.fill: parent }

    Rectangle {
        anchors.centerIn: parent
        width: 440
        height: 280
        radius: 16
        color: "#161524"
        border.color: "#ffffff18"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 14

            Text {
                text: "Nova Bateria de Questões"
                color: "#fffffe"
                font.pixelSize: 17
                font.bold: true
            }

            TextField {
                id: batteryTitleInput
                Layout.fillWidth: true
                placeholderText: "Título da bateria (ex: Redes de Computadores)..."
                color: "#ffffff"
                background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 }
            }

            TextField {
                id: batteryDescInput
                Layout.fillWidth: true
                placeholderText: "Descrição opcional..."
                color: "#ffffff"
                background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 }
            }

            Item { Layout.fillHeight: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    text: "Cancelar"
                    Layout.fillWidth: true
                    onClicked: createBatteryRoot.closed()
                }

                Button {
                    text: "Criar Bateria"
                    Layout.fillWidth: true
                    onClicked: {
                        if (batteryTitleInput.text.trim().length > 0) {
                            createBatteryRoot.batteryCreated(batteryTitleInput.text.trim(), batteryDescInput.text.trim())
                            createBatteryRoot.closed()
                        }
                    }
                }
            }
        }
    }
}
