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

    Layout.preferredWidth: sidebarExpanded ? 240 : 64
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
                visible: sidebarRoot.sidebarExpanded
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
                visible: sidebarRoot.sidebarExpanded

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
                    onClicked: sidebarRoot.toggleSidebarRequested()
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

        // Quick Search Bar Button (Ctrl+K)
        Rectangle {
            visible: sidebarRoot.sidebarExpanded
            Layout.fillWidth: true
            height: 34
            radius: 8
            color: searchBtnMouse.containsMouse ? "#ffffff12" : "#15141b"
            border.color: searchBtnMouse.containsMouse ? "#818cf850" : "#ffffff10"
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
                Rectangle {
                    height: 18
                    radius: 4
                    color: "#211f30"
                    border.color: "#ffffff15"
                    Layout.preferredWidth: 44
                    Text {
                        anchors.centerIn: parent
                        text: "Ctrl+K"
                        color: "#64748b"
                        font.pixelSize: 9
                        font.bold: true
                    }
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

        // Collapsed search icon button
        Rectangle {
            Layout.alignment: Qt.AlignHCenter
            width: 40; height: 32; radius: 6
            color: searchIconMouse.containsMouse ? theme.bgHover : "transparent"
            visible: !sidebarRoot.sidebarExpanded

            Text {
                anchors.centerIn: parent
                text: "🔍"
                font.pixelSize: 14
            }

            MouseArea {
                id: searchIconMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: sidebarRoot.openCommandPaletteRequested()
            }
        }

        // Collapsed expand toggle button
        Rectangle {
            Layout.alignment: Qt.AlignHCenter
            width: 40; height: 32; radius: 6
            color: expandMouseArea.containsMouse ? theme.bgHover : "transparent"
            visible: !sidebarRoot.sidebarExpanded

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
                onClicked: sidebarRoot.toggleSidebarRequested()
            }
        }

        // Section Label
        Text {
            visible: sidebarRoot.sidebarExpanded
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
                { key: "home", name: "Início", icon: "🏠", count: 0 },
                { key: "notes", name: "Caderno", icon: "📝", count: dataController.pageCount },
                { key: "diagrams", name: "Diagramas", icon: "🎨", count: 0 },
                { key: "video", name: "Vídeos", icon: "🎬", count: dataController.videoCount },
                { key: "anki", name: "Flashcards", icon: "🎴", count: dataController.deckCount },
                { key: "quiz", name: "Questões", icon: "🎯", count: dataController.quizBatteryCount },
                { key: "finance", name: "Finanças", icon: "💰", count: dataController.transactionCount },
                { key: "habits", name: "Hábitos", icon: "⚡", count: dataController.habitCount },
                { key: "calendar", name: "Agenda", icon: "📅", count: dataController.eventCount },
                { key: "library", name: "Biblioteca", icon: "📚", count: dataController.bookCount },
                { key: "culture", name: "Cultura", icon: "🎭", count: dataController.cultureCount },
                { key: "focus", name: "Foco", icon: "⏳", count: dataController.focusSessionCount },
                { key: "vault", name: "Cofre", icon: "🔒", count: dataController.vaultItemCount },
                { key: "trash", name: "Lixeira", icon: "🗑️", count: 0 },
                { key: "settings", name: "Configurações", icon: "⚙️", count: 0 }
            ]

            delegate: Rectangle {
                width: navListView.width
                height: 38
                radius: 8
                color: {
                    if (sidebarRoot.activeTab === modelData.key) return theme.brand500 + "1a"
                    if (navItemMouse.containsMouse) return theme.bgHover
                    return "transparent"
                }
                border.color: sidebarRoot.activeTab === modelData.key ? theme.brand500 + "33" : "transparent"

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: sidebarRoot.sidebarExpanded ? 10 : 0
                    anchors.rightMargin: sidebarRoot.sidebarExpanded ? 10 : 0
                    spacing: 10

                    Text {
                        Layout.alignment: sidebarRoot.sidebarExpanded ? Qt.AlignVCenter : Qt.AlignHCenter
                        text: modelData.icon
                        font.pixelSize: 15
                    }

                    Text {
                        Layout.fillWidth: true
                        visible: sidebarRoot.sidebarExpanded
                        text: modelData.name
                        color: sidebarRoot.activeTab === modelData.key ? theme.brand300 : (navItemMouse.containsMouse ? theme.textDark : theme.textSubtext)
                        font.pixelSize: 13
                        font.weight: sidebarRoot.activeTab === modelData.key ? Font.DemiBold : Font.Normal
                        font.family: theme.fontFamily
                        elide: Text.ElideRight
                    }

                    // Counter Badge
                    Rectangle {
                        visible: sidebarRoot.sidebarExpanded && modelData.count > 0
                        Layout.alignment: Qt.AlignVCenter
                        width: Math.max(18, countText.contentWidth + 8)
                        height: 18
                        radius: 9
                        color: sidebarRoot.activeTab === modelData.key ? theme.brand600 : theme.bgDarkSurface

                        Text {
                            id: countText
                            anchors.centerIn: parent
                            text: modelData.count.toString()
                            color: sidebarRoot.activeTab === modelData.key ? "#ffffff" : theme.textMuted
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
                    onClicked: sidebarRoot.tabSelected(modelData.key)
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
                    visible: sidebarRoot.sidebarExpanded
                    Layout.fillWidth: true
                    text: "SQLite WAL Conectado"
                    color: theme.textSubtext
                    font.pixelSize: 11
                    font.family: theme.fontFamily
                    elide: Text.ElideRight
                }

                Text {
                    visible: sidebarRoot.sidebarExpanded
                    text: "v2.0"
                    color: theme.brand400
                    font.pixelSize: 10
                    font.bold: true
                }
            }
        }
    }
}
