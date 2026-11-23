import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: notesRoot
    objectName: "notesEditorView"
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
    property bool isPreviewMode: false
    property bool isRichMode: true
    property bool isBlockMode: false
    property int pendingWidgetBlockIndex: -1
    property bool isHistoryOpen: false

    signal openInNewTabRequested(string pageId)
    signal navigateModuleRequested(string moduleId)
    property bool isHelpOpen: false
    property bool isPageEncrypted: false
    property bool isPageUnlocked: false
    property string lastLoadedUpdatedAt: ""
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
        if ((isDirty || isRichMode) && selectedPageId !== "" && !saveActiveNote()) return false

        var p = dataController.getPage(pageId)
        if (!p || !p.id) return false

        selectedPageId = pageId
        isPageEncrypted = Boolean(p.is_locked || p.is_encrypted)
        isPageUnlocked = !isPageEncrypted || (controller && controller.isVaultUnlocked)
        activeTitle = p.title || "Sem título"
        activeDescription = p.description || ""
        activeContent = p.content || ""
        var canRich = notesTextOperations.supportsRichSource(activeContent)
        var parsedBlocks = !canRich && typeof dataController.parseNoteBlocks === "function"
            ? (dataController.parseNoteBlocks(activeContent) || []) : []
        var hasInteractiveBlocks = parsedBlocks.length > 1 ||
            (parsedBlocks.length === 1 && parsedBlocks[0].blockType !== "richText")
        isRichMode = canRich
        isBlockMode = !canRich && hasInteractiveBlocks
        isPreviewMode = !canRich && !hasInteractiveBlocks
        activeIcon = p.icon || "📄"
        activeCoverImage = p.cover_image || ""
        activeDate = p.updated_at ? p.updated_at.substring(0, 10) : ""
        lastLoadedUpdatedAt = p.updated_at || ""
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
        if (!selectedPageId) {
            autoSaveTimer.stop()
            return true
        }
        if (editorCanvas.richContentInvalid || !editorCanvas.flushRichEditor()) {
            isDirty = true
            saveFailed = true
            return false
        }
        if (!isDirty) {
            autoSaveTimer.stop()
            return true
        }

        if (!dataController.savePage(selectedPageId, activeTitle, activeContent, activeIcon, lastLoadedUpdatedAt)) {
            saveFailed = true
            return false
        }
        var refreshed = dataController.getPage(selectedPageId)
        if (refreshed && refreshed.updated_at) {
            lastLoadedUpdatedAt = refreshed.updated_at
            activeDate = refreshed.updated_at.substring(0, 10)
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

    function setPreviewMode(preview) {
        if (preview === isPreviewMode) return true
        if (isRichMode && !editorCanvas.flushRichEditor()) {
            isDirty = true
            saveFailed = true
            return false
        }
        isPreviewMode = preview
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
        if ((isDirty || isRichMode) && !saveActiveNote()) return

        var newId = dataController.createSubPage("", "Nova Nota", "📄")
        if (newId) {
            loadPages()
            selectPage(newId)
        }
    }

    function createNewSubNote(parentId) {
        if ((isDirty || isRichMode) && !saveActiveNote()) return

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
        if ((isDirty || isRichMode) && !saveActiveNote()) {
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
        if ((isDirty || isRichMode) && !saveActiveNote()) return
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

    // Periodic check for external updates from web/other processes
    Timer {
        id: externalSyncTimer
        interval: 3000
        repeat: true
        running: notesRoot.visible && notesRoot.selectedPageId.length > 0 && !notesRoot.isDirty
        onTriggered: notesRoot.checkExternalUpdates()
    }

    function checkExternalUpdates() {
        if (!selectedPageId) return
        var p = dataController.getPage(selectedPageId)
        if (!p || !p.id) return
        if (p.updated_at && lastLoadedUpdatedAt && p.updated_at !== lastLoadedUpdatedAt) {
            if (!isDirty) {
                activeTitle = p.title || "Sem título"
                activeDescription = p.description || ""
                activeContent = p.content || ""
                lastLoadedUpdatedAt = p.updated_at
                activeDate = p.updated_at ? p.updated_at.substring(0, 10) : ""
                editorCanvas.setTitleText(activeTitle)
                editorCanvas.setDescriptionText(activeDescription)
                editorCanvas.setEditorText(activeContent)
                if (notesTextOperations.supportsRichSource(activeContent)) {
                    isRichMode = true
                    editorCanvas.reloadRichEditor()
                } else {
                    isRichMode = false
                }
                editorCanvas.pageActionStatus = ""
                loadPages()
            } else {
                editorCanvas.pageActionStatus = qsTr("Note was modified externally. Save will preserve changes to history.")
            }
        }
    }

    Connections {
        target: dataController
        function onPageConflictDetected(conflictPageId, externalContent) {
            if (conflictPageId === notesRoot.selectedPageId) {
                notesRoot.saveFailed = true
                editorCanvas.pageActionStatus = qsTr("External edits were detected. Your changes have been preserved in history.")
            }
        }
    }

    Connections {
        target: notesRoot.Window.window ? notesRoot.Window.window : null
        function onActiveChanged() {
            if (notesRoot.Window.window && notesRoot.Window.window.active) {
                notesRoot.checkExternalUpdates()
            }
        }
    }

    NotesEditorShortcuts {
        hasPage: notesRoot.selectedPageId.length > 0
        isPreviewMode: notesRoot.isPreviewMode
        isHistoryOpen: notesRoot.isHistoryOpen || notesRoot.isHelpOpen || deleteNoteDialog.visible || editorCanvas.isDialogOpen
        isEmojiPickerOpen: editorCanvas.isEmojiPickerOpen
        contentEditorFocused: editorCanvas.contentEditorFocused
        onSaveRequested: notesRoot.saveActiveNote()
        onPreviewToggleRequested: notesRoot.setPreviewMode(!notesRoot.isPreviewMode)
        onFormatRequested: function(prefix, suffix) { editorCanvas.formatSelection(prefix, suffix) }
        onRichMarkRequested: function(mark) { editorCanvas.toggleRichMark(mark) }
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
            isRichMode: notesRoot.isRichMode
            isBlockMode: notesRoot.isBlockMode

            onWidgetSlashCommandRequested: function(commandId, blockIndex) {
                notesRoot.handleWidgetSlashCommand(commandId, blockIndex)
            }
            onAskAiRequested: function(sel, blockHtml) {
                notesAiModal.openModal(sel, blockHtml || notesRoot.activeContent)
            }
            onPlayQuestionRequested: function(bid, qid, title) {
                notesRoot.openQuestionSession(bid, qid, title)
            }
            onOpenInQuestionsRequested: function(bid) {
                notesRoot.navigateModuleRequested("quiz")
            }
            onHabitStatsRequested: function(hid) {
                notesRoot.openHabitHeatmap(hid)
            }
            onOpenMediaRequested: function(mt, mid, title) {
                notesRoot.navigateModuleRequested(mt === "book" ? "library" : "video")
            }
            onOpenInNewTabRequested: function(pid) {
                notesRoot.openInNewTabRequested(pid)
            }
            onSubPageIconChanged: function(pid, emoji) {
                if (typeof dataController.updatePageIcon === "function" && dataController.updatePageIcon(pid, emoji)) {
                    notesRoot.loadPages()
                }
            }
            onCreateSubPageWithContentRequested: function(title, html) {
                if (!notesRoot.selectedPageId) return
                var newId = dataController.createSubPage(notesRoot.selectedPageId, title || "Nova Sub-página", "📄")
                if (newId) {
                    dataController.savePage(newId, title || "Nova Sub-página", html || "<p></p>", "📄", "")
                    notesRoot.loadPages()
                }
            }

            onSaveRequested: notesRoot.saveActiveNote()
            onDeleteRequested: notesRoot.requestDeleteActiveNote()
            onHistoryRequested: notesRoot.openPageHistory()
            onHelpRequested: notesRoot.isHelpOpen = true
            onShareRequested: {
                if (typeof globalModals !== "undefined" && globalModals) {
                    globalModals.openShare(notesRoot.selectedPageId, notesRoot.activeTitle)
                }
            }
            onPreviewToggled: function(prev) { notesRoot.setPreviewMode(prev) }
            onRichModeRequested: function(enabled) {
                if (enabled) {
                    if (!notesTextOperations.supportsRichSource(notesRoot.activeContent)) return
                    notesRoot.isRichMode = true
                    return
                }
                if (editorCanvas.flushRichEditor()) notesRoot.isRichMode = false
            }
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
            onRichContentModified: function(html) {
                notesRoot.activeContent = html
                editorCanvas.setEditorText(html)
                notesRoot.isDirty = true
                autoSaveTimer.restart()
            }
            onRichValidationChanged: function(invalid) {
                notesRoot.saveFailed = invalid
                if (invalid) notesRoot.isDirty = true
            }
            onIconModified: function(ico) {
                notesRoot.activeIcon = ico
                notesRoot.isDirty = true
                notesRoot.saveActiveNote()
            }
            onPageNavigationRequested: function(pageId) { notesRoot.selectPage(pageId) }
            onPageReferencePreviewRequested: function(pageId) { referencePreview.openForPage(pageId) }
            onCreateSubPageRequested: notesRoot.createNewSubNote(notesRoot.selectedPageId)
            onPageHierarchyChanged: notesRoot.loadPages()
            onPageActionFailed: function(message) { editorCanvas.pageActionStatus = message }
            onCoverModified: function(imageUrl) { notesRoot.updateCover(imageUrl) }
            onExternalLinkRequested: function(link) {
                if (link.indexOf("synapse-youtube://watch?") === 0) {
                    var matchUrl = link.match(/[?&]url=([^&]+)/)
                    var matchTitle = link.match(/[?&]title=([^&]+)/)
                    var targetUrl = matchUrl ? decodeURIComponent(matchUrl[1]) : ""
                    var targetTitle = matchTitle ? decodeURIComponent(matchTitle[1]) : "Vídeo do YouTube"
                    ytWatchLoader.active = true
                    if (ytWatchLoader.item) {
                        ytWatchLoader.item.url = targetUrl
                        ytWatchLoader.item.videoTitle = targetTitle
                        ytWatchLoader.item.visible = true
                    }
                } else if (link.indexOf("synapse-mermaid://view?") === 0) {
                    var matchCode = link.match(/[?&]code=([^&]+)/)
                    var targetCode = matchCode ? decodeURIComponent(matchCode[1]) : ""
                    mermaidLoader.active = true
                    if (mermaidLoader.item) {
                        mermaidLoader.item.chart = targetCode
                        mermaidLoader.item.visible = true
                    }
                }
            }
        }

        NotesEmptyState {
            visible: notesRoot.selectedPageId === ""
            onCreateRequested: notesRoot.createNewRootNote()
        }
    }

    NotesPageUnlockForm {
        id: pageUnlockForm
        anchors.fill: parent
        z: 95
        visible: notesRoot.selectedPageId !== "" && notesRoot.isPageEncrypted && !notesRoot.isPageUnlocked
        onUnlocked: {
            notesRoot.isPageUnlocked = true
        }
    }

    Loader {
        id: ytWatchLoader
        active: false
        anchors.fill: parent
        z: 120
        source: "YouTubeWatchModal.qml"
        onLoaded: {
            if (item) item.visible = true
        }
    }

    Connections {
        target: ytWatchLoader.item
        ignoreUnknownSignals: true
        function onCloseRequested() {
            ytWatchLoader.active = false
        }
    }

    Loader {
        id: mermaidLoader
        active: false
        anchors.fill: parent
        z: 130
        source: "MermaidFullscreenModal.qml"
        onLoaded: {
            if (item) item.visible = true
        }
    }

    Connections {
        target: mermaidLoader.item
        ignoreUnknownSignals: true
        function onCloseRequested() {
            mermaidLoader.active = false
        }
    }

    PageHistoryModal {
        visible: notesRoot.isHistoryOpen
        pageTitle: notesRoot.activeTitle
        history: notesRoot.pageHistoryEntries
        onCloseRequested: notesRoot.isHistoryOpen = false
        onRestoreRevisionRequested: function(content) {
            notesRoot.activeContent = content
            editorCanvas.setEditorText(content)
            notesRoot.isDirty = true
            notesRoot.saveActiveNote()
        }
    }

    NotesPageReferencePreview {
        id: referencePreview
        controller: dataController
        onExpandRequested: function(pageId) {
            if (notesRoot.selectPage(pageId)) referencePreview.close()
        }
        onPageSaved: function(savedPageId, newTitle) {
            notesRoot.loadPages()
            if (notesRoot.selectedPageId === savedPageId) {
                notesRoot.activeTitle = newTitle
            }
        }
    }

    NotesHelpDialog {
        isOpen: notesRoot.isHelpOpen
        onClosed: notesRoot.isHelpOpen = false
    }

    function handleWidgetSlashCommand(commandId, blockIndex) {
        pendingWidgetBlockIndex = blockIndex
        if (commandId === "ia") {
            notesAiModal.openModal("", activeContent)
            return
        }
        if (commandId === "question" || commandId === "foco" || commandId === "alarme" ||
                commandId === "evento" || commandId === "habito") {
            setupWidgetsModal.openMode(commandId)
            return
        }
        if (commandId === "documento" || commandId === "scrap" || commandId === "video" || commandId === "livro") {
            mediaPickerModal.openMode(commandId)
            return
        }
        var widgetHtml = ""
        if (commandId === "toggle") {
            widgetHtml = "<div data-type=\"toggle-block\" data-title=\"Seção recolhível\" data-open=\"true\"><p></p></div>"
        } else if (commandId === "blockquoteToggle") {
            widgetHtml = "<div data-type=\"blockquote-toggle\" data-title=\"Nota expandível\" data-color=\"#8b5cf6\" data-open=\"true\"><p></p></div>"
        } else if (commandId === "agrupar") {
            widgetHtml = "<div data-type=\"document-bundle\" data-title=\"Pacote de Documentos\" data-items=\"[]\"></div>"
        } else if (commandId === "group") {
            widgetHtml = "<div data-type=\"groupBlock\" data-title=\"Coleção\" data-color=\"#8b5cf6\" data-collapsed=\"false\"><p></p></div>"
        }
        if (widgetHtml.length > 0) insertWidgetIntoNote(widgetHtml)
    }

    function insertWidgetIntoNote(widgetHtml) {
        if (!isBlockMode) {
            editorCanvas.flushRichEditor()
            activeContent = (activeContent || "") + widgetHtml
            isRichMode = false
            isPreviewMode = false
            isBlockMode = true
        } else {
            editorCanvas.insertWidgetAtBlock(pendingWidgetBlockIndex, widgetHtml)
        }
        isDirty = true
        autoSaveTimer.restart()
    }

    function openQuestionSession(batteryId, questionId, title) {
        var qs = []
        if (typeof dataController.getAllQuizQuestions === "function") {
            var all = dataController.getAllQuizQuestions() || []
            qs = all.filter(function(q) {
                return (batteryId && q.battery_id === batteryId) || (questionId && q.id === questionId)
            })
        }
        quizModalLoader.active = true
        if (quizModalLoader.item) {
            quizModalLoader.item.batteryId = batteryId
            quizModalLoader.item.batteryTitle = title || qsTr("Prática Rápida")
            quizModalLoader.item.questions = qs
            quizModalLoader.item.currentIndex = 0
            quizModalLoader.item.selectedOption = -1
            quizModalLoader.item.isConfirmed = false
            quizModalLoader.item.isCompleted = false
            quizModalLoader.item.score = 0
            quizModalLoader.item.elapsedSeconds = 0
            quizModalLoader.item.visible = true
        }
    }

    function openHabitHeatmap(habitId) {
        if (typeof dataController.getHabits !== "function") return
        var list = dataController.getHabits() || []
        var target = null
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === habitId) { target = list[i]; break }
        }
        if (!target) return
        habitHeatmapLoader.active = true
        if (habitHeatmapLoader.item) {
            habitHeatmapLoader.item.habit = target
            habitHeatmapLoader.item.reloadData()
            habitHeatmapLoader.item.visible = true
        }
    }

    NotesAiPromptModal {
        id: notesAiModal
        onApplyHtmlRequested: function(html) {
            notesRoot.activeContent = html
            editorCanvas.setEditorText(html)
            if (notesRoot.isRichMode) editorCanvas.reloadRichEditor()
            notesRoot.isDirty = true
            autoSaveTimer.restart()
        }
        onInsertTextRequested: function(text) {
            var esc = "<p>" + String(text || "").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</p>"
            notesRoot.activeContent = (notesRoot.activeContent || "") + esc
            editorCanvas.setEditorText(notesRoot.activeContent)
            if (notesRoot.isRichMode) editorCanvas.reloadRichEditor()
            notesRoot.isDirty = true
            autoSaveTimer.restart()
        }
        onClosed: notesAiModal.isOpen = false
    }

    NotesSetupWidgetsModal {
        id: setupWidgetsModal
        onInsertWidgetRequested: function(html) { notesRoot.insertWidgetIntoNote(html) }
    }

    NotesMediaWidgetPickerModal {
        id: mediaPickerModal
        onInsertWidgetRequested: function(html) { notesRoot.insertWidgetIntoNote(html) }
    }

    Loader {
        id: quizModalLoader
        active: false
        anchors.fill: parent
        z: 145
        source: "../questions/QuizSequentialFocusModal.qml"
    }

    Connections {
        target: quizModalLoader.item
        ignoreUnknownSignals: true
        function onClosed() { quizModalLoader.active = false }
        function onRecordAttemptRequested(bId, qId, selIndex, correct) {
            dataController.recordQuizAttempt(bId, qId, selIndex, correct)
        }
    }

    Loader {
        id: habitHeatmapLoader
        active: false
        anchors.fill: parent
        z: 145
        source: "../habits/HabitsHeatmapModal.qml"
    }

    Connections {
        target: habitHeatmapLoader.item
        ignoreUnknownSignals: true
        function onVisibleChanged() {
            if (habitHeatmapLoader.item && !habitHeatmapLoader.item.visible) {
                habitHeatmapLoader.active = false
            }
        }
    }

    NotesDeleteDialog {
        id: deleteNoteDialog
        anchors.centerIn: parent
        noteTitle: notesRoot.activeTitle
        onConfirmed: notesRoot.deleteActiveNote()
    }
}
