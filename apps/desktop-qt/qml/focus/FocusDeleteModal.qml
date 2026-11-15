import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: deleteModalRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 98

    property string title: "Excluir Item"
    property string description: "Tem certeza de que deseja excluir este item? Esta ação não pode ser desfeita."

    signal confirmed()
    signal closed()

    MouseArea {
        anchors.fill: parent
        onClicked: deleteModalRoot.closed()
    }

    Rectangle {
        width: Math.min(420, parent.width - 40)
        height: Math.min(240, parent.height - 40)
        radius: 20
        color: "#161524"
        border.color: "#40ef4444"
        border.width: 1
        anchors.centerIn: parent

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    width: 36
                    height: 36
                    radius: 18
                    color: "#26ef4444"
                    Text {
                        anchors.centerIn: parent
                        text: "🗑"
                        font.pixelSize: 18
                    }
                }

                Text {
                    text: deleteModalRoot.title
                    color: "#fffffe"
                    font.pixelSize: 17
                    font.bold: true
                }
            }

            Text {
                Layout.fillWidth: true
                text: deleteModalRoot.description
                color: "#a7a9be"
                font.pixelSize: 13
                wrapMode: Text.WordWrap
            }

            Item { Layout.fillHeight: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    Layout.fillWidth: true
                    height: 40
                    flat: true
                    background: Rectangle {
                        color: "#211f30"
                        radius: 8
                        border.color: "#33ffffff"
                        border.width: 1
                    }
                    contentItem: Text {
                        text: "Cancelar"
                        color: "#a7a9be"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: deleteModalRoot.closed()
                }

                Button {
                    Layout.fillWidth: true
                    height: 40
                    flat: true
                    background: Rectangle {
                        color: "#ef4444"
                        radius: 8
                    }
                    contentItem: Text {
                        text: "Excluir"
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: {
                        deleteModalRoot.confirmed()
                        deleteModalRoot.closed()
                    }
                }
            }
        }
    }
}
