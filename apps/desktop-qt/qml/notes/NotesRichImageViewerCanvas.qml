pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: canvas
    objectName: "notesRichImageViewerViewport"

    property string imageSource: ""
    property string mode: "view"
    property real zoom: 1
    property real panX: 0
    property real panY: 0
    property rect cropSelection: Qt.rect(0, 0, 0, 0)
    property point cropStart: Qt.point(0, 0)
    property bool cropDragging: false
    property bool panDragging: false
    property point panStart: Qt.point(0, 0)
    property real panStartX: 0
    property real panStartY: 0

    signal zoomStepRequested(real amount)

    readonly property bool imageReady: imagePreview.status === Image.Ready
    readonly property real fitScale: imagePreview.status === Image.Ready &&
        width > 0 && height > 0
        ? Math.min(width / imagePreview.implicitWidth, height / imagePreview.implicitHeight) : 0
    readonly property real naturalWidth: imagePreview.status === Image.Ready ? imagePreview.implicitWidth : 0
    readonly property real naturalHeight: imagePreview.status === Image.Ready ? imagePreview.implicitHeight : 0
    readonly property rect displayedImageRect: {
        var displayedWidth = naturalWidth * fitScale * zoom
        var displayedHeight = naturalHeight * fitScale * zoom
        return Qt.rect(width / 2 - displayedWidth / 2 + panX,
                       height / 2 - displayedHeight / 2 + panY,
                       displayedWidth, displayedHeight)
    }
    readonly property rect cropPixels: {
        if (cropSelection.width < 1 || cropSelection.height < 1 ||
                displayedImageRect.width <= 0 || displayedImageRect.height <= 0) return Qt.rect(0, 0, 0, 0)
        var left = clamp((cropSelection.x - displayedImageRect.x) /
                         displayedImageRect.width * naturalWidth, 0, naturalWidth)
        var top = clamp((cropSelection.y - displayedImageRect.y) /
                        displayedImageRect.height * naturalHeight, 0, naturalHeight)
        var right = clamp((cropSelection.x + cropSelection.width - displayedImageRect.x) /
                          displayedImageRect.width * naturalWidth, 0, naturalWidth)
        var bottom = clamp((cropSelection.y + cropSelection.height - displayedImageRect.y) /
                           displayedImageRect.height * naturalHeight, 0, naturalHeight)
        var pixelX = Math.round(left)
        var pixelY = Math.round(top)
        return Qt.rect(pixelX, pixelY, Math.max(0, Math.round(right) - pixelX),
                       Math.max(0, Math.round(bottom) - pixelY))
    }

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value))
    }

    function reset() {
        panX = 0
        panY = 0
        cropSelection = Qt.rect(0, 0, 0, 0)
        cropDragging = false
        panDragging = false
    }

    function beginCrop() {
        const bounds = displayedImageRect
        const left = clamp(bounds.x, 0, width)
        const top = clamp(bounds.y, 0, height)
        const right = clamp(bounds.x + bounds.width, 0, width)
        const bottom = clamp(bounds.y + bounds.height, 0, height)
        cropSelection = Qt.rect(left + (right - left) * 0.1, top + (bottom - top) * 0.1,
                                (right - left) * 0.8, (bottom - top) * 0.8)
    }

    function updateCropSelection(x, y) {
        const bounds = displayedImageRect
        const left = clamp(bounds.x, 0, width)
        const top = clamp(bounds.y, 0, height)
        const right = clamp(bounds.x + bounds.width, 0, width)
        const bottom = clamp(bounds.y + bounds.height, 0, height)
        const endX = clamp(x, left, right)
        const endY = clamp(y, top, bottom)
        const startX = clamp(cropStart.x, left, right)
        const startY = clamp(cropStart.y, top, bottom)
        cropSelection = Qt.rect(Math.min(startX, endX), Math.min(startY, endY),
                                Math.abs(endX - startX), Math.abs(endY - startY))
    }

    Image {
        id: imagePreview
        objectName: "notesRichImageViewerImage"
        source: canvas.imageSource
        asynchronous: true
        autoTransform: true
        cache: false
        smooth: true
        fillMode: Image.PreserveAspectFit
        width: canvas.naturalWidth * canvas.fitScale
        height: canvas.naturalHeight * canvas.fitScale
        x: canvas.width / 2 - width / 2 + canvas.panX
        y: canvas.height / 2 - height / 2 + canvas.panY
        scale: canvas.zoom
        transformOrigin: Item.Center
        visible: status === Image.Ready
    }

    Label {
        anchors.centerIn: parent
        visible: imagePreview.status === Image.Error || canvas.imageSource.length === 0
        text: qsTr("The selected image could not be loaded.")
        color: "#fda4af"
    }

    Repeater {
        model: 4
        delegate: Rectangle {
            required property int index
            readonly property rect selection: canvas.cropSelection
            visible: canvas.mode === "crop" && selection.width > 0 && selection.height > 0
            color: "#99000000"
            x: index === 0 ? 0 : index === 1 ? selection.x + selection.width : selection.x
            y: index < 2 ? 0 : index === 2 ? 0 : selection.y + selection.height
            width: index === 0 ? selection.x : index === 1
                ? canvas.width - selection.x - selection.width : selection.width
            height: index < 2 ? canvas.height : index === 2
                ? selection.y : canvas.height - selection.y - selection.height
            z: 1
        }
    }

    Rectangle {
        objectName: "notesRichImageCropSelection"
        visible: canvas.mode === "crop" && canvas.cropSelection.width > 0 && canvas.cropSelection.height > 0
        x: canvas.cropSelection.x
        y: canvas.cropSelection.y
        width: canvas.cropSelection.width
        height: canvas.cropSelection.height
        color: "transparent"
        border.color: "#fffffe"
        border.width: 1
        z: 2
        Repeater {
            model: 2
            delegate: Rectangle {
                required property int index
                x: index === 0 ? parent.width / 3 : parent.width * 2 / 3
                width: 1
                height: parent.height
                color: "#66ffffff"
            }
        }
        Repeater {
            model: 2
            delegate: Rectangle {
                required property int index
                y: index === 0 ? parent.height / 3 : parent.height * 2 / 3
                width: parent.width
                height: 1
                color: "#66ffffff"
            }
        }
    }

    MouseArea {
        objectName: "notesRichImageCropMouseArea"
        anchors.fill: parent
        acceptedButtons: canvas.mode === "crop" ? Qt.LeftButton | Qt.RightButton : Qt.NoButton
        cursorShape: canvas.mode === "crop"
            ? canvas.cropDragging ? Qt.CrossCursor : canvas.panDragging ? Qt.ClosedHandCursor : Qt.CrossCursor
            : Qt.ArrowCursor
        onPressed: function(mouse) {
            if (canvas.mode !== "crop") return
            if (mouse.button === Qt.RightButton || (mouse.modifiers & Qt.ShiftModifier) !== 0) {
                canvas.panDragging = true
                canvas.panStart = Qt.point(mouse.x, mouse.y)
                canvas.panStartX = canvas.panX
                canvas.panStartY = canvas.panY
            } else {
                canvas.cropDragging = true
                canvas.cropStart = Qt.point(mouse.x, mouse.y)
                canvas.cropSelection = Qt.rect(mouse.x, mouse.y, 0, 0)
            }
        }
        onPositionChanged: function(mouse) {
            if (canvas.cropDragging) canvas.updateCropSelection(mouse.x, mouse.y)
            if (canvas.panDragging) {
                canvas.panX = canvas.panStartX + mouse.x - canvas.panStart.x
                canvas.panY = canvas.panStartY + mouse.y - canvas.panStart.y
            }
        }
        onReleased: {
            canvas.cropDragging = false
            canvas.panDragging = false
        }
        onCanceled: {
            canvas.cropDragging = false
            canvas.panDragging = false
        }
        onWheel: function(wheel) {
            if (canvas.mode !== "view") return
            canvas.zoomStepRequested(wheel.angleDelta.y > 0 ? 0.15 : -0.15)
            wheel.accepted = true
        }
    }
}
