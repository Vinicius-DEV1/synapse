import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: filterBar
    Layout.fillWidth: true
    spacing: 8

    property string activeStatusFilter: "all"
    signal filterSelected(string filter)

    Repeater {
        model: [
            { key: "all", label: "Todos" },
            { key: "reading", label: "Lendo" },
            { key: "finished", label: "Concluídos" },
            { key: "queue", label: "Na fila" }
        ]
        delegate: Rectangle {
            required property var modelData
            readonly property bool isSelected: filterBar.activeStatusFilter === modelData.key
            height: 30
            width: tabLabel.implicitWidth + 24
            radius: 15
            color: isSelected ? "#7c3aed" : "#161524"
            border.color: isSelected ? "#a78bfa" : "#10ffffff"
            border.width: 1
            Text {
                id: tabLabel
                anchors.centerIn: parent
                text: modelData.label
                color: isSelected ? "#ffffff" : "#a7a9be"
                font.pixelSize: 12
                font.bold: isSelected
            }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: filterBar.filterSelected(modelData.key)
            }
        }
    }

    Item { Layout.fillWidth: true }
}
