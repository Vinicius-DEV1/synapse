import QtQuick 2.15

Rectangle {
    id: noticeRoot
    anchors.top: parent.top
    anchors.topMargin: 16
    anchors.horizontalCenter: parent.horizontalCenter
    width: Math.min(parent.width - 32, 560)
    height: 44
    radius: 10
    color: "#27272a"
    border.color: "#22ffffff"
    visible: noticeRoot.isActive && noticeRoot.message.length > 0
    z: 200

    property string message: ""
    property bool isActive: true
    signal dismissed()

    Timer {
        id: dismissTimer
        interval: 5500
        onTriggered: noticeRoot.dismissed()
    }

    onMessageChanged: {
        if (message.length > 0) dismissTimer.restart()
        else dismissTimer.stop()
    }

    Text {
        anchors.fill: parent
        anchors.leftMargin: 14
        anchors.rightMargin: 14
        verticalAlignment: Text.AlignVCenter
        horizontalAlignment: Text.AlignHCenter
        text: noticeRoot.message
        color: "#f4f4f5"
        font.pixelSize: 12
        wrapMode: Text.Wrap
    }

    MouseArea {
        anchors.fill: parent
        onClicked: noticeRoot.dismissed()
    }
}
