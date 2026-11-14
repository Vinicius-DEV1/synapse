import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "notes"

Rectangle {
    id: sidebarRoot
    property bool sidebarExpanded: true
    property string activeTab: "home"
    property bool modulesExpanded: true
    property var notePinnedPages: []
    property var notePageTree: []
    property var noteCollapsedNodeMap: ({})
    property string selectedNotePageId: ""

    signal tabSelected(string tabKey)
    signal toggleSidebarRequested()
    signal openCommandPaletteRequested()
    signal notePageSelected(string pageId)
    signal createNoteRequested()
    signal createSubNoteRequested(string parentId)
    signal toggleNotePinRequested(string pageId)
    signal toggleNoteCollapseRequested(string pageId)
    signal noteSearchChanged(string query)
    signal moveNoteRequested(string pageId)

    readonly property var moduleMeta: ({
        "home": { title: "Início", icon: "home" },
        "notes": { title: "Caderno", icon: "notes" },
        "quiz": { title: "Questões", icon: "quiz" },
        "library": { title: "Biblioteca", icon: "library" },
        "finance": { title: "Finanças", icon: "finance" },
        "culture": { title: "Cultura", icon: "culture" },
        "video": { title: "Vídeos", icon: "video" },
        "anki": { title: "Flashcards", icon: "anki" },
        "calendar": { title: "Agenda", icon: "calendar" },
        "habits": { title: "Hábitos", icon: "habits" },
        "files": { title: "Arquivos", icon: "folder" },
        "diagrams": { title: "Diagramas", icon: "diagrams" },
        "focus": { title: "Foco", icon: "focus" },
        "practice": { title: "Prática", icon: "focus" },
        "vault": { title: "Cofre", icon: "vault" },
        "trash": { title: "Lixeira", icon: "trash" },
        "settings": { title: "Configurações", icon: "settings" }
    })

    function getModuleTitle(tabKey) {
        return (moduleMeta[tabKey] ? moduleMeta[tabKey].title : "Caderno")
    }

    function getModuleIcon(tabKey) {
        return (moduleMeta[tabKey] ? moduleMeta[tabKey].icon : "notes")
    }

    function getModuleDescription(tabKey) {
        var descriptions = {
            "home": "Daily overview, live events and daily reviews.",
            "library": "Use the main panel to manage your books and collections.",
            "culture": "Manage your movies, series, books and anime in the main panel.",
            "video": "Your videos with interactive subtitles for studying.",
            "anki": "Review your cards with spaced repetition.",
            "focus": "Manage your focus sessions and timers.",
            "practice": "AI tutor practice sessions, transcript history, and memory context.",
            "calendar": "Manage your appointments and daily tasks.",
            "files": "Manage your files, PDFs and documents.",
            "vault": "Protect your credentials and passwords with maximum security.",
            "trash": "Restore pages and Lo-Fi stations or permanently delete items.",
            "diagrams": "Create, connect and structure visual flowcharts in the main panel.",
            "quiz": "Practice questions, mock exams and track your test performance.",
            "finance": "Track income, expenses, budgets and financial goals in the main panel."
        }
        return descriptions[tabKey] ? qsTr(descriptions[tabKey]) : ""
    }

    Layout.preferredWidth: sidebarExpanded ? 260 : 48
    Layout.fillHeight: true
    color: "#801a1924"
    border.color: theme.borderSubtle
    border.width: 1

    Behavior on Layout.preferredWidth {
        NumberAnimation { duration: 150; easing.type: Easing.OutQuad }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 10

        // 1. Top Header Row: Active Module + Collapse button (Matching Original App)
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            RowLayout {
                Layout.fillWidth: true
                visible: sidebarRoot.sidebarExpanded
                spacing: 8

                AppIcon {
                    width: 18
                    height: 18
                    name: sidebarRoot.getModuleIcon(sidebarRoot.activeTab)
                    color: theme.brand400
                }

                Text {
                    text: sidebarRoot.getModuleTitle(sidebarRoot.activeTab)
                    color: theme.textDark
                    font.pixelSize: 14
                    font.bold: true
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }

            // Collapse / Expand Button
            Rectangle {
                width: 28; height: 28; radius: 6
                color: collapseMouse.containsMouse ? theme.bgHover : "transparent"

                Text {
                    anchors.centerIn: parent
                    text: sidebarRoot.sidebarExpanded ? "◨" : "◧"
                    color: theme.textSubtext
                    font.pixelSize: 14
                }

                MouseArea {
                    id: collapseMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: sidebarRoot.toggleSidebarRequested()
                }
            }
        }

        // 2. Search entry opens the command palette instead of presenting an unsupported workspace switcher.
        Rectangle {
            visible: sidebarRoot.sidebarExpanded && sidebarRoot.activeTab !== "notes"
            Layout.fillWidth: true
            height: 34
            radius: 7
            color: searchMouse.containsMouse ? theme.bgDarkSurface : "transparent"
            border.color: searchMouse.containsMouse ? theme.borderBrand : theme.borderSubtle
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 9
                anchors.rightMargin: 8
                spacing: 8

                AppIcon { width: 16; height: 16; name: "search"; color: theme.textSubtext }

                Text {
                    text: "Buscar..."
                    color: theme.textSubtext
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                    elide: Text.ElideRight
                }

                Rectangle {
                    height: 18
                    radius: 4
                    color: theme.bgDarkBg
                    border.color: theme.borderSubtle
                    Layout.preferredWidth: 48
                    Text {
                        anchors.centerIn: parent
                        text: "Ctrl+K"
                        color: theme.textMuted
                        font.pixelSize: 9
                        font.family: theme.fontMono
                    }
                }
            }

            MouseArea {
                id: searchMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: sidebarRoot.openCommandPaletteRequested()
            }
        }

        NotesTreeSidebar {
            visible: sidebarRoot.sidebarExpanded && sidebarRoot.activeTab === "notes"
            Layout.fillWidth: true
            Layout.fillHeight: true
            pinnedPages: sidebarRoot.notePinnedPages
            pageTree: sidebarRoot.notePageTree
            collapsedNodeMap: sidebarRoot.noteCollapsedNodeMap
            selectedPageId: sidebarRoot.selectedNotePageId
            onPageSelected: function(pageId) { sidebarRoot.notePageSelected(pageId) }
            onCreateRootRequested: sidebarRoot.createNoteRequested()
            onCreateSubRequested: function(pageId) { sidebarRoot.createSubNoteRequested(pageId) }
            onTogglePinRequested: function(pageId) { sidebarRoot.toggleNotePinRequested(pageId) }
            onToggleCollapseRequested: function(pageId) { sidebarRoot.toggleNoteCollapseRequested(pageId) }
            onSearchChanged: function(query) { sidebarRoot.noteSearchChanged(query) }
            onMovePageRequested: function(pageId) { sidebarRoot.moveNoteRequested(pageId) }
        }

        ColumnLayout {
            visible: sidebarRoot.sidebarExpanded && sidebarRoot.activeTab !== "notes"
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 2

            Text {
                text: sidebarRoot.getModuleTitle(sidebarRoot.activeTab).toUpperCase()
                color: theme.textMuted
                font.pixelSize: 10
                font.bold: true
                font.letterSpacing: 1.1
            }

            Text {
                text: sidebarRoot.getModuleDescription(sidebarRoot.activeTab)
                color: theme.textSubtext
                font.pixelSize: 11
                font.family: theme.fontFamily
                wrapMode: Text.Wrap
                Layout.fillWidth: true
                visible: text.length > 0
            }
        }

        Rectangle {
            visible: sidebarRoot.sidebarExpanded
            Layout.fillWidth: true
            height: 1
            color: theme.borderSubtle
        }

        Rectangle {
            id: modulesHeader
            visible: sidebarRoot.sidebarExpanded
            Layout.fillWidth: true
            height: 30
            radius: 6
            color: modulesHeaderMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8

                Text {
                    text: "MÓDULOS"
                    color: theme.textMuted
                    font.pixelSize: 10
                    font.bold: true
                    font.letterSpacing: 1.2
                }
                Item { Layout.fillWidth: true }
                Text {
                    text: sidebarRoot.modulesExpanded ? "⌄" : "⌃"
                    color: theme.textMuted
                    font.pixelSize: 11
                }
            }

            MouseArea {
                id: modulesHeaderMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: sidebarRoot.modulesExpanded = !sidebarRoot.modulesExpanded
            }
        }

        AppNavList {
            visible: !sidebarRoot.sidebarExpanded || sidebarRoot.modulesExpanded
            sidebarExpanded: sidebarRoot.sidebarExpanded
            activeTab: sidebarRoot.activeTab
            Layout.fillWidth: true
            Layout.fillHeight: !sidebarRoot.sidebarExpanded
            Layout.preferredHeight: sidebarRoot.sidebarExpanded && sidebarRoot.modulesExpanded
                                    ? Math.min(336, Math.max(0, sidebarRoot.height * 0.4)) : 0
            onTabSelected: function(tabKey) {
                sidebarRoot.tabSelected(tabKey)
            }
        }
    }
}
