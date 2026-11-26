pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Layouts 1.15
import "DocumentBundleOperations.js" as DocumentBundleOperations
import "NotesColorUtils.js" as NotesColorUtils

Rectangle {
    id: bundleWidgetRoot
    Layout.fillWidth: true
    implicitHeight: widgetBody.implicitHeight
    radius: 8

    property var blockData: ({})
    property var controller: null
    property var looseFileItems: []
    property bool managerInitiallyOpen: false
    property var attrs: blockData.attrs || ({})
    property string title: attrs["data-title"] || attrs["title"] || qsTr("Documentos")
    property string accentColor: attrs["data-color"] || attrs["color"] || "default"
    function parseBundleItems() {
        var result = DocumentBundleOperations.parseBundleItems(attrs)
        if (!result.valid) {
            var message = "[Notes:DocumentBundle] " + result.error
            if (result.details) console.warn(message, result.details)
            else console.warn(message)
        }
        return result
    }
    property var itemsState: parseBundleItems()
    property var items: itemsState.items
    property bool itemsInvalid: !itemsState.valid
    property var uniqueExtensions: DocumentBundleOperations.uniqueFileExtensions(items)
    property bool renaming: false
    property bool showColorPicker: false
    property bool expanded: false
    property bool managerOpen: false
    property bool isModalOpen: false
    property bool deleteDialogOpen: false
    property string deleteActionError: ""
    property bool autoOpenConsumed: false
    property bool isDestroying: false

    Component.onCompleted: {
        if (managerInitiallyOpen) managerOpen = true
        if (!autoOpenConsumed && !itemsInvalid && (attrs["data-auto-open"] || "") === "true" && items.length === 0) {
            autoOpenConsumed = true
            isModalOpen = true
        }
    }

    Component.onDestruction: isDestroying = true

    onManagerInitiallyOpenChanged: {
        if (managerInitiallyOpen) managerOpen = true
    }

    readonly property bool hasCustomColor: accentColor.length > 0 && accentColor !== "default"

    color: hasCustomColor
        ? NotesColorUtils.withHexAlpha(accentColor, "18")
        : (hoverHandler.hovered ? "#338b5cf6" : "#1a8b5cf6")
    border.color: hasCustomColor
        ? (hoverHandler.hovered ? accentColor : NotesColorUtils.withHexAlpha(accentColor, "60"))
        : "#338b5cf6"
    border.width: activeFocus ? 2 : 1
    Behavior on color { ColorAnimation { duration: 150 } }
    Behavior on border.color { ColorAnimation { duration: 150 } }

    signal attrsUpdated(var newAttrs)
    signal pageOpenRequested(string pageId)
    signal unlinkRequested(string fileIdToTrashAfterSave)
    signal localFileTrashAfterSaveRequested(string fileId)
    signal ungroupRequested(var bundledItems, string groupColor)
    signal ungroupItemRequested(string fileId, var bundledItems, string groupColor)
    signal absorbLooseFileRequested(var sourceBlockPath, string fileId)
    signal managerOpenStateRequested(string blockId, bool isOpen)
    signal filePreviewRequested(string fileId, string fileName, bool showOpenActions, bool playAudio)

    Keys.priority: Keys.BeforeItem
    Keys.onPressed: function(event) {
        if (event.modifiers !== Qt.NoModifier || bundleWidgetRoot.renaming ||
                bundleWidgetRoot.isModalOpen || bundleWidgetRoot.deleteDialogOpen ||
                bundleWidgetRoot.managerOpen) return
        if (event.key === Qt.Key_Delete || event.key === Qt.Key_Backspace) {
            event.accepted = true
            bundleWidgetRoot.requestDeleteConfirmation()
        }
    }

    HoverHandler { id: hoverHandler }

    function saveBundle(nextTitle, nextColor, nextItems) {
        if (itemsInvalid) return false
        var next = Object.assign({}, attrs)
        next["data-type"] = "document-bundle"
        next["data-title"] = nextTitle
        if (nextColor && nextColor !== "default") next["data-color"] = nextColor
        else delete next["data-color"]
        delete next["data-auto-open"]
        next["data-items"] = JSON.stringify(nextItems)
        attrsUpdated(next)
        return true
    }

    function requestDeleteConfirmation() {
        deleteActionError = ""
        deleteDialogOpen = true
    }

    function setDeleteActionError(message) {
        deleteActionError = String(message || "")
    }

    function setManagerActionError(message) {
        widgetDialogs.setManagerActionError(message)
    }

    function setManagerOpen(nextOpen) {
        managerOpen = nextOpen
        if (!isDestroying)
            managerOpenStateRequested(String(blockData.id || ""), nextOpen)
    }

    function handleBundleItemRemoval(fileId, moveToTrash) {
        widgetDialogs.setManagerActionError("")
        if (itemsInvalid) {
            widgetDialogs.setManagerActionError(qsTr("Os dados do agrupamento são inválidos e foram mantidos."))
            return
        }
        var targetId = String(fileId || "")
        var fileIndex = items.findIndex(function(item) {
            return String(item.fileId || item.id || "") === targetId
        })
        if (!targetId || fileIndex < 0) {
            widgetDialogs.setManagerActionError(qsTr("Este arquivo não está mais neste agrupamento."))
            return
        }
        var nextItems = items.filter(function(item) {
            return String(item.fileId || item.id || "") !== targetId
        })
        if (nextItems.length === 0) {
            unlinkRequested(moveToTrash ? targetId : "")
            return
        }
        if (!saveBundle(title, accentColor, nextItems)) {
            widgetDialogs.setManagerActionError(qsTr("Não foi possível atualizar o agrupamento. O arquivo não foi removido dele."))
            return
        }
        if (moveToTrash)
            localFileTrashAfterSaveRequested(targetId)
    }

    DocumentBundleWidgetBody {
        id: widgetBody
        anchors.fill: parent
        items: bundleWidgetRoot.items
        uniqueExtensions: bundleWidgetRoot.uniqueExtensions
        title: bundleWidgetRoot.title
        accentColor: bundleWidgetRoot.accentColor
        itemsInvalid: bundleWidgetRoot.itemsInvalid
        renaming: bundleWidgetRoot.renaming
        expanded: bundleWidgetRoot.expanded
        showColorPicker: bundleWidgetRoot.showColorPicker
        pointerHovered: hoverHandler.hovered
        onTitleClicked: {
            bundleWidgetRoot.forceActiveFocus()
            bundleWidgetRoot.expanded = !bundleWidgetRoot.expanded
        }
        onFilePreviewRequested: function(fileId, fileName) {
            bundleWidgetRoot.filePreviewRequested(fileId, fileName, false, false)
        }
        onRenameRequested: {
            if (bundleWidgetRoot.itemsInvalid) return
            bundleWidgetRoot.renaming = true
        }
        onTitleSaveRequested: function(nextTitle) {
            bundleWidgetRoot.renaming = false
            bundleWidgetRoot.saveBundle(nextTitle, bundleWidgetRoot.accentColor, bundleWidgetRoot.items)
        }
        onRenameCanceled: bundleWidgetRoot.renaming = false
        onColorPickerToggled: bundleWidgetRoot.showColorPicker = !bundleWidgetRoot.showColorPicker
        onColorSelected: function(nextColor) {
            bundleWidgetRoot.showColorPicker = false
            bundleWidgetRoot.saveBundle(bundleWidgetRoot.title, nextColor, bundleWidgetRoot.items)
        }
        onColorPickerDismissed: bundleWidgetRoot.showColorPicker = false
        onManagerRequested: {
            bundleWidgetRoot.deleteActionError = ""
            bundleWidgetRoot.setManagerOpen(true)
        }
        onExpandedToggled: bundleWidgetRoot.expanded = !bundleWidgetRoot.expanded
        onAddRequested: bundleWidgetRoot.isModalOpen = true
        onDeleteRequested: bundleWidgetRoot.requestDeleteConfirmation()
        onRemoveItemRequested: function(fileId, itemName) {
            bundleWidgetRoot.setManagerOpen(true)
            Qt.callLater(function() { widgetDialogs.openItemRemoval(fileId, itemName) })
        }
    }

    DocumentBundleWidgetDialogs {
        id: widgetDialogs
        anchors.fill: parent
        controller: bundleWidgetRoot.controller
        bundleTitle: bundleWidgetRoot.title
        groupColor: bundleWidgetRoot.accentColor
        bundleItems: bundleWidgetRoot.items
        looseFileItems: bundleWidgetRoot.looseFileItems
        itemsInvalid: bundleWidgetRoot.itemsInvalid
        managerOpen: bundleWidgetRoot.managerOpen
        pickerOpen: bundleWidgetRoot.isModalOpen
        deleteConfirmationOpen: bundleWidgetRoot.deleteDialogOpen
        deleteActionError: bundleWidgetRoot.deleteActionError
        onManagerClosed: {
            if (!bundleWidgetRoot.isDestroying)
                bundleWidgetRoot.setManagerOpen(false)
        }
        onManagerItemsReordered: function(nextItems) {
            bundleWidgetRoot.saveBundle(bundleWidgetRoot.title, bundleWidgetRoot.accentColor, nextItems)
        }
        onManagerTitleUpdateRequested: function(nextTitle) {
            bundleWidgetRoot.saveBundle(nextTitle, bundleWidgetRoot.accentColor, bundleWidgetRoot.items)
        }
        onFilePreviewRequested: function(fileId, fileName) {
            bundleWidgetRoot.filePreviewRequested(fileId, fileName, false, false)
        }
        onAddFilesRequested: {
            bundleWidgetRoot.setManagerOpen(false)
            Qt.callLater(function() { bundleWidgetRoot.isModalOpen = true })
        }
        onItemUngroupRequested: function(fileId, items, color) {
            bundleWidgetRoot.ungroupItemRequested(fileId, items, color)
        }
        onItemRemovalRequested: function(fileId, moveToTrash) {
            bundleWidgetRoot.handleBundleItemRemoval(fileId, moveToTrash)
        }
        onAbsorbLooseFileRequested: function(sourceBlockPath, fileId) {
            bundleWidgetRoot.absorbLooseFileRequested(sourceBlockPath, fileId)
        }
        onUngroupAllRequested: function(items, color) {
            bundleWidgetRoot.ungroupRequested(items, color)
        }
        onFileSelected: function(fileItem) {
            if (bundleWidgetRoot.itemsInvalid) {
                bundleWidgetRoot.isModalOpen = false
                return
            }
            var next = bundleWidgetRoot.items.slice()
            var exists = next.some(function(item) { return (item.fileId || item.id) === fileItem.id })
            if (!exists) {
                next.push({ id: fileItem.id, fileId: fileItem.id, name: fileItem.name || "Documento",
                    fileType: fileItem.file_type || "doc", fileSize: Number(fileItem.file_size || 0) })
                bundleWidgetRoot.saveBundle(bundleWidgetRoot.title, bundleWidgetRoot.accentColor, next)
            }
            bundleWidgetRoot.isModalOpen = false
        }
        onPickerClosed: {
            bundleWidgetRoot.isModalOpen = false
            if ((bundleWidgetRoot.attrs["data-auto-open"] || "") === "true") {
                var cleanedAttrs = Object.assign({}, bundleWidgetRoot.attrs)
                delete cleanedAttrs["data-auto-open"]
                bundleWidgetRoot.attrsUpdated(cleanedAttrs)
            }
        }
        onUnlinkRequested: bundleWidgetRoot.unlinkRequested("")
        onUngroupRequested: function(items, color) { bundleWidgetRoot.ungroupRequested(items, color) }
        onDeleteDialogDismissed: {
            bundleWidgetRoot.deleteDialogOpen = false
            bundleWidgetRoot.deleteActionError = ""
        }
    }

}
