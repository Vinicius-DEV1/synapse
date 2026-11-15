import QtQuick 2.15
import "../workspace"
import "../auth"
import "../sharing"
import "../ui"

Item {
    id: globalModalsHost
    anchors.fill: parent
    z: 9999

    property var dataCtrl: null
    property alias confirmDialog: confirmDialog
    property alias syncToast: syncToast
    property alias taskWidget: taskWidget
    property alias contextMenu: contextMenu

    signal actionTriggered(string actionKey)

    function requestConfirm(title, message, callback, kind, confirmText, cancelText) {
        confirmDialog.showDialog(title, message, callback, kind, confirmText, cancelText)
    }

    function showSyncStatus(status) {
        syncToast.status = status
    }

    function showContextMenu(xPos, yPos) {
        contextMenu.x = Math.max(8, Math.min(xPos, globalModalsHost.width - 210))
        contextMenu.y = Math.max(8, Math.min(yPos, globalModalsHost.height - 250))
        contextMenu.open()
    }

    function openWorkspaceCreate() {
        workspaceCreateModal.visible = true
    }

    function openWorkspaceMembers() {
        workspaceMembersModal.visible = true
    }

    function openAccountEvolution() {
        accountEvolutionModal.visible = true
    }

    function openShare(pageId, pageTitle) {
        shareModal.pageId = pageId
        shareModal.pageTitle = pageTitle || "Página"
        shareModal.visible = true
    }

    function openShareManagement() {
        shareManagementPanel.visible = true
    }

    function openShareAccessRequest(email, pageTitle, role) {
        shareAccessRequestModal.requesterEmail = email || "colega@equipe.com"
        shareAccessRequestModal.pageTitle = pageTitle || "Página"
        shareAccessRequestModal.requestedRole = role || "editor"
        shareAccessRequestModal.visible = true
    }

    AppConfirmDialog {
        id: confirmDialog
    }

    SyncStatusToast {
        id: syncToast
        anchors.fill: parent
    }

    BackgroundTaskWidget {
        id: taskWidget
        tasks: globalModalsHost.dataCtrl ? globalModalsHost.dataCtrl.activeTasks : []
        onTaskCancelled: function(taskId) {
            if (globalModalsHost.dataCtrl && typeof globalModalsHost.dataCtrl.cancelTask === "function") {
                globalModalsHost.dataCtrl.cancelTask(taskId)
            }
        }
        onTaskDismissed: function(taskId) {
            if (globalModalsHost.dataCtrl && typeof globalModalsHost.dataCtrl.removeTask === "function") {
                globalModalsHost.dataCtrl.removeTask(taskId)
            }
        }
    }

    AppContextMenu {
        id: contextMenu
        onActionTriggered: function(actionKey) {
            globalModalsHost.actionTriggered(actionKey)
        }
    }

    // Workspace & Auth Modals
    WorkspaceCreateModal {
        id: workspaceCreateModal
        visible: false
        onClosed: visible = false
        onWorkspaceCreated: function(name, icon, desc) {
            visible = false
        }
    }

    WorkspaceMembersModal {
        id: workspaceMembersModal
        visible: false
        onClosed: visible = false
    }

    AccountEvolutionModal {
        id: accountEvolutionModal
        visible: false
        onClosed: visible = false
    }

    ShareModal {
        id: shareModal
        visible: false
        onClosed: visible = false
    }

    ShareManagementPanel {
        id: shareManagementPanel
        visible: false
        onClosed: visible = false
    }

    ShareAccessRequestModal {
        id: shareAccessRequestModal
        visible: false
        onClosed: visible = false
    }
}
