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
    property int selectedIndex: 0
    readonly property var filteredItems: PickerOperations.filteredItems(items, searchFilter)

    signal itemSelected(var item, string mode)
    signal selectedIndexRequested(int index)

    ColumnLayout {
        width: existingItemsRoot.availableWidth
        spacing: 4
        Text {
            objectName: "notesMediaWidgetEmptyState"
            visible: existingItemsRoot.filteredItems.length === 0
            Layout.fillWidth: true
            Layout.preferredHeight: 72
            text: qsTr("Nenhum resultado encontrado.")
            color: "#a7a9be"
            font.pixelSize: 12
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
        Repeater {
            model: existingItemsRoot.filteredItems
            delegate: Button {
                id: itemButton
                required property var modelData
                required property int index
                objectName: "notesMediaWidgetItem_" + String(modelData.id || "")
                Layout.fillWidth: true
                Layout.preferredHeight: existingItemsRoot.itemMode === "file-select" ? 60 : 56
                implicitHeight: existingItemsRoot.itemMode === "file-select" ? 60 : 56
                onHoveredChanged: if (hovered) existingItemsRoot.selectedIndexRequested(index)
                onClicked: existingItemsRoot.itemSelected(itemButton.modelData, existingItemsRoot.itemMode)
                background: Rectangle {
                    radius: 8
                    color: existingItemsRoot.selectedIndex === itemButton.index
                        ? "#1affffff" : itemButton.hovered ? "#0dffffff" : "transparent"
                }
                contentItem: RowLayout {
                    spacing: 12
                    Rectangle {
                        Layout.preferredWidth: 40
                        Layout.preferredHeight: 40
                        radius: 8
                        color: "#0f0e17"
                        border.color: "#14ffffff"
                        clip: true
                        Image {
                            id: coverImage
                            objectName: "notesMediaWidgetCover_" + String(itemButton.modelData.id || "")
                            anchors.fill: parent
                            visible: existingItemsRoot.itemMode !== "file-select" &&
                                source.toString().length > 0 && status !== Image.Error
                            source: String(itemButton.modelData.cover_image || itemButton.modelData.thumbnail_url || "")
                            fillMode: Image.PreserveAspectCrop
                            asynchronous: true
                            cache: true
                            mipmap: true
                        }
                        AppIcon {
                            anchors.centerIn: parent
                            name: existingItemsRoot.iconNameFor(itemButton.modelData)
                            color: existingItemsRoot.iconColorFor(itemButton.modelData)
                            width: 20
                            height: 20
                            visible: existingItemsRoot.itemMode === "file-select" ||
                                !coverImage.visible || coverImage.status !== Image.Ready
                        }
                    }
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        Text {
                            Layout.fillWidth: true
                            text: itemButton.modelData.name || itemButton.modelData.title || ""
                            color: "#fffffe"
                            font.pixelSize: existingItemsRoot.itemMode === "file-select" ? 12 : 14
                            font.weight: Font.Medium
                            elide: Text.ElideRight
                        }
                        Text {
                            objectName: "notesMediaWidgetItemSubtitle_" + String(itemButton.modelData.id || "")
                            visible: existingItemsRoot.itemMode === "file-select"
                                || existingItemsRoot.itemMode === "video"
                                || existingItemsRoot.itemMode === "livro"
                            Layout.fillWidth: true
                            text: existingItemsRoot.itemMode === "file-select"
                                ? qsTr("%1 MB").arg((Number(itemButton.modelData.file_size || 0) / 1024 / 1024).toFixed(2))
                                : existingItemsRoot.itemMode === "livro"
                                    ? String(itemButton.modelData.author || "")
                                    : existingItemsRoot.videoDurationText(itemButton.modelData.duration)
                            color: "#a7a9be"
                            font.pixelSize: existingItemsRoot.itemMode === "file-select" ? 11 : 12
                            elide: Text.ElideRight
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

    function videoDurationText(duration) {
        var seconds = Math.max(0, Math.floor(Number(duration) || 0))
        if (seconds === 0) return ""
        return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0")
    }
}
