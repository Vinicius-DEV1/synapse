import QtQuick 2.15

Item {
    id: bulkHost
    property var selectionController: null
    property var collections: []
    property bool isViewingArchived: false
    property bool actionsVisible: true

    LibraryBulkActionsBar {
        visible: bulkHost.actionsVisible && bulkHost.selectionController &&
                 bulkHost.selectionController.selectedBookIds.length > 0
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        anchors.leftMargin: 24
        anchors.rightMargin: 24
        anchors.bottomMargin: 20
        z: 110
        selectedCount: bulkHost.selectionController ? bulkHost.selectionController.selectedBookIds.length : 0
        collections: bulkHost.collections
        isViewingArchived: bulkHost.isViewingArchived
        onStatusRequested: function(status) { bulkHost.selectionController.updateStatus(status) }
        onArchiveRequested: function(archived) { bulkHost.selectionController.setArchived(archived) }
        onCollectionRequested: function(collectionId) { bulkHost.selectionController.assignCollection(collectionId) }
        onDeleteRequested: deleteDialog.openFor(bulkHost.selectionController.selectedBookIds.length)
        onClearRequested: bulkHost.selectionController.clear()
    }

    LibraryBulkDeleteDialog {
        id: deleteDialog
        anchors.centerIn: parent
        onConfirmed: bulkHost.selectionController.deleteSelected()
    }
}
