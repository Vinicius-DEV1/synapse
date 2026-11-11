import QtQuick 2.15

Item {
    id: selectionToggle
    width: 20
    height: 20
    z: 4

    property string bookId: ""
    property bool selected: false

    signal toggled(string bookId)

    Rectangle {
        anchors.fill: parent
        radius: 5
        color: selectionToggle.selected ? "#8b5cf6" : "#990f0e17"
        border.color: selectionToggle.selected ? "#c4b5fd" : "#66ffffff"
        Text { anchors.centerIn: parent; text: selectionToggle.selected ? "✓" : ""; color: "white"; font.pixelSize: 12; font.bold: true }
    }
    MouseArea {
        anchors.fill: parent
        cursorShape: Qt.PointingHandCursor
        onClicked: selectionToggle.toggled(selectionToggle.bookId)
    }
}
