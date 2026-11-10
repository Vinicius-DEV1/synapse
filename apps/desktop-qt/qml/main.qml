import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "home"
import "diagrams"
import "video"
import "quiz"
import "editor"
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

ApplicationWindow {
    id: rootWindow
    visible: true
    width: 1366
    height: 840
    minimumWidth: 1024
    minimumHeight: 680
    title: "Caderno"
    color: theme.bgDarkBg

    Theme { id: theme }

    // Navigation & Tabs State (Matching Original Caderno Tab System)
    property string activeTab: "home"
    property bool sidebarExpanded: true
    property var tabsList: [
        { id: "tab-home", module: "home", title: "Início", icon: "🏠" }
    ]
    property string currentTabId: "tab-home"

    function openOrSwitchTab(moduleKey, title, icon) {
        for (var i = 0; i < tabsList.length; i++) {
            if (tabsList[i].module === moduleKey) {
                currentTabId = tabsList[i].id
                activeTab = moduleKey
                return
            }
        }
        var newId = "tab-" + moduleKey + "-" + Date.now()
        var newTabs = tabsList.slice()
        newTabs.push({ id: newId, module: moduleKey, title: title, icon: icon })
        tabsList = newTabs
        currentTabId = newId
        activeTab = moduleKey
    }

    function closeTab(tabId) {
        if (tabsList.length <= 1) return
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

    function getModuleInfo(key) {
        if (key === "home") return { title: "Início", icon: "🏠" }
        if (key === "notes") return { title: "Caderno", icon: "📖" }
        if (key === "quiz") return { title: "Quiz", icon: "☑️" }
        if (key === "library") return { title: "Biblioteca", icon: "📚" }
        if (key === "finance") return { title: "Finanças", icon: "💵" }
        if (key === "culture") return { title: "Cultura", icon: "🎭" }
        if (key === "video") return { title: "Vídeos", icon: "🎬" }
        if (key === "anki") return { title: "Flashcards", icon: "🎴" }
        if (key === "calendar") return { title: "Agenda", icon: "📅" }
        if (key === "habits") return { title: "Hábitos", icon: "⚡" }
        if (key === "diagrams") return { title: "Diagramas", icon: "🎨" }
        if (key === "focus") return { title: "Foco", icon: "⏳" }
        if (key === "vault") return { title: "Cofre", icon: "🔒" }
        if (key === "trash") return { title: "Lixeira", icon: "🗑️" }
        if (key === "settings") return { title: "Configurações", icon: "⚙️" }
        return { title: "Caderno", icon: "📖" }
    }

    // Global Keyboard Shortcuts
    Shortcut { sequence: "Ctrl+H"; onActivated: rootWindow.openOrSwitchTab("home", "Início", "🏠") }
    Shortcut { sequence: "Ctrl+1"; onActivated: rootWindow.openOrSwitchTab("notes", "Caderno", "📖") }
    Shortcut { sequence: "Ctrl+2"; onActivated: rootWindow.openOrSwitchTab("video", "Vídeos", "🎬") }
    Shortcut { sequence: "Ctrl+3"; onActivated: rootWindow.openOrSwitchTab("anki", "Flashcards", "🎴") }
    Shortcut { sequence: "Ctrl+4"; onActivated: rootWindow.openOrSwitchTab("quiz", "Quiz", "☑️") }
    Shortcut { sequence: "Ctrl+5"; onActivated: rootWindow.openOrSwitchTab("finance", "Finanças", "💵") }
    Shortcut { sequence: "Ctrl+6"; onActivated: rootWindow.openOrSwitchTab("habits", "Hábitos", "⚡") }
    Shortcut { sequence: "Ctrl+7"; onActivated: rootWindow.openOrSwitchTab("calendar", "Agenda", "📅") }
    Shortcut { sequence: "Ctrl+8"; onActivated: rootWindow.openOrSwitchTab("library", "Biblioteca", "📚") }
    Shortcut { sequence: "Ctrl+9"; onActivated: rootWindow.openOrSwitchTab("culture", "Cultura", "🎭") }
    Shortcut { sequence: "Ctrl+0"; onActivated: rootWindow.openOrSwitchTab("vault", "Cofre", "🔒") }
    Shortcut { sequence: "Ctrl+,"; onActivated: rootWindow.openOrSwitchTab("settings", "Configurações", "⚙️") }
    Shortcut { sequence: "Ctrl+B"; onActivated: rootWindow.sidebarExpanded = !rootWindow.sidebarExpanded }
    Shortcut {
        sequences: ["Ctrl+K", "Ctrl+P"]
        onActivated: {
            if (cmdPalette.isOpen) cmdPalette.close()
            else cmdPalette.open()
        }
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // ===================================================================
        // Signature Top Chrome Tab Bar (Matching Original Caderno Layout)
        // ===================================================================
        AppTopTabBar {
            id: topTabBar
            openTabs: rootWindow.tabsList
            activeTabId: rootWindow.currentTabId
            onTabSelected: function(tId, modKey) {
                rootWindow.currentTabId = tId
                rootWindow.activeTab = modKey
            }
            onTabClosed: function(tId) {
                rootWindow.closeTab(tId)
            }
            onNewTabRequested: {
                var info = rootWindow.getModuleInfo("notes")
                rootWindow.openOrSwitchTab("notes", info.title, info.icon)
            }
            onMinimizeRequested: rootWindow.showMinimized()
            onMaximizeRequested: {
                if (rootWindow.visibility === Window.Maximized) rootWindow.showNormal()
                else rootWindow.showMaximized()
            }
            onCloseAppRequested: Qt.quit()
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 0

            // ===================================================================
            // Caderno Sidebar (Matching Original Caderno Image 1 & 2)
            // ===================================================================
            AppSidebar {
                id: appSidebar
                sidebarExpanded: rootWindow.sidebarExpanded
                activeTab: rootWindow.activeTab
                onTabSelected: function(tabKey) {
                    var info = rootWindow.getModuleInfo(tabKey)
                    rootWindow.openOrSwitchTab(tabKey, info.title, info.icon)
                }
                onToggleSidebarRequested: rootWindow.sidebarExpanded = !rootWindow.sidebarExpanded
                onOpenCommandPaletteRequested: cmdPalette.open()
            }

            // ===================================================================
            // Main Workspace Area (Stack of Native Modules)
            // ===================================================================
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                color: theme.bgDarkBg

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
                        return 0;
                    }

                    HomeView {
                        id: homeView
                        onNavigateToTab: function(tabKey) {
                            var info = rootWindow.getModuleInfo(tabKey)
                            rootWindow.openOrSwitchTab(tabKey, info.title, info.icon)
                        }
                    }
                    NotesEditorView { id: notesView }
                    ZenQuizView { id: quizView }
                    LibraryView { id: libraryView }
                    FinanceView { id: financeView }
                    CultureView { id: cultureView }
                    VideoPlayerView { id: videoView }
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
        onNavigateToTab: function(tabKey) {
            var info = rootWindow.getModuleInfo(tabKey)
            rootWindow.openOrSwitchTab(tabKey, info.title, info.icon)
        }
        onTriggerAction: {
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
            }
        }
    }
}
