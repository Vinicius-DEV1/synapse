import QtQuick 2.15
import QtQuick.Layouts 1.15
import "home"
import "diagrams"
import "video"
import "questions"
import "notes"
import "anki"
import "finance"
import "habits"
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

Item {
    id: rootWindow
    anchors.fill: parent
    property var windowRoot: null

    Theme { id: theme }

    // Navigation & Tabs State (Matching Original Caderno Tab System)
    property string activeTab: "home"
    property bool sidebarExpanded: true
    property bool notificationsOpen: false
    property var tabsList: [
        { id: "tab-home", module: "home", title: "Início", icon: "home", isPinned: false }
    ]
    property string currentTabId: "tab-home"

    readonly property string activeTitle: {
        if (activeTab === "notes" && notesView && notesView.activeTitle && notesView.activeTitle !== "Selecione uma nota") {
            return notesView.activeTitle
        }
        var info = getModuleInfo(activeTab)
        return info.title
    }

    function flushActiveNotes() {
        if (notesView && (notesView.isDirty || notesView.isRichMode)) {
            notesView.saveActiveNote()
        }
    }

    function openOrSwitchTab(moduleKey, title, icon) {
        flushActiveNotes()
        for (var i = 0; i < tabsList.length; i++) {
            if (tabsList[i].module === moduleKey) {
                currentTabId = tabsList[i].id
                activeTab = moduleKey
                return
            }
        }
        var newId = "tab-" + moduleKey + "-" + Date.now()
        var newTabs = tabsList.slice()
        newTabs.push({ id: newId, module: moduleKey, title: title, icon: icon, isPinned: false })
        tabsList = newTabs
        currentTabId = newId
        activeTab = moduleKey
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
                var nextTab = newTabs[Math.max(0, idx - 1)]
                currentTabId = nextTab.id
                activeTab = nextTab.module
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
        for (var i = 0; i < tabsList.length; ++i) {
            if (tabsList[i].id === tabId) {
                var src = tabsList[i]
                var newId = "tab-" + src.module + "-" + Date.now()
                var newTabs = tabsList.slice()
                newTabs.splice(i + 1, 0, { id: newId, module: src.module, title: src.title, icon: src.icon, isPinned: false })
                tabsList = newTabs
                currentTabId = newId
                activeTab = src.module
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
                currentTabId = tabsList[nextIdx].id
                activeTab = tabsList[nextIdx].module
                return
            }
        }
    }

    function previousTab() {
        if (tabsList.length <= 1) return
        for (var i = 0; i < tabsList.length; ++i) {
            if (tabsList[i].id === currentTabId) {
                var prevIdx = (i - 1 + tabsList.length) % tabsList.length
                currentTabId = tabsList[prevIdx].id
                activeTab = tabsList[prevIdx].module
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
        if (key === "habits") return { title: "Hábitos", icon: "habits" }
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
            rootWindow.openOrSwitchTab("notes", "Caderno", "📖")
            notesView.createNewRootNote()
        } else if (actionKey === "new_event") {
            rootWindow.openOrSwitchTab("calendar", "Agenda", "📅")
            calendarView.isCreatingEvent = true
        } else if (actionKey === "new_habit") {
            rootWindow.openOrSwitchTab("habits", "Hábitos", "⚡")
            habitsView.isCreatingHabit = true
        } else if (actionKey === "new_transaction") {
            rootWindow.openOrSwitchTab("finance", "Finanças", "💵")
            financeView.isAddingTransaction = true
        } else if (actionKey === "new_vault") {
            rootWindow.openOrSwitchTab("vault", "Cofre", "🔒")
            vaultView.isAddingItem = true
        } else if (actionKey === "command_palette") {
            cmdPalette.open()
        } else if (actionKey === "settings") {
            rootWindow.openOrSwitchTab("settings", "Configurações", "⚙️")
        }
    }

    // Global Keyboard Shortcuts
    AppGlobalShortcuts {
        onOpenCommandPalette: {
            if (cmdPalette.isOpen) cmdPalette.close()
            else cmdPalette.open()
        }
        onNewPageRequested: {
            rootWindow.openOrSwitchTab("notes", "Caderno", "📖")
            notesView.createNewRootNote()
        }
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
            rootWindow.openOrSwitchTab(modKey, title, icon)
        }
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // Signature Top Chrome Tab Bar
        AppTopTabBar {
            id: topTabBar
            visible: !(videoView.activeVideo !== null && videoView.isPlayerFullscreen)
            Layout.preferredHeight: visible ? 42 : 0
            openTabs: rootWindow.tabsList
            activeTabId: rootWindow.currentTabId
            unreadCount: dataController ? dataController.unreadNotificationCount : 0
            windowRoot: rootWindow.windowRoot
            onTabSelected: function(tId, modKey) {
                rootWindow.currentTabId = tId
                rootWindow.activeTab = modKey
            }
            onTabClosed: function(tId) { rootWindow.closeTab(tId) }
            onTabPinToggled: function(tId) { rootWindow.togglePinTab(tId) }
            onDuplicateTabRequested: function(tId) { rootWindow.duplicateTab(tId) }
            onCloseOtherTabsRequested: function(tId) { rootWindow.closeOtherTabs(tId) }
            onCloseTabsToRightRequested: function(tId) { rootWindow.closeTabsToRight(tId) }
            onNotificationRequested: rootWindow.notificationsOpen = !rootWindow.notificationsOpen
            onNewTabRequested: {
                var info = rootWindow.getModuleInfo("notes")
                rootWindow.openOrSwitchTab("notes", info.title, info.icon)
            }
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
                visible: !(videoView.activeVideo !== null && videoView.isPlayerFullscreen)
                sidebarExpanded: rootWindow.sidebarExpanded
                activeTab: rootWindow.activeTab
                notePinnedPages: notesView.pinnedPages
                notePageTree: notesView.pageTree
                noteCollapsedNodeMap: notesView.collapsedNodeMap
                selectedNotePageId: notesView.selectedPageId
                onTabSelected: function(tabKey) {
                    var info = rootWindow.getModuleInfo(tabKey)
                    rootWindow.openOrSwitchTab(tabKey, info.title, info.icon)
                }
                onToggleSidebarRequested: rootWindow.sidebarExpanded = !rootWindow.sidebarExpanded
                onOpenCommandPaletteRequested: cmdPalette.open()
                onNotePageSelected: function(pageId) { notesView.selectPage(pageId) }
                onOpenInNewTabRequested: function(pageId) {
                    notesView.selectPage(pageId)
                    var p = dataController.getPage(pageId)
                    var title = (p && p.title) ? p.title : "Nota"
                    rootWindow.openOrSwitchTab("notes", title, "📖")
                }
                onCreateNoteRequested: notesView.createNewRootNote()
                onCreateSubNoteRequested: function(parentId) { notesView.createNewSubNote(parentId) }
                onToggleNotePinRequested: function(pageId) { notesView.togglePin(pageId) }
                onToggleNoteCollapseRequested: function(pageId) { notesView.toggleNodeCollapse(pageId) }
                onNoteSearchChanged: function(query) { notesView.setPageFilter(query) }
                onMoveNoteRequested: function(pageId) { notesView.openMovePageDialog(pageId) }
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
                        if (rootWindow.activeTab === "habits") return 9;
                        if (rootWindow.activeTab === "diagrams") return 10;
                        if (rootWindow.activeTab === "focus") return 11;
                        if (rootWindow.activeTab === "vault") return 12;
                        if (rootWindow.activeTab === "trash") return 13;
                        if (rootWindow.activeTab === "settings") return 14;
                        if (rootWindow.activeTab === "files") return 15;
                        if (rootWindow.activeTab === "practice") return 16;
                        return 0;
                    }

                    HomeView {
                        id: homeView
                        onOpenPageId: function(pageId) {
                            notesView.selectPage(pageId)
                        }
                        onNavigateToTab: function(tabKey) {
                            var info = rootWindow.getModuleInfo(tabKey)
                            rootWindow.openOrSwitchTab(tabKey, info.title, info.icon)
                        }
                    }
                    NotesEditorView { id: notesView }
                    ZenQuizView { id: quizView }
                    LibraryView {
                        id: libraryView
                        viewportWidth: rootWindow.width
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
                    HabitsView { id: habitsView }
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
        }
        onNavigateToTab: function(tabKey) {
            var info = rootWindow.getModuleInfo(tabKey)
            rootWindow.openOrSwitchTab(tabKey, info.title, info.icon)
        }
        onTriggerAction: function(actionKey) {
            rootWindow.handleGlobalAction(actionKey)
        }
    }

    NotificationCenter {
        id: notificationCenter
        isOpen: rootWindow.notificationsOpen
        onClosed: rootWindow.notificationsOpen = false
        onOpenPage: function(pageId) {
            notesView.selectPage(pageId)
            var info = rootWindow.getModuleInfo("notes")
            rootWindow.openOrSwitchTab("notes", info.title, info.icon)
            rootWindow.notificationsOpen = false
        }
    }

    GlobalModalsHost {
        id: globalModals
        dataCtrl: dataController
        onActionTriggered: function(actionKey) {
            rootWindow.handleGlobalAction(actionKey)
        }
    }
}
