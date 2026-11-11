import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Item {
    id: explorer

    property var items: []
    property var selectedIds: []
    property string focusedId: ""
    property string viewMode: "grid"
    property string sortBy: "name"
    property string sortOrder: "asc"

    signal itemSelected(string itemId, bool isFolder, int modifiers)
    signal itemActivated(var item)
    signal itemActionRequested(string action, var item)
    signal sortRequested(string key)

    function selected(itemId) {
        return selectedIds.indexOf(String(itemId)) !== -1
    }

    function itemIcon(item) {
        if (item.kind === "folder") return "folder"
        if (item.file_type === "video") return "video"
        if (item.file_type === "epub") return "library"
        if (item.file_type === "pdf") return "notes"
        return "files"
    }

    function formatSize(value) {
        var size = Number(value || 0)
        if (size < 1024) return size + " B"
        if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KB"
        if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + " MB"
        return (size / (1024 * 1024 * 1024)).toFixed(1) + " GB"
    }

    function sortLabel(key, label) {
        if (sortBy !== key) return label
        return label + (sortOrder === "asc" ? " ↑" : " ↓")
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        Rectangle {
            visible: explorer.viewMode === "table"
            Layout.fillWidth: true
            height: visible ? 34 : 0
            color: "#08ffffff"
            border.color: theme.borderSubtle
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 8
                spacing: 8
                Text { text: ""; width: 20 }
                Repeater {
                    model: [
                        { key: "name", label: "Nome", width: -1 },
                        { key: "type", label: "Tipo", width: 86 },
                        { key: "size", label: "Tamanho", width: 92 },
                        { key: "updated_at", label: "Modificado", width: 96 },
                        { key: "source", label: "Origem", width: 76 }
                    ]
                    delegate: Item {
                        required property var modelData
                        Layout.fillWidth: modelData.width < 0
                        Layout.preferredWidth: modelData.width > 0 ? modelData.width : 220
                        Layout.minimumWidth: modelData.width < 0 ? 100 : modelData.width
                        height: 34
                        Text {
                            anchors.fill: parent
                            text: modelData.key === "source" ? modelData.label : explorer.sortLabel(modelData.key, modelData.label)
                            color: explorer.sortBy === modelData.key ? theme.brand300 : theme.textMuted
                            font.pixelSize: 9
                            font.bold: true
                            font.letterSpacing: 0.45
                            verticalAlignment: Text.AlignVCenter
                        }
                        MouseArea {
                            anchors.fill: parent
                            enabled: modelData.key !== "source"
                            cursorShape: enabled ? Qt.PointingHandCursor : Qt.ArrowCursor
                            onClicked: explorer.sortRequested(modelData.key)
                        }
                    }
                }
                Item { width: 24 }
            }
        }

        GridView {
            id: grid
            visible: explorer.viewMode === "grid"
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            cellWidth: Math.max(178, Math.floor(width / Math.max(1, Math.floor(width / 215))))
            cellHeight: 145
            model: explorer.items
            delegate: Rectangle {
                required property var modelData
                width: grid.cellWidth - 10
                height: grid.cellHeight - 10
                radius: 11
                color: explorer.selected(modelData.id) || explorer.focusedId === modelData.id
                       ? theme.activePillBg : theme.bgDarkSurface
                border.color: explorer.selected(modelData.id) || explorer.focusedId === modelData.id
                              ? theme.borderBrand : theme.borderCard

                MouseArea {
                    anchors.fill: parent
                    acceptedButtons: Qt.LeftButton | Qt.RightButton
                    onClicked: {
                        explorer.itemSelected(String(modelData.id), modelData.kind === "folder", mouse.modifiers)
                        if (mouse.button === Qt.RightButton) fileMenu.popup()
                    }
                    onDoubleClicked: explorer.itemActivated(modelData)
                }

                ColumnLayout {
                    z: 1
                    anchors.fill: parent
                    anchors.margins: 11
                    spacing: 6
                    RowLayout {
                        Layout.fillWidth: true
                        AppIcon { width: 18; height: 18; name: explorer.itemIcon(modelData); color: modelData.kind === "folder" ? theme.warning : theme.brand400 }
                        Text { Layout.fillWidth: true; text: modelData.name; color: theme.textDark; font.pixelSize: 10; font.bold: true; elide: Text.ElideRight }
                        AppIcon { visible: modelData.kind === "file" && Boolean(modelData.has_drive_copy || modelData.drive_file_id); width: 13; height: 13; name: "cloud"; color: theme.success }
                        ToolButton {
                            text: "⋯"
                            implicitWidth: 25
                            implicitHeight: 24
                            onClicked: fileMenu.popup()
                            background: Rectangle { color: parent.hovered ? theme.bgHover : "transparent"; radius: 6 }
                            contentItem: Text { text: parent.text; color: theme.textSubtext; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                        }
                    }
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        radius: 8
                        color: "#0affffff"
                        border.color: "#06ffffff"
                        Column {
                            anchors.centerIn: parent
                            spacing: 5
                            AppIcon { anchors.horizontalCenter: parent.horizontalCenter; width: 22; height: 22; name: explorer.itemIcon(modelData); color: modelData.kind === "folder" ? theme.warning : theme.brand400 }
                            Text { anchors.horizontalCenter: parent.horizontalCenter; text: modelData.kind === "folder" ? "PASTA" : String(modelData.file_type || "arquivo").toUpperCase(); color: theme.textMuted; font.pixelSize: 8; font.family: theme.fontMono }
                        }
                    }
                    RowLayout {
                        Layout.fillWidth: true
                        Text { Layout.fillWidth: true; text: modelData.kind === "folder" ? "Abrir pasta" : explorer.formatSize(modelData.file_size); color: theme.textSubtext; font.pixelSize: 9; elide: Text.ElideRight }
                        Text { text: String(modelData.updated_at || "").slice(0, 10); color: theme.textMuted; font.pixelSize: 8 }
                    }
                }

                FilesItemMenu {
                    id: fileMenu
                    itemData: modelData
                    onActionRequested: function(action, item) { explorer.itemActionRequested(action, item) }
                }
            }
        }

        ListView {
            id: table
            visible: explorer.viewMode === "table"
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            model: explorer.items
            delegate: Rectangle {
                required property var modelData
                width: table.width
                height: 42
                color: explorer.selected(modelData.id) || explorer.focusedId === modelData.id
                       ? theme.activePillBg : rowMouse.containsMouse ? "#08ffffff" : "transparent"
                border.color: "#05ffffff"
                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 12
                    anchors.rightMargin: 8
                    spacing: 8
                    AppIcon { width: 16; height: 16; name: explorer.itemIcon(modelData); color: modelData.kind === "folder" ? theme.warning : theme.brand400 }
                    Text { Layout.fillWidth: true; Layout.minimumWidth: 100; text: modelData.name; color: theme.textSubtext; font.pixelSize: 10; elide: Text.ElideRight }
                    Text { Layout.preferredWidth: 86; text: modelData.kind === "folder" ? "Pasta" : String(modelData.file_type || "Arquivo").toUpperCase(); color: theme.textMuted; font.pixelSize: 9; elide: Text.ElideRight }
                    Text { Layout.preferredWidth: 92; text: modelData.kind === "folder" ? "—" : explorer.formatSize(modelData.file_size); color: theme.textMuted; font.pixelSize: 9; font.family: theme.fontMono }
                    Text { Layout.preferredWidth: 96; text: String(modelData.updated_at || "").slice(0, 10); color: theme.textMuted; font.pixelSize: 9 }
                    Text { Layout.preferredWidth: 76; text: modelData.kind === "folder" ? "Local" : modelData.has_drive_copy || modelData.drive_file_id ? "Drive" : "Local"; color: modelData.has_drive_copy || modelData.drive_file_id ? theme.success : theme.textMuted; font.pixelSize: 9 }
                    ToolButton {
                        text: "⋯"
                        implicitWidth: 25
                        implicitHeight: 28
                        onClicked: rowMenu.popup()
                        background: Rectangle { color: parent.hovered ? theme.bgHover : "transparent"; radius: 6 }
                        contentItem: Text { text: parent.text; color: theme.textSubtext; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    }
                }
                MouseArea {
                    id: rowMouse
                    z: -1
                    anchors.fill: parent
                    hoverEnabled: true
                    acceptedButtons: Qt.LeftButton | Qt.RightButton
                    onClicked: {
                        explorer.itemSelected(String(modelData.id), modelData.kind === "folder", mouse.modifiers)
                        if (mouse.button === Qt.RightButton) rowMenu.popup()
                    }
                    onDoubleClicked: explorer.itemActivated(modelData)
                }
                FilesItemMenu {
                    id: rowMenu
                    itemData: modelData
                    onActionRequested: function(action, item) { explorer.itemActionRequested(action, item) }
                }
            }
        }
    }

    Column {
        anchors.centerIn: parent
        z: 3
        spacing: 9
        visible: explorer.items.length === 0
        AppIcon { anchors.horizontalCenter: parent.horizontalCenter; width: 36; height: 36; name: "folder"; color: theme.textMuted }
        Text { anchors.horizontalCenter: parent.horizontalCenter; text: "Nenhum arquivo ou pasta"; color: theme.textSubtext; font.pixelSize: 13; font.bold: true }
        Text { anchors.horizontalCenter: parent.horizontalCenter; text: "Importe arquivos para guardá-los com criptografia local."; color: theme.textMuted; font.pixelSize: 10 }
    }
}
