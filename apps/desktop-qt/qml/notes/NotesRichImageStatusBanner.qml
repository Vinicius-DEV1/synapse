import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: statusBanner
    property string message: ""

    function show(nextMessage) {
        message = String(nextMessage || qsTr("The image could not be inserted."))
        clearTimer.restart()
    }

    Label {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        visible: statusBanner.message.length > 0
        text: statusBanner.message
        color: "#fda4af"
        wrapMode: Text.Wrap
        padding: 8
        background: Rectangle { color: "#f21a1924"; border.color: "#22fb7185"; radius: 8 }
    }

    Timer {
        id: clearTimer
        interval: 5000
        repeat: false
        onTriggered: statusBanner.message = ""
    }
}
