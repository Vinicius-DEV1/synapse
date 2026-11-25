import QtQuick 2.15
import QtQuick.Layouts 1.15
import "../ui"
import "../notes"
import "PageViewActions.js" as Actions

// Primary page orchestration container mirroring apps/web-react/src/components/page-view/PageView.tsx.
Rectangle {
    id: pageViewRoot
    objectName: "pageViewRoot"
    color: theme.bgDarkBg

    property var controller: null
    property var activePageObj: null
    property string selectedPageId: ""
    property string activeTitle: ""
    property string activeDescription: ""
    readonly property int responsivePageMargin: width < 640 ? 16 : (width < 768 ? 32 : 48)
    property string activeIcon: "📄"
    property string activeCoverImage: ""
    property string activeContent: ""
    property string activeUpdatedAt: ""
    property bool activeIsEncrypted: false
    property bool isPageUnlocked: true
    property string saveStatus: "saved"
    property bool isDirty: false
    property var pageList: []
    property var pinnedPages: []
    property var pageTree: []
    property alias allPageTree: pageViewRoot.pageList
    property var collapsedNodeMap: ({})
    property string pageFilterQuery: ""
    readonly property bool isRichMode: true
    property var breadcrumbPages: []
    property var subPagesList: []
    property var childrenByParentMap: ({})
    property bool isHistoryOpen: false
    property bool isHelpOpen: false
    property var pageHistoryEntries: []
    property var scrollPositionMap: ({})
    property var pageByIdMap: ({})
    property int wordCount: 0

    signal shareRequested(string pageId)
    signal openInNewTabRequested(string pageId)
    signal navigateModuleRequested(string moduleKey)
    signal pageSavedExternal(string pageId, string title)

    Theme { id: theme }

    function flushPendingEdits() {
        if (pageHeader && typeof pageHeader.commitPendingMetadata === "function") {
            pageHeader.commitPendingMetadata()
        }
        if (editorSurface && typeof editorSurface.flushActiveEdits === "function") {
            editorSurface.flushActiveEdits()
        }
        return true
    }

    function syncPageMetadataFromController(pageId) {
        var targetId = String(pageId || selectedPageId || "")
        if (!targetId || targetId !== selectedPageId || !controller || typeof controller.getPage !== "function") return
        var refreshed = controller.getPage(targetId)
        if (!refreshed || !refreshed.id) return
        activePageObj = refreshed
        if (refreshed.updated_at) activeUpdatedAt = String(refreshed.updated_at)
        if (refreshed.title !== undefined) activeTitle = String(refreshed.title || "")
        if (refreshed.icon !== undefined) activeIcon = String(refreshed.icon || "📄")
        if (refreshed.description !== undefined) activeDescription = String(refreshed.description || "")
        if (refreshed.cover_image !== undefined) activeCoverImage = Actions.parseCoverConfig(refreshed.cover_image || "").url
    }

    function appendExternalHtml(htmlChunk) {
        if (!selectedPageId || (activeIsEncrypted && !isPageUnlocked) || !htmlChunk) return false
        flushPendingEdits()
        activeContent = (activeContent || "") + String(htmlChunk)
        wordCount = Actions.countWords(activeContent)
        return saveActiveNote()
    }

    function selectPage(pageId) {
        if (selectedPageId === pageId && pageList.length > 0) return
        autoSaveTimer.stop()
        if (selectedPageId && bodyScroll) {
            var nextMap = Object.assign({}, scrollPositionMap)
            nextMap[selectedPageId] = bodyScroll.contentY
            scrollPositionMap = nextMap
        }
        if (selectedPageId) {
            flushPendingEdits()
            if (isDirty) saveActiveNote()
        }
        selectedPageId = String(pageId || "")
        loadActivePage()
        if (bodyScroll) bodyScroll.contentY = scrollPositionMap[selectedPageId] || 0
    }

    function loadPages() { refreshPageTree() }

    function refreshPageTree() {
        if (!controller || typeof controller.getPageTree !== "function") return
        var list = controller.getPageTree("") || []
        pageList = list
        pageTree = pageFilterQuery ? (controller.getPageTree(pageFilterQuery) || []) : list
        if (typeof controller.getPinnedPages === "function") pinnedPages = controller.getPinnedPages() || []
        var maps = Actions.buildHierarchyMaps(list)
        pageByIdMap = maps.byId
        childrenByParentMap = maps.childrenByParent
        breadcrumbPages = Actions.buildBreadcrumbs(selectedPageId, maps.byId)
        subPagesList = maps.childrenByParent[selectedPageId] || []
        if (!selectedPageId && maps.sorted.length > 0) {
            selectedPageId = maps.sorted[0].id
            loadActivePage()
        }
    }

    function createNewSubNote(parentId) {
        if (!controller) return
        var nid = controller.createSubPage(parentId || "", qsTr("Nova Sub-página"), "📄")
        if (nid) { refreshPageTree(); selectPage(nid) }
    }

    function togglePin(pageId) {
        if (controller && typeof controller.togglePinPage === "function") { controller.togglePinPage(pageId); refreshPageTree() }
    }

    function toggleNodeCollapse(pageId) { collapsedNodeMap = Actions.toggleCollapsedKey(collapsedNodeMap, pageId) }
    function setPageFilter(query) { pageFilterQuery = String(query || ""); refreshPageTree() }
    function openMovePageDialog(pageId) { viewModals.openMoveFor(pageId || selectedPageId) }

    function loadActivePage() {
        if (!selectedPageId || !controller) return
        autoSaveTimer.stop()
        var p = controller.getPage(selectedPageId)
        if (!p || !p.id) return
        activePageObj = p
        activeTitle = String(p.title || "")
        activeDescription = String(p.description || "")
        activeIcon = String(p.icon || "📄")
        activeCoverImage = Actions.parseCoverConfig(p.cover_image || "").url
        activeContent = String(p.content || "<p></p>")
        wordCount = Actions.countWords(activeContent)
        activeUpdatedAt = String(p.updated_at || "")
        activeIsEncrypted = Actions.isEncryptedStub(p)
        isPageUnlocked = !activeIsEncrypted || Boolean(controller.isVaultUnlocked)
        isDirty = false; saveStatus = "saved"
        if (pageByIdMap[selectedPageId]) {
            breadcrumbPages = Actions.buildBreadcrumbs(selectedPageId, pageByIdMap)
            subPagesList = childrenByParentMap[selectedPageId] || []
        } else {
            refreshPageTree()
        }
    }

    function saveActiveNote() {
        autoSaveTimer.stop()
        if (!selectedPageId || !controller || (activeIsEncrypted && !isPageUnlocked)) return false
        flushPendingEdits(); saveStatus = "saving"
        var titleToSave = activeTitle || qsTr("Sem título")
        var treeMetaChanged = !activePageObj || String(activePageObj.title || "") !== titleToSave ||
            String(activePageObj.icon || "📄") !== activeIcon
        var res = controller.savePage(selectedPageId, titleToSave, activeContent, activeIcon, activeUpdatedAt)
        if (res === true || (res && res.success)) {
            isDirty = false; saveStatus = "saved"
            var refreshed = (res && res.updated_at) ? res : controller.getPage(selectedPageId)
            if (refreshed && refreshed.updated_at) activeUpdatedAt = String(refreshed.updated_at)
            if (refreshed && refreshed.id) activePageObj = refreshed
            if (treeMetaChanged) refreshPageTree()
            pageSavedExternal(selectedPageId, activeTitle)
            return true
        }
        saveStatus = "error"; return false
    }
    function scheduleAutoSave() { isDirty = true; saveStatus = "dirty"; autoSaveTimer.restart() }
    function createNewRootNote() { createNewSubNote("") }
    function duplicateCurrentPage() {
        var newId = Actions.duplicatePageWithController(controller, selectedPageId, activeTitle, activeContent, activeIcon, activeDescription, activeCoverImage)
        if (newId) { refreshPageTree(); selectPage(newId) }
    }

    Component.onCompleted: refreshPageTree()
    Timer { id: autoSaveTimer; interval: 900; onTriggered: pageViewRoot.saveActiveNote() }

    NotesEditorShortcuts {
        id: pageShortcuts
        hasPage: pageViewRoot.selectedPageId !== ""
        isHistoryOpen: viewModals.innerModalsHost.anyBlockingOverlayVisible
        isEmojiPickerOpen: pageHeader.isEmojiPickerOpen
        contentEditorFocused: editorSurface.hasContentFocus
        onSaveRequested: pageViewRoot.saveActiveNote()
        onFormatRequested: function(prefix, _suffix) {
            var mark = prefix === "<strong>" ? "bold"
                : prefix === "<em>" ? "italic"
                : prefix === "<u>" ? "underline"
                : prefix === "<s>" ? "strike" : ""
            if (mark) editorSurface.toggleActiveMark(mark)
        }
        onRichMarkRequested: function(mark) { editorSurface.toggleActiveMark(mark) }
    }

    NotesEmptyState {
        anchors.fill: parent
        visible: pageViewRoot.selectedPageId === ""
        onCreateRequested: pageViewRoot.createNewRootNote()
    }

    Flickable {
        id: bodyScroll
        anchors.fill: parent
        visible: pageViewRoot.selectedPageId !== "" && (!pageViewRoot.activeIsEncrypted || pageViewRoot.isPageUnlocked)
        contentWidth: width
        contentHeight: mainColumn.implicitHeight + 120
        clip: true
        boundsBehavior: Flickable.StopAtBounds

        ColumnLayout {
            id: mainColumn
            width: parent.width
            spacing: 0

            PageCover {
                Layout.fillWidth: true
                Layout.preferredHeight: pageViewRoot.activeCoverImage.length > 0 ? 256 : 48
                controller: pageViewRoot.controller
                pageId: pageViewRoot.selectedPageId
                coverImage: pageViewRoot.activeCoverImage
                onCoverSaved: function(url) {
                    pageViewRoot.activeCoverImage = url
                    pageViewRoot.syncPageMetadataFromController(pageViewRoot.selectedPageId)
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                Layout.maximumWidth: 1024
                Layout.alignment: Qt.AlignHCenter
                Layout.leftMargin: pageViewRoot.responsivePageMargin
                Layout.rightMargin: pageViewRoot.responsivePageMargin
                spacing: 12

                PageHeader {
                    id: pageHeader
                    Layout.fillWidth: true
                    controller: pageViewRoot.controller
                    activePageId: pageViewRoot.selectedPageId
                    activeTitle: pageViewRoot.activeTitle
                    activeDescription: pageViewRoot.activeDescription
                    activeIcon: pageViewRoot.activeIcon
                    hasCover: pageViewRoot.activeCoverImage.length > 0
                    actionStatus: pageViewRoot.saveStatus
                    isDirty: pageViewRoot.isDirty
                    saveFailed: pageViewRoot.saveStatus === "error"
                    wordCount: pageViewRoot.wordCount
                    pages: pageViewRoot.pageList
                    breadcrumbs: pageViewRoot.breadcrumbPages
                    childPages: pageViewRoot.subPagesList
                    hierarchyActions: viewModals.hierarchyActions
                    onPageSelected: function(pid) { pageViewRoot.selectPage(pid) }
                    onOpenInNewTabRequested: function(pid) { pageViewRoot.openInNewTabRequested(pid) }
                    onTitleModified: function(t) { pageViewRoot.activeTitle = t; pageViewRoot.scheduleAutoSave() }
                    onDescriptionModified: function(d) {
                        pageViewRoot.activeDescription = d
                        if (pageViewRoot.controller) {
                            pageViewRoot.controller.updatePageDescription(pageViewRoot.selectedPageId, d)
                            pageViewRoot.syncPageMetadataFromController(pageViewRoot.selectedPageId)
                        }
                    }
                    onIconModified: function(i) { pageViewRoot.activeIcon = i; pageViewRoot.saveActiveNote() }
                    onSaveRequested: pageViewRoot.saveActiveNote()
                    onShareRequested: pageViewRoot.shareRequested(pageViewRoot.selectedPageId)
                    onDuplicateRequested: pageViewRoot.duplicateCurrentPage()
                    onExportRequested: viewModals.openExport(pageViewRoot.selectedPageId)
                    onHistoryRequested: {
                        if (pageViewRoot.controller) pageViewRoot.pageHistoryEntries = pageViewRoot.controller.getPageHistory(pageViewRoot.selectedPageId) || []
                        pageViewRoot.isHistoryOpen = true
                    }
                    onHelpRequested: pageViewRoot.isHelpOpen = true
                    onMoveRequested: function(pid) { viewModals.openMoveFor(pid || pageViewRoot.selectedPageId) }
                    onDeleteRequested: { viewModals.pendingDeleteTargetId = pageViewRoot.selectedPageId; viewModals.innerModalsHost.openDeleteDialog("") }
                    onCreateSubPageRequested: {
                        var nid = pageViewRoot.controller ? pageViewRoot.controller.createSubPage(pageViewRoot.selectedPageId, qsTr("Nova Sub-página"), "📄") : ""
                        if (nid) { pageViewRoot.refreshPageTree(); pageViewRoot.selectPage(nid) }
                    }
                    onSubPageCreateRequested: function(pid) {
                        var nid = pageViewRoot.controller ? pageViewRoot.controller.createSubPage(pid, qsTr("Nova Sub-página"), "📄") : ""
                        if (nid) pageViewRoot.refreshPageTree()
                    }
                    onSubPageIconChanged: function(pid, emoji) { if (pageViewRoot.controller) { pageViewRoot.controller.updatePageIcon(pid, emoji); pageViewRoot.refreshPageTree() } }
                    onSubPageRenameRequested: function(pid, curTitle) { viewModals.openRenameFor(pid, curTitle) }
                    onSubPageDeleteRequested: function(pid) { viewModals.pendingDeleteTargetId = pid; viewModals.innerModalsHost.openDeleteDialog("") }
                }

                Editor {
                    id: editorSurface
                    Layout.fillWidth: true
                    controller: pageViewRoot.controller
                    activeContent: pageViewRoot.activeContent
                    pageId: pageViewRoot.selectedPageId
                    activeTitle: pageViewRoot.activeTitle
                    pageList: pageViewRoot.pageList
                    modalsHost: viewModals.innerModalsHost
                    shortcutsHost: pageShortcuts
                    onContentModified: function(html) {
                        if (html === pageViewRoot.activeContent) return
                        pageViewRoot.activeContent = html
                        pageViewRoot.wordCount = Actions.countWords(html)
                        pageViewRoot.scheduleAutoSave()
                    }
                    onPagePreviewRequested: function(pid) { viewModals.openFloatingPage(pid) }
                    onPageOpenRequested: function(pid) { pageViewRoot.selectPage(pid) }
                    onExternalLinkRequested: function(lnk) { Qt.openUrlExternally(lnk) }
                    onPageHierarchyChanged: pageViewRoot.refreshPageTree()
                    onPlayQuestionRequested: function(bid, qid, t) { viewModals.innerModalsHost.openQuestionSession(bid, qid, t) }
                    onOpenInQuestionsRequested: function() { pageViewRoot.navigateModuleRequested("questions") }
                    onOpenCalendarRequested: pageViewRoot.navigateModuleRequested("calendar")
                    onYoutubeWatchRequested: function(u, t) { viewModals.innerModalsHost.openYoutubeModal(u, t) }
                    onMermaidFullscreenRequested: function(c) { viewModals.innerModalsHost.openMermaidModal(c) }
                    onHabitStatsRequested: function(hid) { viewModals.innerModalsHost.openHabitHeatmap(hid) }
                    onOpenMediaRequested: function() { pageViewRoot.navigateModuleRequested("library") }
                }

                MouseArea {
                    Layout.fillWidth: true; Layout.preferredHeight: 96; cursorShape: Qt.IBeamCursor
                    onClicked: editorSurface.appendTrailingParagraphAndFocus()
                }
            }
        }
    }

    PageUnlockForm {
        anchors.fill: parent; z: 95
        controller: pageViewRoot.controller
        page: pageViewRoot.activePageObj
        visible: pageViewRoot.selectedPageId !== "" && pageViewRoot.activeIsEncrypted && !pageViewRoot.isPageUnlocked
        onUnlocked: function(decryptedContent) {
            pageViewRoot.isPageUnlocked = true
            pageViewRoot.activeIsEncrypted = false
            if (decryptedContent && decryptedContent.length > 0) pageViewRoot.activeContent = decryptedContent
            pageViewRoot.loadActivePage()
        }
    }

    PageViewModalsHost {
        id: viewModals
        controller: pageViewRoot.controller
        selectedPageId: pageViewRoot.selectedPageId
        activeTitle: pageViewRoot.activeTitle
        activeContent: pageViewRoot.activeContent
        activeIsEncrypted: pageViewRoot.activeIsEncrypted
        isPageUnlocked: pageViewRoot.isPageUnlocked
        pageList: pageViewRoot.pageList
        pageHistoryEntries: pageViewRoot.pageHistoryEntries
        isHistoryOpen: pageViewRoot.isHistoryOpen
        isHelpOpen: pageViewRoot.isHelpOpen
        onHistoryClosed: pageViewRoot.isHistoryOpen = false
        onHelpClosed: pageViewRoot.isHelpOpen = false
        onSelectPageRequested: function(pid) { pageViewRoot.selectPage(pid) }
        onImportedPage: function(newId) { pageViewRoot.refreshPageTree(); pageViewRoot.selectPage(newId) }
        onRestoreRevisionRequested: function(content) {
            pageViewRoot.activeContent = content
            pageViewRoot.wordCount = Actions.countWords(content)
            pageViewRoot.saveActiveNote()
            pageViewRoot.isHistoryOpen = false
        }
        onApplyAiHtmlRequested: function(html) { editorSurface.applyAiResult(html) }
        onInsertAiTextRequested: function(txt) { editorSurface.applyAiResult("<p>" + txt + "</p>") }
        onInsertWidgetRequested: function(html) { editorSurface.insertWidgetHtmlAtPending(html) }
        onTitleRenamedFromModal: function(pid, nt) {
            if (pid === pageViewRoot.selectedPageId) {
                pageViewRoot.activeTitle = nt
                pageViewRoot.syncPageMetadataFromController(pid)
            }
        }
        onHierarchyRefreshRequested: {
            if (pageViewRoot.selectedPageId && pageViewRoot.controller && !pageViewRoot.controller.getPage(pageViewRoot.selectedPageId)) {
                pageViewRoot.selectedPageId = ""
                pageViewRoot.activePageObj = null
                pageViewRoot.activeTitle = ""
                pageViewRoot.activeDescription = ""
                pageViewRoot.activeIcon = "📄"
                pageViewRoot.activeCoverImage = ""
                pageViewRoot.activeContent = ""
                pageViewRoot.activeUpdatedAt = ""
                pageViewRoot.activeIsEncrypted = false
                pageViewRoot.isPageUnlocked = true
                pageViewRoot.wordCount = 0
                pageViewRoot.isDirty = false
                pageViewRoot.saveStatus = "saved"
            }
            pageViewRoot.refreshPageTree()
        }
    }
}
