import QtQuick 2.15
import QtQuick.Layouts 1.15
import "../ui"

ColumnLayout {
    id: subRoot
    Layout.fillWidth: true
    Layout.fillHeight: true
    spacing: 4

    property string activeTab: ""
    property string activeSubSection: ""

    signal subSectionSelected(string sectionId)

    Theme { id: theme }

    readonly property var sectionsByModule: ({
        "settings": [
            { id: "general", label: qsTr("Geral"), icon: "settings" },
            { id: "editor", label: qsTr("Editor de Notas"), icon: "layout" },
            { id: "security", label: qsTr("Segurança e Cofre"), icon: "shield" },
            { id: "ai", label: qsTr("Inteligência Artificial"), icon: "zap" },
            { id: "shortcuts", label: qsTr("Atalhos de Teclado"), icon: "keyboard" },
            { id: "storage", label: qsTr("Armazenamento"), icon: "hard-drive" },
            { id: "video", label: qsTr("Vídeo e Mídia"), icon: "video" },
            { id: "backup", label: qsTr("Backup de Dados"), icon: "backup" },
            { id: "sync", label: qsTr("Sincronização"), icon: "refresh" },
            { id: "sharing", label: qsTr("Compartilhamento"), icon: "share" }
        ],
        "finance": [
            { id: "dashboard", label: qsTr("Dashboard"), icon: "layout" },
            { id: "transactions", label: qsTr("Transações"), icon: "finance" },
            { id: "loans", label: qsTr("Empréstimos"), icon: "refresh" },
            { id: "wishlist", label: qsTr("Lista de Desejos"), icon: "sparkles" }
        ],
        "focus": [
            { id: "dashboard", label: qsTr("Pomodoro & Foco"), icon: "focus" },
            { id: "habits", label: qsTr("Hábitos Diários"), icon: "habits" },
            { id: "stats", label: qsTr("Estatísticas"), icon: "history" },
            { id: "lofi", label: qsTr("Rádio Lo-Fi"), icon: "video" },
            { id: "alarms", label: qsTr("Alarmes"), icon: "bell" }
        ],
        "vault": [
            { id: "items", label: qsTr("Todos os Itens"), icon: "vault" },
            { id: "generator", label: qsTr("Gerador de Senhas"), icon: "key" },
            { id: "security", label: qsTr("Auditoria de Segurança"), icon: "shield" }
        ]
    })

    readonly property var currentItems: sectionsByModule[activeTab] || []
    visible: currentItems.length > 0

    Text {
        text: {
            if (subRoot.activeTab === "settings") return qsTr("SEÇÕES DE CONFIGURAÇÃO")
            if (subRoot.activeTab === "finance") return qsTr("FINANÇAS")
            if (subRoot.activeTab === "focus") return qsTr("FOCO & HÁBITOS")
            if (subRoot.activeTab === "vault") return qsTr("COFRE E2EE")
            return ""
        }
        color: theme.textMuted
        font.pixelSize: 10
        font.bold: true
        font.letterSpacing: 1.1
        Layout.bottomMargin: 4
    }

    Flickable {
        Layout.fillWidth: true
        Layout.fillHeight: true
        contentHeight: subCol.implicitHeight
        clip: true

        ColumnLayout {
            id: subCol
            width: parent.width
            spacing: 2

            Repeater {
                model: subRoot.currentItems

                delegate: Rectangle {
                    required property var modelData
                    readonly property bool isCurrent: subRoot.activeSubSection === modelData.id
                    Layout.fillWidth: true
                    Layout.preferredHeight: 32
                    radius: 6
                    color: isCurrent ? theme.activePillBg : (sMouse.containsMouse ? theme.bgHover : "transparent")
                    border.color: isCurrent ? theme.activePillBorder : "transparent"

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 8
                        anchors.rightMargin: 8
                        spacing: 8

                        AppIcon {
                            width: 14; height: 14
                            name: modelData.icon
                            color: isCurrent ? theme.brand300 : theme.brand400
                        }

                        Text {
                            Layout.fillWidth: true
                            text: modelData.label
                            color: isCurrent ? theme.brand300 : theme.textDark
                            font.pixelSize: 12
                            font.bold: isCurrent
                            elide: Text.ElideRight
                        }
                    }

                    MouseArea {
                        id: sMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: subRoot.subSectionSelected(modelData.id)
                    }
                }
            }
        }
    }
}
