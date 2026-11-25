import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../../../ui"

// Sub-page card with inline expand grandchildren, emoji picker, DnD nest & context menu
// Mirrors apps/web-react/src/components/notes/components/subpage-grid/SubPageItem.tsx
ColumnLayout {
    id: itemRoot
    required property var pageData
    property var allPages: []
    property bool isExpanded: false
    property real cardWidth: 220

    signal pageSelected(string pageId)
    signal openInNewTabRequested(string pageId)
    signal reorderDropRequested(string sourceId, string targetId)
    signal moveRequested(string pageId, string newParentId)
    signal moveToRequested(string pageId)
    signal renameRequested(string pageId, string currentTitle)
    signal iconChangeRequested(string pageId, real itemX, real itemY)
    signal toggleExpandRequested(string pageId)
    signal createSubRequested(string parentId)
    signal deleteRequested(string pageId)

    Theme { id: theme }

    readonly property var grandChildren: {
        if (!allPages || !pageData) return []
        return allPages.filter(function(p) { return p.parent_id === pageData.id })
    }
    readonly property bool hasChildren: grandChildren.length > 0

    Layout.fillWidth: true
    Layout.preferredWidth: cardWidth
    spacing: 4

    Rectangle {
        id: childCard
        property bool nestTargetActive: false
        property bool orderTargetActive: false
        property bool nestedDropHandled: false
        readonly property var pageData: itemRoot.pageData

        Layout.fillWidth: true
        Layout.preferredHeight: 48
        radius: 12
        color: nestTargetActive ? theme.activePillBg
             : orderTargetActive ? "#181a1924"
             : childMouse.containsMouse ? "#14ffffff" : "#801a1924"
        border.color: nestTargetActive ? theme.brand400
                    : orderTargetActive ? theme.borderBrand
                    : childMouse.containsMouse ? "#558b5cf6" : theme.borderCard
        border.width: nestTargetActive || orderTargetActive ? 2 : 1

        Drag.active: dragHandleMouse.drag.active
        Drag.source: childCard
        Drag.keys: ["synapse-page"]
        Drag.supportedActions: Qt.MoveAction
        Drag.hotSpot.x: width / 2
        Drag.hotSpot.y: height / 2

        DropArea {
            anchors.fill: parent
            keys: ["synapse-page"]
            onEntered: function(drag) {
                if (drag.source && drag.source.pageData && drag.source.pageData.parent_id === itemRoot.pageData.parent_id) {
                    childCard.orderTargetActive = true
                }
            }
            onExited: childCard.orderTargetActive = false
            onDropped: function(drop) {
                childCard.orderTargetActive = false
                if (nestedDropArea.containsDrag || childCard.nestedDropHandled || !drop.source || !drop.source.pageData) return
                if (drop.source.pageData.parent_id === itemRoot.pageData.parent_id) {
                    itemRoot.reorderDropRequested(drop.source.pageData.id, itemRoot.pageData.id)
                    drop.acceptProposedAction()
                }
            }
        }

        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 8
            anchors.rightMargin: 8
            spacing: 6

            Item {
                width: 14; height: 28
                visible: childMouse.containsMouse || dragHandleMouse.drag.active
                Text { anchors.centerIn: parent; text: "⋮⋮"; color: theme.textMuted; font.pixelSize: 11 }
                MouseArea {
                    id: dragHandleMouse
                    anchors.fill: parent
                    drag.target: childCard
                    cursorShape: drag.active ? Qt.ClosedHandCursor : Qt.OpenHandCursor
                }
            }

            Rectangle {
                id: iconBox
                Layout.preferredWidth: 30; Layout.preferredHeight: 30
                radius: 8
                color: nestedDropArea.containsDrag ? "#558b5cf6" : (iconClick.containsMouse ? theme.bgHover : "transparent")
                border.color: nestedDropArea.containsDrag ? theme.brand400 : "transparent"
                Text { anchors.centerIn: parent; text: itemRoot.pageData.icon || "📄"; font.pixelSize: 18 }
                MouseArea {
                    id: iconClick
                    anchors.fill: parent
                    z: 2
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        var pt = iconBox.mapToItem(itemRoot, 0, iconBox.height)
                        itemRoot.iconChangeRequested(itemRoot.pageData.id, pt.x, pt.y)
                    }
                }
                DropArea {
                    id: nestedDropArea
                    anchors.fill: parent
                    z: 3
                    keys: ["synapse-page"]
                    onEntered: { childCard.nestTargetActive = true; childCard.nestedDropHandled = false }
                    onExited: childCard.nestTargetActive = false
                    onDropped: function(drop) {
                        childCard.nestTargetActive = false
                        if (!drop.source || !drop.source.pageData || drop.source.pageData.id === itemRoot.pageData.id) return
                        childCard.nestedDropHandled = true
                        Qt.callLater(function() { childCard.nestedDropHandled = false })
                        itemRoot.moveRequested(drop.source.pageData.id, itemRoot.pageData.id)
                        drop.acceptProposedAction()
                    }
                }
            }

            Text {
                Layout.fillWidth: true
                text: itemRoot.pageData.title || qsTr("Sem título")
                color: theme.textDark
                font.pixelSize: 13
                font.weight: Font.Medium
                elide: Text.ElideRight
            }

            ToolButton {
                visible: itemRoot.hasChildren
                implicitWidth: 24; implicitHeight: 24
                onClicked: itemRoot.toggleExpandRequested(itemRoot.pageData.id)
                ToolTip.visible: hovered
                ToolTip.text: itemRoot.grandChildren.length + " " + qsTr("sub-páginas")
                background: Rectangle { color: parent.hovered ? theme.activePillBg : "transparent"; radius: 6 }
                contentItem: AppIcon { anchors.centerIn: parent; name: itemRoot.isExpanded ? "chevron-down" : "chevron-right"; color: theme.brand400; width: 12; height: 12 }
            }

            ToolButton {
                implicitWidth: 24; implicitHeight: 24
                visible: childMouse.containsMouse || hovered
                onClicked: cardContextMenu.popup()
                background: Rectangle { color: parent.hovered ? theme.bgHover : "transparent"; radius: 6 }
                contentItem: AppIcon { anchors.centerIn: parent; name: "more-horizontal"; color: theme.textSubtext; width: 13; height: 13 }
            }
        }

        MouseArea {
            id: childMouse
            anchors.fill: parent
            z: -1
            hoverEnabled: true
            acceptedButtons: Qt.LeftButton | Qt.MiddleButton | Qt.RightButton
            cursorShape: Qt.PointingHandCursor
            onClicked: function(mouse) {
                if (mouse.button === Qt.MiddleButton) itemRoot.openInNewTabRequested(itemRoot.pageData.id)
                else if (mouse.button === Qt.RightButton) cardContextMenu.popup()
                else itemRoot.pageSelected(itemRoot.pageData.id)
            }
            onDoubleClicked: itemRoot.renameRequested(itemRoot.pageData.id, itemRoot.pageData.title || "")
        }

        Menu {
            id: cardContextMenu
            background: Rectangle { color: theme.bgDarkCard; radius: 10; border.color: theme.borderCard }
            MenuItem { text: qsTr("Abrir"); onTriggered: itemRoot.pageSelected(itemRoot.pageData.id) }
            MenuItem { text: qsTr("Abrir em nova aba"); onTriggered: itemRoot.openInNewTabRequested(itemRoot.pageData.id) }
            MenuItem { text: qsTr("Criar sub-página"); onTriggered: itemRoot.createSubRequested(itemRoot.pageData.id) }
            MenuItem { text: qsTr("Renomear"); onTriggered: itemRoot.renameRequested(itemRoot.pageData.id, itemRoot.pageData.title || "") }
            MenuItem { text: qsTr("Mover para…"); onTriggered: itemRoot.moveToRequested(itemRoot.pageData.id) }
            MenuSeparator {}
            MenuItem { text: qsTr("Mover para Lixeira"); onTriggered: itemRoot.deleteRequested(itemRoot.pageData.id) }
        }
    }

    // Inline collapsible grandchildren directly beneath the expanded sub-page card
    ColumnLayout {
        visible: itemRoot.isExpanded && itemRoot.hasChildren
        Layout.fillWidth: true
        Layout.leftMargin: 16
        spacing: 4
        Repeater {
            model: itemRoot.isExpanded ? itemRoot.grandChildren : []
            delegate: Rectangle {
                required property var modelData
                Layout.fillWidth: true
                Layout.preferredHeight: 32
                radius: 8
                color: gcMouse.containsMouse ? "#12ffffff" : "#6615141b"
                border.color: theme.borderSubtle
                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 8; anchors.rightMargin: 8
                    spacing: 6
                    Text { text: modelData.icon || "📄"; font.pixelSize: 13 }
                    Text { Layout.fillWidth: true; text: modelData.title || qsTr("Sem título"); color: theme.textSubtext; font.pixelSize: 12; elide: Text.ElideRight }
                }
                MouseArea {
                    id: gcMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    acceptedButtons: Qt.LeftButton | Qt.MiddleButton
                    cursorShape: Qt.PointingHandCursor
                    onClicked: function(m) {
                        if (m.button === Qt.MiddleButton) itemRoot.openInNewTabRequested(modelData.id)
                        else itemRoot.pageSelected(modelData.id)
                    }
                }
            }
        }
    }
}
