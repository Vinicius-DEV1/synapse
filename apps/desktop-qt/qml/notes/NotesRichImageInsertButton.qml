import QtQuick 2.15
import QtQuick.Controls 2.15

Rectangle {
    visible: false
    width: 30
    height: 26
    implicitWidth: 30
    implicitHeight: 26
    radius: 4
    color: insertMouse.containsMouse ? "#12ffffff" : "#08ffffff"
    Accessible.name: qsTr("Insert image")
    ToolTip.visible: insertMouse.containsMouse
    ToolTip.text: qsTr("Insert image")
    Text { anchors.centerIn: parent; text: "▧"; color: "#c4b5fd"; font.pixelSize: 16 }

    signal clicked()

    MouseArea {
        id: insertMouse
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onClicked: parent.clicked()
    }
}
