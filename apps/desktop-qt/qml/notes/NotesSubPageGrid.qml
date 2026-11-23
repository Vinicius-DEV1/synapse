import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

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

    function childrenOf(parentId) {
        if (!allPages || allPages.length === 0) return []
        return allPages.filter(function(p) { return p.parent_id === parentId })
    }

    function toggleExpand(pageId) {
        var copy = Object.assign({}, expandedChildrenMap)
        if (copy[pageId]) delete copy[pageId]
        else copy[pageId] = true
        expandedChildrenMap = copy
    }

    function columnWidth() {
        var columnCount = childPageGrid.columns
        return columnCount > 0 ? Math.max(0, (childPageGrid.width - childPageGrid.columnSpacing * (columnCount - 1)) / columnCount) : 0
    }

    function requestReorder(sourceId, targetId) {
        if (!sourceId || !targetId || sourceId === targetId) return
        var nextPages = pages.slice()
        var sourceIndex = -1
        var targetIndex = -1
        for (var index = 0; index < nextPages.length; ++index) {
            if (nextPages[index].id === sourceId) sourceIndex = index
            if (nextPages[index].id === targetId) targetIndex = index
        }
        if (sourceIndex < 0 || targetIndex < 0) return
        var moved = nextPages.splice(sourceIndex, 1)[0]
        nextPages.splice(targetIndex, 0, moved)
        var orderedIds = []
        for (var pageIndex = 0; pageIndex < nextPages.length; ++pageIndex) orderedIds.push(nextPages[pageIndex].id)
        reorderRequested(orderedIds)
    }

    Timer {
        id: statusTimer
        interval: 4000
        onTriggered: subPageGrid.actionStatus = ""
    }
    onActionStatusChanged: if (actionStatus.length > 0) statusTimer.restart()

    RowLayout {
        Layout.fillWidth: true
        Text {
            text: qsTr("Sub-páginas")
            color: "#a7a9be"
            font.pixelSize: 12
            font.weight: Font.Medium
            font.capitalization: Font.AllUppercase
            font.letterSpacing: 1.1
        }
        Item { Layout.fillWidth: true }
        Text {
            visible: subPageGrid.actionStatus.length > 0
            text: subPageGrid.actionStatus
            color: "#a78bfa"
            font.pixelSize: 10
            elide: Text.ElideRight
        }
    }

    GridLayout {
        id: childPageGrid
        Layout.fillWidth: true
        columns: Math.max(1, Math.min(3, Math.floor(width / 220)))
        rowSpacing: 8
        columnSpacing: 8

        Repeater {
            model: subPageGrid.pages.slice(0, subPageGrid.pageLimit)
            delegate: Rectangle {
                id: childCard
                required property var modelData
                readonly property var pageData: modelData
                readonly property var grandChildren: subPageGrid.childrenOf(modelData.id)
                readonly property bool hasChildren: grandChildren.length > 0
                readonly property bool isExpanded: Boolean(subPageGrid.expandedChildrenMap[modelData.id])
                property bool nestTargetActive: false
                property bool orderTargetActive: false
                property bool nestedDropHandled: false
                Layout.fillWidth: true
                Layout.preferredWidth: subPageGrid.columnWidth()
                Layout.preferredHeight: 50
                radius: 12
                color: nestTargetActive ? "#248b5cf6" : orderTargetActive ? "#181a1924" : childMouse.containsMouse ? "#14ffffff" : "#801a1924"
                border.color: nestTargetActive ? "#a78bfa" : orderTargetActive ? "#668b5cf6" : childMouse.containsMouse ? "#558b5cf6" : "#0dffffff"
                border.width: nestTargetActive || orderTargetActive ? 2 : 1

                Drag.active: dragHandleMouse.drag.active
                Drag.source: childCard
                Drag.keys: ["synapse-page"]
                Drag.supportedActions: Qt.MoveAction
                Drag.hotSpot.x: width / 2
                Drag.hotSpot.y: height / 2

                DropArea {
                    id: reorderDropArea
                    anchors.fill: parent
                    keys: ["synapse-page"]
                    onEntered: {
                        if (drag.source && drag.source.pageData && drag.source.pageData.parent_id === childCard.pageData.parent_id) {
                            childCard.orderTargetActive = true
                        }
                    }
                    onExited: childCard.orderTargetActive = false
                    onDropped: function(drop) {
                        childCard.orderTargetActive = false
                        if (nestedDropArea.containsDrag || childCard.nestedDropHandled || !drop.source || !drop.source.pageData) return
                        if (drop.source.pageData.parent_id === childCard.pageData.parent_id) {
                            subPageGrid.requestReorder(drop.source.pageData.id, childCard.pageData.id)
                            drop.acceptProposedAction()
                        }
                    }
                }

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 8
                    anchors.rightMargin: 10
                    spacing: 8

                    Item {
                        width: 16
                        height: 30
                        visible: childMouse.containsMouse || dragHandleMouse.drag.active
                        Text { anchors.centerIn: parent; text: "⋮⋮"; color: "#77798c"; font.pixelSize: 11; lineHeight: 0.8 }
                        MouseArea {
                            id: dragHandleMouse
                            anchors.fill: parent
                            drag.target: childCard
                            cursorShape: drag.active ? Qt.ClosedHandCursor : Qt.OpenHandCursor
                        }
                    }

                    Item {
                        Layout.preferredWidth: 32
                        Layout.preferredHeight: 32
                        Rectangle {
                            anchors.fill: parent
                            radius: 8
                            color: nestedDropArea.containsDrag ? "#558b5cf6" : iconClickArea.containsMouse ? "#1affffff" : "transparent"
                            border.color: nestedDropArea.containsDrag ? "#a78bfa" : "transparent"
                        }
                        Text {
                            anchors.centerIn: parent
                            text: childCard.pageData.icon || "📄"
                            font.pixelSize: 20
                        }
                        MouseArea {
                            id: iconClickArea
                            anchors.fill: parent
                            z: 2
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                subPageGrid.emojiTargetPageId = childCard.pageData.id
                                subEmojiPopover.open()
                            }
                        }
                        DropArea {
                            id: nestedDropArea
                            anchors.fill: parent
                            z: 3
                            keys: ["synapse-page"]
                            onEntered: {
                                childCard.nestTargetActive = true
                                childCard.nestedDropHandled = false
                            }
                            onExited: childCard.nestTargetActive = false
                            onDropped: function(drop) {
                                childCard.nestTargetActive = false
                                if (!drop.source || !drop.source.pageData || drop.source.pageData.id === childCard.pageData.id) return
                                childCard.nestedDropHandled = true
                                Qt.callLater(function() { childCard.nestedDropHandled = false })
                                subPageGrid.moveRequested(drop.source.pageData.id, childCard.pageData.id)
                                drop.acceptProposedAction()
                            }
                        }
                        ToolTip.visible: nestedDropArea.containsDrag
                        ToolTip.text: qsTr("Drop here to nest inside this page")
                    }

                    Text {
                        Layout.fillWidth: true
                        text: childCard.pageData.title || qsTr("Untitled")
                        color: "#fffffe"
                        font.pixelSize: 14
                        font.weight: Font.Medium
                        elide: Text.ElideRight
                    }
                    ToolButton {
                        visible: childCard.hasChildren
                        implicitWidth: 24
                        implicitHeight: 24
                        onClicked: subPageGrid.toggleExpand(childCard.pageData.id)
                        ToolTip.visible: hovered
                        ToolTip.text: childCard.grandChildren.length + " sub-páginas"
                        background: Rectangle { color: parent.hovered ? "#1a8b5cf6" : "transparent"; radius: 6 }
                        contentItem: AppIcon {
                            anchors.centerIn: parent
                            name: childCard.isExpanded ? "chevron-down" : "chevron-right"
                            color: "#a78bfa"
                            width: 12
                            height: 12
                        }
                    }

                    ToolButton {
                        id: movePageButton
                        implicitWidth: 28
                        implicitHeight: 28
                        visible: childMouse.containsMouse || hovered || activeFocus
                        Accessible.name: qsTr("Move page")
                        onClicked: subPageGrid.moveToRequested(childCard.pageData.id)
                        ToolTip.visible: hovered
                        ToolTip.text: qsTr("Mover para…")
                        background: Rectangle { color: parent.hovered ? "#1a8b5cf6" : "transparent"; radius: 7 }
                        contentItem: AppIcon {
                            anchors.centerIn: parent
                            name: "file-symlink"
                            color: parent.hovered ? "#ddd6fe" : "#a7a9be"
                            width: 13
                            height: 13
                        }
                    }
                }

                MouseArea {
                    id: childMouse
                    anchors.fill: parent
                    z: -1
                    hoverEnabled: true
                    acceptedButtons: Qt.LeftButton | Qt.MiddleButton
                    cursorShape: Qt.PointingHandCursor
                    onClicked: function(mouse) {
                        if (mouse.button === Qt.MiddleButton) {
                            subPageGrid.openInNewTabRequested(childCard.pageData.id)
                        } else {
                            subPageGrid.pageSelected(childCard.pageData.id)
                        }
                    }
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredWidth: subPageGrid.columnWidth()
            Layout.preferredHeight: 50
            radius: 12
            color: createMouse.containsMouse ? "#0d8b5cf6" : "transparent"
            border.width: 0

            Canvas {
                anchors.fill: parent
                property color strokeColor: createMouse.containsMouse ? "#808b5cf6" : "#14ffffff"
                onStrokeColorChanged: requestPaint()
                onWidthChanged: requestPaint()
                onHeightChanged: requestPaint()
                onPaint: {
                    var ctx = getContext("2d")
                    ctx.clearRect(0, 0, width, height)
                    ctx.save()
                    ctx.strokeStyle = strokeColor
                    ctx.lineWidth = 1.2
                    ctx.setLineDash([5, 4])
                    var r = 12
                    var w = width - 1
                    var h = height - 1
                    ctx.beginPath()
                    ctx.moveTo(0.5 + r, 0.5)
                    ctx.lineTo(w - r, 0.5)
                    ctx.arcTo(w, 0.5, w, 0.5 + r, r)
                    ctx.lineTo(w, h - r)
                    ctx.arcTo(w, h, w - r, h, r)
                    ctx.lineTo(0.5 + r, h)
                    ctx.arcTo(0.5, h, 0.5, h - r, r)
                    ctx.lineTo(0.5, 0.5 + r)
                    ctx.arcTo(0.5, 0.5, 0.5 + r, 0.5, r)
                    ctx.stroke()
                    ctx.restore()
                }
            }

            RowLayout {
                anchors.centerIn: parent
                spacing: 8
                AppIcon { name: "plus"; color: createMouse.containsMouse ? "#a78bfa" : "#a7a9be"; width: 16; height: 16 }
                Text { text: qsTr("Nova Sub-página"); color: createMouse.containsMouse ? "#a78bfa" : "#a7a9be"; font.pixelSize: 13; font.weight: Font.Medium }
            }

            MouseArea {
                id: createMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: subPageGrid.createRequested()
            }
        }

        Item {
            visible: subPageGrid.pages.length + 1 < childPageGrid.columns
            Layout.fillWidth: true
            Layout.preferredWidth: subPageGrid.columnWidth()
            Layout.preferredHeight: 50
        }
    }

    Button {
        visible: subPageGrid.pages.length > subPageGrid.pageLimit
        Layout.alignment: Qt.AlignLeft
        Layout.preferredHeight: 28
        padding: 10
        onClicked: subPageGrid.pageLimit += 12
        background: Rectangle { radius: 8; color: parent.hovered ? "#1f8b5cf6" : "#161522"; border.color: "#22ffffff" }
        contentItem: Text {
            text: qsTr("Mostrar mais (") + (subPageGrid.pages.length - subPageGrid.pageLimit) + qsTr(" restantes)")
            color: "#c4b5fd"
            font.pixelSize: 11
            font.weight: Font.Medium
        }
    }

    // Expanded grandchildren strip
    Flow {
        Layout.fillWidth: true
        spacing: 6
        visible: Object.keys(subPageGrid.expandedChildrenMap).length > 0

        Repeater {
            model: {
                var out = []
                for (var i = 0; i < subPageGrid.pages.length; i++) {
                    var p = subPageGrid.pages[i]
                    if (subPageGrid.expandedChildrenMap[p.id]) {
                        var ch = subPageGrid.childrenOf(p.id)
                        for (var c = 0; c < ch.length; c++) out.push(ch[c])
                    }
                }
                return out
            }
            delegate: Button {
                required property var modelData
                height: 28
                padding: 8
                onClicked: subPageGrid.pageSelected(modelData.id)
                background: Rectangle { radius: 8; color: parent.hovered ? "#228b5cf6" : "#141320"; border.color: "#1affffff" }
                contentItem: Text {
                    text: (modelData.icon || "📄") + " " + (modelData.title || qsTr("Untitled"))
                    color: "#cbd5e1"
                    font.pixelSize: 11
                }
            }
        }
    }

    AppEmojiPopover {
        id: subEmojiPopover
        onEmojiSelected: function(emoji) {
            if (subPageGrid.emojiTargetPageId.length > 0) {
                subPageGrid.iconChanged(subPageGrid.emojiTargetPageId, emoji)
            }
            subPageGrid.emojiTargetPageId = ""
        }
    }

    Rectangle {
        visible: pages.length > 0 && rootDropArea.containsDrag
        Layout.fillWidth: true
        Layout.preferredHeight: visible ? 36 : 0
        radius: 9
        color: "#248b5cf6"
        border.color: "#668b5cf6"
        Text {
            anchors.centerIn: parent
            text: qsTr("Drop a sub-page here to move it to the top level")
            color: "#ddd6fe"
            font.pixelSize: 10
        }
        DropArea {
            id: rootDropArea
            anchors.fill: parent
            keys: ["synapse-page"]
            onDropped: function(drop) {
                if (!drop.source || !drop.source.pageData) return
                subPageGrid.moveRequested(drop.source.pageData.id, "")
                drop.acceptProposedAction()
            }
        }
    }
}
