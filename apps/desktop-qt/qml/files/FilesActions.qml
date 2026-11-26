import QtQuick 2.15

Item {
    id: actions
    width: 0
    height: 0
    visible: false

    property var collection
    property var dialogs
    property var linkDialogs
    property var previewOverlay
    property var importQueue: []
    property var clipboardItems: []
    property string clipboardOperation: ""
    property string feedbackText: ""
    property var linkedNotes: []
    property bool inspectorOpen: false
    property bool previewOpen: false

    function enqueueImports(urls) {
        importQueue = urls.slice()
        importNext()
    }

    function importNext() {
        if (importQueue.length === 0) return
        dataController.importLocalFile(importQueue[0].toLocalFile(), collection.activeFolderId())
    }

    function openFileDetails(fileId) {
        var item = collection.anyFileItemById(fileId)
        if (!item || item.kind !== "file") return
        collection.focusedItem = item
        collection.selectionFocusChanged()
        inspectorOpen = true
    }

    function itemsForSelection(fallbackItem) {
        var activeFallback = fallbackItem || (collection.focusedItem && collection.focusedItem.id ? collection.focusedItem : null)
        var ids = collection.selectedIds.length > 0
                  ? collection.selectedIds
                  : (activeFallback ? [String(activeFallback.id)] : [])
        if (activeFallback && collection.selectedIds.indexOf(String(activeFallback.id)) === -1) {
            ids = [String(activeFallback.id)]
        }
        var items = []
        for (var i = 0; i < ids.length; i++) {
            var item = collection.anyFileItemById(ids[i])
            if (item) items.push({ id: String(item.id), isFolder: item.kind === "folder" })
        }
        return items
    }

    function requestDelete(item) {
        var items = item ? itemsForSelection(item) : itemsForSelection(null)
        if (items.length > 0) dialogs.openDelete(items)
    }

    function requestMove(item) {
        var items = item ? itemsForSelection(item) : itemsForSelection(null)
        if (items.length === 0) return
        var preferredFolder = collection.activeSection === "folders" ? collection.activeFolderId() : ""
        dialogs.openMove(items, collection.folderChoices, preferredFolder)
    }

    function setClipboard(operation, item) {
        clipboardItems = itemsForSelection(item)
        if (operation === "copy") {
            clipboardItems = clipboardItems.filter(function(entry) { return !entry.isFolder })
        }
        clipboardOperation = clipboardItems.length > 0 ? operation : ""
        feedbackText = clipboardItems.length > 0
            ? (operation === "copy" ? "Itens copiados." : "Itens recortados. Navegue até o destino e pressione Ctrl+V.")
            : "Selecione arquivos para copiar ou arquivos e pastas para recortar."
    }

    function pasteClipboard() {
        if (clipboardItems.length === 0 || clipboardOperation.length === 0) return
        var targetFolder = collection.activeSection === "folders" ? collection.activeFolderId() : ""
        if (clipboardOperation === "copy") {
            var ids = clipboardItems.map(function(item) { return item.id })
            var copied = dataController.duplicateFiles(ids, targetFolder)
            feedbackText = copied.length === ids.length
                ? (copied.length === 1 ? "Cópia criada." : copied.length + " cópias criadas.")
                : "Não foi possível copiar todos os arquivos."
        } else {
            var moved = dataController.moveFileItems(clipboardItems, targetFolder)
            feedbackText = moved ? (clipboardItems.length === 1 ? "Item movido." : "Itens movidos.")
                                 : "Não foi possível mover a seleção para essa pasta."
            if (moved) {
                clipboardItems = []
                clipboardOperation = ""
            }
        }
    }

    function handleItemMenuAction(action, item) {
        if (action === "open") { collection.openFolder(item.id); return }
        if (action === "preview") { previewFile(item.id); return }
        if (action === "export") { dialogs.openExport(item.id); return }
        if (action === "link") { linkDialogs.openLink(item.id, dataController.getPages("")); return }
        if (action === "links") {
            linkDialogs.openLinks(dataController.getFileLinksByFile(item.id))
            return
        }
        if (action === "details") { dialogs.openFileInfo(item); return }
        if (action === "ai") { dialogs.openDocumentAi(item); return }
        if (action === "audio") { dialogs.openAudioPlayer(item); return }
        if (action === "copy" || action === "cut") { setClipboard(action, item); return }
        if (action === "move") { requestMove(item); return }
        if (action === "rename") { dialogs.openRename(item.id, item.name, item.kind === "folder"); return }
        if (action === "trash") requestDelete(item)
    }

    function previewFile(fileId) {
        previewOverlay.previewName = ""
        previewOverlay.previewFileId = fileId
        previewOverlay.previewError = ""
        previewOverlay.previewText = ""
        previewOverlay.previewPdfPage = 1
        previewOverlay.previewPdfImageUrl = ""
        previewOverlay.loading = true
        previewOpen = true
        dataController.previewLocalFile(fileId)
    }

    function closePreview(alreadyInvalidated) {
        if (previewOverlay.loading) dataController.cancelFilePreview()
        if (previewOverlay.previewPdfImagePath.length > 0 && !alreadyInvalidated) {
            dataController.closeLibraryBook(previewOverlay.previewPdfImagePath)
        }
        if (previewOverlay.previewPath.length > 0 && !alreadyInvalidated) {
            dataController.closeFilePreview(previewOverlay.previewPath)
        }
        previewOverlay.stopVideo()
        previewOverlay.previewPath = ""
        previewOverlay.previewUrl = ""
        previewOverlay.previewName = ""
        previewOverlay.previewFileId = ""
        previewOverlay.previewType = ""
        previewOverlay.previewText = ""
        previewOverlay.previewError = ""
        previewOverlay.previewPdfPage = 1
        previewOverlay.previewPdfImageUrl = ""
        previewOverlay.previewPdfImagePath = ""
        previewOverlay.loading = false
        previewOpen = false
    }

    function handleDialogDelete(items) {
        var ok = dataController.trashFileItems(items)
        feedbackText = ok ? "Selected items moved to trash." : "Could not move all selected items to trash."
        collection.clearSelection()
    }

    function handleDialogMove(items, folderId) {
        var ok = dataController.moveFileItems(items, folderId)
        feedbackText = ok ? "Items moved." : "Could not move the selection to that folder."
        if (ok && clipboardOperation === "cut") {
            clipboardItems = []
            clipboardOperation = ""
        }
        collection.clearSelection()
    }

    Connections {
        target: collection
        function onCollectionReloaded() {
            if (collection.focusedItem && collection.focusedItem.kind === "file") {
                actions.linkedNotes = dataController.getFileLinksByFile(String(collection.focusedItem.id))
                linkDialogs.linkedNotes = actions.linkedNotes
            }
        }
        function onSelectionFocusChanged() {
            actions.linkedNotes = collection.focusedItem && collection.focusedItem.kind === "file"
                                  ? dataController.getFileLinksByFile(String(collection.focusedItem.id)) : []
        }
    }

    Connections {
        target: dialogs
        function onImportsRequested(urls) { actions.enqueueImports(urls) }
        function onExportRequested(fileId, destinationPath) { dataController.exportLocalFile(fileId, destinationPath) }
        function onFolderCreateRequested(name, parentId) {
            var id = dataController.createFileFolder(name, parentId)
            actions.feedbackText = id ? "Folder created." : "Could not create the folder."
        }
        function onRenameRequested(id, isFolder, name) {
            var ok = isFolder ? dataController.renameFileFolder(id, name) : dataController.renameFile(id, name)
            actions.feedbackText = ok ? "Item renamed." : "Could not rename the item."
        }
        function onDeleteRequested(items) { actions.handleDialogDelete(items) }
        function onMoveRequested(items, folderId) { actions.handleDialogMove(items, folderId) }
    }

    Connections {
        target: linkDialogs
        function onLinkRequested(fileId, pageId) {
            var linkId = dataController.createFilePageLink(fileId, pageId, "link", "")
            actions.feedbackText = linkId ? "File linked to note." : "Could not link the file to that note."
            actions.linkedNotes = dataController.getFileLinksByFile(fileId)
            linkDialogs.linkedNotes = actions.linkedNotes
        }
        function onUnlinkRequested(linkId) {
            dataController.deleteFilePageLink(linkId)
            if (collection.focusedItem && collection.focusedItem.id) {
                actions.linkedNotes = dataController.getFileLinksByFile(String(collection.focusedItem.id))
                linkDialogs.linkedNotes = actions.linkedNotes
            }
        }
    }

    Connections {
        target: dataController
        function onFileOperationFinished(result) {
            if (String(result.requestId || "").indexOf("notes-text-save-") === 0) return
            if (result.operation === "import" && actions.importQueue.length > 0) {
                actions.feedbackText = result.success ? "Encrypted and imported: " + result.name : result.error || "File operation failed."
                actions.importQueue = actions.importQueue.slice(1)
                if (actions.importQueue.length > 0) Qt.callLater(actions.importNext)
                return
            }
            actions.feedbackText = result.success
                ? (result.name ? "Exported: " + result.name : "File operation complete.")
                : (result.error || "File operation failed.")
        }
        function onFilePreviewReady(result) {
            var requestId = String(result.request_id || "")
            if (requestId.indexOf("notes-audio-") === 0 || requestId.indexOf("notes-viewer-") === 0) return
            if (result.cancelled) return
            previewOverlay.loading = false
            if (!result.success) {
                actions.previewOpen = false
                previewOverlay.previewError = result.error || "Could not open the file preview."
                actions.feedbackText = previewOverlay.previewError
                return
            }
            previewOverlay.previewPath = result.path || ""
            previewOverlay.previewUrl = result.url || ""
            previewOverlay.previewName = result.name || ""
            previewOverlay.previewType = result.file_type || "other"
            actions.previewOpen = true
            if (previewOverlay.previewType === "text" || previewOverlay.previewType === "code") {
                var textResult = dataController.readFilePreviewText(previewOverlay.previewPath)
                if (textResult.success) previewOverlay.previewText = textResult.text || ""
                else previewOverlay.previewError = textResult.error || "Could not read the text preview."
            } else if (previewOverlay.previewType === "pdf" && previewOverlay.previewPath.length > 0) {
                dataController.renderLibraryPdfPage(previewOverlay.previewPath, 1, 960)
            }
        }
        function onFilePreviewsInvalidated() { actions.closePreview(true) }
    }
}
