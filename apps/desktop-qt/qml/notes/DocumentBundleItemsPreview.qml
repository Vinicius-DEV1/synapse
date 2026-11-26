pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Flow {
    id: previewRoot
    property var items: []
    property bool expanded: false
    property bool itemsInvalid: false
    signal removeRequested(string fileId, string itemName)
    signal previewRequested(string fileId, string fileName)

    Layout.fillWidth: true
    spacing: 6
    visible: expanded && items.length > 0 && !itemsInvalid

    Repeater {
        model: previewRoot.items
        delegate: Rectangle {
            id: itemDelegate
            required property var modelData
            required property int index
            height: 28
            width: itemRow.implicitWidth + 16
            radius: 6
            color: itemMouse.containsMouse ? "#268b5cf6" : "#0f0e17"
            border.color: itemMouse.containsMouse ? "#4d8b5cf6" : "#1affffff"
            border.width: 1

            RowLayout {
                id: itemRow
                anchors.centerIn: parent
                spacing: 6
                AppIcon {
                    name: "file-text"
                    color: "#a78bfa"
                    Layout.preferredWidth: 12
                    Layout.preferredHeight: 12
                }
                Text {
                    Layout.maximumWidth: 220
                    text: itemDelegate.modelData.name || itemDelegate.modelData.title || qsTr("Documento")
                    color: "#e2e8f0"
                    font.pixelSize: 11
                    font.weight: Font.Medium
                    elide: Text.ElideRight
                }
                ToolButton {
                    id: removeItemButton
                    Layout.preferredWidth: 16
                    Layout.preferredHeight: 16
                    Accessible.name: qsTr("Gerenciar remoção de %1").arg(itemDelegate.modelData.name || qsTr("Documento"))
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Opções de remoção")
                    onClicked: {
                        var id = String(itemDelegate.modelData.fileId || itemDelegate.modelData.id || "")
                        previewRoot.removeRequested(
                            id, String(itemDelegate.modelData.name || itemDelegate.modelData.title || qsTr("Documento")))
                    }
                    background: Rectangle { radius: 4; color: removeItemButton.hovered ? "#22ef4444" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#a1a1aa"; width: 9; height: 9 }
                }
            }

            MouseArea {
                id: itemMouse
                anchors.fill: parent
                z: -1
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    var fileId = String(itemDelegate.modelData.fileId || itemDelegate.modelData.id || "")
                    if (fileId) previewRoot.previewRequested(
                        fileId, String(itemDelegate.modelData.name || itemDelegate.modelData.title || qsTr("Documento")))
                }
            }
        }
    }
}
