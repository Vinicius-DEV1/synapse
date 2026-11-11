import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: subPageGrid
    Layout.fillWidth: true
    spacing: 8

    property var pages: []
    property string actionStatus: ""

    signal pageSelected(string pageId)
    signal createRequested()
    signal reorderRequested(var orderedPageIds)
    signal moveRequested(string pageId, string newParentId)
    signal moveToRequested(string pageId)

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
            text: qsTr("Sub-pages")
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
            model: subPageGrid.pages
            delegate: Rectangle {
                id: childCard
                required property var modelData
                readonly property var pageData: modelData
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
                            color: nestedDropArea.containsDrag ? "#558b5cf6" : "transparent"
                            border.color: nestedDropArea.containsDrag ? "#a78bfa" : "transparent"
                        }
                        Text {
                            anchors.centerIn: parent
                            text: childCard.pageData.icon || "📄"
                            font.pixelSize: 20
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
                        id: movePageButton
                        text: "↗"
                        implicitWidth: 30
                        implicitHeight: 30
                        visible: childMouse.containsMouse || hovered || activeFocus
                        Accessible.name: qsTr("Move page")
                        onClicked: subPageGrid.moveToRequested(childCard.pageData.id)
                        ToolTip.visible: hovered
                        ToolTip.text: qsTr("Move to…")
                        background: Rectangle { color: parent.hovered ? "#1a8b5cf6" : "transparent"; radius: 7 }
                        contentItem: Text {
                            text: parent.text
                            color: parent.hovered ? "#ddd6fe" : "#a7a9be"
                            font.pixelSize: 15
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }

                MouseArea {
                    id: childMouse
                    anchors.fill: parent
                    z: -1
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: subPageGrid.pageSelected(childCard.pageData.id)
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredWidth: subPageGrid.columnWidth()
            Layout.preferredHeight: 50
            radius: 12
            color: createMouse.containsMouse ? "#0d8b5cf6" : "transparent"
            border.color: createMouse.containsMouse ? "#558b5cf6" : "#20ffffff"

            RowLayout {
                anchors.centerIn: parent
                spacing: 8
                Text { text: "+"; color: "#a78bfa"; font.pixelSize: 18; font.bold: true }
                Text { text: qsTr("New sub-page"); color: "#a7a9be"; font.pixelSize: 14 }
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

    Rectangle {
        visible: pages.length > 0
        Layout.fillWidth: true
        Layout.preferredHeight: 36
        radius: 9
        color: rootDropArea.containsDrag ? "#248b5cf6" : "transparent"
        border.color: rootDropArea.containsDrag ? "#668b5cf6" : "transparent"
        Text {
            anchors.centerIn: parent
            text: qsTr("Drop a sub-page here to move it to the top level")
            color: rootDropArea.containsDrag ? "#ddd6fe" : "#77798c"
            font.pixelSize: 10
            visible: rootDropArea.containsDrag
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
