import QtQuick 2.15
import QtQuick.Layouts 1.15

Item {
    id: navListRoot
    Layout.fillWidth: true
    Layout.fillHeight: true

    property bool sidebarExpanded: true
    property string activeTab: "home"
    signal tabSelected(string tabKey)

    ListView {
        id: navListView
        anchors.fill: parent
        clip: true
        spacing: 3
        model: [
            { key: "home", name: "Início", icon: "🏠", count: 0 },
            { key: "notes", name: "Caderno", icon: "📖", count: dataController.pageCount },
            { key: "quiz", name: "Quiz", icon: "☑️", count: dataController.quizBatteryCount },
            { key: "library", name: "Biblioteca", icon: "📚", count: dataController.bookCount },
            { key: "finance", name: "Finanças", icon: "💵", count: dataController.transactionCount },
            { key: "culture", name: "Cultura", icon: "🎭", count: dataController.cultureCount },
            { key: "video", name: "Vídeos", icon: "🎬", count: dataController.videoCount },
            { key: "anki", name: "Flashcards", icon: "🎴", count: dataController.deckCount },
            { key: "calendar", name: "Agenda", icon: "📅", count: dataController.eventCount },
            { key: "habits", name: "Hábitos", icon: "⚡", count: dataController.habitCount },
            { key: "diagrams", name: "Diagramas", icon: "🎨", count: 0 },
            { key: "focus", name: "Foco", icon: "⏳", count: dataController.focusSessionCount },
            { key: "vault", name: "Cofre", icon: "🔒", count: dataController.vaultItemCount },
            { key: "trash", name: "Lixeira", icon: "🗑️", count: 0 },
            { key: "settings", name: "Configurações", icon: "⚙️", count: 0 }
        ]

        delegate: Rectangle {
            id: itemDelegate
            property bool isActive: navListRoot.activeTab === modelData.key
            width: navListView.width
            height: 36
            radius: 8
            color: itemDelegate.isActive ? theme.activePillBg : (navItemMouse.containsMouse ? theme.bgHover : "transparent")
            border.color: itemDelegate.isActive ? theme.activePillBorder : "transparent"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: navListRoot.sidebarExpanded ? 10 : 0
                anchors.rightMargin: navListRoot.sidebarExpanded ? 10 : 0
                spacing: 10

                Text {
                    Layout.alignment: navListRoot.sidebarExpanded ? Qt.AlignVCenter : Qt.AlignHCenter
                    text: modelData.icon
                    font.pixelSize: 14
                    opacity: itemDelegate.isActive ? 1.0 : 0.85
                }

                Text {
                    Layout.fillWidth: true
                    visible: navListRoot.sidebarExpanded
                    text: modelData.name
                    color: itemDelegate.isActive ? theme.brand300 : (navItemMouse.containsMouse ? theme.textDark : theme.textSubtext)
                    font.pixelSize: 13
                    font.weight: itemDelegate.isActive ? Font.DemiBold : Font.Normal
                    font.family: theme.fontFamily
                    elide: Text.ElideRight
                }

                // Counter Badge (discreet pill)
                Rectangle {
                    visible: navListRoot.sidebarExpanded && modelData.count > 0
                    Layout.alignment: Qt.AlignVCenter
                    width: Math.max(18, countText.contentWidth + 8)
                    height: 18
                    radius: 9
                    color: itemDelegate.isActive ? theme.brand600 : "#ffffff0a"

                    Text {
                        id: countText
                        anchors.centerIn: parent
                        text: modelData.count.toString()
                        color: itemDelegate.isActive ? "#ffffff" : theme.textMuted
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
                onClicked: navListRoot.tabSelected(modelData.key)
            }
        }
    }
}
