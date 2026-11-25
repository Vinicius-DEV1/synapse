import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../../ui"
import "subpage-grid"

// Sub-page grid mirroring apps/web-react/src/components/notes/components/SubPageGrid.tsx
ColumnLayout {
    id: subPageGrid
    Layout.fillWidth: true
    spacing: 8

    property var pages: []
    property var allPages: []
    property string actionStatus: ""
    property int pageLimit: 12
    property var expandedChildrenMap: ({})
    property string emojiTargetPageId: ""

    signal pageSelected(string pageId)
    signal openInNewTabRequested(string pageId)
    signal createRequested()
    signal reorderRequested(var orderedPageIds)
    signal moveRequested(string pageId, string newParentId)
    signal moveToRequested(string pageId)
    signal iconChanged(string pageId, string emoji)
    signal renameRequested(string pageId, string currentTitle)
    signal createSubRequested(string parentId)
    signal deleteRequested(string pageId)

    Theme { id: theme }

    function toggleExpand(pageId) {
        var copy = Object.assign({}, expandedChildrenMap)
        if (copy[pageId]) delete copy[pageId]
        else copy[pageId] = true
        expandedChildrenMap = copy
    }

    function columnWidth() {
        var cols = childPageGrid.columns
        return cols > 0 ? Math.max(0, (childPageGrid.width - childPageGrid.columnSpacing * (cols - 1)) / cols) : 0
    }

    function requestReorder(sourceId, targetId) {
        if (!sourceId || !targetId || sourceId === targetId) return
        var nextPages = pages.slice()
        var srcIdx = -1, dstIdx = -1
        for (var i = 0; i < nextPages.length; ++i) {
            if (nextPages[i].id === sourceId) srcIdx = i
            if (nextPages[i].id === targetId) dstIdx = i
        }
        if (srcIdx < 0 || dstIdx < 0) return
        var moved = nextPages.splice(srcIdx, 1)[0]
        nextPages.splice(dstIdx, 0, moved)
        var orderedIds = []
        for (var j = 0; j < nextPages.length; ++j) orderedIds.push(nextPages[j].id)
        reorderRequested(orderedIds)
    }

    // Minimalist collapsed link when page has zero subpages (matches React Web clean canvas)
    RowLayout {
        visible: subPageGrid.pages.length === 0
        Layout.fillWidth: true
        Layout.leftMargin: 78
        Rectangle {
            Layout.preferredWidth: emptyLbl.implicitWidth + 24
            Layout.preferredHeight: 28
            radius: 8
            color: emptyAddMouse.containsMouse ? theme.bgHover : "transparent"
            border.color: emptyAddMouse.containsMouse ? theme.borderBrand : theme.borderSubtle
            Row {
                anchors.centerIn: parent
                spacing: 6
                AppIcon { name: "plus"; color: emptyAddMouse.containsMouse ? theme.brand400 : theme.textMuted; width: 12; height: 12; anchors.verticalCenter: parent.verticalCenter }
                Text { id: emptyLbl; text: qsTr("Adicionar sub-página"); color: emptyAddMouse.containsMouse ? theme.brand300 : theme.textMuted; font.pixelSize: 11 }
            }
            MouseArea { id: emptyAddMouse; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: subPageGrid.createRequested() }
        }
        Item { Layout.fillWidth: true }
    }

    RowLayout {
        visible: subPageGrid.pages.length > 0
        Layout.fillWidth: true
        Text {
            text: qsTr("Sub-páginas")
            color: theme.textSubtext
            font.pixelSize: 11
            font.weight: Font.Medium
            font.capitalization: Font.AllUppercase
            font.letterSpacing: 1.1
        }
        Item { Layout.fillWidth: true }
        Text {
            visible: subPageGrid.actionStatus.length > 0
            text: subPageGrid.actionStatus
            color: theme.brand400
            font.pixelSize: 10
        }
    }

    GridLayout {
        id: childPageGrid
        visible: subPageGrid.pages.length > 0
        Layout.fillWidth: true
        columns: Math.max(1, Math.min(3, Math.floor(width / 220)))
        rowSpacing: 8
        columnSpacing: 8

        Repeater {
            model: subPageGrid.pages.slice(0, subPageGrid.pageLimit)
            delegate: SubPageItem {
                required property var modelData
                pageData: modelData
                allPages: subPageGrid.allPages
                isExpanded: Boolean(subPageGrid.expandedChildrenMap[modelData.id])
                cardWidth: subPageGrid.columnWidth()
                onPageSelected: function(id) { subPageGrid.pageSelected(id) }
                onOpenInNewTabRequested: function(id) { subPageGrid.openInNewTabRequested(id) }
                onReorderDropRequested: function(s, t) { subPageGrid.requestReorder(s, t) }
                onMoveRequested: function(id, p) { subPageGrid.moveRequested(id, p) }
                onMoveToRequested: function(id) { subPageGrid.moveToRequested(id) }
                onRenameRequested: function(id, t) { subPageGrid.renameRequested(id, t) }
                onCreateSubRequested: function(pid) { subPageGrid.createSubRequested(pid) }
                onDeleteRequested: function(pid) { subPageGrid.deleteRequested(pid) }
                onToggleExpandRequested: function(id) { subPageGrid.toggleExpand(id) }
                onIconChangeRequested: function(id, ix, iy) {
                    subPageGrid.emojiTargetPageId = id
                    subEmojiPopover.x = Math.max(0, ix)
                    subEmojiPopover.y = iy + 6
                    subEmojiPopover.open()
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredWidth: subPageGrid.columnWidth()
            Layout.preferredHeight: 48
            radius: 12
            color: createMouse.containsMouse ? "#0d8b5cf6" : "transparent"
            border.color: createMouse.containsMouse ? theme.borderBrand : theme.borderCard
            RowLayout {
                anchors.centerIn: parent
                spacing: 8
                AppIcon { name: "plus"; color: createMouse.containsMouse ? theme.brand400 : theme.textSubtext; width: 15; height: 15 }
                Text { text: qsTr("Nova Sub-página"); color: createMouse.containsMouse ? theme.brand400 : theme.textSubtext; font.pixelSize: 13; font.weight: Font.Medium }
            }
            MouseArea { id: createMouse; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: subPageGrid.createRequested() }
        }
    }

    Button {
        visible: subPageGrid.pages.length > subPageGrid.pageLimit
        Layout.alignment: Qt.AlignLeft
        Layout.preferredHeight: 28
        padding: 10
        onClicked: subPageGrid.pageLimit += 12
        background: Rectangle { radius: 8; color: parent.hovered ? theme.activePillBg : theme.bgDarkCard; border.color: theme.borderCard }
        contentItem: Text {
            text: qsTr("Mostrar mais (") + (subPageGrid.pages.length - subPageGrid.pageLimit) + qsTr(" restantes)")
            color: theme.brand300
            font.pixelSize: 11
            font.weight: Font.Medium
        }
    }

    AppEmojiPopover {
        id: subEmojiPopover
        onEmojiSelected: function(emoji) {
            if (subPageGrid.emojiTargetPageId.length > 0) subPageGrid.iconChanged(subPageGrid.emojiTargetPageId, emoji)
            subPageGrid.emojiTargetPageId = ""
        }
    }
}
