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
                if (navListRoot.activeTab === modelData.key) return theme.brand500 + "1a"
                if (navItemMouse.containsMouse) return theme.bgHover
                return "transparent"
            }
            border.color: navListRoot.activeTab === modelData.key ? theme.brand500 + "33" : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: navListRoot.sidebarExpanded ? 10 : 0
                anchors.rightMargin: navListRoot.sidebarExpanded ? 10 : 0
                spacing: 10

                Text {
                    Layout.alignment: navListRoot.sidebarExpanded ? Qt.AlignVCenter : Qt.AlignHCenter
                    text: modelData.icon
                    font.pixelSize: 15
                }

                Text {
                    Layout.fillWidth: true
                    visible: navListRoot.sidebarExpanded
                    text: modelData.name
                    color: navListRoot.activeTab === modelData.key ? theme.brand300 : (navItemMouse.containsMouse ? theme.textDark : theme.textSubtext)
                    font.pixelSize: 13
                    font.weight: navListRoot.activeTab === modelData.key ? Font.DemiBold : Font.Normal
                    font.family: theme.fontFamily
                    elide: Text.ElideRight
                }

                // Counter Badge
                Rectangle {
                    visible: navListRoot.sidebarExpanded && modelData.count > 0
                    Layout.alignment: Qt.AlignVCenter
                    width: Math.max(18, countText.contentWidth + 8)
                    height: 18
                    radius: 9
                    color: navListRoot.activeTab === modelData.key ? theme.brand600 : theme.bgDarkSurface

                    Text {
                        id: countText
                        anchors.centerIn: parent
                        text: modelData.count.toString()
                        color: navListRoot.activeTab === modelData.key ? "#ffffff" : theme.textMuted
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
