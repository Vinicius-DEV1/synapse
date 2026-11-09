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
    property string activeTool: "pen"
    property string activeDrawColor: "#8b5cf6"

    signal saveRequested()

    function requestPaint() {
        diagramCanvas.requestPaint()
    }

    Canvas {
        id: diagramCanvas
        anchors.fill: parent

        onPaint: {
            var ctx = getContext("2d")
            ctx.clearRect(0, 0, width, height)

            // Draw grid dots
            ctx.fillStyle = "#ffffff08"
            for (var x = 20; x < width; x += 30) {
                for (var y = 20; y < height; y += 30) {
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
                } else if (s.type === "sticky") {
                    ctx.fillStyle = s.color + "33"
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
                ctx.lineWidth = 2
                ctx.beginPath()
                ctx.moveTo(canvasRoot.currentPath[0].x, canvasRoot.currentPath[0].y)
                for (var cp = 1; cp < canvasRoot.currentPath.length; cp++) {
                    ctx.lineTo(canvasRoot.currentPath[cp].x, canvasRoot.currentPath[cp].y)
                }
                ctx.stroke()
            }
        }

        MouseArea {
            id: canvasMouseArea
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.CrossCursor

            property real startX: 0
            property real startY: 0

            onPressed: {
                startX = mouseX
                startY = mouseY

                if (canvasRoot.activeTool === "pen") {
                    canvasRoot.currentPath = [{ x: mouseX, y: mouseY }]
                } else if (canvasRoot.activeTool === "sticky") {
                    canvasRoot.shapes.push({
                        type: "sticky",
                        x: mouseX,
                        y: mouseY,
                        text: "Ideia Principal",
                        color: canvasRoot.activeDrawColor
                    })
                    diagramCanvas.requestPaint()
                    autoSaveTimer.restart()
                }
            }

            onPositionChanged: {
                if (pressed && canvasRoot.activeTool === "pen") {
                    canvasRoot.currentPath.push({ x: mouseX, y: mouseY })
                    diagramCanvas.requestPaint()
                }
            }

            onReleased: {
                if (canvasRoot.activeTool === "pen" && canvasRoot.currentPath.length > 1) {
                    canvasRoot.shapes.push({
                        type: "path",
                        points: canvasRoot.currentPath,
                        color: canvasRoot.activeDrawColor,
                        lineWidth: 2
                    })
                    canvasRoot.currentPath = []
                } else if (canvasRoot.activeTool === "rect") {
                    canvasRoot.shapes.push({
                        type: "rect",
                        x: Math.min(startX, mouseX),
                        y: Math.min(startY, mouseY),
                        w: Math.abs(mouseX - startX),
                        h: Math.abs(mouseY - startY),
                        color: canvasRoot.activeDrawColor
                    })
                } else if (canvasRoot.activeTool === "circle") {
                    canvasRoot.shapes.push({
                        type: "circle",
                        x: Math.min(startX, mouseX),
                        y: Math.min(startY, mouseY),
                        w: Math.abs(mouseX - startX),
                        h: Math.abs(mouseY - startY),
                        color: canvasRoot.activeDrawColor
                    })
                }
                diagramCanvas.requestPaint()
                autoSaveTimer.restart()
            }
        }
    }

    Timer {
        id: autoSaveTimer
        interval: 1500
        onTriggered: canvasRoot.saveRequested()
    }
}
