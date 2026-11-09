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
    title: "Caderno - Personal Knowledge Management & Vault"
    color: theme.bgDarkBg

    Theme { id: theme }

    // Navigation State (Home is initial view matching Caderno original)
    property string activeTab: "home"
    property bool sidebarExpanded: true

    // Global Keyboard Shortcuts
    Shortcut { sequence: "Ctrl+H"; onActivated: rootWindow.activeTab = "home" }
    Shortcut { sequence: "Ctrl+1"; onActivated: rootWindow.activeTab = "notes" }
    Shortcut { sequence: "Ctrl+2"; onActivated: rootWindow.activeTab = "video" }
    Shortcut { sequence: "Ctrl+3"; onActivated: rootWindow.activeTab = "anki" }
    Shortcut { sequence: "Ctrl+4"; onActivated: rootWindow.activeTab = "quiz" }
    Shortcut { sequence: "Ctrl+5"; onActivated: rootWindow.activeTab = "finance" }
    Shortcut { sequence: "Ctrl+6"; onActivated: rootWindow.activeTab = "habits" }
    Shortcut { sequence: "Ctrl+7"; onActivated: rootWindow.activeTab = "calendar" }
    Shortcut { sequence: "Ctrl+8"; onActivated: rootWindow.activeTab = "library" }
    Shortcut { sequence: "Ctrl+9"; onActivated: rootWindow.activeTab = "culture" }
    Shortcut { sequence: "Ctrl+0"; onActivated: rootWindow.activeTab = "vault" }
    Shortcut { sequence: "Ctrl+,"; onActivated: rootWindow.activeTab = "settings" }
    Shortcut { sequence: "Ctrl+B"; onActivated: rootWindow.sidebarExpanded = !rootWindow.sidebarExpanded }
    Shortcut {
        sequences: ["Ctrl+K", "Ctrl+P"]
        onActivated: {
            if (cmdPalette.isOpen) cmdPalette.close()
            else cmdPalette.open()
        }
    }

    RowLayout {
        anchors.fill: parent
        spacing: 0

        // ===================================================================
        // Caderno Sidebar (Expandable / Collapsible with Whisper-Thin Border)
        // ===================================================================
        AppSidebar {
            id: appSidebar
            sidebarExpanded: rootWindow.sidebarExpanded
            activeTab: rootWindow.activeTab
            onTabSelected: function(tabKey) { rootWindow.activeTab = tabKey }
            onToggleSidebarRequested: rootWindow.sidebarExpanded = !rootWindow.sidebarExpanded
            onOpenCommandPaletteRequested: cmdPalette.open()
        }

        // ===================================================================
        // Main Workspace Area (Stack of 12 Native Modules)
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
                    if (rootWindow.activeTab === "diagrams") return 2;
                    if (rootWindow.activeTab === "video") return 3;
                    if (rootWindow.activeTab === "anki") return 4;
                    if (rootWindow.activeTab === "quiz") return 5;
                    if (rootWindow.activeTab === "finance") return 6;
                    if (rootWindow.activeTab === "habits") return 7;
                    if (rootWindow.activeTab === "calendar") return 8;
                    if (rootWindow.activeTab === "library") return 9;
                    if (rootWindow.activeTab === "culture") return 10;
                    if (rootWindow.activeTab === "focus") return 11;
                    if (rootWindow.activeTab === "vault") return 12;
                    if (rootWindow.activeTab === "trash") return 13;
                    if (rootWindow.activeTab === "settings") return 14;
                    return 0;
                }

                HomeView {
                    id: homeView
                    onNavigateToTab: rootWindow.activeTab = tabKey
                }
                NotesEditorView { id: notesView }
                DiagramsView { id: diagramsView }
                VideoPlayerView { id: videoView }
                AnkiView { id: ankiView }
                ZenQuizView { id: quizView }
                FinanceView { id: financeView }
                HabitsView { id: habitsView }
                CalendarView { id: calendarView }
                LibraryView { id: libraryView }
                CultureView { id: cultureView }
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

    // Persistent Ambient Sound & Lo-Fi Player Widget
    GlobalLofiPlayer {
        id: globalLofiPlayer
    }

    // Floating Spotlight Command Palette (Ctrl+K / Ctrl+P)
    CommandPalette {
        id: cmdPalette
        onNavigateToTab: {
            rootWindow.activeTab = tabKey
        }
        onTriggerAction: {
            if (actionKey === "new_note") {
                rootWindow.activeTab = "notes"
                notesView.createNewRootNote()
            } else if (actionKey === "new_event") {
                rootWindow.activeTab = "calendar"
                calendarView.isCreatingEvent = true
            } else if (actionKey === "new_habit") {
                rootWindow.activeTab = "habits"
                habitsView.isCreatingHabit = true
            } else if (actionKey === "new_transaction") {
                rootWindow.activeTab = "finance"
                financeView.isAddingTransaction = true
            } else if (actionKey === "new_vault") {
                rootWindow.activeTab = "vault"
                vaultView.isAddingItem = true
            }
        }
    }
}
