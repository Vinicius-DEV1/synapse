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
    property var editingItem: null
    property string generatedPassword: ""
    property bool isPasswordDialogOpen: false

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

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24
        visible: !dataController.isVaultConfigured || dataController.isVaultUnlocked

        // Header and Search/Actions/Group Pills
        VaultHeaderSection {
            filteredCount: vaultRoot.filteredItems.length
            allCount: vaultRoot.allItems.length
            groups: vaultRoot.groups
            selectedGroupId: vaultRoot.selectedGroupId
            searchQuery: vaultRoot.searchQuery

            onSearchChanged: function(query) {
                vaultRoot.searchQuery = query
                vaultRoot.applySearch()
            }
            onGeneratePasswordRequested: {
                vaultRoot.generatedPassword = dataController.generateSecurePassword(18, true)
                vaultRoot.isPasswordDialogOpen = true
            }
            onLockVaultRequested: dataController.lockVault()
            onHelpRequested: vaultHelpDialog.isOpen = true
            onNewItemRequested: {
                vaultRoot.editingItem = null
                vaultRoot.isAddingItem = true
            }
            onGroupSelected: function(groupId) {
                vaultRoot.selectedGroupId = groupId
                vaultRoot.refreshVault()
            }
        }

        // Credentials List
        VaultCredentialsList {
            items: vaultRoot.filteredItems
            revealedPasswords: vaultRoot.revealedPasswords
            copiedId: vaultRoot.copiedId

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
                dataController.deleteVaultItem(id)
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
        onClosed: {
            vaultRoot.isAddingItem = false
            vaultRoot.editingItem = null
        }
        onItemSubmitted: function(label, username, password, url) {
            var idToSave = vaultRoot.editingItem ? vaultRoot.editingItem.id : ""
            var grpId = vaultRoot.editingItem ? (vaultRoot.editingItem.group_id || vaultRoot.selectedGroupId) : vaultRoot.selectedGroupId
            dataController.saveVaultItem(idToSave, grpId, label, username, "", password, url, "")
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
