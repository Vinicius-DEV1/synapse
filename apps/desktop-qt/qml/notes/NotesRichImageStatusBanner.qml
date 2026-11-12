import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: statusBanner
    property string message: ""
    property bool warning: false

    function show(nextMessage) {
        warning = false
        message = String(nextMessage || qsTr("The image could not be inserted."))
        clearTimer.restart()
    }

    function showWarning(nextMessage) {
        warning = true
        message = String(nextMessage || qsTr("Some images were skipped."))
        clearTimer.restart()
    }

    Label {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        visible: statusBanner.message.length > 0
        text: statusBanner.message
        color: statusBanner.warning ? "#fcd34d" : "#fda4af"
        wrapMode: Text.Wrap
        padding: 8
        background: Rectangle {
            color: statusBanner.warning ? "#241f12" : "#f21a1924"
            border.color: statusBanner.warning ? "#40fbbf24" : "#22fb7185"
            radius: 8
        }
    }

    Timer {
        id: clearTimer
        interval: 5000
        repeat: false
        onTriggered: {
            statusBanner.message = ""
            statusBanner.warning = false
        }
    }
}
