import QtQuick 2.15
import "../ui"

Item {
    id: resizeHandlesRoot
    anchors.fill: parent
    z: 9999

    property var targetWindow: null
    readonly property int handleThickness: 6
    readonly property int cornerSize: 12
    readonly property bool canResize: targetWindow && targetWindow.visibility !== Window.Maximized && targetWindow.visibility !== Window.FullScreen

    visible: canResize

    // Corners
    MouseArea {
        id: topLeft
        anchors.top: parent.top
        anchors.left: parent.left
        width: resizeHandlesRoot.cornerSize
        height: resizeHandlesRoot.cornerSize
        cursorShape: Qt.SizeFDiagCursor
        z: 2
        onPressed: {
            if (resizeHandlesRoot.targetWindow && typeof resizeHandlesRoot.targetWindow.startSystemResize === "function") {
                resizeHandlesRoot.targetWindow.startSystemResize(Qt.TopEdge | Qt.LeftEdge)
            }
        }
    }

    MouseArea {
        id: topRight
        anchors.top: parent.top
        anchors.right: parent.right
        width: resizeHandlesRoot.cornerSize
        height: resizeHandlesRoot.cornerSize
        cursorShape: Qt.SizeBDiagCursor
        z: 2
        onPressed: {
            if (resizeHandlesRoot.targetWindow && typeof resizeHandlesRoot.targetWindow.startSystemResize === "function") {
                resizeHandlesRoot.targetWindow.startSystemResize(Qt.TopEdge | Qt.RightEdge)
            }
        }
    }

    MouseArea {
        id: bottomLeft
        anchors.bottom: parent.bottom
        anchors.left: parent.left
        width: resizeHandlesRoot.cornerSize
        height: resizeHandlesRoot.cornerSize
        cursorShape: Qt.SizeBDiagCursor
        z: 2
        onPressed: {
            if (resizeHandlesRoot.targetWindow && typeof resizeHandlesRoot.targetWindow.startSystemResize === "function") {
                resizeHandlesRoot.targetWindow.startSystemResize(Qt.BottomEdge | Qt.LeftEdge)
            }
        }
    }

    MouseArea {
        id: bottomRight
        anchors.bottom: parent.bottom
        anchors.right: parent.right
        width: resizeHandlesRoot.cornerSize
        height: resizeHandlesRoot.cornerSize
        cursorShape: Qt.SizeFDiagCursor
        z: 2
        onPressed: {
            if (resizeHandlesRoot.targetWindow && typeof resizeHandlesRoot.targetWindow.startSystemResize === "function") {
                resizeHandlesRoot.targetWindow.startSystemResize(Qt.BottomEdge | Qt.RightEdge)
            }
        }
    }

    // Edges
    MouseArea {
        id: topEdge
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.leftMargin: resizeHandlesRoot.cornerSize
        anchors.rightMargin: resizeHandlesRoot.cornerSize
        height: resizeHandlesRoot.handleThickness
        cursorShape: Qt.SizeVerCursor
        z: 1
        onPressed: {
            if (resizeHandlesRoot.targetWindow && typeof resizeHandlesRoot.targetWindow.startSystemResize === "function") {
                resizeHandlesRoot.targetWindow.startSystemResize(Qt.TopEdge)
            }
        }
    }

    MouseArea {
        id: bottomEdge
        anchors.bottom: parent.bottom
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.leftMargin: resizeHandlesRoot.cornerSize
        anchors.rightMargin: resizeHandlesRoot.cornerSize
        height: resizeHandlesRoot.handleThickness
        cursorShape: Qt.SizeVerCursor
        z: 1
        onPressed: {
            if (resizeHandlesRoot.targetWindow && typeof resizeHandlesRoot.targetWindow.startSystemResize === "function") {
                resizeHandlesRoot.targetWindow.startSystemResize(Qt.BottomEdge)
            }
        }
    }

    MouseArea {
        id: leftEdge
        anchors.top: parent.top
        anchors.bottom: parent.bottom
        anchors.left: parent.left
        anchors.topMargin: resizeHandlesRoot.cornerSize
        anchors.bottomMargin: resizeHandlesRoot.cornerSize
        width: resizeHandlesRoot.handleThickness
        cursorShape: Qt.SizeHorCursor
        z: 1
        onPressed: {
            if (resizeHandlesRoot.targetWindow && typeof resizeHandlesRoot.targetWindow.startSystemResize === "function") {
                resizeHandlesRoot.targetWindow.startSystemResize(Qt.LeftEdge)
            }
        }
    }

    MouseArea {
        id: rightEdge
        anchors.top: parent.top
        anchors.bottom: parent.bottom
        anchors.right: parent.right
        anchors.topMargin: resizeHandlesRoot.cornerSize
        anchors.bottomMargin: resizeHandlesRoot.cornerSize
        width: resizeHandlesRoot.handleThickness
        cursorShape: Qt.SizeHorCursor
        z: 1
        onPressed: {
            if (resizeHandlesRoot.targetWindow && typeof resizeHandlesRoot.targetWindow.startSystemResize === "function") {
                resizeHandlesRoot.targetWindow.startSystemResize(Qt.RightEdge)
            }
        }
    }
}
