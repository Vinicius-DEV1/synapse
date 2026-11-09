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

    // Header Top Row
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

        // Search Bar
        Rectangle {
            Layout.preferredWidth: 220
            height: 38
            radius: 10
            color: "#15141b"
            border.color: vaultSearchInput.activeFocus ? "#8b5cf680" : "#ffffff12"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
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

        // Gerar Senha Segura Button
        Rectangle {
            width: 150; height: 38; radius: 10
            color: genPassMouse.containsMouse ? "#7c3aed33" : "#7c3aed26"
            border.color: "#8b5cf64d"

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
            width: 104; height: 38; radius: 10
            color: lockMouse.containsMouse ? "#ef444426" : "#ef444415"
            border.color: "#ef444440"

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

        // + Nova Credencial Button
        Rectangle {
            width: 150; height: 38; radius: 10
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

    // Groups Filter Pills
    RowLayout {
        Layout.fillWidth: true
        spacing: 8
        visible: headerRoot.groups.length > 0

        Rectangle {
            id: allGroupRect
            property bool isSelected: headerRoot.selectedGroupId === ""
            height: 32
            width: allGroupText.contentWidth + 24
            radius: 16
            color: allGroupRect.isSelected ? "#6366f1" : "#1a1924"
            border.color: allGroupRect.isSelected ? "#818cf8" : "#ffffff0f"
            Text {
                id: allGroupText
                anchors.centerIn: parent
                text: "Todos (" + headerRoot.allCount + ")"
                color: allGroupRect.isSelected ? "#ffffff" : "#a7a9be"
                font.pixelSize: 12
                font.bold: allGroupRect.isSelected
            }
            MouseArea {
                anchors.fill: parent
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
                color: grpDelegate.isSelected ? "#6366f1" : (grpMouse.containsMouse ? "#ffffff12" : "#1a1924")
                border.color: grpDelegate.isSelected ? "#818cf8" : "#ffffff0f"
                Text {
                    id: grpText
                    anchors.centerIn: parent
                    text: "📁 " + modelData.name
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
