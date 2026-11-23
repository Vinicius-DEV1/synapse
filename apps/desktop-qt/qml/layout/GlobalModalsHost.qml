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
        if (dataCtrl) {
            try {
                var json = dataCtrl.getConfig("workspaces_list", "[]")
                var activeId = dataCtrl.getConfig("workspaces_active_id", "default")
                var list = JSON.parse(json)
                var activeWs = list.find(function(w) { return w.id === activeId })
                if (activeWs) {
                    workspaceMembersModal.workspaceName = activeWs.name
                    workspaceMembersModal.membersList = activeWs.members || []
                }
            } catch (e) {}
        }
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
        if (dataCtrl) {
            try {
                var json = dataCtrl.getConfig("sharing_pages", "[]")
                shareManagementPanel.sharedPages = JSON.parse(json)
            } catch (e) {
                shareManagementPanel.sharedPages = []
            }
        }
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
        status: globalModalsHost.dataCtrl ? (globalModalsHost.dataCtrl.fileOperationRunning ? "syncing" : "idle") : "idle"
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
            if (dataCtrl) {
                try {
                    var json = dataCtrl.getConfig("workspaces_list", "[]")
                    var list = JSON.parse(json)
                    if (!Array.isArray(list)) list = []
                    var newId = "ws_" + Date.now()
                    var newWs = {
                        id: newId,
                        name: name,
                        icon: icon || "📁",
                        desc: desc || "",
                        role: "owner",
                        members: [
                            { id: "1", name: "Você (Dono)", email: "usuario@synapse.local", role: "owner" }
                        ]
                    }
                    list.push(newWs)
                    dataCtrl.setConfig("workspaces_list", JSON.stringify(list))
                    dataCtrl.setConfig("workspaces_active_id", newId)
                } catch (e) {
                    console.warn("[GlobalModalsHost] Failed to save workspace:", e.message)
                }
            }
            visible = false
        }
    }

    WorkspaceMembersModal {
        id: workspaceMembersModal
        visible: false
        onClosed: visible = false
        onInviteMemberRequested: function(email, role) {
            if (!dataCtrl) return
            try {
                var json = dataCtrl.getConfig("workspaces_list", "[]")
                var activeId = dataCtrl.getConfig("workspaces_active_id", "default")
                var list = JSON.parse(json)
                var ws = list.find(function(w) { return w.id === activeId })
                if (ws) {
                    if (!Array.isArray(ws.members)) ws.members = []
                    ws.members.push({
                        id: "m_" + Date.now(),
                        name: email.split("@")[0],
                        email: email,
                        role: role
                    })
                    dataCtrl.setConfig("workspaces_list", JSON.stringify(list))
                    workspaceMembersModal.membersList = ws.members
                }
            } catch (e) {}
        }
        onRemoveMemberRequested: function(memberId) {
            if (!dataCtrl) return
            try {
                var json = dataCtrl.getConfig("workspaces_list", "[]")
                var activeId = dataCtrl.getConfig("workspaces_active_id", "default")
                var list = JSON.parse(json)
                var ws = list.find(function(w) { return w.id === activeId })
                if (ws && Array.isArray(ws.members)) {
                    ws.members = ws.members.filter(function(m) { return m.id !== memberId })
                    dataCtrl.setConfig("workspaces_list", JSON.stringify(list))
                    workspaceMembersModal.membersList = ws.members
                }
            } catch (e) {}
        }
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
        onShareConfigured: function(pageId, permission, passwordProtected, pass) {
            if (dataCtrl) {
                try {
                    var json = dataCtrl.getConfig("sharing_pages", "[]")
                    var list = JSON.parse(json)
                    if (!Array.isArray(list)) list = []
                    var existing = list.find(function(p) { return p.id === pageId })
                    if (existing) {
                        existing.permission = permission
                        existing.passwordProtected = passwordProtected
                        existing.updatedAt = new Date().toISOString()
                    } else {
                        list.push({
                            id: pageId,
                            title: shareModal.pageTitle,
                            url: shareModal.shareUrl,
                            permission: permission,
                            passwordProtected: passwordProtected,
                            views: 0,
                            createdAt: new Date().toISOString()
                        })
                    }
                    dataCtrl.setConfig("sharing_pages", JSON.stringify(list))
                } catch (e) {}
            }
            visible = false
        }
        onShareRevoked: function(pageId) {
            if (dataCtrl) {
                try {
                    var json = dataCtrl.getConfig("sharing_pages", "[]")
                    var list = JSON.parse(json)
                    if (Array.isArray(list)) {
                        list = list.filter(function(p) { return p.id !== pageId })
                        dataCtrl.setConfig("sharing_pages", JSON.stringify(list))
                    }
                } catch (e) {}
            }
            visible = false
        }
    }

    ShareManagementPanel {
        id: shareManagementPanel
        visible: false
        onClosed: visible = false
        onRevokeRequested: function(pageId) {
            if (dataCtrl) {
                try {
                    var json = dataCtrl.getConfig("sharing_pages", "[]")
                    var list = JSON.parse(json)
                    if (Array.isArray(list)) {
                        list = list.filter(function(p) { return String(p.id) !== String(pageId) })
                        dataCtrl.setConfig("sharing_pages", JSON.stringify(list))
                        shareManagementPanel.sharedPages = list
                    }
                } catch (e) {}
            }
        }
    }

    ShareAccessRequestModal {
        id: shareAccessRequestModal
        visible: false
        onClosed: visible = false
    }
}
