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

    function openDiagram(d) {
        var full = dataController.getDiagram(d.id)
        activeDiagram = full
        try {
            shapes = JSON.parse(full.content || "[]")
        } catch (e) {
            shapes = []
        }
        isEditing = true
        whiteboardCanvas.requestPaint()
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

    function exportToSvg() {
        var svg = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1920\" height=\"1080\">\n"
        for (var i = 0; i < shapes.length; i++) {
            var s = shapes[i]
            var c = s.color || "#8b5cf6"
            var lw = s.lineWidth || 2
            if (s.type === "path" && s.points && s.points.length > 1) {
                var d = "M " + s.points[0].x + " " + s.points[0].y
                for (var p = 1; p < s.points.length; p++) d += " L " + s.points[p].x + " " + s.points[p].y
                svg += "  <path d=\"" + d + "\" stroke=\"" + c + "\" stroke-width=\"" + lw + "\" fill=\"none\" />\n"
            } else if (s.type === "rect") {
                svg += "  <rect x=\"" + s.x + "\" y=\"" + s.y + "\" width=\"" + s.w + "\" height=\"" + s.h + "\" stroke=\"" + c + "\" stroke-width=\"" + lw + "\" fill=\"none\" />\n"
            } else if (s.type === "circle") {
                svg += "  <ellipse cx=\"" + (s.x + s.w/2) + "\" cy=\"" + (s.y + s.h/2) + "\" rx=\"" + Math.abs(s.w/2) + "\" ry=\"" + Math.abs(s.h/2) + "\" stroke=\"" + c + "\" stroke-width=\"" + lw + "\" fill=\"none\" />\n"
            }
        }
        svg += "</svg>"
        return svg
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
            } else if (filePath.endsWith(".json") || filePath.endsWith(".excalidraw")) {
                dataController.saveLocalTextFile(filePath, JSON.stringify(diagramsRoot.shapes, null, 2))
            } else {
                whiteboardCanvas.requestPaint()
                // PNG image export fallback
                dataController.saveLocalTextFile(filePath + ".json", JSON.stringify(diagramsRoot.shapes))
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
