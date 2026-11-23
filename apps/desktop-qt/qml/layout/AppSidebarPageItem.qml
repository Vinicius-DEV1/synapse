import QtQuick 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: pageItemRoot
    property var pageData: null
    property bool isSelected: false
    property bool isCollapsed: false
    property int depth: 0
    property bool hasChildren: false

    signal pageSelected(string pageId)
    signal openInNewTabRequested(string pageId)
    signal toggleCollapseRequested(string pageId)
    signal createSubRequested(string parentId)
    signal togglePinRequested(string pageId)
    signal moveRequested(string pageId)
    signal renameRequested(string pageId)
    signal emojiClickRequested(string pageId, real itemX, real itemY)
    signal contextMenuRequested(string pageId, real mouseX, real mouseY)
    signal pageDropped(string draggedPageId, string targetParentId)

    Layout.fillWidth: true
    Layout.preferredHeight: 32

    Theme { id: theme }

    Rectangle {
        id: itemCard
        anchors.fill: parent
        anchors.leftMargin: pageItemRoot.depth * 16
        radius: 6
        color: pageItemRoot.isSelected ? theme.activePillBg :
               (dropTargetArea.containsDrag ? theme.activePillBg :
               (itemMouse.containsMouse ? theme.bgHover : "transparent"))
        border.color: pageItemRoot.isSelected ? theme.activePillBorder :
                      (dropTargetArea.containsDrag ? theme.borderBrand : "transparent")
        border.width: 1

        RowLayout {
            z: 2
            anchors.fill: parent
            anchors.leftMargin: 4
            anchors.rightMargin: 6
            spacing: 4

            // Chevron toggle
            Item {
                Layout.preferredWidth: 18
                Layout.preferredHeight: 18

                AppIcon {
                    anchors.centerIn: parent
                    width: 10
                    height: 10
                    name: pageItemRoot.isCollapsed ? "chevron-right" : "chevron-down"
                    color: theme.textMuted
                    visible: pageItemRoot.hasChildren
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    enabled: pageItemRoot.hasChildren
                    onClicked: {
                        if (pageItemRoot.pageData) {
                            pageItemRoot.toggleCollapseRequested(pageItemRoot.pageData.id)
                        }
                    }
                }
            }

            // Page Icon (clickable for inline Emoji Picker)
            Rectangle {
                id: emojiBadge
                Layout.preferredWidth: 20
                Layout.preferredHeight: 20
                radius: 4
                color: emojiMouse.containsMouse ? theme.bgHover : "transparent"

                Text {
                    anchors.centerIn: parent
                    text: (pageItemRoot.pageData && pageItemRoot.pageData.icon) ? pageItemRoot.pageData.icon : "📄"
                    font.pixelSize: 13
                }

                MouseArea {
                    id: emojiMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: function(mouse) {
                        mouse.accepted = true
                        if (pageItemRoot.pageData) {
                            var pt = emojiBadge.mapToItem(pageItemRoot, 0, emojiBadge.height)
                            pageItemRoot.emojiClickRequested(pageItemRoot.pageData.id, pt.x, pt.y)
                        }
                    }
                }
            }

            // Page Title
            Text {
                Layout.fillWidth: true
                text: (pageItemRoot.pageData && pageItemRoot.pageData.title) ? pageItemRoot.pageData.title : qsTr("Sem título")
                color: pageItemRoot.isSelected ? theme.brand300 :
                       (itemMouse.containsMouse ? theme.textDark : theme.textSubtext)
                font.pixelSize: 12
                font.bold: pageItemRoot.isSelected
                font.family: theme.fontFamily
                elide: Text.ElideRight
            }

            // Hover actions: [+] Add sub-page | [•••] Context Menu
            RowLayout {
                spacing: 2
                visible: itemMouse.containsMouse || addSubMouse.containsMouse || moreMouse.containsMouse

                // Add sub-page button
                Rectangle {
                    Layout.preferredWidth: 20
                    Layout.preferredHeight: 20
                    radius: 4
                    color: addSubMouse.containsMouse ? theme.bgHover : "transparent"

                    AppIcon {
                        anchors.centerIn: parent
                        width: 11
                        height: 11
                        name: "plus"
                        color: theme.textSubtext
                    }

                    MouseArea {
                        id: addSubMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: function(mouse) {
                            mouse.accepted = true
                            if (pageItemRoot.pageData) {
                                pageItemRoot.createSubRequested(pageItemRoot.pageData.id)
                            }
                        }
                    }
                }

                // More options button ([•••])
                Rectangle {
                    id: moreBtn
                    Layout.preferredWidth: 20
                    Layout.preferredHeight: 20
                    radius: 4
                    color: moreMouse.containsMouse ? theme.bgHover : "transparent"

                    AppIcon {
                        anchors.centerIn: parent
                        width: 11
                        height: 11
                        name: "more-horizontal"
                        color: theme.textSubtext
                    }

                    MouseArea {
                        id: moreMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: function(mouse) {
                            mouse.accepted = true
                            if (pageItemRoot.pageData) {
                                var pt = moreBtn.mapToItem(pageItemRoot, moreBtn.width, moreBtn.height)
                                pageItemRoot.contextMenuRequested(pageItemRoot.pageData.id, pt.x, pt.y)
                            }
                        }
                    }
                }
            }
        }

        MouseArea {
            id: itemMouse
            anchors.fill: parent
            hoverEnabled: true
            acceptedButtons: Qt.LeftButton | Qt.RightButton | Qt.MiddleButton
            cursorShape: Qt.PointingHandCursor

            drag.target: dragProxy
            drag.axis: Drag.YAxis

            onClicked: function(mouse) {
                if (mouse.button === Qt.RightButton) {
                    if (pageItemRoot.pageData) {
                        pageItemRoot.contextMenuRequested(pageItemRoot.pageData.id, mouse.x, mouse.y)
                    }
                } else if (mouse.button === Qt.MiddleButton) {
                    if (pageItemRoot.pageData) {
                        pageItemRoot.openInNewTabRequested(pageItemRoot.pageData.id)
                    }
                } else {
                    if (pageItemRoot.pageData) {
                        pageItemRoot.pageSelected(pageItemRoot.pageData.id)
                    }
                }
            }
            onDoubleClicked: function(mouse) {
                if (mouse.button === Qt.LeftButton && pageItemRoot.pageData) {
                    pageItemRoot.renameRequested(pageItemRoot.pageData.id)
                }
            }
        }

        DropArea {
            id: dropTargetArea
            anchors.fill: parent
            keys: ["pageId"]
            onDropped: function(drop) {
                if (pageItemRoot.pageData) {
                    var sourceId = ""
                    if (drop.source && drop.source.pageId) {
                        sourceId = drop.source.pageId
                    } else if (drop.hasText) {
                        sourceId = drop.text
                    }
                    if (sourceId.length > 0 && sourceId !== pageItemRoot.pageData.id) {
                        pageItemRoot.pageDropped(sourceId, pageItemRoot.pageData.id)
                    }
                }
            }
        }

        Item {
            id: dragProxy
            property string pageId: pageItemRoot.pageData ? String(pageItemRoot.pageData.id || "") : ""
            Drag.active: itemMouse.drag.active
            Drag.source: dragProxy
            Drag.keys: ["pageId"]
        }
    }
}
