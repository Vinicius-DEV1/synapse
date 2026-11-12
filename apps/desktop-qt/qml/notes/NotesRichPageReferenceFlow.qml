import QtQuick 2.15

Item {
    id: referenceFlow
    objectName: "notesRichPageReferenceFlow"

    property var editorRoot
    property var textEditor
    property var commitTimer
    property bool open: false
    property int targetPosition: -1
    property string initialQuery: ""
    property string mode: "link"
    property real anchorX: 0
    property real anchorY: 0
    readonly property alias menu: pageReferenceMenu

    signal referenceInserted()

    function openForPosition(position, query, creationMode, menuX, menuY) {
        targetPosition = position
        initialQuery = query
        mode = creationMode ? "create" : "link"
        anchorX = menuX
        anchorY = menuY
        open = true
    }

    function close() {
        open = false
        targetPosition = -1
        textEditor.forceActiveFocus()
    }

    function insert(pageId, title, createNew) {
        if (createNew) {
            pageId = editorRoot.createLinkedPage(title)
            if (!pageId) {
                pageReferenceMenu.errorMessage = qsTr("The linked page could not be created. Try again or choose an existing page.")
                return false
            }
        }
        var document = textEditor.textDocument
        var insertedPosition = editorRoot.textOperations.insertRichPageReference(
                    document, targetPosition, pageId, title)
        if (insertedPosition < 0) {
            pageReferenceMenu.dismissed()
            return false
        }
        open = false
        targetPosition = -1
        textEditor.cursorPosition = insertedPosition
        referenceInserted()
        editorRoot.hasPendingChanges = true
        commitTimer.restart()
        textEditor.forceActiveFocus()
        return true
    }

    NotesRichPageReferenceMenu {
        id: pageReferenceMenu
        open: referenceFlow.open
        initialQuery: referenceFlow.initialQuery
        mode: referenceFlow.mode
        anchorX: referenceFlow.anchorX
        anchorY: referenceFlow.anchorY
        pages: referenceFlow.editorRoot.pageList
        onPageSelected: function(pageId, title, createNew) {
            referenceFlow.insert(pageId, title, createNew)
        }
        onDismissed: referenceFlow.close()
    }
}
