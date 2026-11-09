import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: dialogRoot
    anchors.fill: parent
    color: "#b3000000"
    z: 95

    property string generatedPassword: ""
    signal copyRequested(string password)
    signal closed()

    MouseArea { anchors.fill: parent; onClicked: dialogRoot.closed() }

    Rectangle {
        anchors.centerIn: parent
        width: 440; height: 220; radius: 16
        color: "#161524"; border.color: "#ffffff1a"

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 28
            spacing: 16

            Text {
                text: "⚡ Senha Gerada (Alta Entropia)"
                color: "#fffffe"
                font.pixelSize: 18
                font.bold: true
            }

            TextField {
                id: passwordDialogText
                Layout.fillWidth: true
                readOnly: true
                font.family: "Monospace"
                font.pixelSize: 16
                color: "#34d399"
                text: dialogRoot.generatedPassword
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12
                Item { Layout.fillWidth: true }

                Rectangle {
                    width: 120; height: 36; radius: 8
                    color: "#10b981"
                    Text { anchors.centerIn: parent; text: "Copiar Senha"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: dialogRoot.copyRequested(dialogRoot.generatedPassword)
                    }
                }

                Rectangle {
                    width: 80; height: 36; radius: 8
                    color: "#211f30"
                    Text { anchors.centerIn: parent; text: "Fechar"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: dialogRoot.closed() }
                }
            }
        }
    }
}
