import QtQml 2.15

QtObject {
    id: libraryState

    property var controller: null
    property var books: []
    property var collections: []
    property string filterText: ""
    property string statusFilter: "all"
    property string selectedCollectionId: ""
    property bool isViewingArchived: false

    function collectionsFor(book) {
        var values = book ? book.collections || [] : []
        if (typeof values !== "string") return values
        try {
            var parsed = JSON.parse(values)
            return Array.isArray(parsed) ? parsed : []
        } catch (error) {
            console.warn("[LibraryViewState] Invalid collection metadata for book", book ? book.id : "", error)
            return []
        }
    }

    function selectedCollectionName() {
        for (var index = 0; index < collections.length; ++index) {
            if (collections[index].id === selectedCollectionId) return collections[index].name
        }
        return "Collection"
    }

    function archiveFilteredBooks() {
        var filtered = []
        for (var index = 0; index < books.length; ++index) {
            if (Boolean(books[index].is_archived) === isViewingArchived) filtered.push(books[index])
        }
        return filtered
    }

    function filteredBooks() {
        var query = filterText.trim().toLowerCase()
        var filtered = []
        for (var index = 0; index < books.length; ++index) {
            var book = books[index]
            var title = (book.title || "").toLowerCase()
            var author = (book.author || "").toLowerCase()
            var matchesSearch = !query || title.indexOf(query) >= 0 || author.indexOf(query) >= 0
            var matchesArchive = Boolean(book.is_archived) === isViewingArchived
            var matchesStatus = statusFilter === "all"
                || (statusFilter === "reading" && book.reading_status === "reading")
                || (statusFilter === "finished" && (book.reading_status === "finished" || book.reading_status === "completed"))
                || (statusFilter === "queue" && (book.reading_status === "not_started" || book.reading_status === "unread"))
            var matchesCollection = selectedCollectionId.length === 0
            var bookCollections = collectionsFor(book)
            for (var collectionIndex = 0; !matchesCollection && collectionIndex < bookCollections.length; ++collectionIndex) {
                matchesCollection = bookCollections[collectionIndex].id === selectedCollectionId
            }
            if (matchesSearch && matchesArchive && matchesStatus && matchesCollection) filtered.push(book)
        }
        return filtered
    }

    function updateBookCollection(book, collectionId, checked) {
        if (!controller || !book) return false
        var collectionIds = []
        var bookCollections = collectionsFor(book)
        for (var index = 0; index < bookCollections.length; ++index) {
            if (bookCollections[index].id) collectionIds.push(bookCollections[index].id)
        }
        var currentIndex = collectionIds.indexOf(collectionId)
        if (checked && currentIndex < 0) collectionIds.push(collectionId)
        if (!checked && currentIndex >= 0) collectionIds.splice(currentIndex, 1)
        return controller.setBookCollections(book.id, collectionIds)
    }
}
