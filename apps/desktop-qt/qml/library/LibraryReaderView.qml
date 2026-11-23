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
    property int readerFontSize: 19
    property string readerFontFamily: "Georgia"
    property string readerTheme: "dark"
    property real zoomFactor: 1.0

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
    LibraryReaderNavigationShortcuts {
        enabledForReading: reader.isOpen && reader.format === "epub" && !dataController.fileOperationRunning &&
                           !annotationSidebar.annotationEditorActive && !annotationSidebar.confirmationOpen &&
                           !annotationSidebar.textInputActive && !searchHost.searchOpen && !epubContent.activeFocus
        canGoBack: reader.currentPage > 1
        canGoForward: reader.currentPage < reader.totalPages
        onPreviousRequested: reader.navigateToPage(reader.currentPage - 1)
        onNextRequested: reader.navigateToPage(reader.currentPage + 1)
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
            onTypographyRequested: typographyModal.openAt(reader.width - 340, 76)
            onBookmarkRequested: annotationActions.saveCurrentBookmark()
            onZoomInRequested: reader.zoomFactor = Math.min(2.5, reader.zoomFactor + 0.15)
            onZoomOutRequested: reader.zoomFactor = Math.max(0.5, reader.zoomFactor - 0.15)
            onFitWidthRequested: reader.zoomFactor = 1.0
            onPageJumpRequested: function(p) { reader.navigateToPage(p) }
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 12

            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                radius: 14
                color: reader.readerTheme === "sepia" ? "#f4ecd8"
                     : (reader.readerTheme === "light" ? "#ffffff"
                     : (reader.readerTheme === "midnight" ? "#090d16" : "#171620"))
                border.color: "#12ffffff"
                clip: true

                Flickable {
                    id: pdfFlickable
                    anchors.fill: parent
                    anchors.margins: 16
                    clip: true
                    visible: reader.format === "pdf" && reader.pdfImageUrl.length > 0
                    contentWidth: Math.max(width, pdfImg.width)
                    contentHeight: Math.max(height, pdfImg.height)

                    Image {
                        id: pdfImg
                        width: parent.width * reader.zoomFactor
                        height: implicitHeight > 0 && implicitWidth > 0 ? (width * implicitHeight / implicitWidth) : parent.height * reader.zoomFactor
                        source: reader.pdfImageUrl
                        fillMode: Image.PreserveAspectFit
                        asynchronous: true
                        cache: false
                    }
                }

                ScrollView {
                    anchors.fill: parent
                    anchors.margins: 32
                    visible: reader.format === "epub" && reader.chapters.length > 0
                    clip: true
                    contentWidth: availableWidth

                    TextEdit {
                        id: epubContent
                        objectName: "epubReaderText"
                        width: parent.width
                        text: reader.chapters.length >= reader.currentPage ? reader.chapters[reader.currentPage - 1].html : ""
                        textFormat: TextEdit.RichText
                        wrapMode: TextEdit.Wrap
                        readOnly: true
                        selectByMouse: true
                        selectByKeyboard: true
                        color: reader.readerTheme === "sepia" ? "#5b4636"
                             : (reader.readerTheme === "light" ? "#18181b" : "#e8e8ee")
                        selectionColor: "#6d4fc2"
                        font.pixelSize: Math.round(reader.readerFontSize * reader.zoomFactor)
                        font.family: reader.readerFontFamily
                        onSelectedTextChanged: {
                            if (selectedText.length > 0) {
                                highlightMenu.openAt(reader.width / 2 - 130, reader.height - 100, selectedText)
                            }
                        }
                        onLinkActivated: function(link) {
                            var target = String(link).toLowerCase()
                            if (target.startsWith("https://") || target.startsWith("http://") || target.startsWith("mailto:")) {
                                Qt.openUrlExternally(link)
                            }
                        }
                    }
                }

                // Highlights on current page indicator bar
                RowLayout {
                    anchors.bottom: parent.bottom
                    anchors.horizontalCenter: parent.horizontalCenter
                    anchors.bottomMargin: 14
                    spacing: 8
                    z: 50
                    visible: {
                        if (!reader.highlights || reader.highlights.length === 0) return false
                        for (var i = 0; i < reader.highlights.length; i++) {
                            if (reader.highlights[i].page_number === reader.currentPage) return true
                        }
                        return false
                    }

                    Repeater {
                        model: {
                            var list = []
                            if (reader.highlights) {
                                for (var i = 0; i < reader.highlights.length; i++) {
                                    var hl = reader.highlights[i]
                                    if (hl.page_number === reader.currentPage) list.push(hl)
                                }
                            }
                            return list
                        }
                        delegate: Rectangle {
                            height: 24
                            radius: 12
                            color: "#cc161524"
                            border.color: modelData.color || "#8b5cf6"
                            border.width: 1
                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 8
                                anchors.rightMargin: 8
                                spacing: 6
                                Rectangle { width: 8; height: 8; radius: 4; color: modelData.color || "#8b5cf6" }
                                Text {
                                    text: (modelData.text_content || modelData.selected_text || "").substring(0, 28) + ((modelData.text_content || modelData.selected_text || "").length > 28 ? "…" : "")
                                    color: "#e2e8f0"
                                    font.pixelSize: 11
                                    elide: Text.ElideRight
                                    Layout.maximumWidth: 200
                                }
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

    LibraryTypographyModal {
        id: typographyModal
        fontSize: reader.readerFontSize
        fontFamily: reader.readerFontFamily
        readingTheme: reader.readerTheme
        onTypographyChanged: function(size, family, theme) {
            reader.readerFontSize = size
            reader.readerFontFamily = family
            reader.readerTheme = theme
        }
    }

    LibraryDictionaryModal {
        id: dictModal
        onSaveToVocabRequested: function(word, note) {
            if (reader.book) dataController.addVideoWord(reader.book.id, word, note, reader.currentPage)
        }
    }

    LibraryReaderHighlightMenu {
        id: highlightMenu
        onHighlightRequested: function(color) {
            annotationActions.saveSelectionHighlight(highlightMenu.selectedText, "")
        }
        onDictionaryRequested: function(text) {
            dictModal.openForWord(text, "")
        }
    }
}
