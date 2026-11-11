import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: notesRoot
    color: "#0f0e17" // bg-dark-bg

    property string selectedPageId: ""
    property string activeTitle: "Selecione uma nota"
    property string activeDescription: ""
    property string activeContent: ""
    property string activeIcon: "📄"
    property string activeCoverImage: ""
    property string activeDate: ""
    property var pinnedPages: []
    property var pageTree: []
    property var allPageTree: []
    property var pageIndex: ({})
    property var activeBreadcrumbs: []
    property var activeChildPages: []
    property var collapsedNodeMap: ({})
    property var pageHistoryEntries: []
    property string searchQuery: ""
    property bool isDirty: false
    property bool descriptionDirty: false
    property bool saveFailed: false
    property bool isPreviewMode: true
    property bool isHistoryOpen: false
    Component.onCompleted: {
        loadPages()
    }

    function loadPages() {
        pinnedPages = dataController.getPinnedPages()
        allPageTree = dataController.getPageTree("")
        var nextPageIndex = ({})
        for (var i = 0; i < allPageTree.length; ++i) {
            nextPageIndex[allPageTree[i].id] = allPageTree[i]
        }
        pageIndex = nextPageIndex
        pageTree = searchQuery.trim().length > 0 ? dataController.getPageTree(searchQuery) : allPageTree
        updatePageDecor(selectedPageId)

        if (selectedPageId === "") {
            if (pinnedPages.length > 0) {
                selectPage(pinnedPages[0].id)
            } else if (pageTree.length > 0) {
                selectPage(pageTree[0].id)
            }
        }
    }

    function setPageFilter(query) {
        searchQuery = query
        pageTree = query.trim().length > 0 ? dataController.getPageTree(query) : allPageTree
    }
    function openMovePageDialog(pageId) { editorCanvas.openMovePageDialog(pageId) }
    function updatePageDecor(pageId) {
        if (!pageId || !pageIndex[pageId]) {
            activeBreadcrumbs = []
            activeChildPages = []
            return
        }

        var path = []
        var visited = ({})
        var currentPage = pageIndex[pageId]
        while (currentPage && !visited[currentPage.id]) {
            visited[currentPage.id] = true
            path.unshift(currentPage)
            currentPage = pageIndex[currentPage.parent_id]
        }

        activeBreadcrumbs = path
        activeChildPages = allPageTree
            .filter(function(page) { return page.parent_id === pageId })
            .sort(function(left, right) { return (left.sort_order || 0) - (right.sort_order || 0) })
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
        if (selectedPageId === pageId) return true
        if (isDirty && selectedPageId !== "" && !saveActiveNote()) return false

        var p = dataController.getPage(pageId)
        if (!p || !p.id) return false

        selectedPageId = pageId
        activeTitle = p.title || "Sem título"
        activeDescription = p.description || ""
        activeContent = p.content || ""
        isPreviewMode = activeContent.trim().length > 0 && activeContent.trim() !== "<p></p>"
        activeIcon = p.icon || "📄"
        activeCoverImage = p.cover_image || ""
        activeDate = p.updated_at ? p.updated_at.substring(0, 10) : ""
        descriptionDirty = false
        editorCanvas.setTitleText(activeTitle)
        editorCanvas.setDescriptionText(activeDescription)
        editorCanvas.setEditorText(activeContent)
        if (!pageIndex[pageId]) loadPages()
        else updatePageDecor(pageId)
        isDirty = false
        saveFailed = false
        return true
    }

    function saveActiveNote() {
        if (!selectedPageId || !isDirty) {
            autoSaveTimer.stop()
            return true
        }

        if (!dataController.savePage(selectedPageId, activeTitle, activeContent, activeIcon)) {
            saveFailed = true
            return false
        }
        if (descriptionDirty &&
            !dataController.updatePageDescription(selectedPageId, activeDescription)) {
            saveFailed = true
            return false
        }

        isDirty = false
        descriptionDirty = false
        saveFailed = false
        loadPages()
        return true
    }

    function openPageHistory() {
        if (!selectedPageId) return
        pageHistoryEntries = dataController.getPageHistory(selectedPageId)
        isHistoryOpen = true
    }

    function updateCover(imageUrl) {
        activeCoverImage = imageUrl
        const page = dataController.getPage(selectedPageId)
        if (page && page.updated_at) activeDate = page.updated_at.substring(0, 10)
        editorCanvas.pageActionStatus = ""
    }

    function createNewRootNote() {
        if (isDirty && !saveActiveNote()) return

        var newId = dataController.createSubPage("", "Nova Nota", "📄")
        if (newId) {
            loadPages()
            selectPage(newId)
        }
    }

    function createNewSubNote(parentId) {
        if (isDirty && !saveActiveNote()) return

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
        if (!selectedPageId) return false
        if (isDirty && !saveActiveNote()) {
            deleteNoteDialog.errorMessage = qsTr("The note could not be saved. Save it before moving it to Trash.")
            Qt.callLater(function() { deleteNoteDialog.open() })
            return false
        }
        if (!dataController.deletePage(selectedPageId)) {
            deleteNoteDialog.errorMessage = qsTr("The note could not be moved to Trash. It was not removed.")
            Qt.callLater(function() { deleteNoteDialog.open() })
            return false
        }

        selectedPageId = ""
        isDirty = false
        saveFailed = false
        loadPages()
        return true
    }

    function requestDeleteActiveNote() {
        if (!selectedPageId) return
        if (isDirty && !saveActiveNote()) return
        deleteNoteDialog.errorMessage = ""
        deleteNoteDialog.open()
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

    NotesEditorShortcuts {
        hasPage: notesRoot.selectedPageId.length > 0
        isPreviewMode: notesRoot.isPreviewMode
        isHistoryOpen: notesRoot.isHistoryOpen
        isEmojiPickerOpen: editorCanvas.isEmojiPickerOpen
        contentEditorFocused: editorCanvas.contentEditorFocused
        onSaveRequested: notesRoot.saveActiveNote()
        onPreviewToggleRequested: notesRoot.isPreviewMode = !notesRoot.isPreviewMode
        onFormatRequested: function(prefix, suffix) { editorCanvas.formatSelection(prefix, suffix) }
    }

    RowLayout {
        anchors.fill: parent
        spacing: 0

        // Page content occupies the same canvas width as the React page view.
        NotesEditorCanvas {
            id: editorCanvas
            visible: notesRoot.selectedPageId !== ""
            activeTitle: notesRoot.activeTitle
            activeDescription: notesRoot.activeDescription
            activeContent: notesRoot.activeContent
            activeIcon: notesRoot.activeIcon
            activeCoverImage: notesRoot.activeCoverImage
            activeDate: notesRoot.activeDate
            activeBreadcrumbs: notesRoot.activeBreadcrumbs
            childPages: notesRoot.activeChildPages
            allPages: notesRoot.allPageTree
            controller: dataController
            activePageId: notesRoot.selectedPageId
            isDirty: notesRoot.isDirty
            saveFailed: notesRoot.saveFailed
            isPreviewMode: notesRoot.isPreviewMode

            onSaveRequested: notesRoot.saveActiveNote()
            onDeleteRequested: notesRoot.requestDeleteActiveNote()
            onHistoryRequested: notesRoot.openPageHistory()
            onPreviewToggled: function(prev) { notesRoot.isPreviewMode = prev }
            onTitleModified: function(t) {
                notesRoot.activeTitle = t
                notesRoot.isDirty = true
                autoSaveTimer.restart()
            }
            onDescriptionModified: function(description) {
                notesRoot.activeDescription = description
                editorCanvas.setDescriptionText(description)
                notesRoot.descriptionDirty = true
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
                notesRoot.isDirty = true
                notesRoot.saveActiveNote()
            }
            onPageNavigationRequested: function(pageId) { notesRoot.selectPage(pageId) }
            onCreateSubPageRequested: notesRoot.createNewSubNote(notesRoot.selectedPageId)
            onPageHierarchyChanged: notesRoot.loadPages()
            onPageActionFailed: function(message) { editorCanvas.pageActionStatus = message }
            onCoverModified: function(imageUrl) { notesRoot.updateCover(imageUrl) }
        }

        NotesEmptyState {
            visible: notesRoot.selectedPageId === ""
            onCreateRequested: notesRoot.createNewRootNote()
        }
    }

    PageHistoryModal {
        visible: notesRoot.isHistoryOpen
        pageTitle: notesRoot.activeTitle
        history: notesRoot.pageHistoryEntries
        onCloseRequested: notesRoot.isHistoryOpen = false
    }

    NotesDeleteDialog {
        id: deleteNoteDialog
        anchors.centerIn: parent
        noteTitle: notesRoot.activeTitle
        onConfirmed: notesRoot.deleteActiveNote()
    }
}
