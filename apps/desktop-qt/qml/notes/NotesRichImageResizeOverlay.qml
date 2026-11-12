pragma ComponentBehavior: Bound

import QtQuick 2.15

Item {
    id: resizeRoot
    objectName: "notesRichImageResizeOverlay"

    property bool active: false
    property rect imageRect: Qt.rect(0, 0, 0, 0)
    property int imageWidth: 0
    property int imageHeight: 0
    property int maximumWidth: 0
    property string alignment: "center"
    property string imageSource: ""
    property bool resizing: false
    property real previewWidth: imageWidth
    property real previewHeight: imageHeight
    property bool previewHasExplicitHeight: false
    property real startX: 0
    property real startY: 0
    property real lastX: 0
    property real lastY: 0
    property real startWidth: 0
    property real startHeight: 0
    property real aspectRatio: 1
    property int horizontalDirection: 0
    property int verticalDirection: 0
    property bool pointerMoved: false
    property bool shiftHeld: false

    signal resizeStarted()
    signal resizeCommitted(int width, int height)
    signal resizeCanceled()
    signal resetRequested()

    readonly property real displayedWidth: resizing ? previewWidth : imageWidth
    readonly property real displayedHeight: resizing ? previewHeight : imageHeight
    readonly property bool previewReady: previewImage.status === Image.Ready
    readonly property real displayedX: alignment === "right"
        ? Math.max(0, width - displayedWidth)
        : alignment === "center"
            ? Math.max(0, imageRect.x + (imageWidth - displayedWidth) / 2)
            : imageRect.x

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value))
    }

    function pointInOverlay(area, mouse) {
        return area.mapToItem(resizeRoot, mouse.x, mouse.y)
    }

    function beginResize(handle, area, mouse) {
        if (!active || imageWidth < 1 || imageHeight < 1) return
        var point = pointInOverlay(area, mouse)
        startX = point.x
        startY = point.y
        lastX = point.x
        lastY = point.y
        startWidth = imageWidth
        startHeight = imageHeight
        aspectRatio = imageWidth / imageHeight
        horizontalDirection = handle === "w" ? -1 : handle === "e" || handle === "se" ? 1 : 0
        verticalDirection = handle === "se" ? 1 : 0
        pointerMoved = false
        shiftHeld = false
        previewWidth = imageWidth
        previewHeight = imageHeight
        previewHasExplicitHeight = false
        resizing = true
        forceActiveFocus()
        resizeStarted()
    }

    function updateResize(area, mouse) {
        var point = pointInOverlay(area, mouse)
        updateAt(point.x, point.y, shiftHeld || (mouse.modifiers & Qt.ShiftModifier) !== 0)
    }

    function updateAt(pointerX, pointerY, freeResize) {
        if (!resizing) return
        lastX = pointerX
        lastY = pointerY
        var deltaX = pointerX - startX
        var deltaY = pointerY - startY
        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) pointerMoved = true

        var limitWidth = maximumWidth > 60 ? Math.min(maximumWidth, 8192) : 8192
        var nextWidth = startWidth + deltaX * horizontalDirection
        var nextHeight = startHeight + deltaY * verticalDirection
        if (!freeResize && horizontalDirection !== 0) nextHeight = nextWidth / aspectRatio
        nextWidth = clamp(nextWidth, 60, limitWidth)
        if (freeResize) nextHeight = clamp(nextHeight, 60, 8192)
        else if (horizontalDirection !== 0) nextHeight = nextWidth / aspectRatio

        previewWidth = Math.round(nextWidth)
        previewHeight = Math.round(nextHeight)
        previewHasExplicitHeight = freeResize
    }

    function clearPreview() {
        resizing = false
        imageSource = ""
        previewWidth = imageWidth
        previewHeight = imageHeight
        previewHasExplicitHeight = false
        pointerMoved = false
        shiftHeld = false
    }

    function finishResize() {
        if (!resizing) return
        var didMove = pointerMoved
        var nextWidth = Math.round(previewWidth)
        var nextHeight = previewHasExplicitHeight ? Math.round(previewHeight) : -1
        clearPreview()
        if (didMove) resizeCommitted(nextWidth, nextHeight)
    }

    function cancelResize() {
        if (!resizing) return
        clearPreview()
        resizeCanceled()
    }

    function resetSize() {
        cancelResize()
        resetRequested()
    }

    onActiveChanged: if (!active) cancelResize()

    Keys.onPressed: function(event) {
        if (!resizing) return
        if (event.key === Qt.Key_Escape) {
            cancelResize()
            event.accepted = true
        } else if (event.key === Qt.Key_Shift) {
            shiftHeld = true
            updateAt(lastX, lastY, true)
            event.accepted = true
        }
    }
    Keys.onReleased: function(event) {
        if (resizing && event.key === Qt.Key_Shift) {
            shiftHeld = false
            updateAt(lastX, lastY, false)
            event.accepted = true
        }
    }

    Rectangle {
        id: previewCover
        visible: resizeRoot.resizing && previewImage.status === Image.Ready
        x: Math.min(resizeRoot.imageRect.x, resizeRoot.displayedX)
        y: resizeRoot.imageRect.y
        width: Math.max(resizeRoot.imageRect.x + resizeRoot.imageWidth,
                         resizeRoot.displayedX + resizeRoot.displayedWidth) - x
        height: Math.max(resizeRoot.imageRect.height, resizeRoot.displayedHeight)
        color: "#0f0e17"
        z: 8

        Rectangle {
            x: resizeRoot.displayedX - previewCover.x
            y: 0
            width: resizeRoot.displayedWidth
            height: resizeRoot.displayedHeight
            color: "transparent"
            radius: 4
            clip: true
            border.color: "#18ffffff"
            Image {
                id: previewImage
                objectName: "notesRichImageResizePreview"
                anchors.fill: parent
                source: resizeRoot.imageSource
                asynchronous: true
                cache: false
                smooth: true
                fillMode: Image.Stretch
            }
        }

        Rectangle {
            anchors.right: parent.right
            anchors.bottom: parent.bottom
            anchors.margins: 8
            radius: 5
            color: "#e6111018"
            border.color: "#20ffffff"
            width: resizeDimensions.implicitWidth + 16
            height: 25
            Text {
                id: resizeDimensions
                anchors.centerIn: parent
                text: Math.round(resizeRoot.previewWidth) + " × " + Math.round(resizeRoot.previewHeight) + " px"
                color: "#fffffe"
                font.family: "monospace"
                font.pixelSize: 11
            }
        }
    }

    Repeater {
        model: ["se", "w", "e"]
        delegate: Item {
            id: resizeHandle
            required property string modelData
            readonly property bool corner: modelData === "se"
            width: corner ? 26 : 16
            height: corner ? 26 : 40
            x: modelData === "w" ? resizeRoot.imageRect.x - width / 2
                : modelData === "e" ? resizeRoot.imageRect.x + resizeRoot.imageWidth - width / 2
                    : resizeRoot.displayedX + resizeRoot.displayedWidth - width / 2
            y: corner ? resizeRoot.imageRect.y + resizeRoot.imageHeight - height / 2
                : resizeRoot.imageRect.y + (resizeRoot.imageHeight - height) / 2
            visible: resizeRoot.active
            z: 10
            Accessible.name: modelData === "se" ? qsTr("Resize image proportionally or hold Shift to resize freely")
                : qsTr("Resize image width")
            Rectangle {
                anchors.centerIn: parent
                width: resizeHandle.corner ? 12 : 6
                height: resizeHandle.corner ? 12 : 30
                radius: resizeHandle.corner ? 6 : 3
                color: "#8b5cf6"
                border.color: "#fffffe"
            }
            MouseArea {
                id: resizeArea
                objectName: "notesRichImageResizeHandle_" + resizeHandle.modelData
                anchors.fill: parent
                hoverEnabled: true
                preventStealing: true
                cursorShape: resizeHandle.modelData === "se" ? Qt.SizeFDiagCursor : Qt.SizeHorCursor
                onPressed: function(mouse) { resizeRoot.beginResize(resizeHandle.modelData, resizeArea, mouse) }
                onPositionChanged: function(mouse) { if (pressed) resizeRoot.updateResize(resizeArea, mouse) }
                onReleased: resizeRoot.finishResize()
                onCanceled: resizeRoot.cancelResize()
                onDoubleClicked: function(mouse) {
                    mouse.accepted = true
                    resizeRoot.resetSize()
                }
            }
        }
    }
}
