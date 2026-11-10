import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: sidebarRoot
    property bool sidebarExpanded: true
    property string activeTab: "home"

    signal tabSelected(string tabKey)
    signal toggleSidebarRequested()
    signal openCommandPaletteRequested()

    readonly property var moduleMeta: ({
        "home": { title: "Início", icon: "🏠" },
        "notes": { title: "Caderno", icon: "📖" },
        "quiz": { title: "Quiz", icon: "☑️" },
        "library": { title: "Biblioteca", icon: "📚" },
        "finance": { title: "Finanças", icon: "💵" },
        "culture": { title: "Cultura", icon: "🎭" },
        "video": { title: "Vídeos", icon: "🎬" },
        "anki": { title: "Flashcards", icon: "🎴" },
        "calendar": { title: "Agenda", icon: "📅" },
        "habits": { title: "Hábitos", icon: "⚡" },
        "diagrams": { title: "Diagramas", icon: "🎨" },
        "focus": { title: "Foco", icon: "⏳" },
        "vault": { title: "Cofre", icon: "🔒" },
        "trash": { title: "Lixeira", icon: "🗑️" },
        "settings": { title: "Configurações", icon: "⚙️" }
    })

    function getModuleTitle(tabKey) {
        return (moduleMeta[tabKey] ? moduleMeta[tabKey].title : "Caderno")
    }

    function getModuleIcon(tabKey) {
        return (moduleMeta[tabKey] ? moduleMeta[tabKey].icon : "📖")
    }

    Layout.preferredWidth: sidebarExpanded ? 240 : 56
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
        spacing: 10

        // 1. Top Header Row: Active Module + Collapse button (Matching Original App)
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            RowLayout {
                Layout.fillWidth: true
                visible: sidebarRoot.sidebarExpanded
                spacing: 8

                Text {
                    text: sidebarRoot.getModuleIcon(sidebarRoot.activeTab)
                    font.pixelSize: 16
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

        // 2. Workspace Selector Pill: Espaço Pessoal (Local) [Dono] ⌄
        Rectangle {
            visible: sidebarRoot.sidebarExpanded
            Layout.fillWidth: true
            height: 38
            radius: 8
            color: wsMouse.containsMouse ? "#ffffff08" : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 4
                anchors.rightMargin: 6
                spacing: 6

                Text { text: "📁"; font.pixelSize: 14 }

                Text {
                    text: "Espaço Pessoal (Local)"
                    color: theme.textDark
                    font.pixelSize: 12
                    font.bold: true
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                    elide: Text.ElideRight
                }

                // Dono badge (Gold pill matching original)
                Rectangle {
                    width: 38; height: 18; radius: 9
                    color: "#f59e0b20"
                    border.color: "#f59e0b40"
                    Text {
                        anchors.centerIn: parent
                        text: "Dono"
                        color: "#fbbf24"
                        font.pixelSize: 9
                        font.bold: true
                    }
                }

                Text {
                    text: "⌄"
                    color: theme.textSubtext
                    font.pixelSize: 11
                }
            }

            MouseArea {
                id: wsMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
            }
        }

        // 3. Module Subtitle / Context (Início / Caderno)
        ColumnLayout {
            visible: sidebarRoot.sidebarExpanded && sidebarRoot.activeTab === "home"
            Layout.fillWidth: true
            spacing: 2

            Text {
                text: "INÍCIO"
                color: theme.textMuted
                font.pixelSize: 10
                font.bold: true
                font.letterSpacing: 1.1
            }

            Text {
                text: "Resumo do dia, eventos ao vivo e revisões diárias."
                color: theme.textSubtext
                font.pixelSize: 11
                font.family: theme.fontFamily
                wrapMode: Text.Wrap
                Layout.fillWidth: true
            }
        }

        // 4. Quick Search Bar Button (⌘K)
        Rectangle {
            visible: sidebarRoot.sidebarExpanded && sidebarRoot.activeTab !== "home"
            Layout.fillWidth: true
            height: 32
            radius: 6
            color: searchBtnMouse.containsMouse ? "#ffffff0c" : "#1a172c"
            border.color: theme.borderSubtle
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 6

                Text { text: "🔍"; font.pixelSize: 11; color: "#a7a9be" }
                Text {
                    text: "Buscar..."
                    color: "#a7a9be"
                    font.pixelSize: 12
                    Layout.fillWidth: true
                }
                Text {
                    text: "⌘K"
                    color: "#6b7280"
                    font.pixelSize: 10
                    font.family: "Monospace"
                }
            }

            MouseArea {
                id: searchBtnMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: sidebarRoot.openCommandPaletteRequested()
            }
        }

        // Divider
        Rectangle {
            Layout.fillWidth: true
            height: 1
            color: theme.borderSubtle
        }

        // 5. Section Label: MÓDULOS ⌄
        RowLayout {
            visible: sidebarRoot.sidebarExpanded
            Layout.fillWidth: true

            Text {
                text: "MÓDULOS"
                color: theme.textMuted
                font.pixelSize: 10
                font.bold: true
                font.letterSpacing: 1.2
            }
            Item { Layout.fillWidth: true }
            Text {
                text: "⌄"
                color: theme.textMuted
                font.pixelSize: 11
            }
        }

        // 6. Navigation Items List (Modules)
        AppNavList {
            sidebarExpanded: sidebarRoot.sidebarExpanded
            activeTab: sidebarRoot.activeTab
            onTabSelected: function(tabKey) {
                sidebarRoot.tabSelected(tabKey)
            }
        }

        // 7. Bottom Status Pill (Minimalist & Discreet)
        Rectangle {
            Layout.fillWidth: true
            height: 32
            radius: 6
            color: "#ffffff04"

            RowLayout {
                anchors.fill: parent
                anchors.margins: 6
                spacing: 6

                Rectangle {
                    width: 6; height: 6; radius: 3
                    color: theme.success
                }

                Text {
                    visible: sidebarRoot.sidebarExpanded
                    Layout.fillWidth: true
                    text: "SQLite WAL Conectado"
                    color: theme.textMuted
                    font.pixelSize: 10
                    font.family: theme.fontFamily
                    elide: Text.ElideRight
                }

                Text {
                    visible: sidebarRoot.sidebarExpanded
                    text: "v2.0"
                    color: theme.brand400
                    font.pixelSize: 9
                    font.bold: true
                }
            }
        }
    }
}
