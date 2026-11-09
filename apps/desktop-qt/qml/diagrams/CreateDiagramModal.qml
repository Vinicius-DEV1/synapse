import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: modalRoot
    anchors.fill: parent
    color: "#00000088"
    z: 99

    signal diagramCreated(string title)
    signal closed()

    MouseArea { anchors.fill: parent; onClicked: modalRoot.closed() }

    Rectangle {
        anchors.centerIn: parent
        width: 440; height: 210; radius: 16
        color: "#161524"
        border.color: "#ffffff18"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            Text { text: "🎨 Novo Diagrama ou Mapa Mental"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }

            TextField {
                id: diagramTitleInput
                Layout.fillWidth: true
                placeholderText: "Título do diagrama..."
                color: "#ffffff"
                background: Rectangle { color: "#0f0e17"; border.color: "#ffffff18"; radius: 8 }
            }

            Item { Layout.fillHeight: true }

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
                    width: 130; height: 36; radius: 8; color: "#8b5cf6"
                    Text { anchors.centerIn: parent; text: "Criar Lousa"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (diagramTitleInput.text.trim().length > 0) {
                                modalRoot.diagramCreated(diagramTitleInput.text.trim())
                                diagramTitleInput.text = ""
                            }
                        }
                    }
                }
            }
        }
    }
}
