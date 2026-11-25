import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: notesRoot
    objectName: "notesEditorView"
    color: "#0f0e17"

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
    property bool isHelpOpen: false
    property bool isPageEncrypted: false
    property bool isPageUnlocked: false
    property string lastLoadedUpdatedAt: ""

    signal openInNewTabRequested(string pageId)
    signal navigateModuleRequested(string moduleId)

    Component.onCompleted: loadPages()

    function resolveEditingModeForContent(rawHtml) {
        var html = rawHtml || ""
        if (notesTextOperations.supportsRichSource(html)) {
            isRichMode = true
            isBlockMode = false
            isPreviewMode = false
            return html
        }
        if (typeof dataController.parseNoteBlocks === "function") {
            var parsed = dataController.parseNoteBlocks(html) || []
            if (parsed.length === 1 && parsed[0].blockType === "richText" &&
                    notesTextOperations.supportsRichSource(parsed[0].html)) {
                isRichMode = true
                isBlockMode = false
                isPreviewMode = false
                return parsed[0].html
            }
            if (parsed.length >= 1) {
                isRichMode = false
                isBlockMode = true
                isPreviewMode = false
                return html
            }
        }
        isRichMode = false
        isBlockMode = false
        isPreviewMode = true
        return html
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
            if (pinnedPages.length > 0) selectPage(pinnedPages[0].id)
            else if (pageTree.length > 0) selectPage(pageTree[0].id)
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
        if (copy[pageId]) delete copy[pageId]
        else copy[pageId] = true
        collapsedNodeMap = copy
    }

    function selectPage(pageId) {
        if (selectedPageId === pageId) return true
        if ((isDirty || isRichMode || isBlockMode) && selectedPageId !== "" && !saveActiveNote()) return false

        var p = dataController.getPage(pageId)
        if (!p || !p.id) return false

        selectedPageId = pageId
        isPageEncrypted = Boolean(p.is_locked || p.is_encrypted)
        isPageUnlocked = !isPageEncrypted || Boolean(dataController && dataController.isVaultUnlocked)
        activeTitle = p.title || "Sem título"
        activeDescription = p.description || ""
        activeContent = resolveEditingModeForContent(p.content || "")
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
        if (descriptionDirty && !dataController.updatePageDescription(selectedPageId, activeDescription)) {
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
        if ((isRichMode || isBlockMode) && !editorCanvas.flushRichEditor()) {
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
        var page = dataController.getPage(selectedPageId)
        if (page && page.updated_at) activeDate = page.updated_at.substring(0, 10)
        editorCanvas.pageActionStatus = ""
    }

    function createNewRootNote() {
        if ((isDirty || isRichMode || isBlockMode) && !saveActiveNote()) return
        var newId = dataController.createSubPage("", "Nova Nota", "📄")
        if (newId) { loadPages(); selectPage(newId) }
    }

    function createNewSubNote(parentId) {
        if ((isDirty || isRichMode || isBlockMode) && !saveActiveNote()) return
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
        if ((isDirty || isRichMode || isBlockMode) && !saveActiveNote()) {
            Qt.callLater(function() { modalsHost.openDeleteDialog(qsTr("The note could not be saved. Save it before moving it to Trash.")) })
            return false
        }
        if (!dataController.deletePage(selectedPageId)) {
            Qt.callLater(function() { modalsHost.openDeleteDialog(qsTr("The note could not be moved to Trash. It was not removed.")) })
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
        if ((isDirty || isRichMode || isBlockMode) && !saveActiveNote()) return
        modalsHost.openDeleteDialog("")
    }

    function handleWidgetSlashCommand(commandId, blockIndex) {
        pendingWidgetBlockIndex = blockIndex
        if (commandId === "ia") { modalsHost.openAiPrompt("", activeContent); return }
        if (commandId === "question" || commandId === "foco" || commandId === "alarme" ||
                commandId === "evento" || commandId === "habito") {
            modalsHost.openSetupWidget(commandId)
            return
        }
        if (commandId === "documento" || commandId === "scrap" || commandId === "video" || commandId === "livro") {
            modalsHost.openMediaWidgetPicker(commandId)
            return
        }
        var widgetHtml = ""
        if (commandId === "toggle") {
            widgetHtml = "<div class=\"toggle-block\" data-type=\"toggle-block\" data-title=\"Seção recolhível\" data-is-open=\"true\"><p></p></div>"
        } else if (commandId === "blockquoteToggle") {
            widgetHtml = "<div class=\"blockquote-toggle\" data-type=\"blockquote-toggle\" data-title=\"Nota expandível\" data-color=\"#8b5cf6\" data-is-open=\"true\"><p></p></div>"
        } else if (commandId === "agrupar") {
            widgetHtml = "<div class=\"document-bundle\" data-type=\"document-bundle\" data-title=\"Pacote de Documentos\" data-items=\"[]\"></div>"
        } else if (commandId === "group") {
            widgetHtml = "<div class=\"group-collection\" data-type=\"groupBlock\" data-title=\"Coleção\" data-collapsed=\"false\"><p></p></div>"
        } else if (commandId === "mermaid") {
            widgetHtml = "<pre><code class=\"language-mermaid\">flowchart TD\n    A[\"Início\"] --> B[\"Resultado\"]</code></pre>"
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

    function checkExternalUpdates() {
        if (!selectedPageId) return
        var p = dataController.getPage(selectedPageId)
        if (!p || !p.id) return
        if (p.updated_at && lastLoadedUpdatedAt && p.updated_at !== lastLoadedUpdatedAt) {
            if (!isDirty) {
                activeTitle = p.title || "Sem título"
                activeDescription = p.description || ""
                activeContent = resolveEditingModeForContent(p.content || "")
                lastLoadedUpdatedAt = p.updated_at
                activeDate = p.updated_at ? p.updated_at.substring(0, 10) : ""
                editorCanvas.setTitleText(activeTitle)
                editorCanvas.setDescriptionText(activeDescription)
                editorCanvas.setEditorText(activeContent)
                editorCanvas.reloadRichEditor()
                editorCanvas.pageActionStatus = ""
                loadPages()
            } else {
                editorCanvas.pageActionStatus = qsTr("Note was modified externally. Save will preserve changes to history.")
            }
        }
    }

    Timer { id: autoSaveTimer; interval: 1500; repeat: false; onTriggered: if (notesRoot.isDirty) notesRoot.saveActiveNote() }
    Timer { id: externalSyncTimer; interval: 3000; repeat: true; running: notesRoot.visible && notesRoot.selectedPageId.length > 0 && !notesRoot.isDirty; onTriggered: notesRoot.checkExternalUpdates() }

    Connections {
        target: dataController
        function onPageConflictDetected(conflictPageId) {
            if (conflictPageId === notesRoot.selectedPageId) {
                notesRoot.saveFailed = true
                editorCanvas.pageActionStatus = qsTr("External edits were detected. Your changes have been preserved in history.")
            }
        }
    }

    Connections {
        target: notesRoot.Window.window ? notesRoot.Window.window : null
        function onActiveChanged() {
            if (notesRoot.Window.window && notesRoot.Window.window.active) notesRoot.checkExternalUpdates()
        }
    }

    NotesEditorShortcuts {
        hasPage: notesRoot.selectedPageId.length > 0
        isPreviewMode: notesRoot.isPreviewMode
        isHistoryOpen: modalsHost.anyBlockingOverlayVisible || editorCanvas.isDialogOpen
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
            onWidgetSlashCommandRequested: function(commandId, blockIndex) { notesRoot.handleWidgetSlashCommand(commandId, blockIndex) }
            onConvertUrlToCardRequested: function(url) {
                var safeUrl = String(url || "").replace(/"/g, "&quot;")
                notesRoot.insertWidgetIntoNote("<div class=\"link-preview-block\" data-type=\"link-preview\" url=\"" + safeUrl + "\"></div>")
            }
            onAskAiRequested: function(sel, blockHtml) { modalsHost.openAiPrompt(sel, blockHtml || notesRoot.activeContent) }
            onPlayQuestionRequested: function(bid, qid, title) { modalsHost.openQuestionSession(bid, qid, title) }
            onOpenInQuestionsRequested: function() { notesRoot.navigateModuleRequested("quiz") }
            onHabitStatsRequested: function(hid) { modalsHost.openHabitHeatmap(hid) }
            onOpenMediaRequested: function(mt) { notesRoot.navigateModuleRequested(mt === "book" ? "library" : "video") }
            onOpenInNewTabRequested: function(pid) { notesRoot.openInNewTabRequested(pid) }
            onSubPageIconChanged: function(pid, emoji) {
                if (typeof dataController.updatePageIcon === "function" && dataController.updatePageIcon(pid, emoji)) notesRoot.loadPages()
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
            onShareRequested: if (typeof globalModals !== "undefined" && globalModals) globalModals.openShare(notesRoot.selectedPageId, notesRoot.activeTitle)
            onPreviewToggled: function(prev) { notesRoot.setPreviewMode(prev) }
            onRichModeRequested: function(enabled) {
                if (enabled) {
                    var resolved = notesRoot.resolveEditingModeForContent(notesRoot.activeContent)
                    if (notesRoot.isRichMode || notesRoot.isBlockMode) notesRoot.activeContent = resolved
                    return
                }
                if (editorCanvas.flushRichEditor()) {
                    notesRoot.isRichMode = false
                    notesRoot.isBlockMode = false
                }
            }
            onTitleModified: function(t) { notesRoot.activeTitle = t; notesRoot.isDirty = true; autoSaveTimer.restart() }
            onDescriptionModified: function(desc) { notesRoot.activeDescription = desc; editorCanvas.setDescriptionText(desc); notesRoot.descriptionDirty = true; notesRoot.isDirty = true; autoSaveTimer.restart() }
            onContentModified: function(c) { notesRoot.activeContent = c; notesRoot.isDirty = true; autoSaveTimer.restart() }
            onRichContentModified: function(html) { notesRoot.activeContent = html; editorCanvas.setEditorText(html); notesRoot.isDirty = true; autoSaveTimer.restart() }
            onRichValidationChanged: function(invalid) { notesRoot.saveFailed = invalid; if (invalid) notesRoot.isDirty = true }
            onIconModified: function(ico) { notesRoot.activeIcon = ico; notesRoot.isDirty = true; notesRoot.saveActiveNote() }
            onPageNavigationRequested: function(pageId) { notesRoot.selectPage(pageId) }
            onPageReferencePreviewRequested: function(pageId) { modalsHost.openReferencePreview(pageId) }
            onCreateSubPageRequested: notesRoot.createNewSubNote(notesRoot.selectedPageId)
            onPageHierarchyChanged: notesRoot.loadPages()
            onPageActionFailed: function(message) { editorCanvas.pageActionStatus = message }
            onCoverModified: function(imageUrl) { notesRoot.updateCover(imageUrl) }
            onExternalLinkRequested: function(link) {
                if (link.indexOf("synapse-youtube://watch?") === 0) {
                    var matchUrl = link.match(/[?&]url=([^&]+)/)
                    var matchTitle = link.match(/[?&]title=([^&]+)/)
                    modalsHost.openYoutubeModal(matchUrl ? decodeURIComponent(matchUrl[1]) : "", matchTitle ? decodeURIComponent(matchTitle[1]) : "Vídeo do YouTube")
                } else if (link.indexOf("synapse-mermaid://view?") === 0) {
                    var matchCode = link.match(/[?&]code=([^&]+)/)
                    modalsHost.openMermaidModal(matchCode ? decodeURIComponent(matchCode[1]) : "")
                }
            }
        }

        NotesEmptyState {
            visible: notesRoot.selectedPageId === ""
            onCreateRequested: notesRoot.createNewRootNote()
        }
    }

    NotesEditorModalsHost {
        id: modalsHost
        controller: dataController
        selectedPageId: notesRoot.selectedPageId
        activeTitle: notesRoot.activeTitle
        activeContent: notesRoot.activeContent
        pageHistoryEntries: notesRoot.pageHistoryEntries
        isHistoryOpen: notesRoot.isHistoryOpen
        isHelpOpen: notesRoot.isHelpOpen
        isPageEncrypted: notesRoot.isPageEncrypted
        isPageUnlocked: notesRoot.isPageUnlocked
        onPageUnlocked: notesRoot.isPageUnlocked = true
        onHistoryClosed: notesRoot.isHistoryOpen = false
        onHelpClosed: notesRoot.isHelpOpen = false
        onRestoreRevisionRequested: function(content) {
            notesRoot.activeContent = notesRoot.resolveEditingModeForContent(content)
            editorCanvas.setEditorText(notesRoot.activeContent)
            editorCanvas.reloadRichEditor()
            notesRoot.isDirty = true
            notesRoot.saveActiveNote()
        }
        onSelectPageRequested: function(pid) { notesRoot.selectPage(pid) }
        onPageSavedExternally: function(savedPageId, newTitle) {
            notesRoot.loadPages()
            if (notesRoot.selectedPageId === savedPageId) notesRoot.activeTitle = newTitle
        }
        onApplyAiHtmlRequested: function(html) {
            notesRoot.activeContent = notesRoot.resolveEditingModeForContent(html)
            editorCanvas.setEditorText(notesRoot.activeContent)
            editorCanvas.reloadRichEditor()
            notesRoot.isDirty = true
            autoSaveTimer.restart()
        }
        onInsertAiTextRequested: function(text) {
            var esc = "<p>" + String(text || "").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</p>"
            notesRoot.activeContent = notesRoot.resolveEditingModeForContent((notesRoot.activeContent || "") + esc)
            editorCanvas.setEditorText(notesRoot.activeContent)
            editorCanvas.reloadRichEditor()
            notesRoot.isDirty = true
            autoSaveTimer.restart()
        }
        onInsertWidgetRequested: function(html) { notesRoot.insertWidgetIntoNote(html) }
        onDeleteNoteConfirmed: notesRoot.deleteActiveNote()
    }
}
