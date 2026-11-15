import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: wishlistDetailsRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 130

    property var item: null

    signal closeRequested()
    signal acquireRequested(var wishlistItem)
    signal deleteRequested(string itemId)

    Shortcut {
        sequence: "Escape"
        enabled: wishlistDetailsRoot.visible
        onActivated: wishlistDetailsRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: wishlistDetailsRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 520)
        height: 380
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

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
                    radius: 8
                    color: "#338b5cf6"
                    Text { anchors.centerIn: parent; text: "★"; font.pixelSize: 18; color: "#c4b5fd" }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text {
                        text: wishlistDetailsRoot.item ? (wishlistDetailsRoot.item.title || "Item Wishlist") : ""
                        color: "#fffffe"
                        font.pixelSize: 17
                        font.bold: true
                    }
                    Text {
                        text: "Prioridade: " + (wishlistDetailsRoot.item ? (wishlistDetailsRoot.item.priority || "Normal") : "")
                        color: "#94a1b2"
                        font.pixelSize: 12
                    }
                }

                Button {
                    text: "✕"
                    flat: true
                    onClicked: wishlistDetailsRoot.closeRequested()
                }
            }

            // Price & details box
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                radius: 10
                color: "#11101a"
                border.color: "#2e2b44"

                ColumnLayout {
                    anchors.centerIn: parent
                    spacing: 8

                    Text {
                        text: "Preço Estimado:"
                        color: "#94a1b2"
                        font.pixelSize: 12
                        Layout.alignment: Qt.AlignHCenter
                    }

                    Text {
                        text: "R$ " + (wishlistDetailsRoot.item ? Number(wishlistDetailsRoot.item.price || 0).toFixed(2) : "0.00")
                        color: "#10b981"
                        font.pixelSize: 24
                        font.bold: true
                        Layout.alignment: Qt.AlignHCenter
                    }

                    Text {
                        text: "Categoria: " + (wishlistDetailsRoot.item ? (wishlistDetailsRoot.item.category || "Geral") : "")
                        color: "#c4b5fd"
                        font.pixelSize: 12
                        Layout.alignment: Qt.AlignHCenter
                    }
                }
            }

            // Actions
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    text: "Excluir Item"
                    background: Rectangle { color: "#232135"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#f43f5e"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: {
                        if (wishlistDetailsRoot.item && wishlistDetailsRoot.item.id) {
                            wishlistDetailsRoot.deleteRequested(wishlistDetailsRoot.item.id)
                        }
                        wishlistDetailsRoot.closeRequested()
                    }
                }

                Item { Layout.fillWidth: true }

                Button {
                    text: "Adquirir Item"
                    background: Rectangle { color: "#10b981"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#ffffff"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: {
                        wishlistDetailsRoot.acquireRequested(wishlistDetailsRoot.item)
                        wishlistDetailsRoot.closeRequested()
                    }
                }
            }
        }
    }
}
