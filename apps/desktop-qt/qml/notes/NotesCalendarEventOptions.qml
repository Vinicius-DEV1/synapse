import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: eventOptions

    property string eventColor: "#8b5cf6"
    property string recurrence: "none"
    readonly property var colorOptions: [
        { color: "#3b82f6", options: eventOptions },
        { color: "#8b5cf6", options: eventOptions },
        { color: "#10b981", options: eventOptions },
        { color: "#f59e0b", options: eventOptions },
        { color: "#ef4444", options: eventOptions },
        { color: "#ec4899", options: eventOptions }
    ]
    signal eventColorSelected(string color)
    signal recurrenceSelected(string recurrence)

    spacing: 8

    ComboBox {
        Layout.fillWidth: true
        Layout.preferredHeight: 30
        model: ["none", "daily", "weekly", "monthly", "yearly"]
        currentIndex: Math.max(0, model.indexOf(eventOptions.recurrence))
        onActivated: eventOptions.recurrenceSelected(currentText)
    }

    RowLayout {
        Layout.fillWidth: true
        spacing: 8
        Text { text: qsTr("Cor:"); color: "#a7a9be"; font.pixelSize: 11 }
        Repeater {
            model: eventOptions.colorOptions
            delegate: Rectangle {
                id: eventColorOption
                required property var modelData
                width: 18
                height: 18
                radius: 9
                color: eventColorOption.modelData.color
                border.color: eventColorOption.modelData.options.eventColor === eventColorOption.modelData.color ? "#ffffff" : "#33ffffff"
                border.width: eventColorOption.modelData.options.eventColor === eventColorOption.modelData.color ? 2 : 1
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: eventColorOption.modelData.options.eventColorSelected(eventColorOption.modelData.color)
                }
            }
        }
        Item { Layout.fillWidth: true }
    }
}
