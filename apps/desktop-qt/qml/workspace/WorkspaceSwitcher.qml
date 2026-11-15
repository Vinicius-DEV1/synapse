import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: switcherRoot
    Layout.fillWidth: true
    height: 48

    property string activeWorkspaceId: "default"
    property string activeWorkspaceName: "Espaço Pessoal"
    property string activeWorkspaceIcon: "📁"
    property string activeRole: "owner"
    property var workspaces: [
        { id: "default", name: "Espaço Pessoal", icon: "📁", role: "owner" }
    ]

    signal workspaceSelected(string id)
    signal openCreateModal()
    signal openMembersModal()
    signal openEvolutionModal()

    Rectangle {
        id: pillBg
        anchors.fill: parent
        radius: 10
        color: pillMouse.containsMouse ? "#211f30" : "transparent"
        border.color: pillMouse.containsMouse ? "#33ffffff" : "transparent"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 8
            anchors.rightMargin: 8
            spacing: 8

            Text {
                text: switcherRoot.activeWorkspaceIcon
                font.pixelSize: 18
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 1

                Text {
                    text: switcherRoot.activeWorkspaceName
                    color: "#ffffff"
                    font.pixelSize: 12
                    font.bold: true
                    elide: Text.ElideRight
                    Layout.fillWidth: true
                }

                RowLayout {
                    spacing: 4
                    Rectangle {
                        width: roleText.width + 8
                        height: 14
                        radius: 4
                        color: switcherRoot.activeRole === "owner" ? "#26f59e0b" : "#268b5cf6"
                        Text {
                            id: roleText
                            anchors.centerIn: parent
                            text: switcherRoot.activeRole === "owner" ? "Dono" : (switcherRoot.activeRole === "admin" ? "Admin" : "Editor")
                            color: switcherRoot.activeRole === "owner" ? "#f59e0b" : "#a78bfa"
                            font.pixelSize: 8
                            font.bold: true
                        }
                    }
                }
            }

            Text {
                text: "▾"
                color: "#a7a9be"
                font.pixelSize: 12
            }
        }

        MouseArea {
            id: pillMouse
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: switcherMenu.open()
        }
    }

    Menu {
        id: switcherMenu
        y: switcherRoot.height + 4

        MenuItem {
            text: "📁 Espaço Pessoal (Local)"
            onTriggered: switcherRoot.workspaceSelected("default")
        }

        MenuSeparator {}

        MenuItem {
            text: "+ Criar Novo Workspace..."
            onTriggered: switcherRoot.openCreateModal()
        }

        MenuItem {
            text: "👥 Gerenciar Membros..."
            onTriggered: switcherRoot.openMembersModal()
        }

        MenuItem {
            text: "✨ Evoluir para Conta em Nuvem..."
            onTriggered: switcherRoot.openEvolutionModal()
        }
    }
}
