import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: diagramsRoot
    color: "#0f0e17" // bg-dark-bg

    property var diagramsList: []
    property var activeDiagram: null
    property bool isEditing: false
    property bool isCreatingModal: false
    property string activeTool: "pen" // "select", "pen", "rect", "circle", "sticky", "text"
    property string activeDrawColor: "#8b5cf6"
    property double zoomLevel: 1.0
    property var shapes: []
    property var currentPath: []

    function loadDiagrams() {
        diagramsList = dataController.getDiagrams()
    }

    function openDiagram(d) {
        var full = dataController.getDiagram(d.id)
        activeDiagram = full
        try {
            shapes = JSON.parse(full.content || "[]")
        } catch (e) {
            shapes = []
        }
        isEditing = true
        diagramCanvas.requestPaint()
    }

    function saveActiveDiagram() {
        if (!activeDiagram) return
        var contentStr = JSON.stringify(shapes)
        dataController.saveDiagram(activeDiagram.id, activeDiagram.title, contentStr, activeDiagram.icon || "🎨")
        loadDiagrams()
    }

    function exitEditor() {
        saveActiveDiagram()
        isEditing = false
        activeDiagram = null
        shapes = []
        loadDiagrams()
    }

    Component.onCompleted: {
        loadDiagrams()
    }

    // =========================================================================
    // View 1: Diagrams Gallery
    // =========================================================================
    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 20
        visible: !diagramsRoot.isEditing

        // Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 16

            ColumnLayout {
                spacing: 4
                Text {
                    text: "🎨 Diagramas & Whiteboard Infinito"
                    color: "#fffffe"
                    font.pixelSize: 24
                    font.bold: true
                }
                Text {
                    text: diagramsRoot.diagramsList.length + " diagrama(s) no acervo • Mapas mentais, fluxogramas e lousa infinita"
                    color: "#a7a9be"
                    font.pixelSize: 13
                }
            }

            Item { Layout.fillWidth: true }

            Rectangle {
                width: 144
                height: 40
                radius: 10
                color: newMouse.containsMouse ? "#7c3aed" : "#8b5cf6"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                    Text { text: "Novo Diagrama"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                }

                MouseArea {
                    id: newMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        diagramTitleInput.text = ""
                        diagramsRoot.isCreatingModal = true
                    }
                }
            }
        }

        // Diagrams Grid
        GridView {
            id: diagramsGrid
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            cellWidth: 260
            cellHeight: 180
            model: diagramsRoot.diagramsList

            delegate: Rectangle {
                width: 244
                height: 164
                radius: 12
                color: cardMouse.containsMouse ? "#201e30" : "#1a1924"
                border.color: cardMouse.containsMouse ? "#8b5cf680" : "#ffffff0f"
                border.width: 1

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 16
                    spacing: 10

                    RowLayout {
                        Layout.fillWidth: true
                        Rectangle {
                            width: 36; height: 36; radius: 8; color: "#8b5cf620"
                            Text { anchors.centerIn: parent; text: modelData.icon || "🎨"; font.pixelSize: 18 }
                        }
                        Item { Layout.fillWidth: true }
                        // Delete Button
                        Rectangle {
                            width: 28; height: 28; radius: 6; color: delMouse.containsMouse ? "#f43f5e26" : "transparent"
                            Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 11 }
                            MouseArea {
                                id: delMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    dataController.deleteDiagram(modelData.id)
                                    diagramsRoot.loadDiagrams()
                                }
                            }
                        }
                    }

                    Text {
                        text: modelData.title || "Sem título"
                        color: "#fffffe"
                        font.pixelSize: 15
                        font.bold: true
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }

                    Item { Layout.fillHeight: true }

                    RowLayout {
                        Layout.fillWidth: true
                        Text {
                            text: modelData.updated_at ? modelData.updated_at.substring(0, 10) : "Hoje"
                            color: "#64748b"
                            font.pixelSize: 11
                        }
                        Item { Layout.fillWidth: true }
                        Text {
                            text: "Abrir Lousa →"
                            color: "#c4b5fd"
                            font.pixelSize: 11
                            font.bold: true
                        }
                    }
                }

                MouseArea {
                    id: cardMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    z: -1
                    onClicked: diagramsRoot.openDiagram(modelData)
                }
            }

            Text {
                anchors.centerIn: parent
                visible: diagramsRoot.diagramsList.length === 0
                text: "Nenhum diagrama criado. Clique em '+ Novo Diagrama' para começar a desenhar!"
                color: "#64748b"
                font.pixelSize: 14
            }
        }
    }

    // =========================================================================
    // View 2: Whiteboard / Canvas Editor
    // =========================================================================
    ColumnLayout {
        anchors.fill: parent
        spacing: 0
        visible: diagramsRoot.isEditing

        // Top Toolbar
        Rectangle {
            Layout.fillWidth: true
            height: 56
            color: "#161524"
            border.color: "#ffffff0f"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.margins: 12
                spacing: 12

                // Back Button
                Rectangle {
                    width: 90; height: 34; radius: 8; color: "#211f30"
                    RowLayout {
                        anchors.centerIn: parent; spacing: 4
                        Text { text: "←"; color: "#a7a9be"; font.pixelSize: 14; font.bold: true }
                        Text { text: "Voltar"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: diagramsRoot.exitEditor()
                    }
                }

                Rectangle { width: 1; height: 24; color: "#ffffff12" }

                // Title
                Text {
                    text: (diagramsRoot.activeDiagram ? diagramsRoot.activeDiagram.title : "Diagrama")
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                }

                Item { Layout.fillWidth: true }

                // Drawing Tools Group
                RowLayout {
                    spacing: 4

                    ToolButtonPill {
                        toolName: "pen"
                        label: "✏️ Caneta"
                        isSelected: diagramsRoot.activeTool === "pen"
                        onClicked: diagramsRoot.activeTool = "pen"
                    }
                    ToolButtonPill {
                        toolName: "rect"
                        label: "▭ Retângulo"
                        isSelected: diagramsRoot.activeTool === "rect"
                        onClicked: diagramsRoot.activeTool = "rect"
                    }
                    ToolButtonPill {
                        toolName: "circle"
                        label: "○ Círculo"
                        isSelected: diagramsRoot.activeTool === "circle"
                        onClicked: diagramsRoot.activeTool = "circle"
                    }
                    ToolButtonPill {
                        toolName: "sticky"
                        label: "📌 Nota"
                        isSelected: diagramsRoot.activeTool === "sticky"
                        onClicked: diagramsRoot.activeTool = "sticky"
                    }
                }

                Rectangle { width: 1; height: 24; color: "#ffffff12" }

                // Color Selector
                RowLayout {
                    spacing: 6
                    Repeater {
                        model: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#fffffe"]
                        Rectangle {
                            width: 22; height: 22; radius: 11
                            color: modelData
                            border.color: diagramsRoot.activeDrawColor === modelData ? "#ffffff" : "transparent"
                            border.width: 2
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: diagramsRoot.activeDrawColor = modelData
                            }
                        }
                    }
                }

                Rectangle { width: 1; height: 24; color: "#ffffff12" }

                // Clear Canvas
                Rectangle {
                    width: 76; height: 32; radius: 6; color: "#f43f5e18"; border.color: "#f43f5e33"
                    Text { anchors.centerIn: parent; text: "Limpar"; color: "#fda4af"; font.pixelSize: 11; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            diagramsRoot.shapes = []
                            diagramCanvas.requestPaint()
                            diagramsRoot.saveActiveDiagram()
                        }
                    }
                }

                // Save Action
                Rectangle {
                    width: 80; height: 32; radius: 6; color: "#10b981"
                    Text { anchors.centerIn: parent; text: "Salvar ✓"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: diagramsRoot.saveActiveDiagram()
                    }
                }
            }
        }

        // Infinite Canvas Area
        Rectangle {
            Layout.fillWidth: true
            Layout.fillHeight: true
            color: "#0c0b12"
            clip: true

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
                    for (var i = 0; i < diagramsRoot.shapes.length; i++) {
                        var s = diagramsRoot.shapes[i]
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
                    if (diagramsRoot.currentPath.length > 1) {
                        ctx.strokeStyle = diagramsRoot.activeDrawColor
                        ctx.lineWidth = 2
                        ctx.beginPath()
                        ctx.moveTo(diagramsRoot.currentPath[0].x, diagramsRoot.currentPath[0].y)
                        for (var cp = 1; cp < diagramsRoot.currentPath.length; cp++) {
                            ctx.lineTo(diagramsRoot.currentPath[cp].x, diagramsRoot.currentPath[cp].y)
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

                        if (diagramsRoot.activeTool === "pen") {
                            diagramsRoot.currentPath = [{ x: mouseX, y: mouseY }]
                        } else if (diagramsRoot.activeTool === "sticky") {
                            diagramsRoot.shapes.push({
                                type: "sticky",
                                x: mouseX,
                                y: mouseY,
                                text: "Ideia Principal",
                                color: diagramsRoot.activeDrawColor
                            })
                            diagramCanvas.requestPaint()
                            autoSaveTimer.restart()
                        }
                    }

                    onPositionChanged: {
                        if (pressed && diagramsRoot.activeTool === "pen") {
                            diagramsRoot.currentPath.push({ x: mouseX, y: mouseY })
                            diagramCanvas.requestPaint()
                        }
                    }

                    onReleased: {
                        if (diagramsRoot.activeTool === "pen" && diagramsRoot.currentPath.length > 1) {
                            diagramsRoot.shapes.push({
                                type: "path",
                                points: diagramsRoot.currentPath,
                                color: diagramsRoot.activeDrawColor,
                                lineWidth: 2
                            })
                            diagramsRoot.currentPath = []
                        } else if (diagramsRoot.activeTool === "rect") {
                            diagramsRoot.shapes.push({
                                type: "rect",
                                x: Math.min(startX, mouseX),
                                y: Math.min(startY, mouseY),
                                w: Math.abs(mouseX - startX),
                                h: Math.abs(mouseY - startY),
                                color: diagramsRoot.activeDrawColor
                            })
                        } else if (diagramsRoot.activeTool === "circle") {
                            diagramsRoot.shapes.push({
                                type: "circle",
                                x: Math.min(startX, mouseX),
                                y: Math.min(startY, mouseY),
                                w: Math.abs(mouseX - startX),
                                h: Math.abs(mouseY - startY),
                                color: diagramsRoot.activeDrawColor
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
                onTriggered: diagramsRoot.saveActiveDiagram()
            }
        }
    }

    // Modal: Novo Diagrama
    Rectangle {
        anchors.fill: parent
        color: "#00000088"
        visible: diagramsRoot.isCreatingModal
        z: 99

        MouseArea { anchors.fill: parent; onClicked: diagramsRoot.isCreatingModal = false }

        Rectangle {
            anchors.centerIn: parent
            width: 440; height: 210; radius: 16
            color: "#161524"
            border.color: "#ffffff18"
            border.width: 1

            MouseArea { anchors.fill: parent }

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 24
                spacing: 16

                Text { text: "🎨 Novo Diagrama ou Mapa Mental"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }

                TextField {
                    id: diagramTitleInput
                    Layout.fillWidth: true
                    placeholderText: "Título do diagrama..."
                    color: "#ffffff"
                    background: Rectangle { color: "#0f0e17"; border.color: "#ffffff18"; radius: 8 }
                }

                Item { Layout.fillHeight: true }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Item { Layout.fillWidth: true }

                    Rectangle {
                        width: 90; height: 36; radius: 8; color: "#211f30"
                        Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: diagramsRoot.isCreatingModal = false }
                    }

                    Rectangle {
                        width: 130; height: 36; radius: 8; color: "#8b5cf6"
                        Text { anchors.centerIn: parent; text: "Criar Lousa"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                if (diagramTitleInput.text.trim().length > 0) {
                                    var newId = dataController.createDiagram(diagramTitleInput.text.trim(), "🎨")
                                    diagramsRoot.isCreatingModal = false
                                    diagramsRoot.loadDiagrams()
                                    if (newId) {
                                        diagramsRoot.openDiagram({ id: newId, title: diagramTitleInput.text.trim(), icon: "🎨" })
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Helper component for tool buttons
    component ToolButtonPill: Rectangle {
        property string toolName: ""
        property string label: ""
        property bool isSelected: false
        signal clicked()

        width: 86
        height: 32
        radius: 6
        color: isSelected ? "#8b5cf6" : "#211f30"
        border.color: isSelected ? "#a78bfa" : "#ffffff10"

        Text {
            anchors.centerIn: parent
            text: label
            color: isSelected ? "#ffffff" : "#a7a9be"
            font.pixelSize: 11
            font.bold: isSelected
        }

        MouseArea {
            anchors.fill: parent
            cursorShape: Qt.PointingHandCursor
            onClicked: parent.clicked()
        }
    }
}

