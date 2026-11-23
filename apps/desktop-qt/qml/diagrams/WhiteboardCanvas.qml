import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: canvasRoot
    Layout.fillWidth: true
    Layout.fillHeight: true
    color: "#0c0b12"
    clip: true

    property var shapes: []
    property var currentPath: []
    property var undoStack: []
    property var redoStack: []
    property string activeTool: "pen"
    property string activeDrawColor: "#8b5cf6"
    property int activeLineWidth: 2
    property real zoomLevel: 1.0
    property real panX: 0
    property real panY: 0
    property int selectedShapeIndex: -1

    signal saveRequested()

    function requestPaint() {
        diagramCanvas.requestPaint()
    }

    function pushHistory() {
        undoStack.push(JSON.parse(JSON.stringify(shapes)))
        redoStack = []
    }

    function undo() {
        if (undoStack.length === 0) return
        redoStack.push(JSON.parse(JSON.stringify(shapes)))
        shapes = undoStack.pop()
        requestPaint()
        saveRequested()
    }

    function redo() {
        if (redoStack.length === 0) return
        undoStack.push(JSON.parse(JSON.stringify(shapes)))
        shapes = redoStack.pop()
        requestPaint()
        saveRequested()
    }

    function zoomIn() {
        zoomLevel = Math.min(3.0, zoomLevel + 0.15)
        requestPaint()
    }

    function zoomOut() {
        zoomLevel = Math.max(0.3, zoomLevel - 0.15)
        requestPaint()
    }

    function zoomReset() {
        zoomLevel = 1.0
        panX = 0
        panY = 0
        requestPaint()
    }

    function drawArrow(ctx, fromx, fromy, tox, toy) {
        var headlen = 10
        var dx = tox - fromx
        var dy = toy - fromy
        var angle = Math.atan2(dy, dx)
        ctx.beginPath()
        ctx.moveTo(fromx, fromy)
        ctx.lineTo(tox, toy)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(tox, toy)
        ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6))
        ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6))
        ctx.closePath()
        ctx.fill()
    }

    Canvas {
        id: diagramCanvas
        anchors.fill: parent

        onPaint: {
            var ctx = getContext("2d")
            ctx.reset()
            ctx.clearRect(0, 0, width, height)

            ctx.save()
            ctx.translate(canvasRoot.panX, canvasRoot.panY)
            ctx.scale(canvasRoot.zoomLevel, canvasRoot.zoomLevel)

            // Draw grid dots
            ctx.fillStyle = "#08ffffff"
            var startX = Math.floor(-canvasRoot.panX / canvasRoot.zoomLevel / 30) * 30 - 30
            var startY = Math.floor(-canvasRoot.panY / canvasRoot.zoomLevel / 30) * 30 - 30
            var endX = startX + (width / canvasRoot.zoomLevel) + 60
            var endY = startY + (height / canvasRoot.zoomLevel) + 60

            for (var x = startX; x < endX; x += 30) {
                for (var y = startY; y < endY; y += 30) {
                    ctx.fillRect(x, y, 2, 2)
                }
            }

            // Render saved shapes
            for (var i = 0; i < canvasRoot.shapes.length; i++) {
                var s = canvasRoot.shapes[i]
                ctx.strokeStyle = s.color || "#8b5cf6"
                ctx.fillStyle = s.color || "#8b5cf6"
                ctx.lineWidth = s.lineWidth || 2

                if (s.type === "path" && s.points && s.points.length > 1) {
                    ctx.beginPath()
                    ctx.moveTo(s.points[0].x, s.points[0].y)
                    for (var p = 1; p < s.points.length; p++) {
                        ctx.lineTo(s.points[p].x, s.points[p].y)
                    }
                    ctx.stroke()
                } else if (s.type === "rect") {
                    ctx.strokeRect(s.x, s.y, s.w, s.h)
                } else if (s.type === "circle") {
                    ctx.beginPath()
                    ctx.arc(s.x + s.w / 2, s.y + s.h / 2, Math.abs(s.w) / 2, 0, 2 * Math.PI)
                    ctx.stroke()
                } else if (s.type === "arrow") {
                    canvasRoot.drawArrow(ctx, s.x, s.y, s.x + s.w, s.y + s.h)
                } else if (s.type === "line") {
                    ctx.beginPath()
                    ctx.moveTo(s.x, s.y)
                    ctx.lineTo(s.x + s.w, s.y + s.h)
                    ctx.stroke()
                } else if (s.type === "diamond") {
                    ctx.beginPath()
                    ctx.moveTo(s.x + s.w / 2, s.y)
                    ctx.lineTo(s.x + s.w, s.y + s.h / 2)
                    ctx.lineTo(s.x + s.w / 2, s.y + s.h)
                    ctx.lineTo(s.x, s.y + s.h / 2)
                    ctx.closePath()
                    ctx.stroke()
                } else if (s.type === "text") {
                    ctx.fillStyle = s.color || "#ffffff"
                    ctx.font = (s.fontSize || 14) + "px sans-serif"
                    ctx.fillText(s.text || "Texto", s.x, s.y)
                } else if (s.type === "sticky") {
                    ctx.fillStyle = s.color + "22"
                    ctx.fillRect(s.x, s.y, 140, 90)
                    ctx.strokeStyle = s.color
                    ctx.strokeRect(s.x, s.y, 140, 90)
                    ctx.fillStyle = "#ffffff"
                    ctx.font = "12px sans-serif"
                    ctx.fillText(s.text || "Nota Adesiva", s.x + 10, s.y + 24)
                }
            }

            // Render current drawing path
            if (canvasRoot.currentPath.length > 1) {
                ctx.strokeStyle = canvasRoot.activeDrawColor
                ctx.lineWidth = canvasRoot.activeLineWidth
                ctx.beginPath()
                ctx.moveTo(canvasRoot.currentPath[0].x, canvasRoot.currentPath[0].y)
                for (var cp = 1; cp < canvasRoot.currentPath.length; cp++) {
                    ctx.lineTo(canvasRoot.currentPath[cp].x, canvasRoot.currentPath[cp].y)
                }
                ctx.stroke()
            }

            ctx.restore()
        }

        MouseArea {
            id: canvasMouseArea
            anchors.fill: parent
            hoverEnabled: true
            acceptedButtons: Qt.LeftButton | Qt.MiddleButton
            cursorShape: {
                if (canvasRoot.activeTool === "hand") return Qt.OpenHandCursor
                if (canvasRoot.activeTool === "eraser") return Qt.PointingHandCursor
                return Qt.CrossCursor
            }

            property real startX: 0
            property real startY: 0
            property real lastPanX: 0
            property real lastPanY: 0

            function screenToWorldX(sx) {
                return (sx - canvasRoot.panX) / canvasRoot.zoomLevel
            }
            function screenToWorldY(sy) {
                return (sy - canvasRoot.panY) / canvasRoot.zoomLevel
            }

            onWheel: function(wheel) {
                if (wheel.angleDelta.y > 0) canvasRoot.zoomIn()
                else canvasRoot.zoomOut()
            }

            onPressed: function(mouse) {
                var wx = screenToWorldX(mouse.x)
                var wy = screenToWorldY(mouse.y)
                startX = wx
                startY = wy
                lastPanX = mouse.x
                lastPanY = mouse.y

                if (mouse.button === Qt.MiddleButton || canvasRoot.activeTool === "hand") {
                    return
                }
                if (canvasRoot.activeTool === "select") {
                    if (canvasRoot.selectedShapeIndex >= 0) canvasRoot.saveRequested()
                    return
                }

                if (canvasRoot.activeTool === "select") {
                    canvasRoot.selectedShapeIndex = -1
                    for (var si = canvasRoot.shapes.length - 1; si >= 0; si--) {
                        var obj = canvasRoot.shapes[si]
                        if (obj.x !== undefined && obj.y !== undefined) {
                            var ow = Math.abs(obj.w || 120)
                            var oh = Math.abs(obj.h || 60)
                            if (wx >= obj.x - 10 && wx <= obj.x + ow + 10 && wy >= obj.y - 20 && wy <= obj.y + oh + 10) {
                                canvasRoot.selectedShapeIndex = si
                                canvasRoot.pushHistory()
                                break
                            }
                        }
                    }
                    return
                }

                if (canvasRoot.activeTool === "eraser") {
                    canvasRoot.pushHistory()
                    var remaining = []
                    for (var i = 0; i < canvasRoot.shapes.length; i++) {
                        var sh = canvasRoot.shapes[i]
                        var hit = false
                        if (sh.x !== undefined && sh.y !== undefined) {
                            var w = sh.w || 100
                            var h = sh.h || 50
                            if (wx >= sh.x && wx <= sh.x + w && wy >= sh.y && wy <= sh.y + h) {
                                hit = true
                            }
                        }
                        if (!hit) remaining.push(sh)
                    }
                    canvasRoot.shapes = remaining
                    diagramCanvas.requestPaint()
                    canvasRoot.saveRequested()
                } else if (canvasRoot.activeTool === "pen") {
                    canvasRoot.currentPath = [{ x: wx, y: wy }]
                } else if (canvasRoot.activeTool === "sticky") {
                    canvasRoot.pushHistory()
                    canvasRoot.shapes.push({
                        type: "sticky", x: wx, y: wy, color: canvasRoot.activeDrawColor, text: "Nova Nota"
                    })
                    diagramCanvas.requestPaint()
                    canvasRoot.saveRequested()
                } else if (canvasRoot.activeTool === "text") {
                    canvasRoot.pushHistory()
                    canvasRoot.shapes.push({
                        type: "text", x: wx, y: wy, color: canvasRoot.activeDrawColor, text: "Novo Texto"
                    })
                    diagramCanvas.requestPaint()
                    canvasRoot.saveRequested()
                }
            }

            onPositionChanged: function(mouse) {
                if (mouse.buttons & Qt.MiddleButton || (mouse.buttons & Qt.LeftButton && canvasRoot.activeTool === "hand")) {
                    canvasRoot.panX += (mouse.x - lastPanX)
                    canvasRoot.panY += (mouse.y - lastPanY)
                    lastPanX = mouse.x
                    lastPanY = mouse.y
                    diagramCanvas.requestPaint()
                    return
                }

                if (mouse.buttons & Qt.LeftButton && canvasRoot.activeTool === "select" && canvasRoot.selectedShapeIndex >= 0) {
                    var nwx = screenToWorldX(mouse.x)
                    var nwy = screenToWorldY(mouse.y)
                    var dx = nwx - startX
                    var dy = nwy - startY
                    startX = nwx
                    startY = nwy
                    var target = canvasRoot.shapes[canvasRoot.selectedShapeIndex]
                    if (target && target.x !== undefined) {
                        target.x += dx
                        target.y += dy
                        diagramCanvas.requestPaint()
                    }
                    return
                }

                if (mouse.buttons & Qt.LeftButton && canvasRoot.activeTool === "pen") {
                    var wx = screenToWorldX(mouse.x)
                    var wy = screenToWorldY(mouse.y)
                    canvasRoot.currentPath.push({ x: wx, y: wy })
                    diagramCanvas.requestPaint()
                }
            }

            onReleased: function(mouse) {
                if (mouse.button === Qt.MiddleButton || canvasRoot.activeTool === "hand") {
                    return
                }
                if (canvasRoot.activeTool === "select") {
                    if (canvasRoot.selectedShapeIndex >= 0) canvasRoot.saveRequested()
                    return
                }

                var wx = screenToWorldX(mouse.x)
                var wy = screenToWorldY(mouse.y)
                var diffX = wx - startX
                var diffY = wy - startY

                if (canvasRoot.activeTool === "pen") {
                    if (canvasRoot.currentPath.length > 1) {
                        canvasRoot.pushHistory()
                        canvasRoot.shapes.push({
                            type: "path", points: canvasRoot.currentPath, color: canvasRoot.activeDrawColor, lineWidth: canvasRoot.activeLineWidth
                        })
                        canvasRoot.currentPath = []
                        diagramCanvas.requestPaint()
                        canvasRoot.saveRequested()
                    }
                } else if (canvasRoot.activeTool === "rect" || canvasRoot.activeTool === "circle" || canvasRoot.activeTool === "arrow" || canvasRoot.activeTool === "line" || canvasRoot.activeTool === "diamond") {
                    if (Math.abs(diffX) > 4 || Math.abs(diffY) > 4) {
                        canvasRoot.pushHistory()
                        canvasRoot.shapes.push({
                            type: canvasRoot.activeTool,
                            x: startX,
                            y: startY,
                            w: diffX,
                            h: diffY,
                            color: canvasRoot.activeDrawColor,
                            lineWidth: canvasRoot.activeLineWidth
                        })
                        diagramCanvas.requestPaint()
                        canvasRoot.saveRequested()
                    }
                }
            }
        }
    }
}
