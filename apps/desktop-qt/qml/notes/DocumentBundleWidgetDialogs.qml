pragma ComponentBehavior: Bound
import QtQuick 2.15

Item {
    id: dialogsRoot
    property var controller: null
    property string bundleTitle: qsTr("Documentos")
    property string groupColor: "default"
    property var bundleItems: []
    property var looseFileItems: []
    property bool itemsInvalid: false
    property bool managerOpen: false
    property bool pickerOpen: false
    property bool deleteConfirmationOpen: false
    property string deleteActionError: ""

    signal managerClosed()
    signal managerItemsReordered(var nextItems)
    signal managerTitleUpdateRequested(string nextTitle)
    signal addFilesRequested()
    signal itemUngroupRequested(string fileId, var bundledItems, string groupColor)
    signal itemRemovalRequested(string fileId, bool moveToTrash)
    signal absorbLooseFileRequested(var sourceBlockPath, string fileId)
    signal ungroupAllRequested(var bundledItems, string groupColor)
    signal fileSelected(var fileItem)
    signal pickerClosed()
    signal unlinkRequested()
    signal ungroupRequested(var bundledItems, string groupColor)
    signal deleteDialogDismissed()

    function setManagerActionError(message) {
        bundleManagerDialog.setActionError(message)
    }

    function openItemRemoval(fileId, itemName) {
        bundleManagerDialog.openItemRemoval(fileId, itemName)
    }

    DocumentBundleManagerDialog {
        id: bundleManagerDialog
        controller: dialogsRoot.controller
        isOpen: dialogsRoot.managerOpen && !dialogsRoot.itemsInvalid
        bundleTitle: dialogsRoot.bundleTitle
        groupColor: dialogsRoot.groupColor
        bundleItems: dialogsRoot.bundleItems
        looseFileItems: dialogsRoot.looseFileItems
        onCloseRequested: dialogsRoot.managerClosed()
        onItemsReordered: function(nextItems) { dialogsRoot.managerItemsReordered(nextItems) }
        onTitleUpdateRequested: function(nextTitle) { dialogsRoot.managerTitleUpdateRequested(nextTitle) }
        onAddFilesRequested: dialogsRoot.addFilesRequested()
        onAbsorbLooseFileRequested: function(sourceBlockPath, fileId) {
            dialogsRoot.absorbLooseFileRequested(sourceBlockPath, fileId)
        }
        onItemUngroupRequested: function(fileId) {
            dialogsRoot.itemUngroupRequested(fileId, dialogsRoot.bundleItems, dialogsRoot.groupColor)
        }
        onItemRemovalRequested: function(fileId, moveToTrash) {
            dialogsRoot.itemRemovalRequested(fileId, moveToTrash)
        }
        onUngroupAllRequested: dialogsRoot.ungroupAllRequested(
                                   dialogsRoot.bundleItems, dialogsRoot.groupColor)
    }

    DocumentBundleModal {
        controller: dialogsRoot.controller
        isOpen: dialogsRoot.pickerOpen && !dialogsRoot.itemsInvalid
        existingIds: dialogsRoot.bundleItems.map(function(item) { return item.fileId || item.id || "" })
        onFileSelected: function(fileItem) { dialogsRoot.fileSelected(fileItem) }
        onClosed: dialogsRoot.pickerClosed()
    }

    DocumentBundleDeleteDialog {
        isOpen: dialogsRoot.deleteConfirmationOpen
        bundleTitle: dialogsRoot.bundleTitle
        errorMessage: dialogsRoot.deleteActionError
        itemCount: dialogsRoot.bundleItems.length
        itemsInvalid: dialogsRoot.itemsInvalid
        onUnlinkRequested: dialogsRoot.unlinkRequested()
        onUngroupRequested: dialogsRoot.ungroupRequested(
                                dialogsRoot.bundleItems, dialogsRoot.groupColor)
        onDismissed: dialogsRoot.deleteDialogDismissed()
    }
}
