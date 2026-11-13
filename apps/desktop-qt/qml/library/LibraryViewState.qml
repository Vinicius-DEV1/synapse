import QtQml 2.15

QtObject {
    id: libraryState

    property var controller: null
    property var books: []
    property var collections: []
    property string filterText: ""
    property string statusFilter: "all"
    property string formatFilter: "all" // "all", "pdf", "epub"
    property string selectedAuthor: ""
    property string selectedCollectionId: ""
    property bool isViewingArchived: false
    property string sortBy: "last_read" // "last_read", "title", "created", "author"
    property string sortOrder: "desc" // "asc", "desc"

    readonly property var authors: {
        var map = ({})
        var list = []
        for (var i = 0; i < books.length; ++i) {
            var b = books[i]
            if (Boolean(b.is_archived) !== isViewingArchived) continue
            var auth = String(b.author || "").trim()
            if (auth.length > 0 && !map[auth]) {
                map[auth] = true
                list.push(auth)
            }
        }
        list.sort(function(a, b) { return a.localeCompare(b) })
        return list
    }

    readonly property bool hasActiveFilters: Boolean(
        filterText.trim().length > 0 ||
        statusFilter !== "all" ||
        formatFilter !== "all" ||
        selectedAuthor.length > 0 ||
        selectedCollectionId.length > 0
    )

    function clearAllFilters() {
        filterText = ""
        statusFilter = "all"
        formatFilter = "all"
        selectedAuthor = ""
        selectedCollectionId = ""
    }

    function isBookEpub(book) {
        var path = String(book ? book.original_name || book.file_path || "" : "").toLowerCase()
        return path.endsWith(".epub")
    }

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
            var epub = isBookEpub(book)
            var matchesFormat = formatFilter === "all"
                || (formatFilter === "epub" && epub)
                || (formatFilter === "pdf" && !epub)
            var matchesAuthor = selectedAuthor.length === 0 || String(book.author || "") === selectedAuthor

            if (matchesSearch && matchesArchive && matchesStatus && matchesCollection && matchesFormat && matchesAuthor) {
                filtered.push(book)
            }
        }

        filtered.sort(function(a, b) {
            var cmp = 0
            if (sortBy === "title") {
                cmp = String(a.title || "").localeCompare(String(b.title || ""))
            } else if (sortBy === "author") {
                cmp = String(a.author || "").localeCompare(String(b.author || ""))
            } else if (sortBy === "created") {
                var aCreated = a.created_at ? new Date(a.created_at).getTime() : 0
                var bCreated = b.created_at ? new Date(b.created_at).getTime() : 0
                cmp = aCreated - bCreated
            } else { // "last_read"
                var aTime = a.last_read_at ? new Date(a.last_read_at).getTime() : 0
                var bTime = b.last_read_at ? new Date(b.last_read_at).getTime() : 0
                cmp = aTime - bTime
            }
            if (cmp === 0) {
                cmp = String(a.title || "").localeCompare(String(b.title || ""))
            }
            return sortOrder === "asc" ? cmp : -cmp
        })

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
