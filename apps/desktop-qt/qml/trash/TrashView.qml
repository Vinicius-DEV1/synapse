import QtQuick 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: trashRoot
    color: "#0f0e17" // bg-dark-bg

    property var allTrashItems: []
    property var filteredTrashItems: []
    property string activeTypeFilter: "all"
    property string searchQuery: ""
    property bool isHelpOpen: false
    property string pendingDeleteId: ""
    property string pendingDeleteType: ""

    function refreshTrash() {
        allTrashItems = dataController.getTrashItems()
        applyFilters()
    }

    function applyFilters() {
        var q = searchQuery.trim().toLowerCase()
        var res = []
        for (var i = 0; i < allTrashItems.length; i++) {
            var it = allTrashItems[i]
            var matchType = true
            if (activeTypeFilter !== "all") {
                matchType = (it.item_type === activeTypeFilter)
            }
            var matchSearch = true
            if (q.length > 0) {
                var title = (it.title || "").toLowerCase()
                matchSearch = (title.indexOf(q) !== -1)
            }
            if (matchType && matchSearch) {
                res.push(it)
            }
        }
        filteredTrashItems = res
    }

    Component.onCompleted: {
        refreshTrash()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 20

        // Header
        TrashHeaderSection {
            allCount: trashRoot.allTrashItems.length
            onEmptyTrashRequested: emptyConfirmModal.visible = true
            onHelpRequested: trashRoot.isHelpOpen = true
        }

        // Filter Tabs & Search Bar Row
        TrashFilterBar {
            activeTypeFilter: trashRoot.activeTypeFilter
            searchQuery: trashRoot.searchQuery

            onFilterSelected: function(key) {
                trashRoot.activeTypeFilter = key
                trashRoot.applyFilters()
            }
            onSearchChanged: function(query) {
                trashRoot.searchQuery = query
                trashRoot.applyFilters()
            }
        }

        // Trash Items ListView
        TrashItemsList {
            items: trashRoot.filteredTrashItems

            onRestoreRequested: function(id, itemType) {
                dataController.restoreTrashItem(id, itemType)
                trashRoot.refreshTrash()
            }
            onDeletePermanentlyRequested: function(id, itemType) {
                trashRoot.pendingDeleteId = id
                trashRoot.pendingDeleteType = itemType
                singleDeleteConfirm.open()
            }
        }
    }

    AppConfirmDialog {
        id: singleDeleteConfirm
        anchors.centerIn: parent
        titleText: qsTr("Excluir Permanentemente")
        messageText: qsTr("Tem certeza que deseja excluir este item permanentemente? Esta ação não pode ser desfeita.")
        confirmLabel: qsTr("Excluir")
        isDestructive: true
        onConfirmed: {
            if (trashRoot.pendingDeleteId.length > 0) {
                dataController.deleteTrashItemPermanently(trashRoot.pendingDeleteId, trashRoot.pendingDeleteType)
                trashRoot.refreshTrash()
            }
            trashRoot.pendingDeleteId = ""
            trashRoot.pendingDeleteType = ""
        }
    }

    // Modal de Confirmação: Esvaziar Lixeira
    EmptyTrashModal {
        id: emptyConfirmModal
        onConfirmed: {
            dataController.emptyTrash()
            trashRoot.refreshTrash()
        }
    }

    TrashHelpDialog {
        isOpen: trashRoot.isHelpOpen
        onClosed: trashRoot.isHelpOpen = false
    }

    Shortcut {
        sequence: "Escape"
        enabled: trashRoot.isHelpOpen || emptyConfirmModal.visible
        onActivated: {
            if (trashRoot.isHelpOpen) trashRoot.isHelpOpen = false
            else if (emptyConfirmModal.visible) emptyConfirmModal.visible = false
        }
    }
}
