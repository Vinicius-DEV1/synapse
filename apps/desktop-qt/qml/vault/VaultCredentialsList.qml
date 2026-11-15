pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

ListView {
    id: vaultListView
    Layout.fillWidth: true
    Layout.fillHeight: true
    clip: true
    spacing: 8

    property var items: []
    property var revealedPasswords: ({})
    property string copiedId: ""
    property var selectedItem: null

    signal toggleRevealRequested(string itemId)
    signal copyPasswordRequested(string password, string itemId)
    signal deleteRequested(string itemId)
    signal editRequested(var item)
    signal itemSelected(var item)

    ScrollBar.vertical: ScrollBar {
        policy: ScrollBar.AsNeeded
        active: vaultListView.moving || vaultListView.flicking
    }

    model: items

    delegate: Rectangle {
        id: vaultCardDelegate
        required property var modelData
        required property int index

        readonly property bool isSelected: vaultListView.selectedItem && (vaultListView.selectedItem.id === vaultCardDelegate.modelData.id)
        readonly property bool isGoogle: vaultCardDelegate.modelData.login_type === "google"

        width: vaultListView.width
        height: 72
        radius: 12
        color: isSelected ? "#281b38" : (vaultCardMouse.containsMouse ? "#211f30" : "#16161e")
        border.color: isSelected ? "#7c3aed" : (vaultCardMouse.containsMouse ? "#4f46e5" : "#2e2e38")
        border.width: 1

        Behavior on color { ColorAnimation { duration: 150 } }
        Behavior on border.color { ColorAnimation { duration: 150 } }

        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 14
            anchors.rightMargin: 14
            spacing: 12

            // Icon box
            Rectangle {
                Layout.preferredWidth: 38
                Layout.preferredHeight: 38
                radius: 10
                color: vaultCardDelegate.isGoogle ? "#1f1f2e" : "#281b38"
                border.color: vaultCardDelegate.isGoogle ? "#3a3a4c" : "#7c3aed"
                border.width: 1

                Item {
                    anchors.fill: parent
                    GoogleGIcon {
                        anchors.centerIn: parent
                        visible: vaultCardDelegate.isGoogle
                        size: 20
                    }
                    AppIcon {
                        anchors.centerIn: parent
                        visible: !vaultCardDelegate.isGoogle
                        name: "key"
                        color: "#a78bfa"
                        Layout.preferredWidth: 18
                        Layout.preferredHeight: 18
                    }
                }
            }

            // Info column
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                RowLayout {
                    spacing: 6
                    Text {
                        text: vaultCardDelegate.modelData.label || "Sem título"
                        color: "#fffffe"
                        font.pixelSize: 13
                        font.weight: Font.DemiBold
                        elide: Text.ElideRight
                    }

                    Rectangle {
                        visible: vaultCardDelegate.isGoogle
                        Layout.preferredHeight: 16
                        Layout.preferredWidth: 36
                        radius: 4
                        color: "#1e1438"
                        Text {
                            anchors.centerIn: parent
                            text: "SSO"
                            color: "#a78bfa"
                            font.pixelSize: 9
                            font.weight: Font.Bold
                        }
                    }
                }

                Text {
                    Layout.fillWidth: true
                    text: (vaultCardDelegate.modelData.username || vaultCardDelegate.modelData.email || "Sem usuário") + (vaultCardDelegate.modelData.url ? " • " + vaultCardDelegate.modelData.url : "")
                    color: "#a7a9be"
                    font.pixelSize: 11
                    elide: Text.ElideRight
                }
            }

            // Fast Copy / Reveal / Actions
            RowLayout {
                spacing: 6

                // Copy Password Button
                Rectangle {
                    visible: !vaultCardDelegate.isGoogle && vaultCardDelegate.modelData.password
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 28
                    radius: 6
                    color: vaultListView.copiedId === vaultCardDelegate.modelData.id ? "#14532d" : (copyMouse.containsMouse ? "#2e2e38" : "#1f1f2e")

                    AppIcon {
                        anchors.centerIn: parent
                        name: vaultListView.copiedId === vaultCardDelegate.modelData.id ? "check" : "copy"
                        color: vaultListView.copiedId === vaultCardDelegate.modelData.id ? "#4ade80" : "#a7a9be"
                        Layout.preferredWidth: 14
                        Layout.preferredHeight: 14
                    }

                    MouseArea {
                        id: copyMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: vaultListView.copyPasswordRequested(vaultCardDelegate.modelData.password || "", vaultCardDelegate.modelData.id)
                    }
                }

                // Delete Button
                Rectangle {
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 28
                    radius: 6
                    color: delMouse.containsMouse ? "#3b1e28" : "transparent"

                    AppIcon {
                        anchors.centerIn: parent
                        name: "trash"
                        color: delMouse.containsMouse ? "#ef4444" : "#6b7280"
                        Layout.preferredWidth: 14
                        Layout.preferredHeight: 14
                    }

                    MouseArea {
                        id: delMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: vaultListView.deleteRequested(vaultCardDelegate.modelData.id)
                    }
                }
            }
        }

        MouseArea {
            id: vaultCardMouse
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            z: -1
            onClicked: vaultListView.itemSelected(vaultCardDelegate.modelData)
        }
    }

    Text {
        anchors.centerIn: parent
        visible: !vaultListView.items || vaultListView.items.length === 0
        text: "Nenhuma credencial encontrada no cofre."
        color: "#6b7280"
        font.pixelSize: 13
    }
}
