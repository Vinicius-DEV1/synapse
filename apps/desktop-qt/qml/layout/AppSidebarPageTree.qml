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

    signal pageSelected(string pageId)
    signal openInNewTabRequested(string pageId)
    signal createRootRequested()
    signal createSubRequested(string parentId)
    signal togglePinRequested(string pageId)
    signal toggleCollapseRequested(string pageId)
    signal searchChanged(string query)
    signal movePageRequested(string pageId)
    signal renamePageRequested(string pageId)
    signal deletePageRequested(string pageId)
    signal movePageInTree(string sourceId, string targetParentId)

    Theme { id: theme }

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

        // Search Pages Input
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 32
            radius: 8
            color: "#0dffffff"
            border.color: searchInput.activeFocus ? theme.borderBrand : theme.borderSubtle
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 10
                anchors.rightMargin: 10
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "search"
                    color: theme.textSubtext
                }

                TextInput {
                    id: searchInput
                    Layout.fillWidth: true
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    selectByMouse: true
                    onTextChanged: pageTreeRoot.searchChanged(text)

                    Text {
                        text: qsTr("Buscar páginas...")
                        color: theme.textMuted
                        font.pixelSize: 12
                        font.family: theme.fontFamily
                        visible: !searchInput.text && !searchInput.activeFocus
                    }
                }

                Rectangle {
                    Layout.preferredWidth: 28
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
        }

        // New Page Button
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 32
            radius: 8
            color: createPageMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 10
                anchors.rightMargin: 10
                spacing: 8
                Text {
                    text: "+"
                    color: theme.brand400
                    font.pixelSize: 16
                    font.bold: true
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

        // Scrollable tree with Pinned and Hierarchical Pages
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            contentWidth: width

            ColumnLayout {
                width: parent.width
                spacing: 8

                // Pinned Section
                AppSidebarPinnedSection {
                    pinnedPages: pageTreeRoot.pinnedPages
                    selectedPageId: pageTreeRoot.selectedPageId
                    onPageSelected: function(pageId) { pageTreeRoot.pageSelected(pageId) }
                    onTogglePinRequested: function(pageId) { pageTreeRoot.togglePinRequested(pageId) }
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
                        model: pageTreeRoot.pageTree

                        delegate: AppSidebarPageItem {
                            id: pageItemDelegate
                            required property var modelData

                            visible: pageTreeRoot.isNodeVisible(pageItemDelegate.modelData)
                            pageData: pageItemDelegate.modelData
                            isSelected: pageTreeRoot.selectedPageId === pageItemDelegate.modelData.id
                            isCollapsed: pageTreeRoot.collapsedNodeMap[pageItemDelegate.modelData.id] === true
                            depth: pageItemDelegate.modelData.depth || 0
                            hasChildren: pageItemDelegate.modelData.has_children === true

                            onPageSelected: function(pageId) { pageTreeRoot.pageSelected(pageId) }
                            onToggleCollapseRequested: function(pageId) { pageTreeRoot.toggleCollapseRequested(pageId) }
                            onCreateSubRequested: function(parentId) { pageTreeRoot.createSubRequested(parentId) }
                            onTogglePinRequested: function(pageId) { pageTreeRoot.togglePinRequested(pageId) }
                            onMoveRequested: function(pageId) { pageTreeRoot.movePageRequested(pageId) }
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
                                pageTreeContextMenu.y = Math.max(8, Math.min(pt.y, pageTreeRoot.height - 250))
                                pageTreeContextMenu.open()
                            }
                        }
                    }
                }
            }
        }
    }

    AppSidebarPageContextMenu {
        id: pageTreeContextMenu
        onOpenInNewTabRequested: function(pageId) { pageTreeRoot.openInNewTabRequested(pageId) }
        onCreateSubRequested: function(parentId) { pageTreeRoot.createSubRequested(parentId) }
        onTogglePinRequested: function(pageId) { pageTreeRoot.togglePinRequested(pageId) }
        onMoveRequested: function(pageId) { pageTreeRoot.movePageRequested(pageId) }
        onRenameRequested: function(pageId) { pageTreeRoot.renamePageRequested(pageId) }
        onDeleteRequested: function(pageId) { pageTreeRoot.deletePageRequested(pageId) }
    }
}
