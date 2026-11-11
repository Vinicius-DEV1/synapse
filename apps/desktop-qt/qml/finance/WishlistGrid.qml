import QtQuick 2.15
import QtQuick.Layouts 1.15

ListView {
    id: wishListView
    clip: true
    spacing: 8

    property var wishlistItems: []
    signal acquiredRequested(var item)
    signal deleteRequested(string itemId)

    model: wishlistItems

    delegate: Rectangle {
        width: wishListView.width
        height: 64
        radius: 10
        color: "#1a1924"
        border.color: wishItemMouse.containsMouse ? "#4d8b5cf6" : "#0fffffff"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.margins: 16
            spacing: 16

            Rectangle {
                width: 10; height: 10; radius: 5
                color: modelData.priority === "high" ? "#f43f5e" : (modelData.priority === "medium" ? "#f59e0b" : "#10b981")
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 3
                Text {
                    text: modelData.title
                    color: "#fffffe"
                    font.pixelSize: 14
                    font.bold: true
                }
                Text {
                    text: (modelData.category || "Desejo") + (modelData.link ? " • Possui link externo" : "")
                    color: "#a7a9be"
                    font.pixelSize: 12
                }
            }

            Text {
                text: "R$ " + Number(modelData.price || 0).toFixed(2)
                color: "#c4b5fd"
                font.pixelSize: 16
                font.bold: true
            }

            Rectangle {
                width: 82; height: 30; radius: 6
                color: "#1a10b981"
                border.color: "#3310b981"

                Text {
                    anchors.centerIn: parent
                    text: "✓ Adquirido"
                    color: "#34d399"
                    font.pixelSize: 11
                    font.bold: true
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: wishListView.acquiredRequested(modelData)
                }
            }

            Rectangle {
                width: 76; height: 30; radius: 6
                color: "#1af43f5e"
                border.color: "#33f43f5e"

                Text {
                    anchors.centerIn: parent
                    text: "Remover"
                    color: "#fb7185"
                    font.pixelSize: 11
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: wishListView.deleteRequested(modelData.id)
                }
            }
        }

        MouseArea {
            id: wishItemMouse
            anchors.fill: parent
            hoverEnabled: true
            z: -1
        }
    }

    Text {
        anchors.centerIn: parent
        visible: wishListView.wishlistItems.length === 0
        text: "Nenhum item na sua Wishlist ainda."
        color: "#64748b"
        font.pixelSize: 15
    }
}
