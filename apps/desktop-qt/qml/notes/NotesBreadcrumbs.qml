import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: breadcrumbsRoot
    Layout.fillWidth: true
    spacing: 4

    property var pages: []
    signal pageSelected(string pageId)
    signal openInNewTabRequested(string pageId)

    visible: pages.length > 1

    Repeater {
        model: breadcrumbsRoot.pages

        delegate: RowLayout {
            id: crumbRow
            required property var modelData
            required property int index
            spacing: 4

            Text {
                visible: crumbRow.index > 0
                text: "›"
                color: "#64748b"
                font.pixelSize: 12
            }

            ToolButton {
                id: crumbBtn
                text: (crumbRow.modelData.icon || "📄") + " " + (crumbRow.modelData.title || qsTr("Untitled"))
                onClicked: breadcrumbsRoot.pageSelected(crumbRow.modelData.id)
                ToolTip.visible: hovered
                ToolTip.text: crumbRow.modelData.title || qsTr("Untitled")
                background: Rectangle {
                    color: crumbBtn.hovered ? "#0affffff" : "transparent"
                    radius: 6
                }
                contentItem: Text {
                    text: crumbBtn.text
                    color: crumbRow.index === breadcrumbsRoot.pages.length - 1 ? "#fffffe" : "#a7a9be"
                    font.pixelSize: 12
                    font.weight: crumbRow.index === breadcrumbsRoot.pages.length - 1 ? Font.Medium : Font.Normal
                    elide: Text.ElideRight
                }
                MouseArea {
                    anchors.fill: parent
                    acceptedButtons: Qt.MiddleButton | Qt.RightButton
                    onClicked: function(mouse) {
                        if (mouse.button === Qt.MiddleButton) {
                            breadcrumbsRoot.openInNewTabRequested(crumbRow.modelData.id)
                        } else if (mouse.button === Qt.RightButton) {
                            crumbMenu.popup()
                        }
                    }
                }
                Menu {
                    id: crumbMenu
                    background: Rectangle { color: "#181726"; radius: 10; border.color: "#22ffffff" }
                    MenuItem {
                        text: qsTr("Abrir página")
                        onTriggered: breadcrumbsRoot.pageSelected(crumbRow.modelData.id)
                    }
                    MenuItem {
                        text: qsTr("Abrir em nova aba")
                        onTriggered: breadcrumbsRoot.openInNewTabRequested(crumbRow.modelData.id)
                    }
                }
            }
        }
    }
}
