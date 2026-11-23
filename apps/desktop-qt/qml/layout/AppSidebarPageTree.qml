pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: pageTreeRoot
    Layout.fillWidth: true
    Layout.fillHeight: true
    color: "transparent"
    border.width: 0

    property var pinnedPages: []
    property var pageTree: []
    property var collapsedNodeMap: ({})
    property string selectedPageId: ""
    property int pinnedLimit: 10
    property int rootLimit: 15

    signal pageSelected(string pageId)
    signal openInNewTabRequested(string pageId)
    signal createRootRequested()
    signal importRootRequested()
    signal createSubRequested(string parentId)
    signal importSubRequested(string parentId)
    signal exportPageRequested(string pageId)
    signal sharePageRequested(string pageId)
    signal togglePinRequested(string pageId)
    signal toggleCollapseRequested(string pageId)
    signal openCommandPaletteRequested()
    signal searchChanged(string query)
    signal movePageRequested(string pageId)
    signal renamePageRequested(string pageId)
    signal changeIconRequested(string pageId, string emoji)
    signal deletePageRequested(string pageId)
    signal movePageInTree(string sourceId, string targetParentId)

    Theme { id: theme }

    readonly property var visibleTreeItems: {
        if (!pageTree) return []
        var result = []
        var rootsSeen = 0
        for (var i = 0; i < pageTree.length; ++i) {
            var p = pageTree[i]
            if (!p) continue
            if (!p.depth || p.depth === 0) {
                rootsSeen++
            }
            if (rootsSeen > rootLimit) break
            if (isNodeVisible(p)) {
                result.push(p)
            }
        }
        return result
    }

    readonly property int totalRootCount: {
        if (!pageTree) return 0
        var c = 0
        for (var i = 0; i < pageTree.length; ++i) {
            if (pageTree[i] && (!pageTree[i].depth || pageTree[i].depth === 0)) c++
        }
        return c
    }

    function isNodeVisible(page) {
        if (!page) return false
        if (!page.depth || page.depth === 0) return true
        var pid = page.parent_id
        while (pid && pid !== "" && pid !== "null") {
            if (pageTreeRoot.collapsedNodeMap[pid]) return false
            var found = false
            for (var i = 0; i < pageTreeRoot.pageTree.length; ++i) {
                if (pageTreeRoot.pageTree[i].id === pid) {
                    pid = pageTreeRoot.pageTree[i].parent_id
                    found = true
                    break
                }
            }
            if (!found) break
        }
        return true
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 8

        // Search Pages Button (opens GlobalSearchModal / CommandPalette)
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 32
            radius: 8
            color: searchBtnMouse.containsMouse ? theme.bgHover : "#0dffffff"
            border.color: searchBtnMouse.containsMouse ? theme.borderBrand : theme.borderSubtle
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 10
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "search"
                    color: theme.textSubtext
                }

                Text {
                    Layout.fillWidth: true
                    text: qsTr("Buscar páginas...")
                    color: theme.textMuted
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    elide: Text.ElideRight
                }

                Rectangle {
                    Layout.preferredWidth: 36
                    Layout.preferredHeight: 18
                    radius: 4
                    color: "#33000000"
                    Text {
                        anchors.centerIn: parent
                        text: "Ctrl+K"
                        color: theme.textMuted
                        font.pixelSize: 8
                        font.family: theme.fontMono
                    }
                }
            }

            MouseArea {
                id: searchBtnMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: pageTreeRoot.openCommandPaletteRequested()
            }
        }

        // New Page + Import Page Buttons
        RowLayout {
            Layout.fillWidth: true
            spacing: 4

            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 32
                radius: 8
                color: createPageMouse.containsMouse ? theme.bgHover : "transparent"

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 10
                    anchors.rightMargin: 8
                    spacing: 8
                    AppIcon {
                        Layout.preferredWidth: 14
                        Layout.preferredHeight: 14
                        name: "plus"
                        color: theme.brand400
                    }
                    Text {
                        text: qsTr("Nova página")
                        color: theme.textSubtext
                        font.pixelSize: 12
                        font.family: theme.fontFamily
                        Layout.fillWidth: true
                    }
                }

                MouseArea {
                    id: createPageMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: pageTreeRoot.createRootRequested()
                }
            }

            Rectangle {
                Layout.preferredWidth: 32
                Layout.preferredHeight: 32
                radius: 8
                color: importRootMouse.containsMouse ? theme.bgHover : "transparent"
                ToolTip.visible: importRootMouse.containsMouse
                ToolTip.text: qsTr("Importar página (.md, .html, .txt)")
                ToolTip.delay: 300

                AppIcon {
                    anchors.centerIn: parent
                    width: 14
                    height: 14
                    name: "upload"
                    color: importRootMouse.containsMouse ? theme.brand400 : theme.textSubtext
                }

                MouseArea {
                    id: importRootMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: pageTreeRoot.importRootRequested()
                }
            }
        }

        // Scrollable tree with Pinned and Hierarchical Pages
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            contentWidth: width

            ColumnLayout {
                width: parent.width
                spacing: 8

                // Pinned Section (Paginated +10)
                AppSidebarPinnedSection {
                    pinnedPages: pageTreeRoot.pinnedPages ? pageTreeRoot.pinnedPages.slice(0, pageTreeRoot.pinnedLimit) : []
                    selectedPageId: pageTreeRoot.selectedPageId
                    onPageSelected: function(pageId) { pageTreeRoot.pageSelected(pageId) }
                    onTogglePinRequested: function(pageId) { pageTreeRoot.togglePinRequested(pageId) }
                }

                Rectangle {
                    visible: pageTreeRoot.pinnedPages && pageTreeRoot.pinnedPages.length > pageTreeRoot.pinnedLimit
                    Layout.fillWidth: true
                    Layout.preferredHeight: 24
                    radius: 6
                    color: showMorePinMouse.containsMouse ? theme.bgHover : "transparent"
                    Text {
                        anchors.centerIn: parent
                        text: qsTr("Mostrar mais (+10)")
                        color: theme.brand400
                        font.pixelSize: 11
                    }
                    MouseArea {
                        id: showMorePinMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: pageTreeRoot.pinnedLimit += 10
                    }
                }

                // Divider
                Rectangle {
                    visible: pageTreeRoot.pinnedPages && pageTreeRoot.pinnedPages.length > 0
                    Layout.fillWidth: true
                    Layout.preferredHeight: 1
                    color: theme.borderSubtle
                }

                // Root Drop Area for moving pages to root level
                DropArea {
                    id: rootDropArea
                    Layout.fillWidth: true
                    Layout.preferredHeight: 8
                    keys: ["pageId"]
                    onDropped: function(drop) {
                        if (drop.hasText) {
                            pageTreeRoot.movePageInTree(drop.text, "")
                        }
                    }
                }

                // Hierarchical Pages Tree
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    Text {
                        text: qsTr("PÁGINAS")
                        color: theme.textMuted
                        font.pixelSize: 11
                        font.bold: true
                        font.family: theme.fontFamily
                        font.letterSpacing: 1.1
                    }

                    Repeater {
                        model: pageTreeRoot.visibleTreeItems

                        delegate: AppSidebarPageItem {
                            id: pageItemDelegate
                            required property var modelData

                            pageData: pageItemDelegate.modelData
                            isSelected: pageTreeRoot.selectedPageId === pageItemDelegate.modelData.id
                            isCollapsed: pageTreeRoot.collapsedNodeMap[pageItemDelegate.modelData.id] === true
                            depth: pageItemDelegate.modelData.depth || 0
                            hasChildren: pageItemDelegate.modelData.has_children === true

                            onPageSelected: function(pageId) { pageTreeRoot.pageSelected(pageId) }
                            onOpenInNewTabRequested: function(pageId) { pageTreeRoot.openInNewTabRequested(pageId) }
                            onToggleCollapseRequested: function(pageId) { pageTreeRoot.toggleCollapseRequested(pageId) }
                            onCreateSubRequested: function(parentId) { pageTreeRoot.createSubRequested(parentId) }
                            onTogglePinRequested: function(pageId) { pageTreeRoot.togglePinRequested(pageId) }
                            onMoveRequested: function(pageId) { pageTreeRoot.movePageRequested(pageId) }
                            onRenameRequested: function(pageId) { pageTreeRoot.renamePageRequested(pageId) }
                            onEmojiClickRequested: function(pageId, ix, iy) {
                                sidebarEmojiPopover.targetPageId = pageId
                                var pt = pageItemDelegate.mapToItem(pageTreeRoot, ix, iy)
                                sidebarEmojiPopover.x = Math.max(4, Math.min(pt.x, pageTreeRoot.width - 20))
                                sidebarEmojiPopover.y = Math.max(4, Math.min(pt.y + 4, pageTreeRoot.height - 390))
                                sidebarEmojiPopover.open()
                            }
                            onPageDropped: function(draggedId, targetParentId) {
                                pageTreeRoot.movePageInTree(draggedId, targetParentId)
                            }
                            onContextMenuRequested: function(pageId, mx, my) {
                                pageTreeContextMenu.targetPageId = pageId
                                pageTreeContextMenu.isPinned = false
                                for (var p = 0; p < pageTreeRoot.pinnedPages.length; ++p) {
                                    if (pageTreeRoot.pinnedPages[p].id === pageId) {
                                        pageTreeContextMenu.isPinned = true
                                        break
                                    }
                                }
                                var pt = pageItemDelegate.mapToItem(pageTreeRoot, mx, my)
                                pageTreeContextMenu.x = Math.max(8, Math.min(pt.x, pageTreeRoot.width - 200))
                                pageTreeContextMenu.y = Math.max(8, Math.min(pt.y, pageTreeRoot.height - 290))
                                pageTreeContextMenu.open()
                            }
                        }
                    }

                    // Root Pages Pagination (+10)
                    RowLayout {
                        Layout.fillWidth: true
                        visible: pageTreeRoot.totalRootCount > 15
                        spacing: 6

                        Rectangle {
                            visible: pageTreeRoot.totalRootCount > pageTreeRoot.rootLimit
                            Layout.fillWidth: true
                            Layout.preferredHeight: 26
                            radius: 6
                            color: showMoreRootMouse.containsMouse ? theme.bgHover : "transparent"
                            Text {
                                anchors.centerIn: parent
                                text: qsTr("Mostrar mais (+10)")
                                color: theme.brand400
                                font.pixelSize: 11
                            }
                            MouseArea {
                                id: showMoreRootMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: pageTreeRoot.rootLimit += 10
                            }
                        }

                        Rectangle {
                            visible: pageTreeRoot.rootLimit > 15
                            Layout.preferredWidth: 72
                            Layout.preferredHeight: 26
                            radius: 6
                            color: showLessRootMouse.containsMouse ? theme.bgHover : "transparent"
                            Text {
                                anchors.centerIn: parent
                                text: qsTr("Menos")
                                color: theme.textMuted
                                font.pixelSize: 11
                            }
                            MouseArea {
                                id: showLessRootMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: pageTreeRoot.rootLimit = 15
                            }
                        }
                    }
                }
            }
        }
    }

    AppEmojiPopover {
        id: sidebarEmojiPopover
        property string targetPageId: ""
        onEmojiSelected: function(emoji) {
            if (targetPageId.length > 0) {
                pageTreeRoot.changeIconRequested(targetPageId, emoji)
            }
        }
    }

    AppSidebarPageContextMenu {
        id: pageTreeContextMenu
        onOpenInNewTabRequested: function(pageId) { pageTreeRoot.openInNewTabRequested(pageId) }
        onCreateSubRequested: function(parentId) { pageTreeRoot.createSubRequested(parentId) }
        onImportSubRequested: function(parentId) { pageTreeRoot.importSubRequested(parentId) }
        onExportRequested: function(pageId) { pageTreeRoot.exportPageRequested(pageId) }
        onShareRequested: function(pageId) { pageTreeRoot.sharePageRequested(pageId) }
        onTogglePinRequested: function(pageId) { pageTreeRoot.togglePinRequested(pageId) }
        onMoveRequested: function(pageId) { pageTreeRoot.movePageRequested(pageId) }
        onRenameRequested: function(pageId) { pageTreeRoot.renamePageRequested(pageId) }
        onDeleteRequested: function(pageId) { pageTreeRoot.deletePageRequested(pageId) }
    }
}
