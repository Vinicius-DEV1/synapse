import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: notesRoot
    color: "#0f0e17" // bg-dark-bg

    property string selectedPageId: ""
    property string activeTitle: "Selecione uma nota"
    property string activeContent: ""
    property string activeIcon: "📄"
    property string activeDate: ""
    property var pinnedPages: []
    property var pageTree: []
    property var collapsedNodeMap: ({})
    property string searchQuery: ""
    property bool isDirty: false
    property bool isPreviewMode: false
    property bool isEmojiPickerOpen: false

    Component.onCompleted: {
        loadPages()
    }

    function loadPages() {
        pinnedPages = dataController.getPinnedPages()
        pageTree = dataController.getPageTree(searchQuery)
        
        if (selectedPageId === "") {
            if (pinnedPages.length > 0) {
                selectPage(pinnedPages[0].id)
            } else if (pageTree.length > 0) {
                selectPage(pageTree[0].id)
            }
        }
    }

    function toggleNodeCollapse(pageId) {
        var copy = Object.assign({}, collapsedNodeMap)
        if (copy[pageId]) {
            delete copy[pageId]
        } else {
            copy[pageId] = true
        }
        collapsedNodeMap = copy
    }

    function selectPage(pageId) {
        if (isDirty && selectedPageId !== "" && selectedPageId !== pageId) {
            saveActiveNote()
        }
        selectedPageId = pageId
        var p = dataController.getPage(pageId)
        if (p && p.id) {
            activeTitle = p.title || "Sem título"
            activeContent = p.content || ""
            activeIcon = p.icon || "📄"
            activeDate = p.updated_at ? p.updated_at.substring(0, 10) : ""
            editorCanvas.setTitleText(activeTitle)
            editorCanvas.setEditorText(activeContent)
            isDirty = false
        }
    }

    function saveActiveNote() {
        if (!selectedPageId) return
        dataController.savePage(selectedPageId, activeTitle, activeContent, activeIcon)
        isDirty = false
        pinnedPages = dataController.getPinnedPages()
        pageTree = dataController.getPageTree(searchQuery)
    }

    function createNewRootNote() {
        var newId = dataController.createSubPage("", "Nova Nota", "📄")
        if (newId) {
            loadPages()
            selectPage(newId)
        }
    }

    function createNewSubNote(parentId) {
        var newId = dataController.createSubPage(parentId, "Nova Sub-página", "📄")
        if (newId) {
            var copy = Object.assign({}, collapsedNodeMap)
            delete copy[parentId]
            collapsedNodeMap = copy

            loadPages()
            selectPage(newId)
        }
    }

    function togglePin(pageId) {
        dataController.togglePinPage(pageId)
        loadPages()
    }

    function deleteActiveNote() {
        if (!selectedPageId) return
        dataController.deletePage(selectedPageId)
        selectedPageId = ""
        loadPages()
    }

    // Auto-save debounce timer
    Timer {
        id: autoSaveTimer
        interval: 1500
        repeat: false
        onTriggered: {
            if (notesRoot.isDirty) {
                notesRoot.saveActiveNote()
            }
        }
    }

    // Keyboard shortcut Ctrl+S / ⌘S
    Shortcut {
        sequences: ["Ctrl+S", "Cmd+S"]
        onActivated: notesRoot.saveActiveNote()
    }

    // Keyboard shortcut Ctrl+E / ⌘E (Toggle Edit / Preview mode)
    Shortcut {
        sequences: ["Ctrl+E", "Cmd+E"]
        onActivated: notesRoot.isPreviewMode = !notesRoot.isPreviewMode
    }

    RowLayout {
        anchors.fill: parent
        spacing: 0

        // Left Note Explorer Panel
        NotesTreeSidebar {
            pinnedPages: notesRoot.pinnedPages
            pageTree: notesRoot.pageTree
            collapsedNodeMap: notesRoot.collapsedNodeMap
            selectedPageId: notesRoot.selectedPageId

            onPageSelected: function(pageId) { notesRoot.selectPage(pageId) }
            onCreateRootRequested: notesRoot.createNewRootNote()
            onCreateSubRequested: function(pId) { notesRoot.createNewSubNote(pId) }
            onTogglePinRequested: function(pId) { notesRoot.togglePin(pId) }
            onToggleCollapseRequested: function(pId) { notesRoot.toggleNodeCollapse(pId) }
            onSearchChanged: function(q) {
                notesRoot.searchQuery = q
                notesRoot.loadPages()
            }
        }

        // Right Note Reading & Editing Canvas
        NotesEditorCanvas {
            id: editorCanvas
            selectedPageId: notesRoot.selectedPageId
            activeTitle: notesRoot.activeTitle
            activeContent: notesRoot.activeContent
            activeIcon: notesRoot.activeIcon
            activeDate: notesRoot.activeDate
            isDirty: notesRoot.isDirty
            isPreviewMode: notesRoot.isPreviewMode
            isEmojiPickerOpen: notesRoot.isEmojiPickerOpen

            onSaveRequested: notesRoot.saveActiveNote()
            onDeleteRequested: notesRoot.deleteActiveNote()
            onPreviewToggled: function(prev) { notesRoot.isPreviewMode = prev }
            onTitleModified: function(t) {
                notesRoot.activeTitle = t
                notesRoot.isDirty = true
                autoSaveTimer.restart()
            }
            onContentModified: function(c) {
                notesRoot.activeContent = c
                notesRoot.isDirty = true
                autoSaveTimer.restart()
            }
            onIconModified: function(ico) {
                notesRoot.activeIcon = ico
                notesRoot.saveActiveNote()
            }
        }
    }
}
