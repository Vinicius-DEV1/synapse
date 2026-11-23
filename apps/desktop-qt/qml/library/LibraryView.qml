import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Dialogs

Rectangle {
    id: libraryRoot
    color: "#0f0e17" // bg-dark-bg

    property var books: []
    property var collections: []
    property int viewportWidth: width > 0 ? width : 1366
    property string filterText: ""
    property string activeStatusFilter: "all" // "all", "reading", "finished", "queue"
    property string activeViewMode: "books"
    property string displayMode: "grid" // "grid" | "compact" | "list"
    property string selectedCollectionId: ""
    property bool isViewingArchived: false
    property var selectedBook: null
    property bool isEditingProgress: false
    property bool isCreatingBook: false
    property bool isHelpOpen: false
    property var importQueue: []
    property string importStatus: ""

    readonly property bool isReaderFullscreen: libraryReader.isOpen && libraryReader.isFullscreen
    readonly property string activeBookId: libraryReader.isOpen && libraryReader.book ? String(libraryReader.book.id) : ""
    readonly property string activeBookTitle: libraryReader.isOpen && libraryReader.book ? String(libraryReader.book.title) : ""

    signal activeBookChanged(string bookId, string bookTitle)

    function openBookById(bookId) {
        if (!bookId) return
        if (libraryReader.isOpen && libraryReader.book && String(libraryReader.book.id) === String(bookId)) return
        for (var i = 0; i < books.length; i++) {
            if (String(books[i].id) === String(bookId)) {
                libraryReader.openBook(books[i])
                return
            }
        }
        var fresh = dataController.getLibraryBooks("")
        for (var j = 0; j < fresh.length; j++) {
            if (String(fresh[j].id) === String(bookId)) {
                libraryReader.openBook(fresh[j])
                return
            }
        }
    }

    function closeReaderIfOpen() {
        if (libraryReader.isOpen) {
            libraryReader.isFullscreen = false
            libraryReader.closeReader()
        }
    }

    function importNextQueuedBook() {
        if (importQueue.length === 0) return
        var nextUrl = importQueue[0]
        importQueue = importQueue.slice(1)
        var path = nextUrl.toLocalFile()
        if (path.length === 0) {
            importStatus = "O arquivo selecionado não possui um caminho local válido."
            Qt.callLater(libraryRoot.importNextQueuedBook)
            return
        }
        dataController.importLibraryBook(path)
    }
    function refreshBooks() {
        books = dataController.getLibraryBooks(filterText)
        collections = dataController.getLibraryCollections()
    }

    function openReadingStats() {
        var stats = dataController.getLibraryReadingStats()
        var readingBooks = dataController.getLibraryBooks().filter(function(book) {
            return book.reading_status === "reading"
        })
        readingStatsDialog.openFor(stats, readingBooks)
    }

    Component.onCompleted: {
        refreshBooks()
    }

    LibraryViewState {
        id: viewState
        controller: dataController
        books: libraryRoot.books
        collections: libraryRoot.collections
        filterText: libraryRoot.filterText
        statusFilter: libraryRoot.activeStatusFilter
        selectedCollectionId: libraryRoot.selectedCollectionId
        isViewingArchived: libraryRoot.isViewingArchived
    }

    LibraryBulkSelection {
        id: bulkSelection
        controller: dataController
        books: libraryRoot.books
        onActionFinished: function(message) {
            libraryRoot.importStatus = message
            libraryRoot.refreshBooks()
        }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

        LibraryKpiHeader {
            Layout.fillWidth: true
            books: libraryRoot.books
            filterText: libraryRoot.filterText
            importRunning: dataController.fileOperationRunning
            onSearchTextChanged: function(text) {
                libraryRoot.filterText = text
                libraryRoot.refreshBooks()
            }
            onRequestAddBook: libraryRoot.isCreatingBook = true
            onRequestImportBook: libraryImportDialog.open()
            onRequestReadingStats: libraryRoot.openReadingStats()
        }

        Rectangle {
            visible: libraryRoot.importStatus.length > 0
            Layout.fillWidth: true
            Layout.preferredHeight: visible ? 38 : 0
            radius: 8
            color: "#1d1b2a"
            border.color: "#1f818cf8"
            Text {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                text: libraryRoot.importStatus
                color: "#c4c5d4"
                font.pixelSize: 12
                verticalAlignment: Text.AlignVCenter
                elide: Text.ElideRight
            }
        }

        LibraryViewModeBar {
            viewMode: libraryRoot.activeViewMode
            displayMode: libraryRoot.displayMode
            collectionCount: libraryRoot.collections.length
            archivedCount: libraryRoot.books.filter(function(book) { return Boolean(book.is_archived) }).length
            hasSelectedCollection: libraryRoot.activeViewMode === "books" && libraryRoot.selectedCollectionId.length > 0
            isViewingArchived: libraryRoot.isViewingArchived
            selectedCollectionName: viewState.selectedCollectionName()
            onBooksRequested: {
                libraryRoot.activeViewMode = "books"
                libraryRoot.selectedCollectionId = ""
            }
            onCollectionsRequested: {
                libraryRoot.activeViewMode = "collections"
                libraryRoot.selectedCollectionId = ""
            }
            onDisplayModeChanged: function(mode) { libraryRoot.displayMode = mode }
            onBackToCollectionsRequested: {
                libraryRoot.selectedCollectionId = ""
                libraryRoot.activeViewMode = "collections"
            }
            onHelpRequested: libraryRoot.isHelpOpen = true
            onArchiveViewRequested: function(archived) { libraryRoot.isViewingArchived = archived }
        }

        LibraryCollectionGrid {
            visible: libraryRoot.activeViewMode === "collections"
            Layout.fillWidth: true
            Layout.fillHeight: true
            viewportWidth: libraryRoot.viewportWidth
            collections: libraryRoot.collections
            books: viewState.archiveFilteredBooks()
            onCollectionSelected: function(collection) {
                libraryRoot.selectedCollectionId = collection.id
                libraryRoot.activeViewMode = "books"
            }
            onCreateRequested: collectionActions.openEditor(null)
            onEditRequested: function(collection) { collectionActions.openEditor(collection) }
            onDeleteRequested: function(collection) { collectionActions.requestDelete(collection) }
        }

        LibraryBookGrid {
            visible: libraryRoot.activeViewMode === "books"
            displayMode: libraryRoot.displayMode
            Layout.fillWidth: true
            Layout.fillHeight: true
            viewportWidth: libraryRoot.viewportWidth
            books: viewState.filteredBooks()
            collections: libraryRoot.collections
            selectedBookIds: bulkSelection.selectedBookIds
            activeStatusFilter: viewState.statusFilter
            activeFormatFilter: viewState.formatFilter
            authors: viewState.authors
            selectedAuthor: viewState.selectedAuthor
            sortBy: viewState.sortBy
            sortOrder: viewState.sortOrder
            hasActiveFilters: viewState.hasActiveFilters
            filterText: viewState.filterText
            selectedCollectionName: viewState.selectedCollectionName()
            totalBooksCount: viewState.archiveFilteredBooks().length
            onSelectionToggleRequested: function(bookId) { bulkSelection.toggle(bookId) }
            onStatusFilterChanged: function(filter) { viewState.statusFilter = filter; libraryRoot.activeStatusFilter = filter }
            onFormatFilterChanged: function(format) { viewState.formatFilter = format }
            onAuthorChanged: function(author) { viewState.selectedAuthor = author }
            onSortChanged: function(key, order) { viewState.sortBy = key; viewState.sortOrder = order }
            onClearSearchRequested: { libraryRoot.filterText = ""; viewState.filterText = "" }
            onClearStatusRequested: { viewState.statusFilter = "all"; libraryRoot.activeStatusFilter = "all" }
            onClearFormatRequested: { viewState.formatFilter = "all" }
            onClearAuthorRequested: { viewState.selectedAuthor = "" }
            onClearCollectionRequested: { viewState.selectedCollectionId = ""; libraryRoot.selectedCollectionId = "" }
            onClearAllFiltersRequested: {
                viewState.clearAllFilters()
                libraryRoot.filterText = ""
                libraryRoot.activeStatusFilter = "all"
                libraryRoot.selectedCollectionId = ""
            }
            onBookSelected: function(book) {
                libraryRoot.selectedBook = book
                libraryRoot.isEditingProgress = true
            }
            onBookEditRequested: function(book) { bookEditDialog.openFor(book) }
            onBookAiEnrichRequested: function(book) { aiEnrichModal.openForBook(book) }
            onBookCollectionToggleRequested: function(book, collectionId, checked) {
                if (viewState.updateBookCollection(book, collectionId, checked)) {
                    libraryRoot.importStatus = "Book collections updated."
                    libraryRoot.refreshBooks()
                } else {
                    libraryRoot.importStatus = "Could not update this book's collections."
                }
            }
            onBookStatusChangeRequested: function(book, status) {
                if (dataController.updateLibraryBookStatus(book.id, status)) {
                    libraryRoot.importStatus = "Reading status updated."
                    libraryRoot.refreshBooks()
                } else {
                    libraryRoot.importStatus = "Could not update this book's status."
                }
            }
            onBookArchiveToggleRequested: function(book, archived) {
                if (dataController.setLibraryBookArchived(book.id, archived)) {
                    libraryRoot.importStatus = archived ? "Book archived." : "Book restored to the library."
                    libraryRoot.refreshBooks()
                } else {
                    libraryRoot.importStatus = "Could not update this book's archive status."
                }
            }
            onBookDownloadOfflineRequested: function(book) {
                libraryRoot.importStatus = "Arquivo pronto para uso offline no dispositivo."
            }
            onBookEvictCacheRequested: function(book) {
                libraryRoot.importStatus = "Cache local gerenciado. Metadados do acervo preservados."
            }
        }
    }

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
        onBookOpenRequested: function(book) {
            libraryRoot.isEditingProgress = false
            libraryRoot.selectedBook = null
            libraryReader.openBook(book)
        }
    }

    CreateBookModal {
        isOpen: libraryRoot.isCreatingBook
        onClosed: libraryRoot.isCreatingBook = false
        onBookCreated: function(title, author, totalPages, coverColor) {
            dataController.createLibraryBook(title, author, totalPages, coverColor)
            libraryRoot.refreshBooks()
        }
    }

    LibraryCollectionActions {
        id: collectionActions
        anchors.fill: parent
        controller: dataController
        selectedCollectionId: libraryRoot.selectedCollectionId
        onDataChanged: libraryRoot.refreshBooks()
        onStatusRequested: function(message) { libraryRoot.importStatus = message }
        onCollectionDeleted: function(collectionId) {
            if (libraryRoot.selectedCollectionId === collectionId) libraryRoot.selectedCollectionId = ""
        }
    }

    LibraryBookEditDialog {
        id: bookEditDialog
        anchors.centerIn: parent
        controller: dataController
        collections: libraryRoot.collections
        onSaved: {
            libraryRoot.refreshBooks()
            libraryRoot.importStatus = "Book details saved."
        }
        onStatusRequested: function(message) { libraryRoot.importStatus = message }
    }

    LibraryHelpDialog {
        anchors.centerIn: parent
        isOpen: libraryRoot.isHelpOpen
        onDismissRequested: libraryRoot.isHelpOpen = false
    }

    LibraryReadingStatsDialog {
        id: readingStatsDialog
        anchors.centerIn: parent
    }

    LibraryReaderView {
        id: libraryReader
        anchors.fill: parent
        onIsOpenChanged: libraryRoot.activeBookChanged(libraryRoot.activeBookId, libraryRoot.activeBookTitle)
        onBookChanged: libraryRoot.activeBookChanged(libraryRoot.activeBookId, libraryRoot.activeBookTitle)
    }

    FileDialog {
        id: libraryImportDialog
        title: "Importar livros para a biblioteca"
        fileMode: FileDialog.OpenFiles
        nameFilters: ["Livros PDF e EPUB (*.pdf *.epub)"]
        onAccepted: {
            libraryRoot.importQueue = selectedFiles.slice()
            libraryRoot.importStatus = libraryRoot.importQueue.length > 0
                ? "Criptografando e importando " + libraryRoot.importQueue.length + " arquivo(s)…" : ""
            libraryRoot.importNextQueuedBook()
        }
    }

    Connections {
        target: dataController
        function onFileOperationFinished(result) {
            if (result.operation !== "library-import") return
            libraryRoot.importStatus = result.success
                ? "Livro ‘" + (result.name || "") + "’ importado e criptografado."
                : (result.error || "Não foi possível importar o livro.")
            libraryRoot.refreshBooks()
            if (libraryRoot.importQueue.length > 0) Qt.callLater(libraryRoot.importNextQueuedBook)
        }
    }

    LibraryBulkActionHost {
        anchors.fill: parent
        selectionController: bulkSelection
        collections: libraryRoot.collections
        isViewingArchived: libraryRoot.isViewingArchived
        actionsVisible: !libraryRoot.isEditingProgress && !libraryRoot.isCreatingBook &&
                        !libraryRoot.isHelpOpen && !bookEditDialog.visible && !readingStatsDialog.visible
    }

    LibraryAiEnrichModal {
        id: aiEnrichModal
        onApplyEnrichmentRequested: function(book, metadata) {
            var ok = dataController.updateLibraryBookMetadata(
                book.id,
                metadata.title,
                metadata.author,
                book.publisher || "",
                book.published_year || 0,
                "pt-BR",
                metadata.description,
                book.reading_status || "reading",
                book.cover_image || ""
            )
            if (ok) {
                libraryRoot.importStatus = "Metadados enriquecidos pela IA com sucesso."
                libraryRoot.refreshBooks()
            } else {
                libraryRoot.importStatus = "Não foi possível aplicar os metadados enriquecidos."
            }
        }
    }
}
