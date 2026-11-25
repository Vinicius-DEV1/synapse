import QtQuick 2.15
import "../ui"

Item {
    id: slashIcon
    property string name: ""
    property color color: "#e2e8f0"
    readonly property bool customDrawing: [
        "info", "check-square", "file-plus", "table", "type",
        "heading-1", "heading-2", "heading-3", "columns-2", "columns-3"
    ].indexOf(name) >= 0

    AppIcon {
        anchors.fill: parent
        visible: !slashIcon.customDrawing
        name: slashIcon.name
        color: slashIcon.color
    }

    Canvas {
        id: iconCanvas
        anchors.fill: parent
        visible: slashIcon.customDrawing
        property string iconName: slashIcon.name
        property color iconColor: slashIcon.color
        onIconNameChanged: requestPaint()
        onIconColorChanged: requestPaint()
        onWidthChanged: requestPaint()
        onHeightChanged: requestPaint()
        Component.onCompleted: requestPaint()

        onPaint: {
            var context = getContext("2d")
            context.clearRect(0, 0, width, height)
            context.save()
            context.scale(width / 24, height / 24)
            context.strokeStyle = iconCanvas.iconColor
            context.fillStyle = iconCanvas.iconColor
            context.lineWidth = 1.8
            context.lineCap = "round"
            context.lineJoin = "round"

            function line(points) {
                context.beginPath()
                context.moveTo(points[0], points[1])
                for (var index = 2; index < points.length; index += 2)
                    context.lineTo(points[index], points[index + 1])
                context.stroke()
            }
            function rect(x, y, w, h, radius) {
                context.beginPath()
                context.moveTo(x + radius, y)
                context.lineTo(x + w - radius, y)
                context.quadraticCurveTo(x + w, y, x + w, y + radius)
                context.lineTo(x + w, y + h - radius)
                context.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
                context.lineTo(x + radius, y + h)
                context.quadraticCurveTo(x, y + h, x, y + h - radius)
                context.lineTo(x, y + radius)
                context.quadraticCurveTo(x, y, x + radius, y)
                context.stroke()
            }
            function circle(x, y, radius) {
                context.beginPath()
                context.arc(x, y, radius, 0, Math.PI * 2)
                context.stroke()
            }

            switch (iconCanvas.iconName) {
            case "info":
                circle(12, 12, 9)
                line([12, 11, 12, 16])
                circle(12, 7.5, 0.5)
                break
            case "check-square":
                rect(4, 4, 16, 16, 2)
                line([8, 12, 11, 15, 17, 9])
                break
            case "file-plus":
                context.beginPath()
                context.moveTo(14, 3)
                context.lineTo(7, 3)
                context.lineTo(5, 5)
                context.lineTo(5, 19)
                context.lineTo(7, 21)
                context.lineTo(17, 21)
                context.lineTo(19, 19)
                context.lineTo(19, 9)
                context.closePath()
                context.stroke()
                line([14, 3, 14, 9, 19, 9])
                line([9, 15, 15, 15])
                line([12, 12, 12, 18])
                break
            case "table":
                rect(3, 3, 18, 18, 2)
                line([3, 9, 21, 9])
                line([3, 15, 21, 15])
                line([9, 3, 9, 21])
                line([15, 3, 15, 21])
                break
            case "type":
                line([4, 5, 20, 5])
                line([12, 5, 12, 20])
                break
            case "heading-1":
            case "heading-2":
            case "heading-3":
                context.font = "bold 11px sans-serif"
                context.fillText(iconCanvas.iconName.slice(-1), 5, 17)
                line([4, 5, 4, 11])
                line([4, 8, 10, 8])
                line([10, 5, 10, 11])
                break
            case "columns-2":
                rect(3, 4, 8, 16, 1)
                rect(13, 4, 8, 16, 1)
                break
            case "columns-3":
                rect(2, 4, 6, 16, 1)
                rect(9, 4, 6, 16, 1)
                rect(16, 4, 6, 16, 1)
                break
            }
            context.restore()
        }
    }
}
