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
    property string activeTool: "pen" // "pen", "rect", "circle", "sticky"
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

            onBackRequested: diagramsRoot.exitEditor()
            onToolSelected: function(t) { diagramsRoot.activeTool = t }
            onColorSelected: function(c) { diagramsRoot.activeDrawColor = c }
            onClearRequested: {
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

    // Modal: Novo Diagrama
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
}
