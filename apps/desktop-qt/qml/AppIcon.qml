import QtQuick 2.15

Canvas {
    id: iconRoot
    width: 18
    height: 18
    property string name: "circle"
    property color color: "#a7a9be"
    property real strokeWidth: 1.8

    onNameChanged: requestPaint()
    onColorChanged: requestPaint()
    onStrokeWidthChanged: requestPaint()
    onWidthChanged: requestPaint()
    onHeightChanged: requestPaint()
    Component.onCompleted: requestPaint()

    function normalizedName() {
        var names = {
            "🏠": "home", "📖": "notes", "☑️": "quiz", "📚": "library",
            "💵": "finance", "🎭": "culture", "🎬": "video", "🎴": "anki",
            "⏳": "focus", "📅": "calendar", "⚡": "habits", "🎨": "diagrams",
            "🔒": "vault", "🗑️": "trash", "⚙️": "settings", "📄": "notes",
            "➕": "plus", "🔍": "search", "✕": "close"
        }
        return names[name] || name
    }

    onPaint: {
        var ctx = getContext("2d")
        ctx.clearRect(0, 0, width, height)
        ctx.save()
        ctx.scale(width / 24, height / 24)
        ctx.strokeStyle = color
        ctx.lineWidth = strokeWidth
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        function line(points) {
            ctx.beginPath()
            ctx.moveTo(points[0], points[1])
            for (var i = 2; i < points.length; i += 2)
                ctx.lineTo(points[i], points[i + 1])
            ctx.stroke()
        }

        function rect(x, y, w, h, r) {
            ctx.beginPath()
            ctx.moveTo(x + r, y)
            ctx.lineTo(x + w - r, y)
            ctx.quadraticCurveTo(x + w, y, x + w, y + r)
            ctx.lineTo(x + w, y + h - r)
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
            ctx.lineTo(x + r, y + h)
            ctx.quadraticCurveTo(x, y + h, x, y + h - r)
            ctx.lineTo(x, y + r)
            ctx.quadraticCurveTo(x, y, x + r, y)
            ctx.stroke()
        }

        function circle(x, y, radius) {
            ctx.beginPath()
            ctx.arc(x, y, radius, 0, Math.PI * 2)
            ctx.stroke()
        }

        switch (normalizedName()) {
        case "home":
            line([3, 10, 12, 3, 21, 10])
            line([5, 9, 5, 21, 19, 21, 19, 9])
            line([9, 21, 9, 14, 15, 14, 15, 21])
            break
        case "notes":
            rect(4, 3, 16, 18, 2)
            line([8, 8, 16, 8])
            line([8, 12, 16, 12])
            line([8, 16, 13, 16])
            break
        case "quiz":
            rect(4, 3, 16, 18, 2)
            line([7, 8, 8, 9, 10, 6])
            line([12, 8, 17, 8])
            line([7, 14, 8, 15, 10, 12])
            line([12, 14, 17, 14])
            break
        case "library":
            rect(4, 4, 4, 16, 1)
            rect(10, 3, 4, 17, 1)
            rect(16, 5, 4, 15, 1)
            line([5, 8, 7, 8])
            line([11, 7, 13, 7])
            break
        case "folder":
            ctx.beginPath()
            ctx.moveTo(3, 6)
            ctx.lineTo(10, 6)
            ctx.lineTo(12, 8)
            ctx.lineTo(21, 8)
            ctx.lineTo(19, 19)
            ctx.lineTo(4, 19)
            ctx.closePath()
            ctx.stroke()
            break
        case "files":
            rect(5, 3, 13, 16, 2)
            line([8, 7, 15, 7])
            line([8, 11, 15, 11])
            line([8, 15, 13, 15])
            line([3, 7, 3, 20, 15, 20])
            break
        case "cloud":
            ctx.beginPath()
            ctx.moveTo(6, 18)
            ctx.bezierCurveTo(2, 18, 2, 12, 6, 11)
            ctx.bezierCurveTo(7, 5, 16, 4, 18, 10)
            ctx.bezierCurveTo(23, 10, 23, 18, 18, 18)
            ctx.closePath()
            ctx.stroke()
            break
        case "clock":
            circle(12, 12, 9)
            line([12, 6, 12, 12, 16, 14])
            break
        case "hard-drive":
            rect(3, 5, 18, 14, 2)
            line([3, 14, 21, 14])
            circle(7, 17, 0.6)
            circle(11, 17, 0.6)
            break
        case "image":
            rect(3, 4, 18, 16, 2)
            circle(8, 9, 1.5)
            line([4, 18, 10, 12, 13, 15, 17, 10, 21, 16])
            break
        case "archive":
            rect(4, 7, 16, 13, 2)
            line([3, 4, 21, 4, 21, 8, 3, 8, 3, 4])
            line([10, 11, 14, 11])
            break
        case "code":
            line([9, 6, 4, 12, 9, 18])
            line([15, 6, 20, 12, 15, 18])
            line([13, 4, 11, 20])
            break
        case "finance":
            rect(3, 6, 18, 14, 2)
            line([3, 9, 21, 9])
            rect(14, 12, 7, 5, 1)
            circle(17, 14.5, 0.5)
            break
        case "culture":
            rect(3, 4, 18, 16, 2)
            line([7, 4, 7, 20])
            line([17, 4, 17, 20])
            line([3, 9, 7, 9])
            line([17, 15, 21, 15])
            break
        case "video":
            rect(3, 4, 18, 16, 2)
            ctx.beginPath()
            ctx.moveTo(10, 8)
            ctx.lineTo(16, 12)
            ctx.lineTo(10, 16)
            ctx.closePath()
            ctx.stroke()
            break
        case "anki":
            line([12, 3, 20, 7.5, 20, 16.5, 12, 21, 4, 16.5, 4, 7.5, 12, 3])
            line([8, 9, 16, 9])
            line([8, 12, 16, 12])
            line([8, 15, 13, 15])
            break
        case "focus":
            circle(12, 13, 8)
            line([12, 13, 12, 8])
            line([12, 13, 16, 15])
            line([9, 2, 15, 2])
            line([12, 2, 12, 5])
            break
        case "calendar":
            rect(3, 5, 18, 16, 2)
            line([3, 10, 21, 10])
            line([8, 3, 8, 7])
            line([16, 3, 16, 7])
            circle(8, 14, 0.5)
            circle(12, 14, 0.5)
            circle(16, 14, 0.5)
            break
        case "habits":
            line([13, 2, 5, 13, 11, 13, 9, 22, 19, 9, 13, 9, 13, 2])
            break
        case "diagrams":
            line([4, 20, 7, 13, 13, 7, 20, 4])
            circle(4, 20, 2)
            circle(7, 13, 2)
            circle(13, 7, 2)
            circle(20, 4, 2)
            break
        case "vault":
            line([12, 3, 20, 6, 19, 14, 16, 19, 12, 21, 8, 19, 5, 14, 4, 6, 12, 3])
            circle(12, 12, 2)
            line([12, 14, 12, 17])
            break
        case "trash":
            rect(5, 7, 14, 14, 2)
            line([3, 7, 21, 7])
            line([9, 4, 15, 4])
            line([10, 11, 10, 18])
            line([14, 11, 14, 18])
            break
        case "settings":
            circle(12, 12, 3)
            circle(12, 12, 8)
            line([12, 2, 12, 4])
            line([12, 20, 12, 22])
            line([2, 12, 4, 12])
            line([20, 12, 22, 12])
            line([5, 5, 6.5, 6.5])
            line([17.5, 17.5, 19, 19])
            line([5, 19, 6.5, 17.5])
            line([17.5, 6.5, 19, 5])
            break
        case "search":
            circle(10.5, 10.5, 6.5)
            line([15.5, 15.5, 21, 21])
            break
        case "plus":
            line([12, 5, 12, 19])
            line([5, 12, 19, 12])
            break
        case "close":
            line([6, 6, 18, 18])
            line([18, 6, 6, 18])
            break
        case "bell":
            line([18, 9, 18, 13, 20, 17, 4, 17, 6, 13, 6, 9])
            ctx.beginPath()
            ctx.arc(12, 9, 6, Math.PI, 0, false)
            ctx.stroke()
            ctx.beginPath()
            ctx.arc(12, 19, 2, 0, Math.PI)
            ctx.stroke()
            break
        case "pin":
            line([12, 17, 12, 22])
            line([9, 4, 15, 4])
            line([9, 4, 9, 9, 7, 12, 17, 12, 15, 9, 15, 4])
            break
        case "pin-off":
            line([2, 2, 22, 22])
            line([12, 17, 12, 22])
            line([9, 4, 15, 4])
            break
        case "copy":
            rect(8, 8, 12, 12, 2)
            line([4, 16, 4, 4, 16, 4])
            break
        case "arrow-right":
            line([5, 12, 19, 12])
            line([13, 6, 19, 12, 13, 18])
            break
        case "check":
            line([4, 12, 9, 17, 20, 6])
            break
        case "alert":
            circle(12, 12, 9)
            line([12, 8, 12, 13])
            circle(12, 16, 0.6)
            break
        case "loader":
            ctx.beginPath()
            ctx.arc(12, 12, 8, 0, Math.PI * 1.5)
            ctx.stroke()
            break
        case "more-vertical":
            circle(12, 6, 1)
            circle(12, 12, 1)
            circle(12, 18, 1)
            break
        case "edit":
            line([4, 20, 8, 20, 20, 8, 16, 4, 4, 16, 4, 20])
            line([14, 6, 18, 10])
            break
        default:
            circle(12, 12, 8)
        }

        ctx.restore()
    }
}
