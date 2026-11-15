pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: vaultRoot
    color: "#0f0e17"

    property var groups: []
    property var allItems: []
    property var filteredItems: []
    property string selectedGroupId: ""
    property string searchQuery: ""
    property string viewMode: "items" // "items" or "security"

    property var selectedItem: null
    property var editingItem: null
    property bool isAddingItem: false

    property var groupToEdit: null
    property bool isGroupModalOpen: false

    property var itemToDelete: null
    property bool isDeleteModalOpen: false

    property var revealedPasswords: ({})
    property string copiedId: ""

    property string generatedPassword: ""
    property bool isPasswordDialogOpen: false

    function refreshVault() {
        groups = dataController.getVaultGroups()
        allItems = dataController.getVaultItems(selectedGroupId)
        applySearch()

        // Refresh selectedItem if it was updated
        if (selectedItem) {
            var found = false
            for (var i = 0; i < allItems.length; i++) {
                if (allItems[i].id === selectedItem.id) {
                    selectedItem = allItems[i]
                    found = true
                    break
                }
            }
            if (!found) selectedItem = null
        }
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

    Connections {
        target: dataController
        function onVaultStateChanged() {
            vaultRoot.refreshVault()
        }
        function onVaultUnlocked() {
            vaultRoot.refreshVault()
        }
    }

    // Zen Unlock Screen when configured and locked
    VaultUnlockScreen {
        anchors.fill: parent
        visible: dataController.isVaultConfigured && !dataController.isVaultUnlocked
        z: 10
        onUnlocked: vaultRoot.refreshVault()
    }

    // Main 3-Panel Viewport Layout
    RowLayout {
        anchors.fill: parent
        spacing: 0
        visible: !dataController.isVaultConfigured || dataController.isVaultUnlocked

        // PANEL 1: Left Vault Sidebar (Categories & Custom Groups)
        VaultSidebar {
            Layout.fillHeight: true
            groups: vaultRoot.groups
            selectedGroupId: vaultRoot.selectedGroupId
            viewMode: vaultRoot.viewMode
            allItemsCount: vaultRoot.allItems.length

            onSelectGroup: function(groupId) {
                vaultRoot.selectedGroupId = groupId
                vaultRoot.viewMode = "items"
                vaultRoot.refreshVault()
            }
            onSetViewMode: function(mode) {
                vaultRoot.viewMode = mode
            }
            onCreateGroupRequested: {
                vaultRoot.groupToEdit = null
                vaultRoot.isGroupModalOpen = true
            }
            onEditGroupRequested: function(grp) {
                vaultRoot.groupToEdit = grp
                vaultRoot.isGroupModalOpen = true
            }
            onDeleteGroupRequested: function(grp) {
                dataController.deleteVaultGroup(grp.id)
                vaultRoot.refreshVault()
            }
            onHelpRequested: vaultHelpDialog.isOpen = true
        }

        // PANEL 2 & 3: Main Area
        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true

            // Security Dashboard ViewMode
            VaultSecurityDashboard {
                anchors.fill: parent
                visible: vaultRoot.viewMode === "security"
                onEditItemRequested: function(item) {
                    vaultRoot.selectedItem = item
                    vaultRoot.viewMode = "items"
                }
            }

            // Normal Credentials ViewMode (Split: List + Details)
            RowLayout {
                anchors.fill: parent
                spacing: 0
                visible: vaultRoot.viewMode === "items"

                // PANEL 2: Middle Items List
                Rectangle {
                    Layout.preferredWidth: 340
                    Layout.fillHeight: true
                    color: "#13131b"
                    border.color: "#2e2e38"
                    border.width: 1

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 12

                        // Search & Top Actions
                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8

                            // Search Field
                            Rectangle {
                                Layout.fillWidth: true
                                Layout.preferredHeight: 34
                                radius: 8
                                color: "#0f0e17"
                                border.color: searchInput.activeFocus ? "#7c3aed" : "#2e2e38"
                                border.width: 1

                                RowLayout {
                                    anchors.fill: parent
                                    anchors.leftMargin: 8
                                    anchors.rightMargin: 8
                                    spacing: 6

                                    AppIcon {
                                        name: "search"
                                        color: "#6b7280"
                                        Layout.preferredWidth: 14
                                        Layout.preferredHeight: 14
                                    }

                                    TextField {
                                        id: searchInput
                                        Layout.fillWidth: true
                                        placeholderText: "Buscar credenciais..."
                                        color: "#fffffe"
                                        placeholderTextColor: "#4b5563"
                                        font.pixelSize: 12
                                        background: Rectangle { color: "transparent"; border.width: 0 }
                                        onTextChanged: {
                                            vaultRoot.searchQuery = text
                                            vaultRoot.applySearch()
                                        }
                                    }
                                }
                            }

                            // Generate Password Button
                            Rectangle {
                                Layout.preferredWidth: 34
                                Layout.preferredHeight: 34
                                radius: 8
                                color: genMouse.containsMouse ? "#2e2e38" : "#1f1f2e"
                                border.color: "#2e2e38"
                                border.width: 1

                                AppIcon {
                                    anchors.centerIn: parent
                                    name: "refresh"
                                    color: "#a78bfa"
                                    Layout.preferredWidth: 15
                                    Layout.preferredHeight: 15
                                }

                                MouseArea {
                                    id: genMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        vaultRoot.generatedPassword = dataController.generateSecurePassword(18, true, true, true, true)
                                        vaultRoot.isPasswordDialogOpen = true
                                    }
                                }
                            }

                            // New Item Button
                            Rectangle {
                                Layout.preferredWidth: 34
                                Layout.preferredHeight: 34
                                radius: 8
                                color: newMouse.containsMouse ? "#6d28d9" : "#7c3aed"

                                AppIcon {
                                    anchors.centerIn: parent
                                    name: "plus"
                                    color: "#ffffff"
                                    Layout.preferredWidth: 15
                                    Layout.preferredHeight: 15
                                }

                                MouseArea {
                                    id: newMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        vaultRoot.editingItem = null
                                        vaultRoot.isAddingItem = true
                                    }
                                }
                            }
                        }

                        // Credentials List
                        VaultCredentialsList {
                            items: vaultRoot.filteredItems
                            selectedItem: vaultRoot.selectedItem
                            revealedPasswords: vaultRoot.revealedPasswords
                            copiedId: vaultRoot.copiedId

                            onItemSelected: function(item) {
                                vaultRoot.selectedItem = item
                            }
                            onToggleRevealRequested: function(id) { vaultRoot.toggleReveal(id) }
                            onCopyPasswordRequested: function(pass, id) {
                                dataController.copyToClipboard(pass)
                                vaultRoot.copiedId = id
                                copyFeedbackTimer.restart()
                            }
                            onEditRequested: function(item) {
                                vaultRoot.editingItem = item
                                vaultRoot.isAddingItem = true
                            }
                            onDeleteRequested: function(id) {
                                for (var i = 0; i < vaultRoot.allItems.length; i++) {
                                    if (vaultRoot.allItems[i].id === id) {
                                        vaultRoot.itemToDelete = vaultRoot.allItems[i]
                                        vaultRoot.isDeleteModalOpen = true
                                        break
                                    }
                                }
                            }
                        }
                    }
                }

                // PANEL 3: Right Item Details
                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    color: "#0f0e17"

                    // Empty Selection State
                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 12
                        visible: !vaultRoot.selectedItem

                        AppIcon {
                            name: "shield"
                            color: "#2e2e38"
                            Layout.preferredWidth: 64
                            Layout.preferredHeight: 64
                            Layout.alignment: Qt.AlignHCenter
                        }

                        Text {
                            text: "Cofre de Senhas"
                            color: "#fffffe"
                            font.pixelSize: 16
                            font.weight: Font.DemiBold
                            Layout.alignment: Qt.AlignHCenter
                        }

                        Text {
                            text: "Selecione uma credencial ou adicione uma nova"
                            color: "#6b7280"
                            font.pixelSize: 12
                            Layout.alignment: Qt.AlignHCenter
                        }
                    }

                    // Selected Item Details View
                    VaultItemDetails {
                        anchors.fill: parent
                        visible: vaultRoot.selectedItem !== null
                        item: vaultRoot.selectedItem

                        onEditRequested: {
                            vaultRoot.editingItem = vaultRoot.selectedItem
                            vaultRoot.isAddingItem = true
                        }
                        onDeleteRequested: {
                            vaultRoot.itemToDelete = vaultRoot.selectedItem
                            vaultRoot.isDeleteModalOpen = true
                        }
                    }
                }
            }
        }
    }

    // Modal: Criar / Editar Grupo
    VaultGroupModal {
        isOpen: vaultRoot.isGroupModalOpen
        group: vaultRoot.groupToEdit
        onClosed: vaultRoot.isGroupModalOpen = false
        onSaved: vaultRoot.refreshVault()
    }

    // Modal: Confirmação de Exclusão de Credencial
    VaultDeleteItemModal {
        isOpen: vaultRoot.isDeleteModalOpen
        itemName: vaultRoot.itemToDelete ? (vaultRoot.itemToDelete.label || "") : ""
        onClosed: {
            vaultRoot.isDeleteModalOpen = false
            vaultRoot.itemToDelete = null
        }
        onConfirmed: {
            if (vaultRoot.itemToDelete && vaultRoot.itemToDelete.id) {
                dataController.deleteVaultItem(vaultRoot.itemToDelete.id)
                if (vaultRoot.selectedItem && vaultRoot.selectedItem.id === vaultRoot.itemToDelete.id) {
                    vaultRoot.selectedItem = null
                }
                vaultRoot.refreshVault()
            }
        }
    }

    // Dialog: Senha Gerada
    PasswordGeneratorModal {
        visible: vaultRoot.isPasswordDialogOpen
        generatedPassword: vaultRoot.generatedPassword
        onClosed: vaultRoot.isPasswordDialogOpen = false
        onCopyRequested: function(pass) {
            dataController.copyToClipboard(pass)
            vaultRoot.isPasswordDialogOpen = false
        }
    }

    // Modal: Nova / Editar Credencial
    CreateVaultItemModal {
        visible: vaultRoot.isAddingItem
        initialItem: vaultRoot.editingItem
        groups: vaultRoot.groups
        activeGroupId: vaultRoot.selectedGroupId
        onClosed: {
            vaultRoot.isAddingItem = false
            vaultRoot.editingItem = null
        }
        onItemSubmitted: function(label, username, password, url, notes, customJson, loginType, groupId) {
            var idToSave = vaultRoot.editingItem ? vaultRoot.editingItem.id : ""
            var grpId = groupId || (vaultRoot.editingItem ? vaultRoot.editingItem.group_id : vaultRoot.selectedGroupId)
            dataController.saveVaultItem(idToSave, grpId, label, username, "", password, url, notes, customJson, loginType)
            vaultRoot.isAddingItem = false
            vaultRoot.editingItem = null
            vaultRoot.refreshVault()
        }
    }

    // Modal: Guia do Cofre
    VaultHelpDialog {
        id: vaultHelpDialog
        onClosed: isOpen = false
    }
}
