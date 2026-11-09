import QtQuick 2.15

Item {
    id: bubbleRoot
    anchors.fill: parent

    property bool isPlaying: false
    readonly property bool isHovered: bubbleMouse.containsMouse

    signal expandRequested()

    Row {
        anchors.centerIn: parent
        spacing: 3
        visible: bubbleRoot.isPlaying

        // 3 Equalizer animated bars
        Rectangle {
            width: 3; height: 10; radius: 1.5; color: "#c4b5fd"
            SequentialAnimation on height {
                loops: Animation.Infinite
                running: bubbleRoot.isPlaying
                NumberAnimation { to: 16; duration: 400; easing.type: Easing.InOutQuad }
                NumberAnimation { to: 6; duration: 400; easing.type: Easing.InOutQuad }
            }
        }
        Rectangle {
            width: 3; height: 14; radius: 1.5; color: "#a855f7"
            SequentialAnimation on height {
                loops: Animation.Infinite
                running: bubbleRoot.isPlaying
                NumberAnimation { to: 8; duration: 350; easing.type: Easing.InOutQuad }
                NumberAnimation { to: 18; duration: 350; easing.type: Easing.InOutQuad }
            }
        }
        Rectangle {
            width: 3; height: 8; radius: 1.5; color: "#c4b5fd"
            SequentialAnimation on height {
                loops: Animation.Infinite
                running: bubbleRoot.isPlaying
                NumberAnimation { to: 14; duration: 450; easing.type: Easing.InOutQuad }
                NumberAnimation { to: 4; duration: 450; easing.type: Easing.InOutQuad }
            }
        }
    }

    Text {
        anchors.centerIn: parent
        visible: !bubbleRoot.isPlaying
        text: "🎧"
        font.pixelSize: 18
    }

    MouseArea {
        id: bubbleMouse
        anchors.fill: parent
        cursorShape: Qt.PointingHandCursor
        hoverEnabled: true
        onClicked: bubbleRoot.expandRequested()
    }
}
