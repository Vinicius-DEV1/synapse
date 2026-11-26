import QtQuick 2.15
import "../notes"
import "../modals"

// Consolidated modal host for PageView to keep PageView.qml modular and under 250 lines.
Item {
    id: hostRoot

    property var controller: null
    property string selectedPageId: ""
    property string activeTitle: ""
    property string activeContent: ""
    property var pageList: []
    property var pageHistoryEntries: []
    property bool isHistoryOpen: false
    property bool isHelpOpen: false
    property bool activeIsEncrypted: false
    property bool isPageUnlocked: true
    property string pendingDeleteTargetId: ""
    readonly property string pendingDeleteTargetTitle: {
        var tid = pendingDeleteTargetId || selectedPageId
        if (!tid || tid === selectedPageId) return activeTitle
        for (var i = 0; i < pageList.length; ++i) {
            if (pageList[i] && String(pageList[i].id || "") === tid) {
                return String(pageList[i].title || qsTr("Sem título"))
            }
        }
        return activeTitle
    }
    property alias innerModalsHost: notesModals
    property alias hierarchyActions: hierarchyActions

    signal selectPageRequested(string pageId)
    signal hierarchyRefreshRequested()
    signal titleRenamedFromModal(string pageId, string newTitle)
    signal restoreRevisionRequested(string content)
    signal applyAiHtmlRequested(string html)
    signal insertAiTextRequested(string text)
    signal insertWidgetRequested(string widgetHtml)
    signal importedPage(string newPageId)
    signal historyClosed()
    signal helpClosed()
    signal navigateModuleRequested(string moduleKey)

    function openMoveFor(pageId) {
        moveModal.openForPage(pageId || selectedPageId)
    }

    function openRenameFor(pageId, currentTitle) {
        renameModal.openFor(pageId, currentTitle)
    }

    function openExport(pageId) {
        importExportDialogs.openExport(pageId)
    }

    function openFloatingPage(pageId) {
        floatingModalLoader.openForPage(pageId)
    }

    NotesHierarchyActions {
        id: hierarchyActions
        controller: hostRoot.controller
        onStructureChanged: hostRoot.hierarchyRefreshRequested()
    }

    NotesImportExportDialogs {
        id: importExportDialogs
        controller: hostRoot.controller
        onImported: function(newId) { hostRoot.importedPage(newId) }
    }

    MovePageModal {
        id: moveModal
        pages: hostRoot.pageList
        hierarchyActions: hierarchyActions
    }

    RenamePageModal {
        id: renameModal
        onRenamed: function(pid, newTitle) {
            if (hostRoot.controller && typeof hostRoot.controller.renamePage === "function") {
                hostRoot.controller.renamePage(pid, newTitle)
            }
            hostRoot.titleRenamedFromModal(pid, newTitle)
            hostRoot.hierarchyRefreshRequested()
        }
    }

    Loader {
        id: floatingModalLoader
        active: false
        property string pendingPageId: ""
        source: "../modals/FloatingPageModal.qml"
        function openForPage(pid) {
            pendingPageId = String(pid || "")
            active = true
            if (item) {
                item.controller = hostRoot.controller
                item.openForPage(pendingPageId)
                pendingPageId = ""
            }
        }
        onLoaded: {
            if (!item) return
            item.controller = hostRoot.controller
            if (pendingPageId.length > 0) {
                item.openForPage(pendingPageId)
                pendingPageId = ""
            }
        }
    }

    Connections {
        target: floatingModalLoader.item
        ignoreUnknownSignals: true
        function onNavigateModuleRequested(moduleKey) {
            hostRoot.navigateModuleRequested(moduleKey)
        }
    }

    Connections {
        target: floatingModalLoader.item
        ignoreUnknownSignals: true
        function onExpandRequested(pid) { hostRoot.selectPageRequested(pid) }
        function onPageSaved() { hostRoot.hierarchyRefreshRequested() }
        function onClosed() { floatingModalLoader.active = false }
    }

    NotesEditorModalsHost {
        id: notesModals
        controller: hostRoot.controller
        selectedPageId: hostRoot.selectedPageId
        activeTitle: hostRoot.activeTitle
        activeContent: hostRoot.activeContent
        deleteTargetTitle: hostRoot.pendingDeleteTargetTitle
        pageHistoryEntries: hostRoot.pageHistoryEntries
        isHistoryOpen: hostRoot.isHistoryOpen
        isHelpOpen: hostRoot.isHelpOpen
        isPageEncrypted: hostRoot.activeIsEncrypted
        isPageUnlocked: hostRoot.isPageUnlocked
        onHistoryClosed: hostRoot.historyClosed()
        onHelpClosed: hostRoot.helpClosed()
        onRestoreRevisionRequested: function(c) { hostRoot.restoreRevisionRequested(c) }
        onSelectPageRequested: function(pid) { hostRoot.selectPageRequested(pid) }
        onApplyAiHtmlRequested: function(html) { hostRoot.applyAiHtmlRequested(html) }
        onInsertAiTextRequested: function(txt) { hostRoot.insertAiTextRequested(txt) }
        onInsertWidgetRequested: function(html) { hostRoot.insertWidgetRequested(html) }
        onDeleteCancelled: hostRoot.pendingDeleteTargetId = ""
        onDeleteNoteConfirmed: {
            var targetId = hostRoot.pendingDeleteTargetId || hostRoot.selectedPageId
            if (!targetId || !hostRoot.controller) return
            hostRoot.controller.deletePage(targetId)
            hostRoot.pendingDeleteTargetId = ""
            hostRoot.hierarchyRefreshRequested()
        }
    }
}
