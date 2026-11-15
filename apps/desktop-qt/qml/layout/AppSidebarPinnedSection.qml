pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Layouts 1.15
import "../ui"

ColumnLayout {
    id: pinnedSectionRoot
    Layout.fillWidth: true
    spacing: 4

    property var pinnedPages: []
    property string selectedPageId: ""

    signal pageSelected(string pageId)
    signal togglePinRequested(string pageId)
    signal reorderPinnedRequested(int fromIndex, int toIndex)

    visible: pinnedPages && pinnedPages.length > 0

    Theme { id: theme }

    RowLayout {
        Layout.fillWidth: true
        spacing: 6
        AppIcon {
            Layout.preferredWidth: 12
            Layout.preferredHeight: 12
            name: "pin"
            color: theme.brand400
        }
        Text {
            text: qsTr("FIXADOS")
            color: theme.textMuted
            font.pixelSize: 11
            font.bold: true
            font.family: theme.fontFamily
            font.letterSpacing: 1.1
        }
    }

    Repeater {
        model: pinnedSectionRoot.pinnedPages

        delegate: Rectangle {
            id: pinnedDelegate
            required property var modelData
            required property int index

            Theme { id: itemTheme }

            property bool isSelected: pinnedSectionRoot.selectedPageId === pinnedDelegate.modelData.id
            Layout.fillWidth: true
            Layout.preferredHeight: 32
            radius: 6
            color: isSelected ? itemTheme.activePillBg : (pinnedMouse.containsMouse ? itemTheme.bgHover : "transparent")
            border.color: isSelected ? itemTheme.activePillBorder : "transparent"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                Text {
                    text: pinnedDelegate.modelData.icon || "📄"
                    font.pixelSize: 13
                }

                Text {
                    Layout.fillWidth: true
                    text: pinnedDelegate.modelData.title || qsTr("Sem título")
                    color: pinnedDelegate.isSelected ? itemTheme.brand300 :
                           (pinnedMouse.containsMouse ? itemTheme.textDark : itemTheme.textSubtext)
                    font.pixelSize: 12
                    font.bold: pinnedDelegate.isSelected
                    font.family: itemTheme.fontFamily
                    elide: Text.ElideRight
                }

                // Hover Action: Unpin
                Rectangle {
                    Layout.preferredWidth: 20
                    Layout.preferredHeight: 20
                    radius: 4
                    color: unpinMouse.containsMouse ? itemTheme.bgHover : "transparent"
                    visible: pinnedMouse.containsMouse

                    AppIcon {
                        anchors.centerIn: parent
                        width: 10
                        height: 10
                        name: "close"
                        color: itemTheme.textSubtext
                    }

                    MouseArea {
                        id: unpinMouse
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: pinnedSectionRoot.togglePinRequested(pinnedDelegate.modelData.id)
                    }
                }
            }

            MouseArea {
                id: pinnedMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: pinnedSectionRoot.pageSelected(pinnedDelegate.modelData.id)
            }
        }
    }
}
