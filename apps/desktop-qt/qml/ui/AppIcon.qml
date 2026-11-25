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
        case "shield":
            line([12, 3, 20, 6, 19, 14, 16, 19, 12, 21, 8, 19, 5, 14, 4, 6, 12, 3])
            circle(12, 12, 2)
            line([12, 14, 12, 17])
            break
        case "key":
            circle(7.5, 12, 3.5)
            line([11, 12, 19, 12])
            line([16, 12, 16, 15])
            line([19, 12, 19, 15])
            break
        case "eye":
            ctx.beginPath()
            ctx.moveTo(2, 12)
            ctx.bezierCurveTo(6, 6, 18, 6, 22, 12)
            ctx.bezierCurveTo(18, 18, 6, 18, 2, 12)
            ctx.stroke()
            circle(12, 12, 3)
            break
        case "eye-off":
            line([2, 2, 22, 22])
            ctx.beginPath()
            ctx.moveTo(6.7, 6.7)
            ctx.bezierCurveTo(8.3, 6.2, 10.1, 6, 12, 6)
            ctx.bezierCurveTo(18, 6, 22, 12, 22, 12)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(2, 12)
            ctx.bezierCurveTo(2, 12, 4.4, 15.6, 8.5, 17.2)
            ctx.stroke()
            break
        case "history":
            circle(12, 12, 8)
            line([12, 8, 12, 12, 15, 14])
            break
        case "help":
            circle(12, 12, 9)
            line([12, 16, 12, 16.5])
            line([10, 9, 12, 7, 14, 9, 12, 12, 12, 13])
            break
        case "refresh":
            ctx.beginPath()
            ctx.arc(12, 12, 7, 0.2, Math.PI * 1.5, false)
            ctx.stroke()
            line([17, 11, 19, 13, 21, 11])
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
        case "keyboard":
            rect(3, 6, 18, 12, 2)
            line([7, 10, 8, 10])
            line([11, 10, 13, 10])
            line([16, 10, 17, 10])
            line([7, 14, 17, 14])
            break
        case "zap":
            line([13, 2, 3, 14, 12, 14, 11, 22, 21, 10, 12, 10, 13, 2])
            break
        case "share":
        case "share-2":
            circle(18, 5, 2.5)
            circle(6, 12, 2.5)
            circle(18, 19, 2.5)
            line([8.5, 10.5, 15.5, 6.5])
            line([8.5, 13.5, 15.5, 17.5])
            break
        case "layout":
            rect(3, 3, 18, 18, 2)
            line([3, 9, 21, 9])
            line([9, 9, 9, 21])
            break
        case "download-cloud":
        case "backup":
            ctx.beginPath()
            ctx.arc(8, 13, 4, Math.PI * 0.7, Math.PI * 1.8)
            ctx.arc(14, 10, 5, Math.PI * 1.1, Math.PI * 2.1)
            ctx.arc(17, 14, 3, Math.PI * 1.7, Math.PI * 0.3)
            ctx.lineTo(6, 17)
            ctx.stroke()
            line([12, 12, 12, 20])
            line([9, 17, 12, 20, 15, 17])
            break
        case "sparkles":
            line([12, 3, 13.8, 8.2, 19, 10, 13.8, 11.8, 12, 17, 10.2, 11.8, 5, 10, 10.2, 8.2, 12, 3])
            line([19, 15, 19, 21])
            line([16, 18, 22, 18])
            break
        case "upload":
            line([21, 15, 21, 19, 19, 21, 5, 21, 3, 19, 3, 15])
            line([17, 8, 12, 3, 7, 8])
            line([12, 3, 12, 15])
            break
        case "download":
            line([21, 15, 21, 19, 19, 21, 5, 21, 3, 19, 3, 15])
            line([7, 10, 12, 15, 17, 10])
            line([12, 15, 12, 3])
            break
        case "more-horizontal":
            circle(5, 12, 1.2)
            circle(12, 12, 1.2)
            circle(19, 12, 1.2)
            break
        case "palette":
            circle(12, 12, 9)
            circle(8.5, 10, 1)
            circle(12, 7.5, 1)
            circle(15.5, 10, 1)
            circle(9.5, 14.5, 1.3)
            break
        case "panel-left":
            rect(3, 4, 18, 16, 2)
            line([9, 4, 9, 20])
            break
        case "chevron-down":
            line([6, 9, 12, 15, 18, 9])
            break
        case "chevron-right":
            line([9, 6, 15, 12, 9, 18])
            break
        case "file-symlink":
            rect(4, 3, 16, 18, 2)
            line([8, 14, 15, 9])
            line([11, 9, 15, 9, 15, 13])
            break
        case "external-link":
            line([15, 3, 21, 3, 21, 9])
            line([10, 14, 21, 3])
            line([18, 13, 18, 20, 4, 20, 4, 6, 11, 6])
            break
        case "play":
            ctx.beginPath()
            ctx.moveTo(6, 4)
            ctx.lineTo(20, 12)
            ctx.lineTo(6, 20)
            ctx.closePath()
            ctx.stroke()
            break
        case "pause":
            rect(6, 4, 4, 16, 1)
            rect(14, 4, 4, 16, 1)
            break
        case "check-circle":
            circle(12, 12, 9)
            line([8.5, 12.5, 11, 15, 16, 9.5])
            break
        case "flame":
            ctx.beginPath()
            ctx.moveTo(12, 3)
            ctx.bezierCurveTo(13, 7, 18, 8.5, 18, 14)
            ctx.bezierCurveTo(18, 18, 15.3, 21, 12, 21)
            ctx.bezierCurveTo(8.7, 21, 6, 18, 6, 14)
            ctx.bezierCurveTo(6, 10.5, 8.5, 8.5, 9.5, 6.5)
            ctx.bezierCurveTo(10, 8.5, 11, 9, 12, 3)
            ctx.closePath()
            ctx.stroke()
            break
        case "activity":
        case "analytics":
            line([22, 12, 18, 12, 15, 21, 9, 3, 6, 12, 2, 12])
            break
        case "layers":
            line([12, 2, 2, 7, 12, 12, 22, 7, 12, 2])
            line([2, 12, 12, 17, 22, 12])
            line([2, 17, 12, 22, 22, 17])
            break
        case "globe":
            circle(12, 12, 9)
            line([3, 12, 21, 12])
            ctx.beginPath()
            ctx.ellipse(8.5, 3, 7, 18)
            ctx.stroke()
            break
        case "book-open":
            ctx.beginPath()
            ctx.moveTo(2, 4)
            ctx.lineTo(8, 4)
            ctx.quadraticCurveTo(12, 4, 12, 8)
            ctx.lineTo(12, 20)
            ctx.quadraticCurveTo(12, 17, 8, 17)
            ctx.lineTo(2, 17)
            ctx.closePath()
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(22, 4)
            ctx.lineTo(16, 4)
            ctx.quadraticCurveTo(12, 4, 12, 8)
            ctx.lineTo(12, 20)
            ctx.quadraticCurveTo(12, 17, 16, 17)
            ctx.lineTo(22, 17)
            ctx.closePath()
            ctx.stroke()
            break
        case "film":
            rect(3, 3, 18, 18, 2)
            line([7, 3, 7, 21])
            line([17, 3, 17, 21])
            line([3, 12, 21, 12])
            line([3, 7, 7, 7])
            line([3, 17, 7, 17])
            line([17, 7, 21, 7])
            line([17, 17, 21, 17])
            break
        case "file-text":
            line([14, 2, 6, 2, 4, 4, 4, 20, 6, 22, 18, 22, 20, 20, 20, 8, 14, 2])
            line([14, 2, 14, 8, 20, 8])
            line([8, 13, 16, 13])
            line([8, 17, 16, 17])
            line([8, 9, 10, 9])
            break
        case "tag":
            line([12, 2, 2, 2, 2, 12, 12, 22, 22, 12, 12, 2])
            circle(7, 7, 1.2)
            break
        case "hourglass":
            line([5, 2, 19, 2])
            line([5, 22, 19, 22])
            line([6, 2, 6, 7, 12, 12, 6, 17, 6, 22])
            line([18, 2, 18, 7, 12, 12, 18, 17, 18, 22])
            break
        case "list-video":
            line([12, 12, 3, 12])
            line([16, 6, 3, 6])
            line([12, 18, 3, 18])
            ctx.beginPath()
            ctx.moveTo(16, 12)
            ctx.lineTo(21, 15)
            ctx.lineTo(16, 18)
            ctx.closePath()
            ctx.stroke()
            break
        case "list-tree":
            line([9, 6, 20, 6])
            line([13, 12, 20, 12])
            line([13, 18, 20, 18])
            line([5, 6, 5, 18, 9, 18])
            line([5, 12, 9, 12])
            break
        case "arrow-up":
            line([12, 19, 12, 5])
            line([6, 11, 12, 5, 18, 11])
            break
        case "arrow-down":
            line([12, 5, 12, 19])
            line([6, 13, 12, 19, 18, 13])
            break
        case "link":
            ctx.beginPath()
            ctx.arc(9, 12, 4, Math.PI * 0.5, Math.PI * 1.5, false)
            ctx.stroke()
            ctx.beginPath()
            ctx.arc(15, 12, 4, Math.PI * 1.5, Math.PI * 0.5, false)
            ctx.stroke()
            line([8, 12, 16, 12])
            break
        case "maximize":
            line([15, 3, 21, 3, 21, 9])
            line([9, 21, 3, 21, 3, 15])
            line([21, 3, 14, 10])
            line([3, 21, 10, 14])
            break
        case "quote":
            rect(4, 7, 6, 6, 1.5)
            line([10, 13, 8, 18])
            rect(14, 7, 6, 6, 1.5)
            line([20, 13, 18, 18])
            break
        case "minus":
            line([4, 12, 20, 12])
            break
        case "list":
            line([8, 6, 21, 6])
            line([8, 12, 21, 12])
            line([8, 18, 21, 18])
            circle(4, 6, 1)
            circle(4, 12, 1)
            circle(4, 18, 1)
            break
        default:
            circle(12, 12, 8)
        }

        ctx.restore()
    }
}
