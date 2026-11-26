pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesMediaWidgetPickerOperations.js" as PickerOperations
import "../ui"

ScrollView {
    id: existingItemsRoot
    objectName: "notesMediaWidgetItems"
    clip: true

    property var items: []
    property string searchFilter: ""
    property string itemMode: "file-select"
    readonly property var filteredItems: PickerOperations.filteredItems(items, searchFilter)

    signal itemSelected(var item, string mode)

    ColumnLayout {
        width: existingItemsRoot.availableWidth
        spacing: 4
        Repeater {
            model: existingItemsRoot.filteredItems
            delegate: Button {
                id: itemButton
                required property var modelData
                Layout.fillWidth: true
                Layout.preferredHeight: existingItemsRoot.itemMode === "file-select" ? 60 : 40
                onClicked: existingItemsRoot.itemSelected(itemButton.modelData, existingItemsRoot.itemMode)
                background: Rectangle {
                    radius: 8
                    color: itemButton.hovered ? "#0dffffff" : "transparent"
                }
                contentItem: RowLayout {
                    spacing: 12
                    Rectangle {
                        Layout.preferredWidth: 40
                        Layout.preferredHeight: 40
                        radius: 8
                        color: "#0f0e17"
                        border.color: "#14ffffff"
                        AppIcon {
                            anchors.centerIn: parent
                            name: existingItemsRoot.iconNameFor(itemButton.modelData)
                            color: existingItemsRoot.iconColorFor(itemButton.modelData)
                            width: 20
                            height: 20
                        }
                    }
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        Text {
                            Layout.fillWidth: true
                            text: itemButton.modelData.name || itemButton.modelData.title || ""
                            color: "#fffffe"
                            font.pixelSize: 12
                            font.weight: Font.DemiBold
                            elide: Text.ElideRight
                        }
                        Text {
                            visible: existingItemsRoot.itemMode === "file-select"
                            Layout.fillWidth: true
                            text: qsTr("%1 MB").arg((Number(itemButton.modelData.file_size || 0) / 1024 / 1024).toFixed(2))
                            color: "#a7a9be"
                            font.pixelSize: 11
                        }
                    }
                }
            }
        }
        Text {
            visible: existingItemsRoot.filteredItems.length === 0
            Layout.fillWidth: true
            Layout.fillHeight: true
            text: qsTr("Nenhum item encontrado")
            color: "#a7a9be"
            font.pixelSize: 13
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }

    function iconNameFor(item) {
        if (itemMode !== "file-select") return itemMode === "livro" ? "book-open" : "film"
        switch (item.file_type) {
        case "image": return "image"
        case "video": return "film"
        case "pdf":
        case "epub": return "file-text"
        case "slide": return "archive"
        case "code": return "code"
        default: return "file"
        }
    }

    function iconColorFor(item) {
        if (itemMode !== "file-select") return "#c4b5fd"
        switch (item.file_type) {
        case "image": return "#60a5fa"
        case "pdf": return "#f87171"
        case "epub": return "#4ade80"
        case "slide": return "#facc15"
        case "code": return "#22d3ee"
        default: return "#a7a9be"
        }
    }
}
