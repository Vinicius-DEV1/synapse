pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: paletteRoot
    property bool isOpen: false
    property bool itemsInvalid: false
    property string currentColor: "default"
    signal colorSelected(string color)

    visible: isOpen && !itemsInvalid
    Layout.preferredHeight: 24
    Layout.preferredWidth: swatchRow.implicitWidth + 12
    radius: 6
    color: "#1a1924"
    border.color: "#22ffffff"
    border.width: 1

    RowLayout {
        id: swatchRow
        anchors.centerIn: parent
        spacing: 5

        Repeater {
            model: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"]
            delegate: Rectangle {
                id: colorSwatch
                required property string modelData
                width: 13
                height: 13
                radius: 6.5
                color: colorSwatch.modelData
                border.color: paletteRoot.currentColor === colorSwatch.modelData ? "#ffffff" : "#33ffffff"
                border.width: 1

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        if (paletteRoot.itemsInvalid) return
                        paletteRoot.colorSelected(colorSwatch.modelData)
                    }
                }
            }
        }
    }
}
