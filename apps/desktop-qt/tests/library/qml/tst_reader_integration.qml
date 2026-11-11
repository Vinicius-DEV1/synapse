import QtQuick
import QtTest
import "../../../qml/library" as Library

TestCase {
    id: testCase
    name: "ReaderIntegration"
    when: windowShown
    width: 1000
    height: 700
    property int savedPage: 0
    property QtObject dataController: QtObject {
        property bool fileOperationRunning: false
        signal libraryBookReady(var result)
        signal libraryPdfPageReady(var result)
        signal filePreviewsInvalidated()
        signal libraryBookSearchReady(var result)
        function updateBookProgress(id, page, total) { testCase.savedPage = page; return true }
    }
    Library.LibraryReaderView {
        id: reader
        isOpen: true
        format: "epub"
        book: ({ id: "book", title: "Test book" })
        totalPages: 2
        chapters: [ { html: "First" }, { html: "Second" } ]
    }
    function test_chapterNavigation() {
        keyClick(Qt.Key_Right)
        compare(reader.currentPage, 2)
        compare(savedPage, 2)
        keyClick(Qt.Key_Left)
        compare(reader.currentPage, 1)
        compare(savedPage, 1)
        var text = findChild(reader, "epubReaderText")
        verify(text !== null)
        text.forceActiveFocus()
        verify(text.activeFocus)
        keyClick(Qt.Key_Right)
        compare(reader.currentPage, 1)
    }
}
