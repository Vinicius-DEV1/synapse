import QtQuick 2.15

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
}
