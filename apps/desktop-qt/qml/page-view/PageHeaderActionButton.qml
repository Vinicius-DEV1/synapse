import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Button {
    id: actionButton
    objectName: "pageHeaderAction-" + actionKey

    required property string actionKey
    required property string actionIcon
    required property string actionLabel
    required property string tooltipText

    signal triggered(string actionKey, Item triggerItem)

    Layout.preferredHeight: 28
    Layout.preferredWidth: implicitWidth
    implicitWidth: actionContent.implicitWidth + 14
    padding: 0
    Accessible.name: actionButton.actionLabel
    ToolTip.visible: hovered
    ToolTip.text: actionButton.tooltipText
    onClicked: triggered(actionKey, actionButton)

    background: Rectangle {
        radius: 8
        color: actionButton.hovered ? theme.activePillBg : "transparent"
        border.color: actionButton.activeFocus ? "#6d28d9" : "transparent"
    }

    contentItem: RowLayout {
        id: actionContent
        spacing: 5
        AppIcon {
            name: actionButton.actionIcon
            color: actionButton.hovered ? theme.brand300 : theme.textSubtext
            Layout.preferredWidth: 14
            Layout.preferredHeight: 14
        }
        Text {
            text: actionButton.actionLabel
            color: actionButton.hovered ? theme.brand300 : theme.textSubtext
            font.pixelSize: 12
            font.weight: Font.Medium
        }
    }
}
