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
            { key: "home", name: "Início", icon: "home", count: 0 },
            { key: "notes", name: "Caderno", icon: "notes", count: dataController.pageCount },
            { key: "quiz", name: "Questões", icon: "quiz", count: dataController.quizBatteryCount },
            { key: "library", name: "Biblioteca", icon: "library", count: dataController.bookCount },
            { key: "finance", name: "Finanças", icon: "finance", count: dataController.transactionCount },
            { key: "culture", name: "Cultura", icon: "culture", count: dataController.cultureCount },
            { key: "video", name: "Vídeos", icon: "video", count: dataController.videoCount },
            { key: "anki", name: "Flashcards", icon: "anki", count: dataController.deckCount },
            { key: "focus", name: "Foco", icon: "focus", count: dataController.focusSessionCount },
            { key: "calendar", name: "Agenda", icon: "calendar", count: dataController.eventCount },
            { key: "habits", name: "Hábitos", icon: "habits", count: dataController.habitCount },
            { key: "files", name: "Arquivos", icon: "folder", count: 0 },
            { key: "diagrams", name: "Diagramas", icon: "diagrams", count: 0 },
            { key: "practice", name: "Prática", icon: "focus", count: 0 },
            { key: "vault", name: "Cofre", icon: "vault", count: dataController.vaultItemCount },
            { key: "trash", name: "Lixeira", icon: "trash", count: 0 },
            { key: "settings", name: "Configurações", icon: "settings", count: 0 }
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

                AppIcon {
                    width: 18
                    height: 18
                    Layout.alignment: navListRoot.sidebarExpanded ? Qt.AlignVCenter : Qt.AlignHCenter
                    name: modelData.icon
                    color: itemDelegate.isActive ? theme.brand400 : theme.textSubtext
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
                    color: itemDelegate.isActive ? theme.brand600 : "#0affffff"

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
