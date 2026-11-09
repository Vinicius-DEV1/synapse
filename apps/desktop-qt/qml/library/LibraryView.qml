import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: libraryRoot
    color: "#0f0e17" // bg-dark-bg

    property var books: []
    property string filterText: ""
    property string activeStatusFilter: "all" // "all", "reading", "finished", "queue"
    property var selectedBook: null
    property bool isEditingProgress: false
    property bool isCreatingBook: false

    function refreshBooks() {
        books = dataController.getLibraryBooks(filterText)
    }

    Component.onCompleted: {
        refreshBooks()
    }

    function applyFilterAndStatus() {
        var query = filterText.trim().toLowerCase()
        var list = []
        for (var i = 0; i < books.length; i++) {
            var b = books[i]
            var matchSearch = true
            if (query.length > 0) {
                var title = (b.title || "").toLowerCase()
                var author = (b.author || "").toLowerCase()
                matchSearch = (title.indexOf(query) !== -1 || author.indexOf(query) !== -1)
            }

            var matchStatus = true
            if (activeStatusFilter === "reading") {
                matchStatus = ((b.current_page || 0) > 0 && (b.current_page < b.total_pages))
            } else if (activeStatusFilter === "finished") {
                matchStatus = (b.total_pages > 0 && b.current_page >= b.total_pages)
            } else if (activeStatusFilter === "queue") {
                matchStatus = ((b.current_page || 0) === 0)
            }

            if (matchSearch && matchStatus) {
                list.push(b)
            }
        }
        return list
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

        // Top KPI Header & Search
        LibraryKpiHeader {
            Layout.fillWidth: true
            books: libraryRoot.books
            filterText: libraryRoot.filterText
            onSearchTextChanged: function(text) {
                libraryRoot.filterText = text
                libraryRoot.refreshBooks()
            }
            onRequestAddBook: libraryRoot.isCreatingBook = true
        }

        // Books Grid Section
        LibraryBookGrid {
            Layout.fillWidth: true
            Layout.fillHeight: true
            books: libraryRoot.applyFilterAndStatus()
            activeStatusFilter: libraryRoot.activeStatusFilter
            onStatusFilterChanged: function(filter) { libraryRoot.activeStatusFilter = filter }
            onBookSelected: function(book) {
                libraryRoot.selectedBook = book
                libraryRoot.isEditingProgress = true
            }
        }
    }

    // Book Progress & Reading Details Modal
    BookDetailsModal {
        isOpen: libraryRoot.isEditingProgress
        book: libraryRoot.selectedBook
        onClosed: {
            libraryRoot.isEditingProgress = false
            libraryRoot.selectedBook = null
        }
        onProgressSaved: function(bookId, currentPage, totalPages) {
            dataController.updateBookProgress(bookId, currentPage, totalPages)
            libraryRoot.refreshBooks()
        }
        onBookDeleted: function(bookId) {
            dataController.deleteLibraryBook(bookId)
            libraryRoot.refreshBooks()
        }
    }

    // Create Book Modal
    CreateBookModal {
        isOpen: libraryRoot.isCreatingBook
        onClosed: libraryRoot.isCreatingBook = false
        onBookCreated: function(title, author, totalPages, coverColor) {
            dataController.createLibraryBook(title, author, totalPages, coverColor)
            libraryRoot.refreshBooks()
        }
    }
}
