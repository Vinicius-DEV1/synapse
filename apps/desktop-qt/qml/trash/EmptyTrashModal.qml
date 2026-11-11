import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: modalRoot
    anchors.fill: parent
    color: "#88000000"
    z: 99
    visible: false

    signal closed()
    signal confirmed()

    MouseArea {
        anchors.fill: parent
        onClicked: {
            modalRoot.visible = false
            modalRoot.closed()
        }
    }

    Rectangle {
        anchors.centerIn: parent
        width: 440
        height: 200
        radius: 16
        color: "#161524"
        border.color: "#55f43f5e"
        border.width: 1

        MouseArea { anchors.fill: parent } // Prevent click-through

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            Text {
                text: "Esvaziar Lixeira Permanentemente?"
                color: "#fffffe"
                font.pixelSize: 16
                font.bold: true
            }

            Text {
                text: "Todos os itens da lixeira serão eliminados definitivamente do banco de dados SQLite. Esta ação não poderá ser desfeita."
                color: "#a7a9be"
                font.pixelSize: 13
                wrapMode: Text.Wrap
                Layout.fillWidth: true
            }

            Item { Layout.fillHeight: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12
                Item { Layout.fillWidth: true }

                Rectangle {
                    width: 90; height: 36; radius: 8; color: "#211f30"
                    Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            modalRoot.visible = false
                            modalRoot.closed()
                        }
                    }
                }

                Rectangle {
                    width: 130; height: 36; radius: 8; color: "#f43f5e"
                    Text { anchors.centerIn: parent; text: "Sim, Esvaziar"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            modalRoot.confirmed()
                            modalRoot.visible = false
                        }
                    }
                }
            }
        }
    }
}
