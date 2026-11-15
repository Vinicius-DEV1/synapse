import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: createWorkspaceModalRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 99

    property string selectedEmoji: "📁"
    property var emojiList: ["📁", "🚀", "💡", "📚", "⚡", "🏢", "🔬", "🎨", "🎯", "🛠️"]

    signal closed()
    signal workspaceCreated(string name, string icon, string desc)

    MouseArea {
        anchors.fill: parent
        onClicked: createWorkspaceModalRoot.closed()
    }

    Rectangle {
        width: Math.min(460, parent.width - 40)
        height: Math.min(460, parent.height - 40)
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
                    text: "✨ Criar Novo Workspace"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕"
                    flat: true
                    onClicked: createWorkspaceModalRoot.closed()
                    contentItem: Text {
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 16
                    }
                }
            }

            Text {
                text: "Crie um espaço colaborativo independente com criptografia de ponta a ponta para organizar projetos ou equipes."
                color: "#a7a9be"
                font.pixelSize: 12
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }

            // Emoji Icon Selection
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6

                Text { text: "ÍCONE DO WORKSPACE"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true }

                Flow {
                    Layout.fillWidth: true
                    spacing: 8

                    Repeater {
                        model: createWorkspaceModalRoot.emojiList
                        delegate: Rectangle {
                            width: 36; height: 36; radius: 8
                            color: createWorkspaceModalRoot.selectedEmoji === modelData ? "#8b5cf6" : "#211f30"
                            border.color: createWorkspaceModalRoot.selectedEmoji === modelData ? "#a78bfa" : "#33ffffff"
                            border.width: 1

                            Text {
                                anchors.centerIn: parent
                                text: modelData
                                font.pixelSize: 18
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: createWorkspaceModalRoot.selectedEmoji = modelData
                            }
                        }
                    }
                }
            }

            // Name Field
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6

                Text { text: "NOME DO WORKSPACE"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true }

                TextField {
                    id: nameInput
                    Layout.fillWidth: true
                    height: 40
                    placeholderText: "Ex: Concurso Magistratura, Startup Alpha..."
                    color: "#fffffe"
                    background: Rectangle {
                        color: "#0f0e17"
                        radius: 8
                        border.color: nameInput.activeFocus ? "#8b5cf6" : "#2e2f3e"
                        border.width: 1
                    }
                }
            }

            // Description Field
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6

                Text { text: "DESCRIÇÃO (OPCIONAL)"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true }

                TextField {
                    id: descInput
                    Layout.fillWidth: true
                    height: 40
                    placeholderText: "Ex: Notas de aula, jurisprudência e flashcards..."
                    color: "#fffffe"
                    background: Rectangle {
                        color: "#0f0e17"
                        radius: 8
                        border.color: descInput.activeFocus ? "#8b5cf6" : "#2e2f3e"
                        border.width: 1
                    }
                }
            }

            Item { Layout.fillHeight: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    Layout.fillWidth: true
                    height: 44
                    flat: true
                    background: Rectangle { color: "#211f30"; radius: 10; border.color: "#33ffffff"; border.width: 1 }
                    contentItem: Text { text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 13; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: createWorkspaceModalRoot.closed()
                }

                Button {
                    Layout.fillWidth: true
                    height: 44
                    flat: true
                    background: Rectangle { color: "#8b5cf6"; radius: 10 }
                    contentItem: Text { text: "Criar Workspace"; color: "#ffffff"; font.pixelSize: 13; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: {
                        var name = nameInput.text.trim()
                        if (name.length > 0) {
                            createWorkspaceModalRoot.workspaceCreated(name, createWorkspaceModalRoot.selectedEmoji, descInput.text.trim())
                            createWorkspaceModalRoot.closed()
                        }
                    }
                }
            }
        }
    }
}
