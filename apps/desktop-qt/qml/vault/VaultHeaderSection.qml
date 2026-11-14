import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: headerRoot
    Layout.fillWidth: true
    spacing: 16

    property int filteredCount: 0
    property int allCount: 0
    property var groups: []
    property string selectedGroupId: ""
    property string searchQuery: ""

    signal searchChanged(string query)
    signal generatePasswordRequested()
    signal lockVaultRequested()
    signal newItemRequested()
    signal groupSelected(string groupId)
    signal helpRequested()

    // Header Top Row: Title & Action Buttons
    RowLayout {
        Layout.fillWidth: true
        spacing: 16

        ColumnLayout {
            spacing: 4
            Text {
                text: "🔒 Cofre E2EE & Credenciais"
                color: "#fffffe"
                font.pixelSize: 24
                font.bold: true
            }
            Text {
                text: headerRoot.filteredCount + " credenciais listadas de " + headerRoot.allCount + " protegidas com AES-256-GCM Two-Tier"
                color: "#a7a9be"
                font.pixelSize: 13
            }
        }

        Item { Layout.fillWidth: true }

        // Gerar Senha Segura Button
        Rectangle {
            Layout.preferredWidth: 132
            Layout.preferredHeight: 38
            radius: 10
            color: genPassMouse.containsMouse ? "#337c3aed" : "#267c3aed"
            border.color: "#4d8b5cf6"

            RowLayout {
                anchors.centerIn: parent
                spacing: 6
                Text { text: "⚡"; font.pixelSize: 13 }
                Text { text: "Gerar Senha"; color: "#c4b5fd"; font.pixelSize: 13; font.bold: true }
            }

            MouseArea {
                id: genPassMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: headerRoot.generatePasswordRequested()
            }
        }

        // Bloquear Cofre Button
        Rectangle {
            visible: dataController.isVaultConfigured && dataController.isVaultUnlocked
            Layout.preferredWidth: 100
            Layout.preferredHeight: 38
            radius: 10
            color: lockMouse.containsMouse ? "#26ef4444" : "#15ef4444"
            border.color: "#40ef4444"

            RowLayout {
                anchors.centerIn: parent
                spacing: 6
                Text { text: "🔒"; font.pixelSize: 13 }
                Text { text: "Bloquear"; color: "#fca5a5"; font.pixelSize: 13; font.bold: true }
            }

            MouseArea {
                id: lockMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: headerRoot.lockVaultRequested()
            }
        }

        // Help / Guide Button
        Rectangle {
            Layout.preferredWidth: 38
            Layout.preferredHeight: 38
            radius: 10
            color: helpMouse.containsMouse ? "#262438" : "#15141b"
            border.color: helpMouse.containsMouse ? "#808b5cf6" : "#12ffffff"
            border.width: 1

            Text {
                anchors.centerIn: parent
                text: "?"
                color: helpMouse.containsMouse ? "#ffffff" : "#a7a9be"
                font.pixelSize: 15
                font.bold: true
            }

            MouseArea {
                id: helpMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: headerRoot.helpRequested()
            }
        }

        // + Nova Credencial Button
        Rectangle {
            Layout.preferredWidth: 154
            Layout.preferredHeight: 38
            radius: 10
            color: newCredMouse.containsMouse ? "#8b5cf6" : "#7c3aed"

            RowLayout {
                anchors.centerIn: parent
                spacing: 6
                Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                Text { text: "Nova Credencial"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
            }

            MouseArea {
                id: newCredMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: headerRoot.newItemRequested()
            }
        }
    }

    // Secondary Row: Search Bar & Group Filter Pills
    RowLayout {
        Layout.fillWidth: true
        spacing: 12

        // Search Bar
        Rectangle {
            Layout.preferredWidth: 260
            Layout.preferredHeight: 34
            radius: 8
            color: "#15141b"
            border.color: vaultSearchInput.activeFocus ? "#808b5cf6" : "#12ffffff"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 10
                anchors.rightMargin: 10
                spacing: 8

                Text { text: "🔍"; color: "#a7a9be"; font.pixelSize: 12 }

                TextInput {
                    id: vaultSearchInput
                    Layout.fillWidth: true
                    color: "#fffffe"
                    font.pixelSize: 13
                    selectByMouse: true
                    onTextChanged: headerRoot.searchChanged(text)

                    Text {
                        text: "Buscar credencial..."
                        color: "#64748b"
                        font.pixelSize: 13
                        visible: !vaultSearchInput.text && !vaultSearchInput.activeFocus
                    }
                }
            }
        }

        Rectangle {
            Layout.preferredWidth: 1
            Layout.preferredHeight: 20
            color: "#18ffffff"
            visible: headerRoot.groups.length > 0
        }

        // Groups Filter Pills
        Flickable {
            Layout.fillWidth: true
            Layout.preferredHeight: 34
            contentWidth: groupRow.width
            clip: true
            boundsBehavior: Flickable.StopAtBounds

            Row {
                id: groupRow
                spacing: 8

                Rectangle {
                    id: allGroupRect
                    property bool isSelected: headerRoot.selectedGroupId === ""
                    height: 32
                    width: allGroupText.contentWidth + 24
                    radius: 16
                    color: allGroupRect.isSelected ? "#6366f1" : (allGroupMouse.containsMouse ? "#206366f1" : "#1a1924")
                    border.color: allGroupRect.isSelected ? "#818cf8" : "#0fffffff"

                    Text {
                        id: allGroupText
                        anchors.centerIn: parent
                        text: "Todos (" + headerRoot.allCount + ")"
                        color: allGroupRect.isSelected ? "#ffffff" : "#a7a9be"
                        font.pixelSize: 12
                        font.bold: allGroupRect.isSelected
                    }

                    MouseArea {
                        id: allGroupMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: headerRoot.groupSelected("")
                    }
                }

                Repeater {
                    model: headerRoot.groups
                    delegate: Rectangle {
                        id: grpDelegate
                        property bool isSelected: headerRoot.selectedGroupId === modelData.id
                        height: 32
                        width: grpText.contentWidth + 24
                        radius: 16
                        color: grpDelegate.isSelected ? "#6366f1" : (grpMouse.containsMouse ? "#206366f1" : "#1a1924")
                        border.color: grpDelegate.isSelected ? "#818cf8" : "#0fffffff"

                        Text {
                            id: grpText
                            anchors.centerIn: parent
                            text: "📁 " + (modelData.name && modelData.name.length > 0 ? modelData.name : "Geral")
                            color: grpDelegate.isSelected ? "#ffffff" : "#a7a9be"
                            font.pixelSize: 12
                            font.bold: grpDelegate.isSelected
                        }

                        MouseArea {
                            id: grpMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: headerRoot.groupSelected(modelData.id)
                        }
                    }
                }
            }
        }
    }
}
