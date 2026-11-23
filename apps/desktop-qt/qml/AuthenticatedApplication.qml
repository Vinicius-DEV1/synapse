import QtQuick 2.15
import QtQuick.Layouts 1.15
import "layout"
import "ui"
import "home"
import "diagrams"
import "video"
import "questions"
import "notes"
import "anki"
import "finance"
import "calendar"
import "library"
import "culture"
import "focus"
import "vault"
import "trash"
import "settings"
import "notifications"
import "files"
import "practice"
import "ai-sidebar"

Item {
    id: rootWindow
    anchors.fill: parent
    property var windowRoot: null

    Theme { id: theme }

    // Navigation & Tabs State (Matching Original Caderno Tab System)
    property string activeTab: "home"
    property bool sidebarExpanded: true
    property bool notificationsOpen: false
    property bool aiSidebarOpen: false
    property var tabsList: [
        { id: "tab-home", module: "home", title: "Início", icon: "home", pageId: null, pageEmoji: "", bookId: null, bookTitle: "", moduleState: ({}), isPinned: false }
    ]
    property string currentTabId: "tab-home"
    property bool compactPinnedTabs: true
    property int tabMaxWidth: 220

    function loadShellTabSettings() {
        if (!dataController) return
        try {
            var raw = dataController.getConfig("app_settings", "")
            if (raw && raw.length > 0) {
                var parsed = JSON.parse(raw)
                if (typeof parsed.compactPinnedTabs === "boolean") compactPinnedTabs = parsed.compactPinnedTabs
                if (typeof parsed.tabMaxWidth === "number" && parsed.tabMaxWidth >= 90) tabMaxWidth = parsed.tabMaxWidth
            }
        } catch (e) {}
    }

    Component.onCompleted: loadShellTabSettings()

    readonly property var currentTabObj: {
        for (var i = 0; i < tabsList.length; ++i) {
            if (tabsList[i].id === currentTabId) return tabsList[i]
        }
        return null
    }
    readonly property string activeTitle: currentTabObj && currentTabObj.title ? String(currentTabObj.title) : ""

    readonly property string activeSubSection: {
        if (activeTab === "settings" && settingsView) return settingsView.activeTab
        if (activeTab === "finance" && financeView) return financeView.activeSubTab
        if (activeTab === "focus" && focusView) return focusView.currentTab
        if (activeTab === "vault" && vaultView) return vaultView.viewMode === "security" ? "security" : (vaultView.isPasswordDialogOpen ? "generator" : "items")
        return ""
    }

    function captureActiveTabState() {
        var idx = -1
        for (var i = 0; i < tabsList.length; ++i) {
            if (tabsList[i].id === currentTabId) { idx = i; break }
        }
        if (idx === -1) return
        var cur = tabsList[idx]
        var patch = ({})
        if (cur.module === "notes" && notesView && notesView.selectedPageId) {
            patch.pageId = notesView.selectedPageId
            patch.pageEmoji = notesView.activeIcon || "📄"
            patch.title = notesView.activeTitle || "Caderno"
        } else if (cur.module === "finance" && financeView) {
            patch.pageId = financeView.activeSubTab
        } else if (cur.module === "settings" && settingsView) {
            patch.pageId = settingsView.activeTab
        } else if (cur.module === "focus" && focusView) {
            patch.pageId = focusView.currentTab
        } else if (cur.module === "vault" && vaultView) {
            patch.pageId = vaultView.viewMode === "security" ? "security" : "items"
        } else if (cur.module === "library" && libraryView) {
            patch.bookId = libraryView.activeBookId || null
            patch.bookTitle = libraryView.activeBookTitle || ""
            patch.title = patch.bookId ? patch.bookTitle : "Biblioteca"
        }
        var nextTabs = tabsList.slice()
        nextTabs[idx] = Object.assign({}, cur, patch)
        tabsList = nextTabs
    }

    function syncActiveLibraryTabMeta() {
        if (activeTab !== "library" || !libraryView) return
        var bId = libraryView.activeBookId || null
        var bTitle = libraryView.activeBookTitle || ""
        var tabTitle = bId ? bTitle : "Biblioteca"
        for (var i = 0; i < tabsList.length; ++i) {
            if (tabsList[i].id === currentTabId && tabsList[i].module === "library") {
                if (tabsList[i].bookId !== bId || tabsList[i].title !== tabTitle) {
                    var newTabs = tabsList.slice()
                    newTabs[i] = Object.assign({}, newTabs[i], { bookId: bId, bookTitle: bTitle, title: tabTitle })
                    tabsList = newTabs
                }
                break
            }
        }
    }

    function restoreTabState(tabObj) {
        if (!tabObj) return
        if (tabObj.module === "notes" && notesView && tabObj.pageId) {
            notesView.selectPage(tabObj.pageId)
        } else if (tabObj.module === "finance" && financeView && tabObj.pageId) {
            financeView.activeSubTab = tabObj.pageId
        } else if (tabObj.module === "settings" && settingsView && tabObj.pageId) {
            settingsView.activeTab = tabObj.pageId
        } else if (tabObj.module === "focus" && focusView && tabObj.pageId) {
            focusView.currentTab = tabObj.pageId
        } else if (tabObj.module === "vault" && vaultView && tabObj.pageId) {
            vaultView.viewMode = (tabObj.pageId === "security") ? "security" : "items"
        } else if (tabObj.module === "library" && libraryView) {
            if (tabObj.bookId) libraryView.openBookById(tabObj.bookId)
            else libraryView.closeReaderIfOpen()
        }
    }

    function switchToTab(tabId) {
        flushActiveNotes()
        captureActiveTabState()
        for (var i = 0; i < tabsList.length; ++i) {
            if (tabsList[i].id === tabId) {
                currentTabId = tabId
                activeTab = tabsList[i].module
                restoreTabState(tabsList[i])
                return
            }
        }
    }

    function reorderTabs(fromIndex, toIndex) {
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= tabsList.length || toIndex >= tabsList.length || fromIndex === toIndex) return
        var nextTabs = tabsList.slice()
        var item = nextTabs.splice(fromIndex, 1)[0]
        nextTabs.splice(toIndex, 0, item)
        tabsList = nextTabs
    }

    function syncActiveNotesTabMeta() {
        if (activeTab !== "notes" || !notesView) return
        var pageTitle = (notesView.activeTitle && notesView.activeTitle !== "Selecione uma nota") ? notesView.activeTitle : "Caderno"
        var pageId = notesView.selectedPageId || ""
        var pageEmoji = notesView.activeIcon || "📄"
        for (var i = 0; i < tabsList.length; ++i) {
            if (tabsList[i].id === currentTabId && tabsList[i].module === "notes") {
                if (tabsList[i].title !== pageTitle || tabsList[i].pageId !== pageId || tabsList[i].pageEmoji !== pageEmoji) {
                    var newTabs = tabsList.slice()
                    newTabs[i] = Object.assign({}, newTabs[i], { title: pageTitle, pageId: pageId, pageEmoji: pageEmoji })
                    tabsList = newTabs
                }
                break
            }
        }
    }

    function flushActiveNotes() {
        if (notesView && (notesView.isDirty || notesView.isRichMode)) {
            notesView.saveActiveNote()
        }
    }

    function addNewTab(moduleKey, title, icon, pageId, pageEmoji) {
        flushActiveNotes()
        captureActiveTabState()
        var mod = moduleKey || "notes"
        var info = getModuleInfo(mod)
        var newId = "tab-" + mod + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
        var newTabs = tabsList.slice()
        newTabs.push({
            id: newId,
            module: mod,
            title: title || (mod === "notes" ? "Nova Nota" : info.title),
            icon: icon || info.icon,
            pageId: pageId || null,
            pageEmoji: pageEmoji || "",
            bookId: null,
            bookTitle: "",
            moduleState: ({}),
            isPinned: false
        })
        tabsList = newTabs
        currentTabId = newId
        activeTab = mod
        if (mod === "notes" && notesView) {
            if (pageId) notesView.selectPage(pageId)
            else notesView.createNewRootNote()
        }
    }

    function updateActiveTabModule(moduleKey, title, icon, pageId, pageEmoji) {
        flushActiveNotes()
        captureActiveTabState()
        var mod = moduleKey || "notes"
        var info = getModuleInfo(mod)
        var tabTitle = title || info.title
        var tabIcon = icon || info.icon

        var newTabs = tabsList.slice()
        var targetIndex = -1

        for (var i = 0; i < newTabs.length; ++i) {
            if (newTabs[i].id === currentTabId) {
                targetIndex = i
                break
            }
        }

        // If the current tab is pinned, don't overwrite it; use first unpinned tab or open new
        if (targetIndex !== -1 && newTabs[targetIndex].isPinned) {
            var unpinnedIndex = -1
            for (var u = 0; u < newTabs.length; ++u) {
                if (!newTabs[u].isPinned) {
                    unpinnedIndex = u
                    break
                }
            }
            if (unpinnedIndex !== -1) {
                targetIndex = unpinnedIndex
                currentTabId = newTabs[unpinnedIndex].id
            } else {
                addNewTab(mod, tabTitle, tabIcon, pageId, pageEmoji)
                return
            }
        }

        if (targetIndex !== -1) {
            newTabs[targetIndex] = {
                id: newTabs[targetIndex].id,
                module: mod,
                title: tabTitle,
                icon: tabIcon,
                pageId: pageId || null,
                pageEmoji: pageEmoji || "",
                bookId: null,
                bookTitle: "",
                moduleState: ({}),
                isPinned: newTabs[targetIndex].isPinned === true
            }
        } else if (newTabs.length > 0) {
            newTabs[0] = {
                id: newTabs[0].id,
                module: mod,
                title: tabTitle,
                icon: tabIcon,
                pageId: pageId || null,
                pageEmoji: pageEmoji || "",
                bookId: null,
                bookTitle: "",
                moduleState: ({}),
                isPinned: newTabs[0].isPinned === true
            }
            currentTabId = newTabs[0].id
        } else {
            var newId = "tab-" + mod + "-" + Date.now()
            newTabs.push({ id: newId, module: mod, title: tabTitle, icon: tabIcon, pageId: pageId || null, pageEmoji: pageEmoji || "", bookId: null, bookTitle: "", moduleState: ({}), isPinned: false })
            currentTabId = newId
        }

        tabsList = newTabs
        activeTab = mod
        if (mod === "notes" && notesView) {
            if (pageId) notesView.selectPage(pageId)
            else if (notesView.selectedPageId === "") notesView.loadPages()
        }
    }

    function openOrSwitchTab(moduleKey, title, icon) {
        updateActiveTabModule(moduleKey, title, icon)
    }

    function closeTab(tabId) {
        if (tabsList.length <= 1) return
        flushActiveNotes()
        var idx = -1
        for (var i = 0; i < tabsList.length; i++) {
            if (tabsList[i].id === tabId) {
                idx = i
                break
            }
        }
        if (idx !== -1) {
            var newTabs = tabsList.slice()
            newTabs.splice(idx, 1)
            tabsList = newTabs
            if (currentTabId === tabId) {
                var nextTab = newTabs[Math.min(idx, newTabs.length - 1)] || newTabs[0]
                currentTabId = nextTab.id
                activeTab = nextTab.module
                restoreTabState(nextTab)
            }
        }
    }

    function togglePinTab(tabId) {
        var newTabs = tabsList.slice()
        for (var i = 0; i < newTabs.length; ++i) {
            if (newTabs[i].id === tabId) {
                newTabs[i].isPinned = !newTabs[i].isPinned
                break
            }
        }
        newTabs.sort(function(a, b) {
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1
            return 0
        })
        tabsList = newTabs
    }

    function duplicateTab(tabId) {
        captureActiveTabState()
        for (var i = 0; i < tabsList.length; ++i) {
            if (tabsList[i].id === tabId) {
                var src = tabsList[i]
                var newId = "tab-" + src.module + "-" + Date.now()
                var newTabs = tabsList.slice()
                newTabs.splice(i + 1, 0, Object.assign({}, src, { id: newId, isPinned: false }))
                tabsList = newTabs
                currentTabId = newId
                activeTab = src.module
                restoreTabState(newTabs[i + 1])
                return
            }
        }
    }

    function closeOtherTabs(tabId) {
        flushActiveNotes()
        var newTabs = []
        for (var i = 0; i < tabsList.length; ++i) {
            if (tabsList[i].id === tabId || tabsList[i].isPinned) {
                newTabs.push(tabsList[i])
            }
        }
        tabsList = newTabs
        currentTabId = tabId
        for (var j = 0; j < newTabs.length; ++j) {
            if (newTabs[j].id === tabId) {
                activeTab = newTabs[j].module
                break
            }
        }
    }

    function closeTabsToRight(tabId) {
        flushActiveNotes()
        var idx = -1
        for (var i = 0; i < tabsList.length; ++i) {
            if (tabsList[i].id === tabId) {
                idx = i
                break
            }
        }
        if (idx === -1) return
        var newTabs = []
        for (var j = 0; j < tabsList.length; ++j) {
            if (j <= idx || tabsList[j].isPinned) {
                newTabs.push(tabsList[j])
            }
        }
        tabsList = newTabs
    }

    function nextTab() {
        if (tabsList.length <= 1) return
        for (var i = 0; i < tabsList.length; ++i) {
            if (tabsList[i].id === currentTabId) {
                var nextIdx = (i + 1) % tabsList.length
                switchToTab(tabsList[nextIdx].id)
                return
            }
        }
    }

    function previousTab() {
        if (tabsList.length <= 1) return
        for (var i = 0; i < tabsList.length; ++i) {
            if (tabsList[i].id === currentTabId) {
                var prevIdx = (i - 1 + tabsList.length) % tabsList.length
                switchToTab(tabsList[prevIdx].id)
                return
            }
        }
    }

    function getModuleInfo(key) {
        if (key === "home") return { title: "Início", icon: "home" }
        if (key === "notes") return { title: "Caderno", icon: "notes" }
        if (key === "quiz") return { title: "Questões", icon: "quiz" }
        if (key === "library") return { title: "Biblioteca", icon: "library" }
        if (key === "finance") return { title: "Finanças", icon: "finance" }
        if (key === "culture") return { title: "Cultura", icon: "culture" }
        if (key === "video") return { title: "Vídeos", icon: "video" }
        if (key === "anki") return { title: "Flashcards", icon: "anki" }
        if (key === "calendar") return { title: "Agenda", icon: "calendar" }
        if (key === "files") return { title: "Arquivos", icon: "folder" }
        if (key === "diagrams") return { title: "Diagramas", icon: "diagrams" }
        if (key === "focus") return { title: "Foco", icon: "focus" }
        if (key === "practice") return { title: "Prática", icon: "focus" }
        if (key === "vault") return { title: "Cofre", icon: "vault" }
        if (key === "trash") return { title: "Lixeira", icon: "trash" }
        if (key === "settings") return { title: "Configurações", icon: "settings" }
        return { title: "Caderno", icon: "notes" }
    }

    function handleGlobalAction(actionKey) {
        if (actionKey === "new_note") {
            rootWindow.updateActiveTabModule("notes", "Caderno", "notes")
            notesView.createNewRootNote()
        } else if (actionKey === "new_event") {
            rootWindow.updateActiveTabModule("calendar", "Agenda", "calendar")
            calendarView.isCreatingEvent = true
        } else if (actionKey === "new_transaction") {
            rootWindow.updateActiveTabModule("finance", "Finanças", "finance")
            financeView.isAddingTransaction = true
        } else if (actionKey === "new_vault") {
            rootWindow.updateActiveTabModule("vault", "Cofre", "vault")
            vaultView.isAddingItem = true
        } else if (actionKey === "command_palette") {
            cmdPalette.open()
        } else if (actionKey === "settings") {
            rootWindow.updateActiveTabModule("settings", "Configurações", "settings")
        }
    }

    // Global Keyboard Shortcuts
    AppGlobalShortcuts {
        onOpenCommandPalette: {
            if (cmdPalette.isOpen) cmdPalette.close()
            else cmdPalette.open()
        }
        onNewPageRequested: {
            rootWindow.updateActiveTabModule("notes", "Caderno", "notes")
            notesView.createNewRootNote()
        }
        onNewTabRequested: rootWindow.addNewTab("notes", "Nova Nota", "notes")
        onCloseActiveTabRequested: rootWindow.closeTab(rootWindow.currentTabId)
        onNextTabRequested: rootWindow.nextTab()
        onPreviousTabRequested: rootWindow.previousTab()
        onToggleSidebarRequested: rootWindow.sidebarExpanded = !rootWindow.sidebarExpanded
        onToggleFullscreenRequested: {
            if (!rootWindow.windowRoot) return
            if (rootWindow.windowRoot.visibility === Window.FullScreen) rootWindow.windowRoot.showNormal()
            else rootWindow.windowRoot.showFullScreen()
        }
        onOpenTabRequested: function(modKey, title, icon) {
            rootWindow.updateActiveTabModule(modKey, title, icon)
        }
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // Signature Top Chrome Tab Bar
        AppTopTabBar {
            id: topTabBar
            visible: !(videoView.activeVideo !== null && videoView.isPlayerFullscreen) && !libraryView.isReaderFullscreen
            Layout.preferredHeight: visible ? 46 : 0
            openTabs: rootWindow.tabsList
            activeTabId: rootWindow.currentTabId
            unreadCount: dataController ? dataController.unreadNotificationCount : 0
            compactPinnedTabs: rootWindow.compactPinnedTabs
            tabMaxWidth: rootWindow.tabMaxWidth
            windowRoot: rootWindow.windowRoot
            onTabSelected: function(tId, _modKey) { rootWindow.switchToTab(tId) }
            onTabClosed: function(tId) { rootWindow.closeTab(tId) }
            onTabPinToggled: function(tId) { rootWindow.togglePinTab(tId) }
            onTabReordered: function(fromIdx, toIdx) { rootWindow.reorderTabs(fromIdx, toIdx) }
            onDuplicateTabRequested: function(tId) { rootWindow.duplicateTab(tId) }
            onCloseOtherTabsRequested: function(tId) { rootWindow.closeOtherTabs(tId) }
            onCloseTabsToRightRequested: function(tId) { rootWindow.closeTabsToRight(tId) }
            onNotificationRequested: rootWindow.notificationsOpen = !rootWindow.notificationsOpen
            onAiAssistantRequested: rootWindow.aiSidebarOpen = !rootWindow.aiSidebarOpen
            onNewTabRequested: rootWindow.addNewTab("notes", "Nova Nota", "notes", "", "📄")
            onMinimizeRequested: {
                if (rootWindow.windowRoot) rootWindow.windowRoot.showMinimized()
            }
            onMaximizeRequested: {
                if (!rootWindow.windowRoot) return
                if (rootWindow.windowRoot.visibility === Window.Maximized) rootWindow.windowRoot.showNormal()
                else rootWindow.windowRoot.showMaximized()
            }
            onCloseAppRequested: {
                rootWindow.flushActiveNotes()
                if (rootWindow.windowRoot) rootWindow.windowRoot.close()
                else Qt.quit()
            }
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 0

            // Caderno Sidebar
            AppSidebar {
                id: appSidebar
                visible: !(videoView.activeVideo !== null && videoView.isPlayerFullscreen) && !libraryView.isReaderFullscreen
                sidebarExpanded: rootWindow.sidebarExpanded
                activeTab: rootWindow.activeTab
                activeSubSection: rootWindow.activeSubSection
                notePinnedPages: notesView.pinnedPages
                notePageTree: notesView.pageTree
                noteCollapsedNodeMap: notesView.collapsedNodeMap
                selectedNotePageId: notesView.selectedPageId
                onTabSelected: function(tabKey) {
                    var info = rootWindow.getModuleInfo(tabKey)
                    rootWindow.updateActiveTabModule(tabKey, info.title, info.icon)
                }
                onSettingsTabSelected: function(tabId) {
                    var info = rootWindow.getModuleInfo("settings")
                    rootWindow.updateActiveTabModule("settings", info.title, info.icon, tabId, "")
                    settingsView.activeTab = tabId
                }
                onModuleSubSectionSelected: function(modKey, secId) {
                    var info = rootWindow.getModuleInfo(modKey)
                    rootWindow.updateActiveTabModule(modKey, info.title, info.icon, secId, "")
                    if (modKey === "finance") {
                        financeView.activeSubTab = secId
                    } else if (modKey === "focus") {
                        focusView.currentTab = secId
                    } else if (modKey === "vault") {
                        if (secId === "generator") {
                            vaultView.viewMode = "items"
                            vaultView.generatedPassword = dataController.generateSecurePassword(20, true, true, true, true)
                            vaultView.isPasswordDialogOpen = true
                        } else if (secId === "security") {
                            vaultView.isPasswordDialogOpen = false
                            vaultView.viewMode = "security"
                        } else {
                            vaultView.isPasswordDialogOpen = false
                            vaultView.viewMode = "items"
                        }
                    }
                }
                onToggleSidebarRequested: rootWindow.sidebarExpanded = !rootWindow.sidebarExpanded
                onOpenCommandPaletteRequested: cmdPalette.open()
                onNotePageSelected: function(pageId) {
                    notesView.selectPage(pageId)
                    var p = dataController.getPage(pageId)
                    var title = (p && p.title) ? p.title : "Caderno"
                    var emoji = (p && p.icon) ? p.icon : "📄"
                    rootWindow.updateActiveTabModule("notes", title, "notes", pageId, emoji)
                }
                onOpenInNewTabRequested: function(pageId) {
                    var p = dataController.getPage(pageId)
                    var title = (p && p.title) ? p.title : "Caderno"
                    var emoji = (p && p.icon) ? p.icon : "📄"
                    rootWindow.addNewTab("notes", title, "notes", pageId, emoji)
                }
                onCreateNoteRequested: notesView.createNewRootNote()
                onImportNoteRequested: function(parentId) { notesImportExport.openImport(parentId) }
                onExportNoteRequested: function(pageId) { notesImportExport.openExport(pageId) }
                onShareNoteRequested: function(pageId) {
                    var p = dataController.getPage(pageId)
                    globalModals.openShare(pageId, (p && p.title) ? p.title : "Página")
                }
                onCreateSubNoteRequested: function(parentId) { notesView.createNewSubNote(parentId) }
                onToggleNotePinRequested: function(pageId) { notesView.togglePin(pageId) }
                onToggleNoteCollapseRequested: function(pageId) { notesView.toggleNodeCollapse(pageId) }
                onNoteSearchChanged: function(query) { notesView.setPageFilter(query) }
                onMoveNoteRequested: function(pageId) { notesView.openMovePageDialog(pageId) }
                onRenameNoteRequested: function(pageId) {
                    var p = dataController.getPage(pageId)
                    renamePageModal.openFor(pageId, (p && p.title) ? p.title : "")
                }
                onChangeNoteIconRequested: function(pageId, emoji) {
                    dataController.updatePageIcon(pageId, emoji)
                    if (notesView.selectedPageId === pageId) {
                        notesView.activeIcon = emoji
                    }
                    notesView.loadPages()
                    rootWindow.syncActiveNotesTabMeta()
                }
                onDeleteNoteRequested: function(pageId) {
                    var p = dataController.getPage(pageId)
                    var title = (p && p.title) ? p.title : "esta página"
                    globalModals.requestConfirm("Mover para lixeira", "Tem certeza que deseja mover '" + title + "' para a lixeira?", function() {
                        dataController.deletePage(pageId)
                        notesView.loadPages()
                        globalModals.showSyncStatus("success")
                    }, "error", "Excluir", "Cancelar")
                }
                onMoveNoteInTreeRequested: function(sourceId, targetParentId) {
                    dataController.movePage(sourceId, targetParentId)
                    notesView.loadPages()
                    globalModals.showSyncStatus("success")
                }
                onOpenWorkspaceCreateRequested: globalModals.openWorkspaceCreate()
                onOpenWorkspaceMembersRequested: globalModals.openWorkspaceMembers()
                onOpenAccountEvolutionRequested: globalModals.openAccountEvolution()
            }

            // Main Workspace Area (Stack of Native Modules)
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                color: theme.bgDarkBg

                MouseArea {
                    anchors.fill: parent
                    acceptedButtons: Qt.RightButton
                    onClicked: function(mouse) {
                        globalModals.showContextMenu(mouse.x, mouse.y)
                    }
                }

                StackLayout {
                    anchors.fill: parent
                    currentIndex: {
                        if (rootWindow.activeTab === "home") return 0;
                        if (rootWindow.activeTab === "notes") return 1;
                        if (rootWindow.activeTab === "quiz") return 2;
                        if (rootWindow.activeTab === "library") return 3;
                        if (rootWindow.activeTab === "finance") return 4;
                        if (rootWindow.activeTab === "culture") return 5;
                        if (rootWindow.activeTab === "video") return 6;
                        if (rootWindow.activeTab === "anki") return 7;
                        if (rootWindow.activeTab === "calendar") return 8;
                        if (rootWindow.activeTab === "diagrams") return 9;
                        if (rootWindow.activeTab === "focus") return 10;
                        if (rootWindow.activeTab === "vault") return 11;
                        if (rootWindow.activeTab === "trash") return 12;
                        if (rootWindow.activeTab === "settings") return 13;
                        if (rootWindow.activeTab === "files") return 14;
                        if (rootWindow.activeTab === "practice") return 15;
                        return 0;
                    }

                    HomeView {
                        id: homeView
                        onOpenPageId: function(pageId) {
                            notesView.selectPage(pageId)
                            var p = dataController.getPage(pageId)
                            var title = (p && p.title) ? p.title : "Caderno"
                            var emoji = (p && p.icon) ? p.icon : "📄"
                            rootWindow.updateActiveTabModule("notes", title, "notes", pageId, emoji)
                        }
                        onNavigateToTab: function(tabKey) {
                            var info = rootWindow.getModuleInfo(tabKey)
                            rootWindow.updateActiveTabModule(tabKey, info.title, info.icon)
                        }
                        onCreateNewNoteRequested: {
                            notesView.createNewRootNote()
                            var info = rootWindow.getModuleInfo("notes")
                            rootWindow.updateActiveTabModule("notes", notesView.activeTitle || info.title, info.icon, notesView.selectedPageId, notesView.activeIcon)
                        }
                    }
                    NotesEditorView {
                        id: notesView
                        onSelectedPageIdChanged: rootWindow.syncActiveNotesTabMeta()
                        onActiveTitleChanged: rootWindow.syncActiveNotesTabMeta()
                        onActiveIconChanged: rootWindow.syncActiveNotesTabMeta()
                        onOpenInNewTabRequested: function(pageId) {
                            var p = dataController.getPage(pageId)
                            var title = (p && p.title) ? p.title : "Caderno"
                            var emoji = (p && p.icon) ? p.icon : "📄"
                            rootWindow.addNewTab("notes", title, "notes", pageId, emoji)
                        }
                        onNavigateModuleRequested: function(modKey) {
                            var info = rootWindow.getModuleInfo(modKey)
                            rootWindow.updateActiveTabModule(modKey, info.title, info.icon)
                        }
                    }
                    ZenQuizView { id: quizView }
                    LibraryView {
                        id: libraryView
                        viewportWidth: rootWindow.width
                        onActiveBookChanged: rootWindow.syncActiveLibraryTabMeta()
                    }
                    FinanceView { id: financeView }
                    CultureView { id: cultureView }
                    VideoPlayerView {
                        id: videoView
                        viewportWidth: rootWindow.width
                        onFullscreenToggled: {
                            if (!rootWindow.windowRoot) return
                            if (videoView.isPlayerFullscreen) {
                                rootWindow.windowRoot.showFullScreen()
                            } else {
                                rootWindow.windowRoot.showNormal()
                            }
                        }
                    }
                    AnkiView { id: ankiView }
                    CalendarView { id: calendarView }
                    DiagramsView { id: diagramsView }
                    FocusLofiView {
                        id: focusView
                        onRequestPlayLofi: function(track) {
                            globalLofiPlayer.playTrack(track)
                        }
                    }
                    VaultView { id: vaultView }
                    TrashView { id: trashView }
                    SettingsView { id: settingsView }
                    FilesView { id: filesView }
                    PracticeView { id: practiceView }
                }
            }
        }
    }

    // Persistent Ambient Sound & Lo-Fi Player Widget
    GlobalLofiPlayer {
        id: globalLofiPlayer
    }

    // Floating Spotlight Command Palette (Ctrl+K / Ctrl+P)
    CommandPalette {
        id: cmdPalette
        onOpenPage: function(pageId) {
            notesView.selectPage(pageId)
            var p = dataController.getPage(pageId)
            var title = (p && p.title) ? p.title : "Caderno"
            var emoji = (p && p.icon) ? p.icon : "📄"
            rootWindow.updateActiveTabModule("notes", title, "notes", pageId, emoji)
        }
        onOpenPageInNewTab: function(pageId) {
            var p = dataController.getPage(pageId)
            var title = (p && p.title) ? p.title : "Caderno"
            var emoji = (p && p.icon) ? p.icon : "📄"
            rootWindow.addNewTab("notes", title, "notes", pageId, emoji)
        }
        onNavigateToTab: function(tabKey) {
            var info = rootWindow.getModuleInfo(tabKey)
            rootWindow.updateActiveTabModule(tabKey, info.title, info.icon)
        }
        onTriggerAction: function(actionKey) {
            rootWindow.handleGlobalAction(actionKey)
        }
    }

    RenamePageModal {
        id: renamePageModal
        onRenamed: function(pageId, newTitle) {
            dataController.renamePage(pageId, newTitle)
            if (notesView.selectedPageId === pageId) {
                notesView.activeTitle = newTitle
            }
            notesView.loadPages()
            rootWindow.syncActiveNotesTabMeta()
        }
    }

    NotesImportExportDialogs {
        id: notesImportExport
        onImported: function(newPageId) {
            notesView.loadPages()
            notesView.selectPage(newPageId)
            var p = dataController.getPage(newPageId)
            rootWindow.updateActiveTabModule("notes", (p && p.title) ? p.title : "Caderno", "notes", newPageId, (p && p.icon) ? p.icon : "📄")
            globalModals.showSyncStatus("success")
        }
        onExported: function(_filePath) {
            globalModals.showSyncStatus("success")
        }
    }

    NotificationCenter {
        id: notificationCenter
        isOpen: rootWindow.notificationsOpen
        onClosed: rootWindow.notificationsOpen = false
        onOpenPage: function(pageId) {
            notesView.selectPage(pageId)
            var p = dataController.getPage(pageId)
            var title = (p && p.title) ? p.title : "Caderno"
            rootWindow.updateActiveTabModule("notes", title, "notes")
            rootWindow.notificationsOpen = false
        }
        onOpenCalendarRequested: function(eventId) {
            var info = rootWindow.getModuleInfo("calendar")
            rootWindow.updateActiveTabModule("calendar", info.title, info.icon)
            rootWindow.notificationsOpen = false
        }
    }

    AiSidebarPanel {
        id: aiSidebar
        anchors.right: parent.right
        anchors.top: parent.top
        anchors.bottom: parent.bottom
        visible: rootWindow.aiSidebarOpen
        availablePages: notesView.allPageTree
        onCloseRequested: rootWindow.aiSidebarOpen = false
        onInsertIntoNoteRequested: function(txt) {
            if (!notesView.selectedPageId) return
            var esc = "<p>" + String(txt || "").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</p>"
            notesView.activeContent = (notesView.activeContent || "") + esc
            notesView.isDirty = true
            notesView.saveActiveNote()
            var info = rootWindow.getModuleInfo("notes")
            rootWindow.updateActiveTabModule("notes", notesView.activeTitle || info.title, info.icon, notesView.selectedPageId, notesView.activeIcon)
        }
    }

    GlobalModalsHost {
        id: globalModals
        dataCtrl: dataController
        onActionTriggered: function(actionKey) {
            rootWindow.handleGlobalAction(actionKey)
        }
    }

    Timer {
        id: notificationSchedulerTimer
        interval: 10000
        repeat: true
        running: true
        triggeredOnStart: true
        onTriggered: {
            if (dataController) {
                var due = dataController.checkDueNotifications()
                if (due && due.length > 0) {
                    if (notificationCenter && notificationCenter.isOpen) {
                        notificationCenter.refresh()
                    }
                }
            }
        }
    }
}
