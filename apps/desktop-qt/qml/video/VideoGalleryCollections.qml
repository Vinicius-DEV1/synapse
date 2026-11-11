import QtQuick 2.15

QtObject {
    id: collectionsModel
    property var controller: null
    property var folders: []
    property var names: [{ id: "__all__", name: "Todos", managed: false }]

    function entryForId(id) {
        for (var i = 0; i < names.length; ++i) {
            if (names[i].id === id) return names[i]
        }
        return { id: "", name: "", managed: false }
    }

    function folderNameForId(id) {
        return entryForId(id).name
    }

    function managedFolderIdForSelection(id) {
        var entry = entryForId(id)
        return entry.managed ? entry.id : ""
    }

    function importVideo(sourcePath, selectedId) {
        var folderName = selectedId === "__all__" ? "" : folderNameForId(selectedId)
        controller.importVideo(sourcePath, folderName, managedFolderIdForSelection(selectedId))
    }

    function loadVideos(selectedName) {
        if (!controller) return []
        folders = controller.getVideoFolders()
        var nextNames = [{ id: "__all__", name: "Todos", managed: false }]
        for (var f = 0; f < folders.length; ++f) {
            nextNames.push({ id: folders[f].id, name: folders[f].name, managed: true })
        }
        var legacyCollections = controller.getVideoCollections()
        for (var i = 0; i < legacyCollections.length; ++i) {
            var name = legacyCollections[i].collection_name
            var id = legacyCollections[i].collection_id || "legacy:" + name
            var exists = false
            for (var j = 0; j < nextNames.length; ++j) {
                if (nextNames[j].id === id) { exists = true; break }
            }
            if (!exists) nextNames.push({ id: id, name: name, managed: !!legacyCollections[i].collection_id })
        }
        names = nextNames
        return controller.getVideos(selectedName === "__all__" ? "" : selectedName)
    }

    function saveFolder(folderId, newName, selectedId, selectedName) {
        if (folderId.length === 0) {
            var created = controller.createVideoFolder(newName)
            return created.id
                ? { success: true, selectedId: selectedId, selectedName: selectedName, message: "Pasta criada." }
                : { success: false, selectedId: selectedId, selectedName: selectedName, message: "Não foi possível criar a pasta." }
        }

        if (!controller.renameVideoFolder(folderId, newName)) {
            return { success: false, selectedId: selectedId, selectedName: selectedName, message: "Não foi possível renomear a pasta." }
        }
        return {
            success: true,
            selectedId: selectedId,
            selectedName: selectedId === folderId ? newName : selectedName,
            message: "Pasta renomeada."
        }
    }

    function removeFolder(folderId, selectedId, selectedName) {
        if (!controller.deleteVideoFolder(folderId)) {
            return { success: false, selectedId: selectedId, selectedName: selectedName, message: "Não foi possível excluir a pasta." }
        }
        return {
            success: true,
            selectedId: selectedId === folderId ? "__all__" : selectedId,
            selectedName: selectedId === folderId ? "Todos" : selectedName,
            message: "Pasta excluída; os vídeos voltaram para a raiz."
        }
    }

    function moveVideo(videoId, folderId) {
        if (!controller.moveVideoToFolder(videoId, folderId)) {
            return { success: false, message: "Não foi possível mover o vídeo." }
        }
        return {
            success: true,
            message: folderId.length === 0 ? "Vídeo movido para a raiz." : "Vídeo movido para a pasta."
        }
    }
}
