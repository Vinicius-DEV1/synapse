import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: vaultRoot
    color: "#0f0e17" // bg-dark-bg

    property var groups: []
    property var allItems: []
    property var filteredItems: []
    property string selectedGroupId: ""
    property string searchQuery: ""
    property var revealedPasswords: ({})
    property string copiedId: ""
    property bool isAddingItem: false

    function refreshVault() {
        groups = dataController.getVaultGroups()
        allItems = dataController.getVaultItems(selectedGroupId)
        applySearch()
    }

    function applySearch() {
        var q = searchQuery.trim().toLowerCase()
        if (q.length === 0) {
            filteredItems = allItems
            return
        }
        var res = []
        for (var i = 0; i < allItems.length; i++) {
            var it = allItems[i]
            var match = (it.label || "").toLowerCase().indexOf(q) !== -1 ||
                        (it.username || "").toLowerCase().indexOf(q) !== -1 ||
                        (it.email || "").toLowerCase().indexOf(q) !== -1 ||
                        (it.url || "").toLowerCase().indexOf(q) !== -1
            if (match) res.push(it)
        }
        filteredItems = res
    }

    function toggleReveal(id) {
        var copy = Object.assign({}, revealedPasswords)
        copy[id] = !copy[id]
        revealedPasswords = copy
    }

    Timer {
        id: copyFeedbackTimer
        interval: 2000
        onTriggered: vaultRoot.copiedId = ""
    }

    Component.onCompleted: {
        refreshVault()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

        // Header
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
                    text: vaultRoot.filteredItems.length + " credenciais listadas de " + vaultRoot.allItems.length + " protegidas com AES-256-GCM Two-Tier"
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
                        onTextChanged: {
                            vaultRoot.searchQuery = text
                            vaultRoot.applySearch()
                        }

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
                    onClicked: {
                        var pass = dataController.generateSecurePassword(18, true)
                        passwordDialogText.text = pass
                        passwordDialog.visible = true
                    }
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
                    onClicked: vaultRoot.isAddingItem = true
                }
            }
        }

        // Groups Filter Pills
        RowLayout {
            Layout.fillWidth: true
            spacing: 8
            visible: vaultRoot.groups.length > 0

            Rectangle {
                id: allGroupRect
                property bool isSelected: vaultRoot.selectedGroupId === ""
                height: 32
                width: allGroupText.contentWidth + 24
                radius: 16
                color: allGroupRect.isSelected ? "#6366f1" : "#1a1924"
                border.color: allGroupRect.isSelected ? "#818cf8" : "#ffffff0f"
                Text {
                    id: allGroupText
                    anchors.centerIn: parent
                    text: "Todos (" + vaultRoot.allItems.length + ")"
                    color: allGroupRect.isSelected ? "#ffffff" : "#a7a9be"
                    font.pixelSize: 12
                    font.bold: allGroupRect.isSelected
                }
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        vaultRoot.selectedGroupId = ""
                        vaultRoot.refreshVault()
                    }
                }
            }

            Repeater {
                model: vaultRoot.groups
                delegate: Rectangle {
                    id: grpDelegate
                    property bool isSelected: vaultRoot.selectedGroupId === modelData.id
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
                        onClicked: {
                            vaultRoot.selectedGroupId = modelData.id
                            vaultRoot.refreshVault()
                        }
                    }
                }
            }
        }

        // Credentials List
        ListView {
            id: vaultListView
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            model: vaultRoot.filteredItems
            spacing: 10

            delegate: Rectangle {
                id: vaultCardDelegate
                width: vaultListView.width
                height: 76
                radius: 12
                color: vaultCardMouse.containsMouse ? "#211f30" : "#1a1924" // bg-dark-card
                border.color: vaultCardMouse.containsMouse ? "#8b5cf666" : "#ffffff0f"
                border.width: 1

                Behavior on color { ColorAnimation { duration: 150 } }
                Behavior on border.color { ColorAnimation { duration: 150 } }

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 16
                    spacing: 16

                    Rectangle {
                        width: 44; height: 44; radius: 10
                        color: "#8b5cf61a"
                        border.color: "#8b5cf633"

                        Text {
                            anchors.centerIn: parent
                            text: "🔑"
                            font.pixelSize: 18
                        }
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 3

                        Text {
                            text: modelData.label
                            color: vaultCardMouse.containsMouse ? "#c4b5fd" : "#fffffe"
                            font.pixelSize: 15
                            font.bold: true
                        }

                        Text {
                            text: (modelData.username || modelData.email || "Sem usuário") + (modelData.url ? " • " + modelData.url : "")
                            color: "#a7a9be"
                            font.pixelSize: 12
                            elide: Text.ElideRight
                        }
                    }

                    // Password Box with Reveal and Copy Buttons
                    Rectangle {
                        width: 270
                        height: 38
                        radius: 8
                        color: "#15141b"
                        border.color: "#ffffff12"

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 12
                            anchors.rightMargin: 8
                            spacing: 6

                            Text {
                                Layout.fillWidth: true
                                text: vaultRoot.revealedPasswords[modelData.id] ? modelData.password : "••••••••••••"
                                color: "#fffffe"
                                font.pixelSize: 13
                                font.family: "Monospace"
                                elide: Text.ElideRight
                            }

                            // Ver / Ocultar
                            Rectangle {
                                width: 50; height: 26; radius: 6
                                color: "#ffffff0a"

                                Text {
                                    anchors.centerIn: parent
                                    text: vaultRoot.revealedPasswords[modelData.id] ? "Ocultar" : "Ver"
                                    color: "#c4b5fd"
                                    font.pixelSize: 11
                                }

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: vaultRoot.toggleReveal(modelData.id)
                                }
                            }

                            // Copiar Senha
                            Rectangle {
                                width: 56; height: 26; radius: 6
                                color: vaultRoot.copiedId === modelData.id ? "#10b98126" : "#ffffff0a"
                                border.color: vaultRoot.copiedId === modelData.id ? "#10b981" : "transparent"

                                Text {
                                    anchors.centerIn: parent
                                    text: vaultRoot.copiedId === modelData.id ? "Copiado!" : "Copiar"
                                    color: vaultRoot.copiedId === modelData.id ? "#34d399" : "#a7a9be"
                                    font.pixelSize: 11
                                    font.bold: vaultRoot.copiedId === modelData.id
                                }

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        dataController.copyToClipboard(modelData.password)
                                        vaultRoot.copiedId = modelData.id
                                        copyFeedbackTimer.restart()
                                    }
                                }
                            }
                        }
                    }

                    // Delete Button
                    Rectangle {
                        width: 68; height: 32; radius: 8
                        color: delCredMouse.containsMouse ? "#f43f5e26" : "#f43f5e1a"
                        border.color: delCredMouse.containsMouse ? "#f43f5e66" : "#f43f5e33"

                        Text {
                            anchors.centerIn: parent
                            text: "Excluir"
                            color: "#fb7185"
                            font.pixelSize: 11
                            font.bold: true
                        }

                        MouseArea {
                            id: delCredMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                dataController.deleteVaultItem(modelData.id)
                                vaultRoot.refreshVault()
                            }
                        }
                    }
                }

                MouseArea {
                    id: vaultCardMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    z: -1
                }
            }

            Text {
                anchors.centerIn: parent
                visible: vaultRoot.filteredItems.length === 0
                text: "Nenhuma credencial encontrada no cofre."
                color: "#64748b"
                font.pixelSize: 15
            }
        }
    }

    // ===================================================================
    // Dialog: Senha Gerada
    // ===================================================================
    Rectangle {
        id: passwordDialog
        anchors.fill: parent
        color: "#b3000000"
        visible: false
        z: 95

        MouseArea { anchors.fill: parent }

        Rectangle {
            anchors.centerIn: parent
            width: 440; height: 220; radius: 16
            color: "#161524"; border.color: "#ffffff1a"

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 28
                spacing: 16

                Text {
                    text: "⚡ Senha Gerada (Alta Entropia)"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }

                TextField {
                    id: passwordDialogText
                    Layout.fillWidth: true
                    readOnly: true
                    font.family: "Monospace"
                    font.pixelSize: 16
                    color: "#34d399"
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Item { Layout.fillWidth: true }

                    // Copiar Senha Gerada
                    Rectangle {
                        width: 120; height: 36; radius: 8
                        color: "#10b981"
                        Text { anchors.centerIn: parent; text: "Copiar Senha"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                dataController.copyToClipboard(passwordDialogText.text)
                                passwordDialog.visible = false
                            }
                        }
                    }

                    Rectangle {
                        width: 80; height: 36; radius: 8
                        color: "#211f30"
                        Text { anchors.centerIn: parent; text: "Fechar"; color: "#a7a9be"; font.pixelSize: 12 }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: passwordDialog.visible = false }
                    }
                }
            }
        }
    }

    // ===================================================================
    // Modal: Nova Credencial
    // ===================================================================
    Rectangle {
        anchors.fill: parent
        color: "#00000088"
        visible: vaultRoot.isAddingItem
        z: 95

        MouseArea { anchors.fill: parent }

        Rectangle {
            anchors.centerIn: parent
            width: 460
            height: 420
            radius: 16
            color: "#161524"
            border.color: "#ffffff14"
            border.width: 1

            MouseArea { anchors.fill: parent }

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 28
                spacing: 14

                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "🔑 Nova Credencial no Cofre"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                    Item { Layout.fillWidth: true }
                    Text {
                        text: "✕"; color: "#a7a9be"; font.pixelSize: 16
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: vaultRoot.isAddingItem = false }
                    }
                }

                // Service Name Input
                ColumnLayout {
                    Layout.fillWidth: true; spacing: 4
                    Text { text: "Serviço ou Rótulo"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true; height: 38; radius: 8; color: "#15141b"; border.color: vaultLabelInput.activeFocus ? "#7c3aed" : "#ffffff15"
                        TextInput {
                            id: vaultLabelInput; anchors.fill: parent; anchors.leftMargin: 12; anchors.rightMargin: 12
                            verticalAlignment: TextInput.AlignVCenter; color: "#fffffe"; font.pixelSize: 13; selectByMouse: true
                        }
                    }
                }

                // Username / Email Input
                ColumnLayout {
                    Layout.fillWidth: true; spacing: 4
                    Text { text: "Usuário ou E-mail"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true; height: 38; radius: 8; color: "#15141b"; border.color: vaultUserInput.activeFocus ? "#7c3aed" : "#ffffff15"
                        TextInput {
                            id: vaultUserInput; anchors.fill: parent; anchors.leftMargin: 12; anchors.rightMargin: 12
                            verticalAlignment: TextInput.AlignVCenter; color: "#fffffe"; font.pixelSize: 13; selectByMouse: true
                        }
                    }
                }

                // Password Input
                ColumnLayout {
                    Layout.fillWidth: true; spacing: 4
                    Text { text: "Senha"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true; height: 38; radius: 8; color: "#15141b"; border.color: vaultPassInput.activeFocus ? "#7c3aed" : "#ffffff15"
                        TextInput {
                            id: vaultPassInput; anchors.fill: parent; anchors.leftMargin: 12; anchors.rightMargin: 12
                            verticalAlignment: TextInput.AlignVCenter; color: "#fffffe"; font.pixelSize: 13; echoMode: TextInput.Password; selectByMouse: true
                        }
                    }
                }

                // URL Input
                ColumnLayout {
                    Layout.fillWidth: true; spacing: 4
                    Text { text: "URL do Site (opcional)"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true; height: 38; radius: 8; color: "#15141b"; border.color: vaultUrlInput.activeFocus ? "#7c3aed" : "#ffffff15"
                        TextInput {
                            id: vaultUrlInput; anchors.fill: parent; anchors.leftMargin: 12; anchors.rightMargin: 12
                            verticalAlignment: TextInput.AlignVCenter; color: "#fffffe"; font.pixelSize: 13; selectByMouse: true
                        }
                    }
                }

                Item { Layout.fillHeight: true }

                // Actions Footer
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Item { Layout.fillWidth: true }
                    Rectangle {
                        width: 90; height: 38; radius: 8; color: "#211f30"
                        Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: vaultRoot.isAddingItem = false }
                    }
                    Rectangle {
                        width: 140; height: 38; radius: 8; color: "#7c3aed"
                        Text { anchors.centerIn: parent; text: "Salvar no Cofre"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                if (vaultLabelInput.text.trim().length > 0 && vaultPassInput.text.length > 0) {
                                    dataController.saveVaultItem("", vaultRoot.selectedGroupId, vaultLabelInput.text, vaultUserInput.text, "", vaultPassInput.text, vaultUrlInput.text, "")
                                    vaultLabelInput.text = ""
                                    vaultUserInput.text = ""
                                    vaultPassInput.text = ""
                                    vaultUrlInput.text = ""
                                    vaultRoot.isAddingItem = false
                                    vaultRoot.refreshVault()
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
