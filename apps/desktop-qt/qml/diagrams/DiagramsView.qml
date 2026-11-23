import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: diagramsRoot
    color: "#0f0e17" // bg-dark-bg

    property var diagramsList: []
    property var activeDiagram: null
    property string activeRawContent: ""
    property bool isEditing: false
    property bool isCreatingModal: false
    property bool isHelpOpen: false
    property bool isExportModalOpen: false
    property bool isImportModalOpen: false
    property string activeTool: "pen"
    property string activeDrawColor: "#8b5cf6"
    property var shapes: []
    property var currentPath: []

    function loadDiagrams() {
        diagramsList = dataController.getDiagrams()
    }

    function parseTldrawRecords(records) {
        if (!records || !Array.isArray(records)) return []
        var converted = []
        var colorMap = {
            "violet": "#8b5cf6", "blue": "#3b82f6", "red": "#ef4444",
            "green": "#10b981", "yellow": "#eab308", "white": "#ffffff",
            "black": "#000000", "grey": "#6b7280", "orange": "#f97316"
        }
        for (var i = 0; i < records.length; i++) {
            var rec = records[i]
            if (rec.typeName === "shape") {
                var props = rec.props || {}
                var c = colorMap[props.color] || props.color || "#8b5cf6"
                var rx = rec.x || 0
                var ry = rec.y || 0
                if (rec.type === "geo") {
                    converted.push({
                        type: props.geo === "ellipse" ? "circle" : "rect",
                        x: rx, y: ry, w: props.w || 100, h: props.h || 100,
                        color: c, lineWidth: 2
                    })
                } else if (rec.type === "draw" && props.segments && props.segments.length > 0) {
                    for (var seg = 0; seg < props.segments.length; seg++) {
                        var pts = props.segments[seg].points || []
                        if (pts.length > 0) {
                            var pList = []
                            for (var p = 0; p < pts.length; p++) {
                                pList.push({ x: rx + (pts[p].x || 0), y: ry + (pts[p].y || 0) })
                            }
                            converted.push({ type: "path", points: pList, color: c, lineWidth: 2 })
                        }
                    }
                } else if ((rec.type === "arrow" || rec.type === "line") && props.start && props.end) {
                    converted.push({
                        type: "path",
                        points: [
                            { x: rx + (props.start.x || 0), y: ry + (props.start.y || 0) },
                            { x: rx + (props.end.x || 0), y: ry + (props.end.y || 0) }
                        ],
                        color: c, lineWidth: 2
                    })
                }
            }
        }
        return converted
    }

    function exportToTldraw() {
        var records = [
            { "gridSize": 10, "name": "", "meta": {}, "id": "document:document", "typeName": "document" },
            { "id": "page:page", "name": "Page 1", "index": "a1", "typeName": "page", "meta": {} }
        ]
        var colorMap = {
            "#8b5cf6": "violet", "#3b82f6": "blue", "#ef4444": "red",
            "#10b981": "green", "#eab308": "yellow", "#ffffff": "white",
            "#000000": "black", "#6b7280": "grey", "#f97316": "orange"
        }
        for (var i = 0; i < shapes.length; i++) {
            var s = shapes[i]
            var id = "shape:" + (i + 1)
            var cName = colorMap[s.color] || "violet"
            if (s.type === "rect") {
                records.push({
                    "x": s.x || 0, "y": s.y || 0, "rotation": 0, "isLocked": false, "opacity": 1, "meta": {},
                    "id": id, "type": "geo",
                    "props": {
                        "w": s.w || 100, "h": s.h || 80, "geo": "rectangle", "color": cName,
                        "labelColor": "black", "fill": "none", "dash": "draw", "size": "m", "font": "draw",
                        "text": "", "align": "middle", "verticalAlign": "middle", "growY": 0, "url": "", "scale": 1
                    },
                    "parentId": "page:page", "index": "a" + (i + 2), "typeName": "shape"
                })
            } else if (s.type === "circle") {
                records.push({
                    "x": s.x || 0, "y": s.y || 0, "rotation": 0, "isLocked": false, "opacity": 1, "meta": {},
                    "id": id, "type": "geo",
                    "props": {
                        "w": s.w || 100, "h": s.h || 100, "geo": "ellipse", "color": cName,
                        "labelColor": "black", "fill": "none", "dash": "draw", "size": "m", "font": "draw",
                        "text": "", "align": "middle", "verticalAlign": "middle", "growY": 0, "url": "", "scale": 1
                    },
                    "parentId": "page:page", "index": "a" + (i + 2), "typeName": "shape"
                })
            } else if (s.type === "path" && s.points && s.points.length > 0) {
                var pts = []
                var baseX = s.points[0].x || 0
                var baseY = s.points[0].y || 0
                for (var p = 0; p < s.points.length; p++) {
                    pts.push({
                        "x": (s.points[p].x || 0) - baseX,
                        "y": (s.points[p].y || 0) - baseY,
                        "z": 0.5
                    })
                }
                records.push({
                    "x": baseX, "y": baseY, "rotation": 0, "isLocked": false, "opacity": 1, "meta": {},
                    "id": id, "type": "draw",
                    "props": {
                        "color": cName, "fill": "none", "dash": "draw", "size": "m",
                        "segments": [{ "type": "free", "points": pts }],
                        "isComplete": true, "isClosed": false, "isPen": false, "scale": 1
                    },
                    "parentId": "page:page", "index": "a" + (i + 2), "typeName": "shape"
                })
            }
        }
        return {
            "schema": {
                "schemaVersion": 2,
                "sequences": {
                    "com.tldraw.store": 4, "com.tldraw.shape": 4,
                    "com.tldraw.shape.geo": 9, "com.tldraw.shape.draw": 2,
                    "com.tldraw.shape.text": 2, "com.tldraw.shape.arrow": 5
                }
            },
            "records": records
        }
    }

    function openDiagram(d) {
        var full = dataController.getDiagram(d.id)
        activeDiagram = full
        activeRawContent = full.content || ""
        if (typeof dataController.extractQtDiagramShapes === "function") {
            shapes = dataController.extractQtDiagramShapes(activeRawContent) || []
        } else {
            shapes = []
        }
        isEditing = true
        whiteboardCanvas.requestPaint()
    }

    function saveActiveDiagram() {
        if (!activeDiagram) return
        var contentStr = typeof dataController.encodeQtDiagramAsTldrawV2 === "function"
            ? dataController.encodeQtDiagramAsTldrawV2(shapes, activeRawContent)
            : JSON.stringify(shapes)
        activeRawContent = contentStr
        dataController.saveDiagram(activeDiagram.id, activeDiagram.title, contentStr, activeDiagram.icon || "🎨")
        loadDiagrams()
    }

    function exitEditor() {
        saveActiveDiagram()
        isEditing = false
        activeDiagram = null
        activeRawContent = ""
        shapes = []
        loadDiagrams()
    }

    function exportToSvg() {
        if (typeof dataController.exportQtDiagramToSvg === "function") {
            return dataController.exportQtDiagramToSvg(shapes)
        }
        return "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"
    }

    Component.onCompleted: {
        loadDiagrams()
    }

    // View 1: Diagrams Gallery
    DiagramsGalleryView {
        visible: !diagramsRoot.isEditing
        diagramsList: diagramsRoot.diagramsList

        onDiagramSelected: function(d) { diagramsRoot.openDiagram(d) }
        onDiagramDeleted: function(id) {
            dataController.deleteDiagram(id)
            diagramsRoot.loadDiagrams()
        }
        onCreateRequested: diagramsRoot.isCreatingModal = true
        onImportRequested: diagramsRoot.isImportModalOpen = true
        onHelpRequested: diagramsRoot.isHelpOpen = true
    }

    // View 2: Whiteboard / Canvas Editor
    ColumnLayout {
        anchors.fill: parent
        spacing: 0
        visible: diagramsRoot.isEditing

        // Top Toolbar
        WhiteboardToolbar {
            diagramTitle: (diagramsRoot.activeDiagram ? diagramsRoot.activeDiagram.title : "Diagrama")
            activeTool: diagramsRoot.activeTool
            activeDrawColor: diagramsRoot.activeDrawColor
            activeLineWidth: whiteboardCanvas.activeLineWidth
            zoomLevel: whiteboardCanvas.zoomLevel

            onBackRequested: diagramsRoot.exitEditor()
            onToolSelected: function(t) { diagramsRoot.activeTool = t }
            onColorSelected: function(c) { diagramsRoot.activeDrawColor = c }
            onLineWidthSelected: function(lw) { whiteboardCanvas.activeLineWidth = lw }
            onUndoRequested: whiteboardCanvas.undo()
            onRedoRequested: whiteboardCanvas.redo()
            onZoomInRequested: whiteboardCanvas.zoomIn()
            onZoomOutRequested: whiteboardCanvas.zoomOut()
            onZoomResetRequested: whiteboardCanvas.zoomReset()
            onExportRequested: diagramsRoot.isExportModalOpen = true
            onImportRequested: diagramsRoot.isImportModalOpen = true
            onClearRequested: {
                whiteboardCanvas.pushHistory()
                diagramsRoot.shapes = []
                whiteboardCanvas.requestPaint()
                diagramsRoot.saveActiveDiagram()
            }
            onSaveRequested: diagramsRoot.saveActiveDiagram()
        }

        // Infinite Canvas Area
        WhiteboardCanvas {
            id: whiteboardCanvas
            shapes: diagramsRoot.shapes
            currentPath: diagramsRoot.currentPath
            activeTool: diagramsRoot.activeTool
            activeDrawColor: diagramsRoot.activeDrawColor

            onSaveRequested: diagramsRoot.saveActiveDiagram()
        }
    }

    // Modals
    CreateDiagramModal {
        visible: diagramsRoot.isCreatingModal
        onClosed: diagramsRoot.isCreatingModal = false
        onDiagramCreated: function(title) {
            var newId = dataController.createDiagram(title, "🎨")
            diagramsRoot.isCreatingModal = false
            diagramsRoot.loadDiagrams()
            if (newId) {
                diagramsRoot.openDiagram({ id: newId, title: title, icon: "🎨" })
            }
        }
    }

    DiagramExportModal {
        visible: diagramsRoot.isExportModalOpen
        diagramTitle: diagramsRoot.activeDiagram ? diagramsRoot.activeDiagram.title : "Diagrama"
        shapes: diagramsRoot.shapes
        onClosed: diagramsRoot.isExportModalOpen = false
        onExportCompleted: function(filePath) {
            if (filePath.endsWith(".svg")) {
                dataController.saveLocalTextFile(filePath, diagramsRoot.exportToSvg())
            } else if (filePath.endsWith(".tldraw") || filePath.indexOf(".tldraw") !== -1) {
                var tldrawOut = typeof dataController.encodeQtDiagramAsTldrawV2 === "function"
                    ? dataController.encodeQtDiagramAsTldrawV2(diagramsRoot.shapes, diagramsRoot.activeRawContent)
                    : JSON.stringify(diagramsRoot.exportToTldraw(), null, 2)
                dataController.saveLocalTextFile(filePath, tldrawOut)
            } else if (filePath.endsWith(".json") || filePath.endsWith(".excalidraw")) {
                dataController.saveLocalTextFile(filePath, JSON.stringify(diagramsRoot.shapes, null, 2))
            } else if (filePath.endsWith(".png")) {
                whiteboardCanvas.grabToImage(function(result) {
                    result.saveToFile(filePath)
                })
            } else {
                dataController.saveLocalTextFile(filePath, JSON.stringify(diagramsRoot.shapes, null, 2))
            }
            diagramsRoot.isExportModalOpen = false
        }
    }

    DiagramImportModal {
        visible: diagramsRoot.isImportModalOpen
        onClosed: diagramsRoot.isImportModalOpen = false
        onImportConfirmed: function(title, content) {
            var newId = dataController.createDiagram(title, "🎨")
            if (newId) {
                dataController.saveDiagram(newId, title, content, "🎨")
                diagramsRoot.loadDiagrams()
                diagramsRoot.openDiagram({ id: newId, title: title, content: content, icon: "🎨" })
            }
            diagramsRoot.isImportModalOpen = false
        }
    }

    DiagramsHelpDialog {
        isOpen: diagramsRoot.isHelpOpen
        onClosed: diagramsRoot.isHelpOpen = false
    }

    Shortcut {
        sequence: "Escape"
        enabled: diagramsRoot.isHelpOpen || diagramsRoot.isCreatingModal || diagramsRoot.isEditing || diagramsRoot.isExportModalOpen || diagramsRoot.isImportModalOpen
        onActivated: {
            if (diagramsRoot.isHelpOpen) diagramsRoot.isHelpOpen = false
            else if (diagramsRoot.isCreatingModal) diagramsRoot.isCreatingModal = false
            else if (diagramsRoot.isExportModalOpen) diagramsRoot.isExportModalOpen = false
            else if (diagramsRoot.isImportModalOpen) diagramsRoot.isImportModalOpen = false
            else if (diagramsRoot.isEditing) diagramsRoot.exitEditor()
        }
    }
}
