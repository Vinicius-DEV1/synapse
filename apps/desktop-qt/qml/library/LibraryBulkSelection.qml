import QtQml 2.15

QtObject {
    id: selection
    property var controller: null
    property var books: []
    property var selectedBookIds: []

    signal actionFinished(string message)

    function toggle(bookId) {
        var nextIds = selectedBookIds.slice()
        var index = nextIds.indexOf(bookId)
        if (index >= 0) nextIds.splice(index, 1)
        else nextIds.push(bookId)
        selectedBookIds = nextIds
    }

    function clear() {
        selectedBookIds = []
    }

    function selectedBooks() {
        var chosen = []
        for (var index = 0; index < books.length; ++index) {
            if (selectedBookIds.indexOf(books[index].id) >= 0) chosen.push(books[index])
        }
        return chosen
    }

    function finishAction(successCount, failureCount, action) {
        clear()
        actionFinished(failureCount > 0
            ? action + " updated " + successCount + " book(s); " + failureCount + " failed."
            : action + " updated " + successCount + " book(s).")
    }

    function updateStatus(status) {
        var succeeded = 0
        var failed = 0
        var chosen = selectedBooks()
        for (var index = 0; index < chosen.length; ++index) {
            if (controller.updateLibraryBookStatus(chosen[index].id, status)) succeeded++
            else failed++
        }
        finishAction(succeeded, failed, "Reading status")
    }

    function setArchived(archived) {
        var succeeded = 0
        var failed = 0
        var chosen = selectedBooks()
        for (var index = 0; index < chosen.length; ++index) {
            if (controller.setLibraryBookArchived(chosen[index].id, archived)) succeeded++
            else failed++
        }
        finishAction(succeeded, failed, archived ? "Archive" : "Restore")
    }

    function assignCollection(collectionId) {
        var succeeded = 0
        var failed = 0
        var chosen = selectedBooks()
        for (var index = 0; index < chosen.length; ++index) {
            var ids = []
            var associations = chosen[index].collections || []
            if (typeof associations === "string") {
                try { associations = JSON.parse(associations) }
                catch (error) {
                    console.warn("[LibraryBulkSelection] Invalid collection data for book", chosen[index].id, error)
                    associations = []
                }
            }
            for (var collectionIndex = 0; collectionIndex < associations.length; ++collectionIndex) {
                if (associations[collectionIndex].id) ids.push(associations[collectionIndex].id)
            }
            if (ids.indexOf(collectionId) < 0) ids.push(collectionId)
            if (controller.setBookCollections(chosen[index].id, ids)) succeeded++
            else failed++
        }
        finishAction(succeeded, failed, "Collection assignment")
    }

    function deleteSelected() {
        var succeeded = 0
        var failed = 0
        var chosen = selectedBooks()
        for (var index = 0; index < chosen.length; ++index) {
            if (controller.deleteLibraryBook(chosen[index].id)) succeeded++
            else failed++
        }
        finishAction(succeeded, failed, "Book removal")
    }
}
