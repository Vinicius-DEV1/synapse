import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: reader
    anchors.fill: parent
    color: "#0f0e17"
    visible: isOpen
    z: 120

    property bool isOpen: false
    property var book: null
    property string temporaryPath: ""
    property string format: ""
    property int currentPage: 1
    property int totalPages: 0
    property var chapters: []
    property string pdfImageUrl: ""
    property string pdfImagePath: ""
    property string pdfPageText: ""
    property string readerError: ""
    property var bookmarks: []
    property var highlights: []
    property string readingSessionId: ""

    signal backRequested()

    function openBook(selectedBook) {
        finishReadingSession()
        searchHost.closeSearch()
        if (temporaryPath.length > 0) dataController.closeLibraryBook(temporaryPath)
        if (pdfImagePath.length > 0) dataController.closeLibraryBook(pdfImagePath)
        book = selectedBook
        isOpen = true
        temporaryPath = ""
        format = ""
        currentPage = 1
        totalPages = 0
        chapters = []
        bookmarks = []
        highlights = []
        readerError = ""
        pdfImageUrl = ""
        pdfImagePath = ""
        pdfPageText = ""
        annotationSidebar.resetState()
        dataController.openLibraryBook(selectedBook.id)
    }

    function closeReader() {
        finishReadingSession()
        searchHost.closeSearch()
        if (temporaryPath.length > 0) dataController.closeLibraryBook(temporaryPath)
        if (pdfImagePath.length > 0) dataController.closeLibraryBook(pdfImagePath)
        temporaryPath = ""
        pdfImageUrl = ""
        pdfImagePath = ""
        pdfPageText = ""
        chapters = []
        bookmarks = []
        highlights = []
        book = null
        format = ""
        currentPage = 1
        totalPages = 0
        readerError = ""
        annotationSidebar.resetState()
        isOpen = false
        backRequested()
    }

    function finishReadingSession() {
        if (readingSessionId.length === 0) return
        dataController.endLibraryReadingSession(readingSessionId, currentPage)
        readingSessionId = ""
    }

    function renderCurrentPdfPage() {
        if (format !== "pdf" || temporaryPath.length === 0 || totalPages < 1) return
        readerError = ""
        dataController.renderLibraryPdfPage(temporaryPath, currentPage, Math.min(1800, Math.floor(width * 0.7)))
    }

    function navigateToPage(page) {
        if (totalPages < 1) return
        var nextPage = Math.max(1, Math.min(totalPages, page))
        if (nextPage === currentPage) return
        currentPage = nextPage
        dataController.updateBookProgress(book.id, currentPage, totalPages)
        if (format === "pdf") renderCurrentPdfPage()
        if (format === "epub") epubContent.cursorPosition = 0
    }

    function loadAnnotations() {
        if (!book) return
        bookmarks = dataController.getLibraryBookmarks(book.id)
        highlights = dataController.getLibraryHighlights(book.id)
    }
    LibraryReaderSearchHost {
        id: searchHost
        controller: dataController
        temporaryPath: reader.temporaryPath
        format: reader.format
        onJumpRequested: function(pageNumber) { reader.navigateToPage(pageNumber) }
    }

    LibraryReaderAnnotationActions {
        id: annotationActions
        controller: dataController
        bookId: reader.book ? reader.book.id : ""
        format: reader.format
        currentPage: reader.currentPage
        totalPages: reader.totalPages
        chapters: reader.chapters
        onAnnotationsChanged: reader.loadAnnotations()
        onStatusChanged: function(success, message) { annotationSidebar.showStatus(success, message) }
    }

    Shortcut {
        sequence: "Esc"
        enabled: reader.isOpen && !annotationSidebar.confirmationOpen && !searchHost.searchOpen
        onActivated: {
            if (annotationSidebar.annotationEditorActive) {
                if (annotationSidebar.editingBookmarkId.length > 0) annotationSidebar.cancelBookmarkEdit()
                else annotationSidebar.cancelHighlightEdit()
                return
            }
            reader.closeReader()
        }
    }
    Shortcut {
        sequence: "Ctrl+Left"
        enabled: reader.isOpen && reader.currentPage > 1 && !dataController.fileOperationRunning &&
                 !annotationSidebar.annotationEditorActive && !annotationSidebar.confirmationOpen &&
                 !annotationSidebar.textInputActive && !searchHost.searchOpen
        onActivated: reader.navigateToPage(reader.currentPage - 1)
    }
    Shortcut {
        sequence: "Ctrl+Right"
        enabled: reader.isOpen && reader.currentPage < reader.totalPages && !dataController.fileOperationRunning &&
                 !annotationSidebar.annotationEditorActive && !annotationSidebar.confirmationOpen &&
                 !annotationSidebar.textInputActive && !searchHost.searchOpen
        onActivated: reader.navigateToPage(reader.currentPage + 1)
    }
    Shortcut {
        sequences: ["Ctrl+F", "Cmd+F"]
        enabled: reader.isOpen && reader.temporaryPath.length > 0 && !dataController.fileOperationRunning &&
                 !annotationSidebar.annotationEditorActive && !annotationSidebar.confirmationOpen &&
                 !annotationSidebar.textInputActive && !searchHost.searchOpen
        onActivated: searchHost.openSearch()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 18
        spacing: 12

        LibraryReaderToolbar {
            book: reader.book
            currentPage: reader.currentPage
            totalPages: reader.totalPages
            format: reader.format
            busy: dataController.fileOperationRunning
            onBackRequested: reader.closeReader()
            onPreviousRequested: reader.navigateToPage(reader.currentPage - 1)
            onNextRequested: reader.navigateToPage(reader.currentPage + 1)
            onSearchRequested: searchHost.openSearch()
            onBookmarkRequested: annotationActions.saveCurrentBookmark()
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 12

            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                radius: 14
                color: "#171620"
                border.color: "#12ffffff"
                clip: true

                Image {
                    anchors.fill: parent
                    anchors.margins: 16
                    source: reader.pdfImageUrl
                    fillMode: Image.PreserveAspectFit
                    asynchronous: true
                    cache: false
                    visible: reader.format === "pdf" && reader.pdfImageUrl.length > 0
                }

                ScrollView {
                    anchors.fill: parent
                    anchors.margins: 32
                    visible: reader.format === "epub" && reader.chapters.length > 0
                    clip: true
                    contentWidth: availableWidth

                    TextEdit {
                        id: epubContent
                        width: parent.width
                        text: reader.chapters.length >= reader.currentPage ? reader.chapters[reader.currentPage - 1].html : ""
                        textFormat: TextEdit.RichText
                        wrapMode: TextEdit.Wrap
                        readOnly: true
                        selectByMouse: true
                        selectByKeyboard: true
                        color: "#e8e8ee"
                        selectionColor: "#6d4fc2"
                        font.pixelSize: 19
                        font.family: "Georgia"
                        onLinkActivated: function(link) {
                            var target = String(link).toLowerCase()
                            if (target.startsWith("https://") || target.startsWith("http://") || target.startsWith("mailto:")) {
                                Qt.openUrlExternally(link)
                            }
                        }
                    }
                }

                ColumnLayout {
                    anchors.centerIn: parent
                    visible: reader.readerError.length > 0 || dataController.fileOperationRunning && reader.pdfImageUrl.length === 0
                    spacing: 10
                    BusyIndicator { running: dataController.fileOperationRunning; Layout.alignment: Qt.AlignHCenter }
                    Text {
                        text: reader.readerError || "Preparando página…"
                        color: reader.readerError.length > 0 ? "#fda4af" : "#a7a9be"
                        wrapMode: Text.Wrap
                        horizontalAlignment: Text.AlignHCenter
                    }
                }
            }

            LibraryReaderAnnotations {
                id: annotationSidebar
                format: reader.format
                bookId: reader.book ? reader.book.id : ""
                pdfText: reader.pdfPageText
                epubSelectedText: epubContent.selectedText
                currentPage: reader.currentPage
                totalPages: reader.totalPages
                busy: dataController.fileOperationRunning
                bookmarks: reader.bookmarks
                highlights: reader.highlights
                chapters: reader.chapters
                onHighlightRequested: function(text, note) {
                    if (annotationActions.saveSelectionHighlight(text, note)) annotationSidebar.clearNote()
                }
                onJumpRequested: function(pageNumber) { reader.navigateToPage(pageNumber) }
                onUpdateBookmarkRequested: function(id, label) { annotationActions.updateBookmark(id, label) }
                onDeleteBookmarkRequested: function(id) { annotationActions.deleteBookmark(id) }
                onUpdateHighlightRequested: function(id, note, color) { annotationActions.updateHighlight(id, note, color) }
                onDeleteHighlightRequested: function(id) { annotationActions.deleteHighlight(id) }
                onDeleteAllHighlightsRequested: annotationActions.deleteAllHighlights()
            }
        }
    }

    Connections {
        target: dataController
        function onLibraryBookReady(result) {
            if (!reader.isOpen || !reader.book || result.bookId !== reader.book.id) return
            if (!result.success) {
                reader.readerError = result.error || "Não foi possível abrir este livro."
                return
            }
            reader.temporaryPath = result.path || ""
            reader.format = result.format || ""
            reader.chapters = result.chapters || []
            reader.totalPages = result.totalPages || reader.chapters.length
            reader.currentPage = Math.max(1, Math.min(reader.totalPages, Number(result.currentPage) || 1))
            reader.readingSessionId = dataController.startLibraryReadingSession(result.bookId, reader.currentPage)
            reader.loadAnnotations()
            if (reader.format === "pdf") reader.renderCurrentPdfPage()
        }
        function onLibraryPdfPageReady(result) {
            if (!reader.isOpen || reader.format !== "pdf" || Number(result.pageNumber) !== reader.currentPage) {
                if (result.path) dataController.closeLibraryBook(result.path)
                return
            }
            if (!result.success) {
                reader.readerError = result.error || "Não foi possível renderizar esta página."
                return
            }
            if (reader.pdfImagePath.length > 0) dataController.closeLibraryBook(reader.pdfImagePath)
            reader.pdfImageUrl = result.url || ""
            reader.pdfImagePath = result.path || ""
            reader.pdfPageText = result.text || ""
            reader.readerError = ""
        }
        function onFilePreviewsInvalidated() {
            if (reader.isOpen) reader.closeReader()
        }
    }
}
