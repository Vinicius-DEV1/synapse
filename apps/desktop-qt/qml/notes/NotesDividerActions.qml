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
    property var dropTarget: null
    readonly property real dragThreshold: 8

    readonly property var actions: [
        { label: "↑", title: qsTr("Move divider up"), value: "moveUp", capability: "canMoveUp" },
        { label: "+", title: qsTr("Add paragraph below divider"), value: "addBelow" },
        { label: "↓", title: qsTr("Move divider down"), value: "moveDown", capability: "canMoveDown" },
        { label: "⋮⋮", title: qsTr("Drag divider to reposition"), value: "drag" }
    ]

    signal actionRequested(string action)
    signal dropRequested(int targetPosition, bool afterTarget)

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
            ToolTip.visible: hovered || dragMouseArea.containsMouse
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
                color: actionButton.hovered || dragMouseArea.containsMouse ? "#1affffff" : "#08ffffff"
            }
            onClicked: {
                if (actionButton.modelData.value !== "drag")
                    actionsRoot.actionRequested(actionButton.modelData.value)
            }

            MouseArea {
                id: dragMouseArea
                anchors.fill: parent
                enabled: actionButton.modelData.value === "drag" && actionsRoot.dropTarget !== null
                hoverEnabled: true
                preventStealing: true
                acceptedButtons: Qt.LeftButton
                cursorShape: pressed ? Qt.ClosedHandCursor : Qt.OpenHandCursor
                property real pressX: 0
                property real pressY: 0
                property bool dragging: false
                onPressed: function(mouse) {
                    pressX = mouse.x
                    pressY = mouse.y
                    dragging = false
                }
                onPositionChanged: function(mouse) {
                    if (!pressed || dragging) return
                    var deltaX = mouse.x - pressX
                    var deltaY = mouse.y - pressY
                    dragging = deltaX * deltaX + deltaY * deltaY >=
                        actionsRoot.dragThreshold * actionsRoot.dragThreshold
                }
                onReleased: function(mouse) {
                    if (!dragging) return
                    dragging = false
                    var point = dragMouseArea.mapToItem(actionsRoot.dropTarget, mouse.x, mouse.y)
                    var targetPosition = actionsRoot.dropTarget.positionAt(point.x, point.y)
                    if (targetPosition < 0) return
                    var targetRect = actionsRoot.dropTarget.positionToRectangle(targetPosition)
                    actionsRoot.dropRequested(targetPosition,
                                              point.y > targetRect.y + targetRect.height / 2)
                }
            }
        }
    }
}
