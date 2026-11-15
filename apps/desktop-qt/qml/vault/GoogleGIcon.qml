import QtQuick 2.15

Canvas {
    id: gRoot
    property int size: 16
    property bool monochrome: false
    property color color: "#ffffff"

    implicitWidth: size
    implicitHeight: size
    width: size
    height: size

    onSizeChanged: requestPaint()
    onMonochromeChanged: requestPaint()
    onColorChanged: requestPaint()
    Component.onCompleted: requestPaint()

    onPaint: {
        var ctx = getContext("2d")
        ctx.clearRect(0, 0, width, height)
        ctx.save()
        var s = width / 24.0
        ctx.scale(s, s)

        if (monochrome) {
            ctx.fillStyle = color
            // Full G path in monochrome
            ctx.beginPath()
            ctx.arc(12, 12, 11, 0, 2 * Math.PI, false)
            ctx.fill()
            ctx.restore()
            return
        }

        // Blue part (horizontal bar and top-right curve)
        ctx.fillStyle = "#4285F4"
        ctx.beginPath()
        ctx.moveTo(23.75, 12.27)
        ctx.lineTo(12, 12)
        ctx.lineTo(12, 16.51)
        ctx.lineTo(18.6, 16.51)
        ctx.arc(12, 12, 11.75, 0.25, 0.9, false)
        ctx.lineTo(23.75, 12.27)
        ctx.fill()

        // Green part (bottom arc)
        ctx.fillStyle = "#34A853"
        ctx.beginPath()
        ctx.arc(12, 12, 11.75, 0.75, 2.35, false)
        ctx.lineTo(12, 12)
        ctx.closePath()
        ctx.fill()

        // Yellow part (bottom-left arc)
        ctx.fillStyle = "#FBBC05"
        ctx.beginPath()
        ctx.arc(12, 12, 11.75, 2.35, 3.92, false)
        ctx.lineTo(12, 12)
        ctx.closePath()
        ctx.fill()

        // Red part (top arc)
        ctx.fillStyle = "#EA4335"
        ctx.beginPath()
        ctx.arc(12, 12, 11.75, 3.92, 5.5, false)
        ctx.lineTo(12, 12)
        ctx.closePath()
        ctx.fill()

        // Inner cutout circle
        ctx.fillStyle = "#0f0e17"
        ctx.beginPath()
        ctx.arc(12, 12, 6.5, 0, 2 * Math.PI, false)
        ctx.fill()

        // Restore blue horizontal bar inside cutout
        ctx.fillStyle = "#4285F4"
        ctx.fillRect(12, 9.75, 11.75, 4.5)

        ctx.restore()
    }
}
