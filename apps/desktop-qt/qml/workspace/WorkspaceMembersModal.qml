import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: membersModalRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 99

    property string workspaceName: "Espaço Pessoal"
    property var membersList: [
        { id: "1", name: "Você (Dono)", email: "usuario@synapse.local", role: "owner" }
    ]
    property string selectedRole: "editor"

    signal closed()
    signal inviteMemberRequested(string email, string role)
    signal removeMemberRequested(string memberId)

    MouseArea {
        anchors.fill: parent
        onClicked: membersModalRoot.closed()
    }

    Rectangle {
        width: Math.min(520, parent.width - 40)
        height: Math.min(540, parent.height - 40)
        radius: 20
        color: "#161524"
        border.color: "#338b5cf6"
        border.width: 1
        anchors.centerIn: parent

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: "👥 Membros do Workspace"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕"
                    flat: true
                    onClicked: membersModalRoot.closed()
                    contentItem: Text {
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 16
                    }
                }
            }

            Text {
                text: "Gerencie permissões de acesso, colabore em tempo real e convide novos membros para \"" + membersModalRoot.workspaceName + "\"."
                color: "#a7a9be"
                font.pixelSize: 12
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }

            // Invite Section
            Rectangle {
                Layout.fillWidth: true
                height: 94
                radius: 12
                color: "#10101b"
                border.color: "#1affffff"
                border.width: 1

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 8

                    Text { text: "CONVIDAR NOVO MEMBRO POR EMAIL"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        TextField {
                            id: emailInput
                            Layout.fillWidth: true
                            height: 36
                            placeholderText: "colega@equipe.com"
                            color: "#fffffe"
                            background: Rectangle { color: "#0f0e17"; radius: 6; border.color: "#2e2f3e"; border.width: 1 }
                        }

                        ComboBox {
                            id: roleCombo
                            Layout.preferredWidth: 100
                            height: 36
                            model: ["Editor", "Leitor", "Admin"]
                        }

                        Button {
                            height: 36
                            flat: true
                            background: Rectangle { color: "#8b5cf6"; radius: 6 }
                            contentItem: Text { text: "+ Convidar"; color: "#ffffff"; font.pixelSize: 11; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter; leftPadding: 8; rightPadding: 8 }
                            onClicked: {
                                var email = emailInput.text.trim()
                                if (email.length > 3) {
                                    membersModalRoot.inviteMemberRequested(email, roleCombo.currentText.toLowerCase())
                                    emailInput.text = ""
                                }
                            }
                        }
                    }
                }
            }

            // Members List
            Text { text: "MEMBROS ATIVOS (" + membersModalRoot.membersList.length + ")"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true }

            ListView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                spacing: 8
                model: membersModalRoot.membersList

                delegate: Rectangle {
                    width: parent.width
                    height: 52
                    radius: 10
                    color: "#1a1924"
                    border.color: "#0fffffff"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 12

                        Rectangle {
                            width: 32; height: 32; radius: 16
                            color: "#268b5cf6"
                            Text { anchors.centerIn: parent; text: "👤"; font.pixelSize: 14 }
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2
                            Text { text: modelData.name || modelData.email; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
                            Text { text: modelData.email; color: "#6b7280"; font.pixelSize: 10 }
                        }

                        Rectangle {
                            width: roleBadge.width + 12
                            height: 22
                            radius: 11
                            color: modelData.role === "owner" ? "#26f59e0b" : "#268b5cf6"
                            Text {
                                id: roleBadge
                                anchors.centerIn: parent
                                text: modelData.role === "owner" ? "Dono" : (modelData.role === "admin" ? "Admin" : (modelData.role === "editor" ? "Editor" : "Leitor"))
                                color: modelData.role === "owner" ? "#f59e0b" : "#a78bfa"
                                font.pixelSize: 10
                                font.bold: true
                            }
                        }
                    }
                }
            }

            Item { Layout.fillHeight: true }

            Button {
                Layout.fillWidth: true
                height: 40
                flat: true
                background: Rectangle { color: "#211f30"; radius: 8 }
                contentItem: Text { text: "Fechar"; color: "#a7a9be"; font.pixelSize: 12; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: membersModalRoot.closed()
            }
        }
    }
}
