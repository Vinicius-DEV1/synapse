import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
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

    // Navigation State
    property string activeTab: "notes"
    property bool sidebarExpanded: true

    // Global Keyboard Shortcuts
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

    RowLayout {
        anchors.fill: parent
        spacing: 0

        // ===================================================================
        // Caderno Sidebar (Expandable / Collapsible with Whisper-Thin Border)
        // ===================================================================
        Rectangle {
            id: sidebarContainer
            Layout.preferredWidth: rootWindow.sidebarExpanded ? 240 : 64
            Layout.fillHeight: true
            color: theme.bgDarkCard
            border.color: theme.borderSubtle
            border.width: 1

            Behavior on Layout.preferredWidth {
                NumberAnimation { duration: 150; easing.type: Easing.OutQuad }
            }

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 12
                spacing: 8

                // Header with Brand Logo & Collapse Toggle
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Rectangle {
                        width: 36; height: 36; radius: 10
                        color: theme.brand600
                        Text {
                            anchors.centerIn: parent
                            text: "S"
                            color: "#ffffff"
                            font.pixelSize: 18
                            font.bold: true
                            font.family: theme.fontFamily
                        }
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        visible: rootWindow.sidebarExpanded
                        spacing: 1
                        Text {
                            text: "Caderno"
                            color: theme.textDark
                            font.pixelSize: 15
                            font.bold: true
                            font.family: theme.fontFamily
                        }
                        Text {
                            text: "Synapse Native"
                            color: theme.brand400
                            font.pixelSize: 11
                            font.family: theme.fontFamily
                        }
                    }

                    // Collapse / Expand Button
                    Rectangle {
                        width: 28; height: 28; radius: 6
                        color: collapseMouseArea.containsMouse ? theme.bgHover : "transparent"
                        visible: rootWindow.sidebarExpanded

                        Text {
                            anchors.centerIn: parent
                            text: "◨"
                            color: theme.textSubtext
                            font.pixelSize: 14
                        }

                        MouseArea {
                            id: collapseMouseArea
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: rootWindow.sidebarExpanded = !rootWindow.sidebarExpanded
                        }
                    }
                }

                // Divider
                Rectangle {
                    Layout.fillWidth: true
                    height: 1
                    color: theme.borderSubtle
                    Layout.topMargin: 4
                    Layout.bottomMargin: 4
                }

                // Collapsed expand toggle button
                Rectangle {
                    Layout.alignment: Qt.AlignHCenter
                    width: 40; height: 32; radius: 6
                    color: expandMouseArea.containsMouse ? theme.bgHover : "transparent"
                    visible: !rootWindow.sidebarExpanded

                    Text {
                        anchors.centerIn: parent
                        text: "◧"
                        color: theme.textSubtext
                        font.pixelSize: 16
                    }

                    MouseArea {
                        id: expandMouseArea
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: rootWindow.sidebarExpanded = true
                    }
                }

                // Section Label
                Text {
                    visible: rootWindow.sidebarExpanded
                    text: "MÓDULOS"
                    color: theme.textMuted
                    font.pixelSize: 10
                    font.bold: true
                    font.letterSpacing: 1.2
                    Layout.leftMargin: 4
                }

                // Navigation Items List
                ListView {
                    id: navListView
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true
                    spacing: 4
                    model: [
                        { key: "notes", name: "Caderno", icon: "📝", count: dataController.pageCount },
                        { key: "video", name: "Vídeos", icon: "🎬", count: dataController.videoCount },
                        { key: "anki", name: "Flashcards", icon: "🎴", count: dataController.deckCount },
                        { key: "quiz", name: "Questões", icon: "🎯", count: 0 },
                        { key: "finance", name: "Finanças", icon: "💰", count: dataController.transactionCount },
                        { key: "habits", name: "Hábitos", icon: "⚡", count: dataController.habitCount },
                        { key: "calendar", name: "Agenda", icon: "📅", count: dataController.eventCount },
                        { key: "library", name: "Biblioteca", icon: "📚", count: dataController.bookCount },
                        { key: "culture", name: "Cultura", icon: "🎭", count: dataController.cultureCount },
                        { key: "focus", name: "Foco", icon: "⏳", count: 0 },
                        { key: "vault", name: "Cofre", icon: "🔒", count: dataController.vaultItemCount },
                        { key: "settings", name: "Configurações", icon: "⚙️", count: 0 }
                    ]

                    delegate: Rectangle {
                        width: navListView.width
                        height: 38
                        radius: 8
                        color: {
                            if (rootWindow.activeTab === modelData.key) return theme.brand500 + "1a" // bg-brand-500/10
                            if (navItemMouse.containsMouse) return theme.bgHover
                            return "transparent"
                        }
                        border.color: rootWindow.activeTab === modelData.key ? theme.brand500 + "33" : "transparent"

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: rootWindow.sidebarExpanded ? 10 : 0
                            anchors.rightMargin: rootWindow.sidebarExpanded ? 10 : 0
                            spacing: 10

                            Text {
                                Layout.alignment: rootWindow.sidebarExpanded ? Qt.AlignVCenter : Qt.AlignHCenter
                                text: modelData.icon
                                font.pixelSize: 15
                            }

                            Text {
                                Layout.fillWidth: true
                                visible: rootWindow.sidebarExpanded
                                text: modelData.name
                                color: rootWindow.activeTab === modelData.key ? theme.brand300 : (navItemMouse.containsMouse ? theme.textDark : theme.textSubtext)
                                font.pixelSize: 13
                                font.weight: rootWindow.activeTab === modelData.key ? Font.DemiBold : Font.Normal
                                font.family: theme.fontFamily
                                elide: Text.ElideRight
                            }

                            // Counter Badge
                            Rectangle {
                                visible: rootWindow.sidebarExpanded && modelData.count > 0
                                Layout.alignment: Qt.AlignVCenter
                                width: Math.max(18, countText.contentWidth + 8)
                                height: 18
                                radius: 9
                                color: rootWindow.activeTab === modelData.key ? theme.brand600 : theme.bgDarkSurface

                                Text {
                                    id: countText
                                    anchors.centerIn: parent
                                    text: modelData.count.toString()
                                    color: rootWindow.activeTab === modelData.key ? "#ffffff" : theme.textMuted
                                    font.pixelSize: 10
                                    font.bold: true
                                    font.family: theme.fontFamily
                                }
                            }
                        }

                        MouseArea {
                            id: navItemMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: rootWindow.activeTab = modelData.key
                        }
                    }
                }

                // Bottom Status Pill
                Rectangle {
                    Layout.fillWidth: true
                    height: 36
                    radius: 8
                    color: theme.bgDarkSurface
                    border.color: theme.borderSubtle

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 8
                        spacing: 8

                        Rectangle {
                            width: 8; height: 8; radius: 4
                            color: theme.success
                        }

                        Text {
                            visible: rootWindow.sidebarExpanded
                            Layout.fillWidth: true
                            text: "SQLite WAL Conectado"
                            color: theme.textSubtext
                            font.pixelSize: 11
                            font.family: theme.fontFamily
                            elide: Text.ElideRight
                        }

                        Text {
                            visible: rootWindow.sidebarExpanded
                            text: "v2.0"
                            color: theme.brand400
                            font.pixelSize: 10
                            font.bold: true
                        }
                    }
                }
            }
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
                    if (rootWindow.activeTab === "notes") return 0;
                    if (rootWindow.activeTab === "video") return 1;
                    if (rootWindow.activeTab === "anki") return 2;
                    if (rootWindow.activeTab === "quiz") return 3;
                    if (rootWindow.activeTab === "finance") return 4;
                    if (rootWindow.activeTab === "habits") return 5;
                    if (rootWindow.activeTab === "calendar") return 6;
                    if (rootWindow.activeTab === "library") return 7;
                    if (rootWindow.activeTab === "culture") return 8;
                    if (rootWindow.activeTab === "focus") return 9;
                    if (rootWindow.activeTab === "vault") return 10;
                    if (rootWindow.activeTab === "settings") return 11;
                    return 0;
                }

                NotesEditorView { id: notesView }
                VideoPlayerView { id: videoView }
                AnkiView { id: ankiView }
                ZenQuizView { id: quizView }
                FinanceView { id: financeView }
                HabitsView { id: habitsView }
                CalendarView { id: calendarView }
                LibraryView { id: libraryView }
                CultureView { id: cultureView }
                FocusLofiView { id: focusView }
                VaultView { id: vaultView }
                SettingsView { id: settingsView }
            }
        }
    }
}
