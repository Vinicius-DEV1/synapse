import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

pragma ComponentBehavior: Bound

RowLayout {
    id: actionsRoot
    objectName: "notesDividerActions"
    visible: active
    spacing: 1

    property bool active: false
    property bool canMoveUp: false
    property bool canMoveDown: false

    readonly property var actions: [
        { label: "↑", title: qsTr("Move divider up"), value: "moveUp", capability: "canMoveUp" },
        { label: "+", title: qsTr("Add paragraph below divider"), value: "addBelow" },
        { label: "↓", title: qsTr("Move divider down"), value: "moveDown", capability: "canMoveDown" }
    ]

    signal actionRequested(string action)

    Repeater {
        model: actionsRoot.actions
        delegate: ToolButton {
            id: actionButton
            required property var modelData
            objectName: "notesDividerAction_" + modelData.value
            Layout.preferredWidth: 27
            Layout.preferredHeight: 26
            padding: 2
            enabled: !actionButton.modelData.capability || actionsRoot[actionButton.modelData.capability]
            text: actionButton.modelData.label
            Accessible.name: actionButton.modelData.title
            ToolTip.visible: hovered
            ToolTip.text: actionButton.modelData.title

            contentItem: Text {
                text: actionButton.text
                color: !actionButton.enabled ? "#6b6b7b" : "#c4b5fd"
                font.pixelSize: 12
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            background: Rectangle {
                radius: 4
                color: actionButton.hovered ? "#1affffff" : "#08ffffff"
            }
            onClicked: actionsRoot.actionRequested(actionButton.modelData.value)
        }
    }
}
