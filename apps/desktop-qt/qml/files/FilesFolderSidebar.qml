import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: sidebar
    color: "#990e0d15"
    border.color: theme.borderSubtle

    property var folders: []
    property var files: []
    property var folderRows: []
    property var expandedIds: []
    property int driveCount: 0
    property string activeSection: "folders"
    property string selectedFolderId: ""

    signal sectionSelected(string section)
    signal folderSelected(string folderId)
    signal newFolderRequested(string parentId)
    signal itemsDroppedOnFolder(var items, string targetFolderId)

    function isExpanded(folderId) {
        return expandedIds.indexOf(folderId) !== -1
    }

    function toggleExpanded(folderId) {
        var next = expandedIds.slice()
        var index = next.indexOf(folderId)
        if (index === -1) next.push(folderId)
        else next.splice(index, 1)
        expandedIds = next
        rebuildFolderRows()
    }

    function rebuildFolderRows() {
        var rows = []
        var visited = {}
        function appendChildren(parentId, depth) {
            if (depth > 32) return
            for (var i = 0; i < folders.length; i++) {
                var folder = folders[i]
                var actualParent = folder.parent_id === null || folder.parent_id === undefined ? "" : String(folder.parent_id)
                if (actualParent !== parentId || visited[folder.id]) continue
                visited[folder.id] = true
                var hasChildren = folders.some(function(candidate) {
                    return String(candidate.parent_id || "") === String(folder.id)
                })
                rows.push({ id: folder.id, name: folder.name, color: folder.color, depth: depth, hasChildren: hasChildren })
                if (isExpanded(folder.id)) appendChildren(String(folder.id), depth + 1)
            }
        }
        appendChildren("", 0)
        folderRows = rows
    }

    onFoldersChanged: rebuildFolderRows()
    Component.onCompleted: rebuildFolderRows()

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8

        Label {
            text: "Acesso rápido"
            color: theme.textMuted
            font.pixelSize: 10
            font.bold: true
            font.letterSpacing: 0.7
            Layout.leftMargin: 8
            Layout.topMargin: 3
        }

        Repeater {
            model: [
                { id: "folders", label: "Início (Raiz)", icon: "home" },
                { id: "all", label: "Todos os arquivos", icon: "files" },
                { id: "recent", label: "Recentes", icon: "clock" },
                { id: "drive", label: "Google Drive", icon: "cloud" }
            ]
            delegate: Rectangle {
                required property var modelData
                required property int index
                Layout.fillWidth: true
                height: 32
                radius: 7
                color: rootItemDrop.containsDrag
                       ? "#2a8b5cf6"
                       : (sidebar.activeSection === modelData.id && (modelData.id !== "folders" || !sidebar.selectedFolderId) ? theme.activePillBg : "transparent")
                border.color: rootItemDrop.containsDrag ? theme.borderBrand : "transparent"

                DropArea {
                    id: rootItemDrop
                    anchors.fill: parent
                    enabled: modelData.id === "folders"
                    keys: ["synapse-file-move"]
                    onDropped: function(drop) {
                        if (drop.source && drop.source.dragItemsPayload) {
                            sidebar.itemsDroppedOnFolder(drop.source.dragItemsPayload, "")
                        }
                    }
                }

                RowLayout {
                    z: 1
                    anchors.fill: parent
                    anchors.leftMargin: 9
                    anchors.rightMargin: 8
                    spacing: 9
                    AppIcon {
                        width: 15
                        height: 15
                        name: modelData.icon
                        color: modelData.id === "drive" ? theme.success : theme.brand400
                    }
                    Text {
                        Layout.fillWidth: true
                        text: modelData.label
                        color: sidebar.activeSection === modelData.id ? theme.brand300 : theme.textSubtext
                        font.pixelSize: 11
                        elide: Text.ElideRight
                    }
                    Text {
                        visible: modelData.id === "all" || modelData.id === "drive"
                        text: modelData.id === "drive"
                              ? String(sidebar.driveCount)
                              : String(sidebar.files.length)
                        color: theme.textMuted
                        font.pixelSize: 9
                    }
                }

                MouseArea {
                    anchors.fill: parent
                    onClicked: sidebar.sectionSelected(modelData.id)
                }
            }
        }

        Rectangle { Layout.fillWidth: true; height: 1; color: theme.borderSubtle; Layout.topMargin: 3; Layout.bottomMargin: 3 }

        RowLayout {
            Layout.fillWidth: true
            Label {
                Layout.fillWidth: true
                text: "Pastas"
                color: theme.textMuted
                font.pixelSize: 10
                font.bold: true
                font.letterSpacing: 0.7
                leftPadding: 8
            }
            ToolButton {
                text: "+"
                implicitWidth: 26
                implicitHeight: 25
                onClicked: sidebar.newFolderRequested(sidebar.selectedFolderId)
                ToolTip.visible: hovered
                ToolTip.text: "Nova pasta"
                background: Rectangle { color: parent.hovered ? theme.bgHover : "transparent"; radius: 6 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 18; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }

        ListView {
            id: folderList
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            model: sidebar.folderRows
            spacing: 1
            delegate: Rectangle {
                required property var modelData
                width: folderList.width
                height: 30
                radius: 6
                color: folderRowDrop.containsDrag
                       ? "#2a8b5cf6"
                       : (sidebar.activeSection === "folders" && sidebar.selectedFolderId === modelData.id ? theme.activePillBg : rowMouse.containsMouse ? theme.bgHover : "transparent")
                border.color: folderRowDrop.containsDrag ? theme.borderBrand : "transparent"

                DropArea {
                    id: folderRowDrop
                    anchors.fill: parent
                    keys: ["synapse-file-move"]
                    onDropped: function(drop) {
                        if (drop.source && drop.source.dragItemsPayload) {
                            sidebar.itemsDroppedOnFolder(drop.source.dragItemsPayload, String(modelData.id))
                        }
                    }
                }

                RowLayout {
                    z: 1
                    anchors.fill: parent
                    anchors.leftMargin: 5 + modelData.depth * 12
                    anchors.rightMargin: 5
                    spacing: 3
                    ToolButton {
                        visible: modelData.hasChildren
                        implicitWidth: 20
                        implicitHeight: 22
                        text: sidebar.isExpanded(modelData.id) ? "⌄" : "›"
                        onClicked: sidebar.toggleExpanded(modelData.id)
                        background: Rectangle { color: parent.hovered ? theme.bgHover : "transparent"; radius: 4 }
                        contentItem: Text { text: parent.text; color: theme.textMuted; font.pixelSize: 15; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    }
                    Item { visible: !modelData.hasChildren; implicitWidth: 20; implicitHeight: 22 }
                    AppIcon { width: 14; height: 14; name: "folder"; color: modelData.color || theme.brand400 }
                    Text {
                        Layout.fillWidth: true
                        text: modelData.name
                        color: sidebar.activeSection === "folders" && sidebar.selectedFolderId === modelData.id ? theme.brand300 : theme.textSubtext
                        font.pixelSize: 10
                        elide: Text.ElideRight
                    }
                }
                MouseArea {
                    id: rowMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    onClicked: sidebar.folderSelected(String(modelData.id))
                }
            }
            footer: Label {
                width: folderList.width
                height: visible ? 52 : 0
                visible: sidebar.folders.length === 0
                text: "As pastas criadas aparecem aqui."
                color: theme.textMuted
                font.pixelSize: 10
                wrapMode: Text.Wrap
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }

        Rectangle {
            Layout.fillWidth: true
            height: 40
            radius: 8
            color: theme.bgDarkSurface
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 9
                anchors.rightMargin: 9
                AppIcon { width: 14; height: 14; name: "hard-drive"; color: theme.textMuted }
                Text { Layout.fillWidth: true; text: "Arquivos locais"; color: theme.textMuted; font.pixelSize: 10 }
                Text { text: String(sidebar.files.length); color: theme.textSubtext; font.pixelSize: 10; font.family: theme.fontMono }
            }
        }
    }
}
