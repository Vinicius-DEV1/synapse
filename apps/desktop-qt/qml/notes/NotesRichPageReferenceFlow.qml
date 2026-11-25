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
    property int searchRequestId: 0
    property string pendingSearchQuery: ""
    property var contentMatches: []
    readonly property var searchController: editorRoot ? editorRoot.controller : null
    readonly property bool supportsContentSearch: searchController &&
        typeof searchController.searchPageReferences === "function" &&
        typeof searchController.cancelPageReferenceSearch === "function"
    readonly property alias menu: pageReferenceMenu

    signal referenceInserted()

    function scheduleContentSearch(query) {
        pendingSearchQuery = String(query || "").trim()
        contentMatches = []
        pageReferenceMenu.searchErrorMessage = ""
        pageReferenceMenu.searchPending = supportsContentSearch && pendingSearchQuery.length > 0
        searchDebounce.stop()
        if (searchRequestId > 0 && supportsContentSearch)
            searchController.cancelPageReferenceSearch(searchRequestId)
        searchRequestId += 1
        if (supportsContentSearch && pendingSearchQuery.length > 0) searchDebounce.start()
    }

    function cancelContentSearch() {
        searchDebounce.stop()
        if (searchRequestId > 0 && supportsContentSearch)
            searchController.cancelPageReferenceSearch(searchRequestId)
        searchRequestId += 1
        pendingSearchQuery = ""
        contentMatches = []
        pageReferenceMenu.searchPending = false
    }

    function acceptSearchResult(result) {
        if (!open || Number(result.requestId) !== searchRequestId) return
        pageReferenceMenu.searchPending = false
        if (!result.success) {
            pageReferenceMenu.searchErrorMessage = String(result.error || qsTr("Page content search failed."))
            return
        }
        contentMatches = result.pages || []
        pageReferenceMenu.searchErrorMessage = String(result.warning || "")
        pageReferenceMenu.selectedIndex = 0
    }

    function openForPosition(position, query, creationMode, menuX, menuY) {
        targetPosition = position
        initialQuery = query
        mode = creationMode ? "create" : "link"
        anchorX = menuX
        anchorY = menuY
        open = true
        scheduleContentSearch(query)
    }

    function close() {
        cancelContentSearch()
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
        cancelContentSearch()
        open = false
        targetPosition = -1
        textEditor.cursorPosition = insertedPosition
        referenceInserted()
        editorRoot.hasEditedSinceLoad = true
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
        contentMatches: referenceFlow.contentMatches
        onPageSelected: function(pageId, title, createNew) {
            referenceFlow.insert(pageId, title, createNew)
        }
        onSearchQueryEdited: function(query) { referenceFlow.scheduleContentSearch(query) }
        onDismissed: referenceFlow.close()
    }

    Timer {
        id: searchDebounce
        interval: 250
        repeat: false
        onTriggered: {
            if (referenceFlow.open && referenceFlow.supportsContentSearch &&
                    referenceFlow.pendingSearchQuery.length > 0) {
                referenceFlow.searchController.searchPageReferences(
                            referenceFlow.pendingSearchQuery, referenceFlow.searchRequestId)
            }
        }
    }

    Connections {
        target: referenceFlow.supportsContentSearch ? referenceFlow.searchController : null
        function onPageReferenceSearchReady(result) { referenceFlow.acceptSearchResult(result) }
    }
}
