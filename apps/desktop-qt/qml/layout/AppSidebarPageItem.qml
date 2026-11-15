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
    signal toggleCollapseRequested(string pageId)
    signal createSubRequested(string parentId)
    signal togglePinRequested(string pageId)
    signal moveRequested(string pageId)
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
            anchors.fill: parent
            anchors.leftMargin: 4
            anchors.rightMargin: 6
            spacing: 4

            // Chevron toggle
            Item {
                Layout.preferredWidth: 18
                Layout.preferredHeight: 18

                Text {
                    anchors.centerIn: parent
                    text: pageItemRoot.isCollapsed ? "▶" : "▼"
                    font.pixelSize: 9
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

            // Page Icon
            Text {
                text: (pageItemRoot.pageData && pageItemRoot.pageData.icon) ? pageItemRoot.pageData.icon : "📄"
                font.pixelSize: 13
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

            // Hover actions: [+] Add sub-page | [📌] Pin | [📂] Move
            RowLayout {
                spacing: 2
                visible: itemMouse.containsMouse

                // Add sub-page button
                Rectangle {
                    Layout.preferredWidth: 20
                    Layout.preferredHeight: 20
                    radius: 4
                    color: addSubMouse.containsMouse ? theme.bgHover : "transparent"

                    AppIcon {
                        anchors.centerIn: parent
                        width: 10
                        height: 10
                        name: "plus"
                        color: theme.textSubtext
                    }

                    MouseArea {
                        id: addSubMouse
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (pageItemRoot.pageData) {
                                pageItemRoot.createSubRequested(pageItemRoot.pageData.id)
                            }
                        }
                    }
                }

                // Pin button
                Rectangle {
                    Layout.preferredWidth: 20
                    Layout.preferredHeight: 20
                    radius: 4
                    color: pinBtnMouse.containsMouse ? theme.bgHover : "transparent"

                    AppIcon {
                        anchors.centerIn: parent
                        width: 10
                        height: 10
                        name: "pin"
                        color: theme.textSubtext
                    }

                    MouseArea {
                        id: pinBtnMouse
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (pageItemRoot.pageData) {
                                pageItemRoot.togglePinRequested(pageItemRoot.pageData.id)
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
            acceptedButtons: Qt.LeftButton | Qt.RightButton
            cursorShape: Qt.PointingHandCursor

            drag.target: dragProxy
            drag.axis: Drag.YAxis

            onClicked: function(mouse) {
                if (mouse.button === Qt.RightButton) {
                    if (pageItemRoot.pageData) {
                        pageItemRoot.contextMenuRequested(pageItemRoot.pageData.id, mouse.x, mouse.y)
                    }
                } else {
                    if (pageItemRoot.pageData) {
                        pageItemRoot.pageSelected(pageItemRoot.pageData.id)
                    }
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
