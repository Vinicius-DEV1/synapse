import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: destinationRow

    property var destination: ({})
    property string selectedTargetId: ""

    signal selected(string targetId)
    signal activated(string targetId)

    height: 54
    radius: 9
    color: selectedTargetId === destination.targetId ? "#258b5cf6" : rowMouse.containsMouse ? "#0affffff" : "transparent"
    border.color: selectedTargetId === destination.targetId ? "#558b5cf6" : "transparent"

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 10 + Math.min(Number(destinationRow.destination.depth) || 0, 8) * 14
        anchors.rightMargin: 10
        spacing: 9
        Text { text: destinationRow.destination.icon; color: "#c4b5fd"; font.pixelSize: 17 }
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2
            RowLayout {
                Layout.fillWidth: true
                spacing: 6
                Text { Layout.fillWidth: true; text: destinationRow.destination.title; color: "#fffffe"; font.pixelSize: 12; font.weight: Font.Medium; elide: Text.ElideRight }
                Text { visible: destinationRow.destination.isCurrent; text: qsTr("Current"); color: "#a7a9be"; font.pixelSize: 9 }
            }
            Text {
                Layout.fillWidth: true
                text: destinationRow.destination.breadcrumb
                color: "#77798c"
                font.pixelSize: 9
                elide: Text.ElideRight
            }
        }
        Text {
            visible: destinationRow.selectedTargetId === destinationRow.destination.targetId
            text: "✓"
            color: "#c4b5fd"
            font.pixelSize: 15
        }
    }

    MouseArea {
        id: rowMouse
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onClicked: destinationRow.selected(destinationRow.destination.targetId)
        onDoubleClicked: {
            destinationRow.selected(destinationRow.destination.targetId)
            destinationRow.activated(destinationRow.destination.targetId)
        }
    }
}
