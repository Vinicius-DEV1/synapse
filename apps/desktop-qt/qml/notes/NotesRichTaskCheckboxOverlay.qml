pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: overlayRoot
    objectName: "notesRichTaskCheckboxOverlay"
    anchors.fill: parent
    property var textEditor
    property var taskItems: []

    signal toggleRequested(int position)

    function focusedTaskPosition() {
        for (var index = 0; index < taskRepeater.count; ++index) {
            var checkbox = taskRepeater.itemAt(index)
            if (checkbox && checkbox.activeFocus) return overlayRoot.taskItems[index].position
        }
        return -1
    }

    function focusTask(position) {
        for (var index = 0; index < taskRepeater.count; ++index) {
            var checkbox = taskRepeater.itemAt(index)
            if (checkbox && overlayRoot.taskItems[index].position === position) {
                checkbox.forceActiveFocus()
                return true
            }
        }
        return false
    }

    function checkboxAt(index) {
        return taskRepeater.itemAt(index)
    }

    Repeater {
        id: taskRepeater
        model: overlayRoot.taskItems

        delegate: CheckBox {
            id: taskCheckbox
            required property var modelData
            objectName: "notesTaskCheckbox_" + modelData.position
            width: 20
            height: 20
            Accessible.name: modelData.label
            Accessible.description: modelData.checked ? qsTr("Completed task") : qsTr("Incomplete task")
            checked: modelData.checked
            x: overlayRoot.textEditor.positionToRectangle(modelData.position).x
            y: overlayRoot.textEditor.positionToRectangle(modelData.position).y +
               (overlayRoot.textEditor.positionToRectangle(modelData.position).height - height) / 2

            indicator: Rectangle {
                x: taskCheckbox.leftPadding
                y: (taskCheckbox.height - height) / 2
                implicitWidth: 16
                implicitHeight: 16
                radius: 4
                color: taskCheckbox.checked ? "#8b5cf6" : "transparent"
                border.width: 2
                border.color: taskCheckbox.checked ? "#8b5cf6" : "#a7a9be"

                Text {
                    anchors.centerIn: parent
                    visible: taskCheckbox.checked
                    text: "✓"
                    color: "white"
                    font.pixelSize: 12
                    font.bold: true
                }
            }
            contentItem: Item {}
            onClicked: overlayRoot.toggleRequested(modelData.position)
        }
    }
}
