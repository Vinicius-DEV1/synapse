import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: cultureRoot
    color: "#0f0e17" // bg-dark-bg

    property var allItems: []
    property var filteredItems: []
    property string activeTypeFilter: "all" // "all", "anime", "série", "filme"
    property string activeStatusFilter: "all" // "all", "watching", "backlog", "finished"
    property string searchQuery: ""
    property bool isCreatingItem: false
    property var editingItem: null
    property var selectedItemForDetails: null
    property var selectedItemForEpisodes: null
    property var currentEpisodes: []

    function refreshItems() {
        allItems = dataController.getCultureItems("")
        applyFilters()
    }

    function loadEpisodes(itemId) {
        currentEpisodes = dataController.getCultureEpisodes(itemId)
    }

    function applyFilters() {
        var query = searchQuery.trim().toLowerCase()
        var result = []
        for (var i = 0; i < allItems.length; i++) {
            var it = allItems[i]
            var matchType = true
            if (activeTypeFilter !== "all") {
                matchType = (it.type === activeTypeFilter)
            }

            var matchStatus = true
            if (activeStatusFilter !== "all") {
                if (activeStatusFilter === "watching") matchStatus = (it.status === "watching" || it.status === "in_progress")
                else if (activeStatusFilter === "backlog") matchStatus = (it.status === "backlog" || it.status === "planned")
                else if (activeStatusFilter === "finished") matchStatus = (it.status === "finished" || it.status === "completed")
            }

            var matchSearch = true
            if (query.length > 0) {
                var title = (it.title || "").toLowerCase()
                var syn = (it.synopsis || "").toLowerCase()
                matchSearch = (title.indexOf(query) !== -1 || syn.indexOf(query) !== -1)
            }

            if (matchType && matchStatus && matchSearch) {
                result.push(it)
            }
        }
        filteredItems = result
    }

    Component.onCompleted: {
        refreshItems()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

        // Top Header and Search Bar
        CultureHeader {
            Layout.fillWidth: true
            filteredCount: cultureRoot.filteredItems.length
            totalCount: cultureRoot.allItems.length
            searchQuery: cultureRoot.searchQuery
            onSearchTextChanged: function(text) {
                cultureRoot.searchQuery = text
                cultureRoot.applyFilters()
            }
            onRequestAddItem: {
                cultureRoot.editingItem = null
                cultureRoot.isCreatingItem = true
            }
            onHelpRequested: helpDialog.isOpen = true
        }

        // Media Grid & Filter Pills
        CultureMediaGrid {
            Layout.fillWidth: true
            Layout.fillHeight: true
            filteredItems: cultureRoot.filteredItems
            activeTypeFilter: cultureRoot.activeTypeFilter
            activeStatusFilter: cultureRoot.activeStatusFilter
            onTypeFilterChanged: function(filter) {
                cultureRoot.activeTypeFilter = filter
                cultureRoot.applyFilters()
            }
            onStatusFilterChanged: function(filter) {
                cultureRoot.activeStatusFilter = filter
                cultureRoot.applyFilters()
            }
            onItemSelected: function(item) {
                cultureRoot.selectedItemForDetails = item
            }
            onProgressUpdated: function(itemId, newProgress) {
                dataController.updateCultureProgress(itemId, newProgress)
                cultureRoot.refreshItems()
            }
            onItemIncremented: function(itemId) {
                dataController.incrementCultureProgress(itemId)
                cultureRoot.refreshItems()
            }
            onItemDeleted: function(itemId) {
                dataController.deleteCultureItem(itemId)
                cultureRoot.refreshItems()
            }
        }
    }

    // Modal: Adicionar / Editar Obra
    CreateCultureModal {
        isOpen: cultureRoot.isCreatingItem
        initialItem: cultureRoot.editingItem
        onClosed: {
            cultureRoot.isCreatingItem = false
            cultureRoot.editingItem = null
        }
        onItemSubmitted: function(title, type, synopsis, totalEpisodes, coverImage, goalNote, accessLink) {
            if (cultureRoot.editingItem) {
                dataController.updateCultureItem(
                    cultureRoot.editingItem.id,
                    title,
                    type,
                    synopsis,
                    totalEpisodes,
                    coverImage,
                    cultureRoot.editingItem.status || "backlog",
                    goalNote,
                    accessLink
                )
            } else {
                dataController.createCultureItem(title, type, synopsis, totalEpisodes, coverImage, goalNote, accessLink)
            }
            cultureRoot.editingItem = null
            cultureRoot.refreshItems()
        }
    }

    // Modal: Visualização e Detalhes da Obra
    CultureDetailsModal {
        isOpen: cultureRoot.selectedItemForDetails !== null
        item: cultureRoot.selectedItemForDetails
        onClosed: cultureRoot.selectedItemForDetails = null
        onRequestEditItem: function(item) {
            cultureRoot.editingItem = item
            cultureRoot.isCreatingItem = true
        }
        onRequestManageEpisodes: function(item) {
            cultureRoot.selectedItemForEpisodes = item
            cultureRoot.loadEpisodes(item.id)
        }
        onStatusChanged: function(itemId, newStatus) {
            dataController.updateCultureStatus(itemId, newStatus)
            if (cultureRoot.selectedItemForDetails) {
                var copy = Object.assign({}, cultureRoot.selectedItemForDetails)
                copy.status = newStatus
                cultureRoot.selectedItemForDetails = copy
            }
            cultureRoot.refreshItems()
        }
        onProgressChanged: function(itemId, newProgress) {
            dataController.updateCultureProgress(itemId, newProgress)
            if (cultureRoot.selectedItemForDetails) {
                var copy = Object.assign({}, cultureRoot.selectedItemForDetails)
                copy.progress = newProgress
                cultureRoot.selectedItemForDetails = copy
            }
            cultureRoot.refreshItems()
        }
        onItemCompleted: function(itemId, totalEpisodes) {
            dataController.updateCultureProgress(itemId, totalEpisodes)
            dataController.updateCultureStatus(itemId, "finished")
            cultureRoot.refreshItems()
            cultureRoot.selectedItemForDetails = null
        }
    }

    // Modal: Gestão de Episódios
    CultureEpisodesModal {
        isOpen: cultureRoot.selectedItemForEpisodes !== null
        item: cultureRoot.selectedItemForEpisodes
        episodes: cultureRoot.currentEpisodes
        onClosed: cultureRoot.selectedItemForEpisodes = null
        onEpisodeWatchedToggled: function(episodeId, itemId) {
            dataController.toggleEpisodeWatched(episodeId, itemId)
            cultureRoot.loadEpisodes(itemId)
            cultureRoot.refreshItems()
        }
        onEpisodeDeleted: function(episodeId) {
            dataController.deleteCultureEpisode(episodeId)
            if (cultureRoot.selectedItemForEpisodes) {
                cultureRoot.loadEpisodes(cultureRoot.selectedItemForEpisodes.id)
            }
            cultureRoot.refreshItems()
        }
        onBulkEpisodesRequested: function(itemId, count) {
            dataController.bulkCreateEpisodes(itemId, count)
            cultureRoot.loadEpisodes(itemId)
            cultureRoot.refreshItems()
        }
        onEpisodeAdded: function(itemId, episodeNumber, title) {
            dataController.addCultureEpisode(itemId, episodeNumber, title)
            cultureRoot.loadEpisodes(itemId)
            cultureRoot.refreshItems()
        }
    }

    // Modal: Guia In-App
    CultureHelpDialog {
        id: helpDialog
        onClosed: isOpen = false
    }
}
