import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: breadcrumbsRoot
    Layout.fillWidth: true
    spacing: 4

    property var pages: []
    signal pageSelected(string pageId)

    visible: pages.length > 1

    Repeater {
        model: breadcrumbsRoot.pages

        delegate: RowLayout {
            spacing: 4

            Text {
                visible: index > 0
                text: "›"
                color: "#64748b"
                font.pixelSize: 12
            }

            ToolButton {
                text: (modelData.icon || "📄") + " " + (modelData.title || qsTr("Untitled"))
                onClicked: breadcrumbsRoot.pageSelected(modelData.id)
                ToolTip.visible: hovered
                ToolTip.text: modelData.title || qsTr("Untitled")
                background: Rectangle {
                    color: parent.hovered ? "#0affffff" : "transparent"
                    radius: 6
                }
                contentItem: Text {
                    text: parent.text
                    color: index === breadcrumbsRoot.pages.length - 1 ? "#fffffe" : "#a7a9be"
                    font.pixelSize: 12
                    font.weight: index === breadcrumbsRoot.pages.length - 1 ? Font.Medium : Font.Normal
                    elide: Text.ElideRight
                }
            }
        }
    }
}
