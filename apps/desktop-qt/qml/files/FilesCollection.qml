import QtQuick 2.15

Item {
    id: collection
    width: 0
    height: 0
    visible: false

    property var folders: []
    property var files: []
    property var allFolders: []
    property var allFiles: []
    property var visibleItems: []
    property var folderStack: []
    property var selectedIds: []
    property var focusedItem: ({})
    property var folderChoices: []
    property var navigationHistory: [{ section: "folders", folderStack: [] }]
    property int navigationIndex: 0
    property int driveCount: 0
    property string searchText: ""
    property string categoryFilter: "all"
    property string activeSection: "folders"
    property bool searchAll: false
    property string viewMode: "grid"
    property string sortBy: "name"
    property string sortOrder: "asc"
    property string selectionAnchorId: ""

    signal collectionReloaded()
    signal selectionFocusChanged()

    function activeFolderId() {
        return folderStack.length ? String(folderStack[folderStack.length - 1].id) : ""
    }

    function refresh() {
        allFolders = dataController.getAllFileFolders()
        allFiles = dataController.getFilesForSection("all", "")
        driveCount = dataController.getDriveFileCount()
        folders = activeSection === "folders" ? allFolders.filter(function(folder) {
            return String(folder.parent_id || "") === activeFolderId()
        }) : []
        files = dataController.getFilesForSection(activeSection, activeFolderId())
        rebuildItems()
        rebuildFolderChoices()
        collectionReloaded()
    }

    function rebuildFolderChoices() {
        var choices = [{ id: "", name: "Início (Raiz)", depth: 0 }]
        var visited = {}
        function appendChildren(parentId, depth) {
            if (depth > 32) return
            for (var i = 0; i < allFolders.length; i++) {
                var folder = allFolders[i]
                if (String(folder.parent_id || "") !== parentId || visited[folder.id]) continue
                visited[folder.id] = true
                choices.push({ id: String(folder.id), name: folder.name, depth: depth })
                appendChildren(String(folder.id), depth + 1)
            }
        }
        appendChildren("", 0)
        folderChoices = choices
    }

    function rebuildItems() {
        var query = searchText.trim().toLowerCase()
        var folderSource = searchAll && activeSection === "folders" ? allFolders : folders
        var fileSource = searchAll && activeSection === "folders" ? allFiles : files
        var folderItems = activeSection === "folders" ? folderSource.filter(function(folder) {
            return query.length === 0 || String(folder.name).toLowerCase().indexOf(query) !== -1
        }).map(function(folder) {
            return { kind: "folder", id: folder.id, name: folder.name, color: folder.color }
        }) : []
        var fileItems = fileSource.filter(function(file) {
            var nameMatches = query.length === 0 || String(file.name).toLowerCase().indexOf(query) !== -1
            return nameMatches && (categoryFilter === "all" || file.file_type === categoryFilter)
        }).map(function(file) {
            var item = Object.assign({}, file)
            item.kind = "file"
            return item
        })
        var combined = folderItems.concat(fileItems)
        combined.sort(function(left, right) {
            if (left.kind !== right.kind) return left.kind === "folder" ? -1 : 1
            var result = 0
            if (sortBy === "size") result = Number(left.file_size || 0) - Number(right.file_size || 0)
            else if (sortBy === "type") result = String(left.file_type || "folder").localeCompare(String(right.file_type || "folder"))
            else if (sortBy === "updated_at") result = String(left.updated_at || "").localeCompare(String(right.updated_at || ""))
            else result = String(left.name || "").localeCompare(String(right.name || ""), undefined, { sensitivity: "base" })
            return sortOrder === "asc" ? result : -result
        })
        visibleItems = combined
    }

    function itemById(itemId) {
        for (var i = 0; i < visibleItems.length; i++) {
            if (String(visibleItems[i].id) === String(itemId)) return visibleItems[i]
        }
        return null
    }

    function anyFileItemById(itemId) {
        for (var i = 0; i < allFiles.length; i++) {
            if (String(allFiles[i].id) === String(itemId)) return Object.assign({ kind: "file" }, allFiles[i])
        }
        for (var folderIndex = 0; folderIndex < allFolders.length; folderIndex++) {
            if (String(allFolders[folderIndex].id) === String(itemId)) return Object.assign({ kind: "folder" }, allFolders[folderIndex])
        }
        return null
    }

    function selectItem(itemId, isFolder, modifiers) {
        var current = itemById(itemId)
        if (!current) return
        focusedItem = current
        if (modifiers & Qt.ShiftModifier && selectionAnchorId.length > 0) {
            var start = -1
            var end = -1
            for (var i = 0; i < visibleItems.length; i++) {
                if (String(visibleItems[i].id) === selectionAnchorId) start = i
                if (String(visibleItems[i].id) === String(itemId)) end = i
            }
            if (start >= 0 && end >= 0) {
                var low = Math.min(start, end)
                var high = Math.max(start, end)
                var range = []
                for (var j = low; j <= high; j++) range.push(String(visibleItems[j].id))
                selectedIds = range
                selectionFocusChanged()
                return
            }
        }
        if (modifiers & (Qt.ControlModifier | Qt.MetaModifier)) {
            var next = selectedIds.slice()
            var selectedIndex = next.indexOf(String(itemId))
            if (selectedIndex === -1) next.push(String(itemId))
            else next.splice(selectedIndex, 1)
            selectedIds = next
        } else {
            selectedIds = [String(itemId)]
            selectionAnchorId = String(itemId)
        }
        selectionFocusChanged()
    }

    function selectAllItems() {
        selectedIds = visibleItems.map(function(item) { return String(item.id) })
    }

    function clearSelection() {
        selectedIds = []
        selectionAnchorId = ""
        focusedItem = ({})
        selectionFocusChanged()
    }

    function recordNavigation(section, stack) {
        var nextStack = stack.slice()
        var current = navigationHistory[navigationIndex]
        var same = current && current.section === section && current.folderStack.length === nextStack.length
        if (same) {
            for (var i = 0; i < nextStack.length; i++) {
                if (String(current.folderStack[i].id) !== String(nextStack[i].id)) { same = false; break }
            }
        }
        if (same) return
        var nextHistory = navigationHistory.slice(0, navigationIndex + 1)
        nextHistory.push({ section: section, folderStack: nextStack })
        navigationHistory = nextHistory
        navigationIndex = nextHistory.length - 1
    }

    function navigateHistory(nextIndex) {
        if (nextIndex < 0 || nextIndex >= navigationHistory.length || nextIndex === navigationIndex) return
        navigationIndex = nextIndex
        var entry = navigationHistory[navigationIndex]
        activeSection = entry.section
        folderStack = entry.folderStack.slice()
        clearSelection()
        refresh()
    }

    function goUpOneLevel() {
        if (activeSection !== "folders" || folderStack.length === 0) return
        var nextStack = folderStack.slice(0, -1)
        folderStack = nextStack
        recordNavigation("folders", nextStack)
        clearSelection()
        refresh()
    }

    function openSection(section) {
        activeSection = section
        folderStack = []
        searchAll = false
        recordNavigation(section, [])
        clearSelection()
        refresh()
    }

    function navigateToFolder(folderId) {
        var chain = []
        var cursor = String(folderId || "")
        var visited = {}
        while (cursor.length > 0 && !visited[cursor] && chain.length < 32) {
            visited[cursor] = true
            var found = null
            for (var i = 0; i < allFolders.length; i++) {
                if (String(allFolders[i].id) === cursor) { found = allFolders[i]; break }
            }
            if (!found) break
            chain.unshift({ id: String(found.id), name: found.name })
            cursor = String(found.parent_id || "")
        }
        activeSection = "folders"
        folderStack = chain
        recordNavigation("folders", chain)
        clearSelection()
        refresh()
    }

    function sortByColumn(key) {
        if (sortBy === key) sortOrder = sortOrder === "asc" ? "desc" : "asc"
        else {
            sortBy = key
            sortOrder = "asc"
        }
    }

    function openFolder(folderId) {
        var folder = anyFileItemById(folderId)
        if (folder && folder.kind === "folder") navigateToFolder(folder.id)
    }

    onSearchTextChanged: rebuildItems()
    onSearchAllChanged: rebuildItems()
    onCategoryFilterChanged: rebuildItems()
    onSortByChanged: rebuildItems()
    onSortOrderChanged: rebuildItems()

    Component.onCompleted: refresh()

    Connections {
        target: dataController
        function onFilesChanged() { collection.refresh() }
    }
}
