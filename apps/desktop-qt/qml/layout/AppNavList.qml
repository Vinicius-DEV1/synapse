import QtQuick 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: navListRoot
    Layout.fillWidth: true
    Layout.fillHeight: true

    Theme { id: theme }

    property bool sidebarExpanded: true
    property string activeTab: "home"
    signal tabSelected(string tabKey)

    ListView {
        id: navListView
        anchors.fill: parent
        clip: true
        spacing: 3
        model: [
            { key: "home", name: "Início", icon: "home" },
            { key: "notes", name: "Caderno", icon: "notes" },
            { key: "calendar", name: "Calendário", icon: "calendar" },
            { key: "library", name: "Biblioteca", icon: "library" },
            { key: "video", name: "Vídeos", icon: "video" },
            { key: "files", name: "Arquivos", icon: "folder" },
            { key: "anki", name: "Flashcards", icon: "anki" },
            { key: "quiz", name: "Questões", icon: "quiz" },
            { key: "practice", name: "Prática & IA", icon: "sparkles" },
            { key: "focus", name: "Foco & Hábitos", icon: "focus" },
            { key: "culture", name: "Cultura", icon: "culture" },
            { key: "finance", name: "Finanças", icon: "finance" },
            { key: "diagrams", name: "Diagramas", icon: "diagrams" },
            { key: "vault", name: "Cofre", icon: "vault" },
            { key: "trash", name: "Lixeira", icon: "trash" },
            { key: "settings", name: "Configurações", icon: "settings" }
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
