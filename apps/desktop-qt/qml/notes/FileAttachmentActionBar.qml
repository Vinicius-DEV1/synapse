pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

RowLayout {
    id: actionBarRoot
    property alias colorAnchorItem: colorActionButton
    property bool pointerHovered: false
    property bool colorPickerOpen: false
    property bool renaming: false
    property bool isMissing: false
    readonly property bool hasActionFocus: renameActionButton.activeFocus || colorActionButton.activeFocus

    signal renameRequested()
    signal colorPickerToggled()

    opacity: pointerHovered || colorPickerOpen || hasActionFocus ? 1 : 0
    Behavior on opacity { NumberAnimation { duration: 150 } }
    spacing: 2

    ToolButton {
        id: renameActionButton
        visible: !actionBarRoot.renaming && !actionBarRoot.isMissing
        Layout.preferredWidth: 24
        Layout.preferredHeight: 24
        focusPolicy: Qt.TabFocus
        Accessible.name: qsTr("Renomear arquivo")
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Renomear arquivo")
        onClicked: actionBarRoot.renameRequested()
        background: Rectangle {
            radius: 5
            color: renameActionButton.hovered || renameActionButton.activeFocus ? "#4d000000" : "transparent"
            border.color: renameActionButton.activeFocus ? "#998b5cf6" : "transparent"
            border.width: renameActionButton.activeFocus ? 1 : 0
        }
        contentItem: AppIcon {
            anchors.centerIn: parent
            name: "edit"
            color: renameActionButton.hovered || renameActionButton.activeFocus ? "#fffffe" : "#a7a9be"
            width: 12
            height: 12
        }
    }

    ToolButton {
        id: colorActionButton
        Layout.preferredWidth: 24
        Layout.preferredHeight: 24
        focusPolicy: Qt.TabFocus
        Accessible.name: qsTr("Personalizar cor do widget")
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Personalizar cor do widget")
        onClicked: actionBarRoot.colorPickerToggled()
        background: Rectangle {
            radius: 5
            color: actionBarRoot.colorPickerOpen || colorActionButton.hovered || colorActionButton.activeFocus
                ? "#4d000000" : "transparent"
            border.color: colorActionButton.activeFocus ? "#998b5cf6" : "transparent"
            border.width: colorActionButton.activeFocus ? 1 : 0
        }
        contentItem: AppIcon {
            anchors.centerIn: parent
            name: "palette"
            color: colorActionButton.hovered || colorActionButton.activeFocus ? "#fffffe" : "#a7a9be"
            width: 12
            height: 12
        }
    }
}
