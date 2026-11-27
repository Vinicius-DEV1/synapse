import QtQuick
import QtQuick.Window
import QtTest
import "../../../qml/notes" as Notes
import "../../../qml/notes/DocumentBundleOperations.js" as DocumentBundleOperations
import "../../../qml/notes/NotesMediaWidgetPickerOperations.js" as PickerOperations

TestCase {
    id: testCase
    name: "NotesMediaWidgetPicker"
    when: windowShown
    width: 560
    height: 440

    property var uploader: null
    property var picker: null
    property string emittedHtml: ""

    QtObject {
        id: mockController
        property string lastImportPath: ""
        property string lastRequestId: ""
        property var importPaths: []
        property var existingFiles: []
        property var videos: []
        property var books: []
        signal fileOperationFinished(var result)

        function getFiles(folderId) {
            return existingFiles
        }

        function getVideos() {
            return videos
        }

        function getLibraryBooks(filter) {
            return books
        }

        function importLocalFile(path, folderId, requestId) {
            lastImportPath = path
            lastRequestId = requestId
            importPaths = importPaths.concat([path])
        }
    }

    Component {
        id: uploaderComponent
        Notes.NotesMediaWidgetPickerLocalUpload {
            controller: mockController
            onWidgetHtmlReady: function(html) { testCase.emittedHtml = html }
        }
    }

    Component {
        id: pickerComponent
        Notes.NotesMediaWidgetPickerModal {
            controller: mockController
            onInsertWidgetRequested: function(html) { testCase.emittedHtml = html }
        }
    }

    function init() {
        emittedHtml = ""
        mockController.lastImportPath = ""
        mockController.lastRequestId = ""
        mockController.importPaths = []
        mockController.existingFiles = []
        mockController.videos = []
        mockController.books = []
        uploader = createTemporaryObject(uploaderComponent, testCase)
        verify(uploader !== null)
    }

    function cleanup() {
        if (uploader) uploader.destroy()
        uploader = null
        if (picker) picker.destroy()
        picker = null
    }

    function emitImportResult(overrides) {
        var result = Object.assign({
            operation: "import",
            requestId: mockController.lastRequestId,
            success: true,
            id: "file-7",
            name: "Plano & notas.pdf",
            file_type: "pdf",
            file_size: 2048
        }, overrides || ({}))
        mockController.fileOperationFinished(result)
    }

    function test_localUploadUsesReturnedFileMetadata() {
        uploader.addFiles(["file:///tmp/Plano%20%26%20notas.pdf"])
        uploader.startUpload()

        compare(mockController.lastImportPath, "/tmp/Plano & notas.pdf")
        verify(mockController.lastRequestId.length > 0)
        compare(uploader.waiting, true)
        emitImportResult({})

        verify(emittedHtml.indexOf('data-file-id="file-7"') >= 0)
        verify(emittedHtml.indexOf('data-name="Plano &amp; notas.pdf"') >= 0)
        verify(emittedHtml.indexOf('data-file-type="pdf"') >= 0)
        verify(emittedHtml.indexOf('data-is-link="false"') >= 0)
        compare(uploader.waiting, false)
        compare(uploader.localFiles.length, 0)
    }

    function test_selectedFilesCanBeExtendedDeduplicatedAndRemoved() {
        uploader.addFiles(["file:///tmp/First.pdf", "file:///tmp/Second.pdf"])
        uploader.addFiles(["file:///tmp/Second.pdf", "file:///tmp/Third.pdf"])
        compare(uploader.localFiles.length, 3)
        uploader.removeFile(1)
        compare(uploader.localFiles.length, 2)
        compare(PickerOperations.fileNameFromUrl(uploader.localFiles[1]), "Third.pdf")
    }

    function test_filePickerCommandsUseDistinctUploadAndSelectionSurfaces() {
        compare(PickerOperations.mediaPickerModeForSlashCommand("documento"), "documento")
        compare(PickerOperations.mediaPickerModeForSlashCommand("file-upload"), "documento")
        compare(PickerOperations.mediaPickerModeForSlashCommand("file"), "file-select")
        compare(PickerOperations.mediaPickerModeForSlashCommand("documento-link"), "file-select")
        compare(PickerOperations.mediaPickerModeForSlashCommand("file-link"), "documento-link")

        picker = createTemporaryObject(pickerComponent, testCase)
        verify(picker !== null)
        mockController.existingFiles = [{
            id: "saved-8", name: "Resumo.pdf", file_type: "pdf", file_size: 1024
        }]
        picker.openMode("file-select", "", false)
        compare(picker.activeMode, "file-select")
        compare(picker.listItems.length, 1)
        compare(picker.filteredItems[0].id, "saved-8")
        var selectorUpload = findVisualChild(picker, "notesLocalFileUpload")
        var searchField = findVisualChild(picker, "notesMediaWidgetSearchField")
        var itemList = findVisualChild(picker, "notesMediaWidgetItems")
        verify(selectorUpload !== null)
        verify(searchField !== null)
        compare(searchField.placeholderText, "Buscar arquivos...")
        verify(itemList !== null)
        compare(itemList.itemMode, "file-select")
        var linkedHtml = PickerOperations.widgetHtmlForPickedItem(mockController.existingFiles[0], "file-select")
        verify(linkedHtml.indexOf('data-file-id="saved-8"') >= 0)
        verify(linkedHtml.indexOf('data-file-type="pdf"') >= 0)
        verify(linkedHtml.indexOf('data-is-link="true"') >= 0)

        picker.openMode("documento-link", "", false)
        compare(picker.activeMode, "documento-link")
        compare(selectorUpload.isLink, true)

        picker.openMode("documento", "", false)
        compare(picker.activeMode, "documento")
        compare(selectorUpload.isLink, false)
        compare(itemList.itemMode, "documento")
    }

    function test_mediaPickerSearchesAuthorsAndShowsMetadataAndCovers() {
        picker = createTemporaryObject(pickerComponent, testCase)
        verify(picker !== null)
        mockController.books = [{
            id: "book-1", title: "Systems Design", author: "A. Writer",
            cover_image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E"
        }]
        mockController.videos = [{
            id: "video-1", title: "Qt Basics", duration: 125,
            thumbnail_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E"
        }]

        picker.openMode("livro", "", false)
        var searchField = findVisualChild(picker, "notesMediaWidgetSearchField")
        var itemList = findVisualChild(picker, "notesMediaWidgetItems")
        verify(searchField !== null)
        verify(itemList !== null)
        compare(picker.listItems.length, 1)
        picker.searchFilter = "writer"
        compare(picker.filteredItems.length, 1)
        compare(picker.filteredItems[0].id, "book-1")
        tryVerify(function() { return findVisualChild(itemList, "notesMediaWidgetItem_book-1") !== null })
        var bookRow = findVisualChild(itemList, "notesMediaWidgetItem_book-1")
        var bookSubtitle = findVisualChild(bookRow, "notesMediaWidgetItemSubtitle_book-1")
        var bookCover = findVisualChild(bookRow, "notesMediaWidgetCover_book-1")
        verify(bookSubtitle !== null)
        verify(bookCover !== null)
        compare(bookSubtitle.text, "A. Writer")
        verify(bookCover.source.toString().indexOf("data:image/svg+xml") === 0)
        compare(bookRow.height, 56)

        picker.openMode("video", "", false)
        compare(picker.listItems.length, 1)
        picker.searchFilter = "qt basics"
        compare(picker.filteredItems[0].id, "video-1")
        tryVerify(function() { return findVisualChild(itemList, "notesMediaWidgetItem_video-1") !== null })
        var videoRow = findVisualChild(itemList, "notesMediaWidgetItem_video-1")
        var videoSubtitle = findVisualChild(videoRow, "notesMediaWidgetItemSubtitle_video-1")
        var videoCover = findVisualChild(videoRow, "notesMediaWidgetCover_video-1")
        verify(videoSubtitle !== null)
        verify(videoCover !== null)
        compare(videoSubtitle.text, "2:05")
        verify(videoCover.source.toString().indexOf("data:image/svg+xml") === 0)
    }

    function test_mediaPickerBackdropDoesNotCloseAndCloseButtonDoes() {
        picker = createTemporaryObject(pickerComponent, null)
        verify(picker !== null)
        picker.parent = testCase.Window.window.contentItem
        mockController.videos = [
            { id: "video-2", title: "Keep open", duration: 0 },
            { id: "video-3", title: "Select with Enter", duration: 90 }
        ]
        picker.openMode("video", "", false)
        compare(picker.activeMode, "video")
        tryVerify(function() { return picker.visible })
        var searchField = findVisualChild(picker, "notesMediaWidgetSearchField")
        verify(searchField !== null)
        tryVerify(function() { return searchField.activeFocus })

        mouseClick(picker, 8, 8)
        compare(picker.activeMode, "video")
        tryVerify(function() { return searchField.activeFocus })

        keyClick(Qt.Key_Down)
        compare(picker.selectedIndex, 1)
        keyClick(Qt.Key_Return)
        compare(picker.activeMode, "")
        verify(emittedHtml.indexOf('data-media-id="video-3"') >= 0)

        picker.openMode("video", "", false)

        var closeButton = findVisualChild(picker, "notesMediaWidgetPickerCloseButton")
        verify(closeButton !== null)
        mouseClick(closeButton)
        tryCompare(picker, "activeMode", "")
    }

    function test_pickerCannotCloseDuringEncryptedImport() {
        picker = createTemporaryObject(pickerComponent, testCase)
        verify(picker !== null)
        picker.openMode("documento", "", false)
        var pickerUploader = findVisualChild(picker, "notesLocalFileUpload")
        verify(pickerUploader !== null)
        pickerUploader.addFiles(["file:///tmp/Busy.pdf"])
        pickerUploader.startUpload()

        compare(pickerUploader.busy, true)
        picker.close()
        compare(picker.activeMode, "documento")
        compare(pickerUploader.busy, true)
    }

    function findVisualChild(parentItem, targetName) {
        if (!parentItem || !parentItem.children) return null
        for (var index = 0; index < parentItem.children.length; ++index) {
            var child = parentItem.children[index]
            if (child.objectName === targetName) return child
            var nested = findVisualChild(child, targetName)
            if (nested) return nested
        }
        return null
    }

    function test_staleAndUnrelatedOperationResultsAreIgnored() {
        uploader.addFiles(["file:///tmp/Current.pdf"])
        uploader.startUpload()
        var activeRequestId = mockController.lastRequestId
        mockController.fileOperationFinished({
            operation: "export",
            requestId: activeRequestId,
            success: true,
            id: "wrong-operation"
        })
        mockController.fileOperationFinished({
            operation: "import",
            requestId: "stale-request",
            success: true,
            id: "stale-file"
        })

        compare(emittedHtml, "")
        compare(uploader.waiting, true)
        compare(uploader.pendingRequestId, activeRequestId)
        compare(PickerOperations.localUploadCompletion("", {
            operation: "import",
            success: true,
            id: "unscoped-file"
        }, "error"), null)
    }

    function test_importFailureCanRetryWithoutLosingSelection() {
        uploader.addFiles(["file:///tmp/First.pdf", "file:///tmp/Second.pdf"])
        uploader.groupAsBundle = true
        uploader.startUpload()
        emitImportResult({ id: "file-first", name: "First.pdf", file_type: "pdf", file_size: 10 })
        tryCompare(mockController, "lastImportPath", "/tmp/Second.pdf")
        emitImportResult({ success: false, error: "Vault is locked." })

        compare(uploader.waiting, false)
        compare(uploader.errorMessage, "Vault is locked.")
        compare(uploader.activeFileIndex, 1)
        compare(uploader.importedFiles.length, 1)
        compare(emittedHtml, "")
        var addFilesButton = findVisualChild(uploader, "notesLocalAddFilesButton")
        verify(addFilesButton !== null)
        compare(addFilesButton.enabled, true)
        uploader.addFiles(["file:///tmp/Third.pdf"])
        compare(uploader.localFiles.length, 3)

        uploader.startUpload()
        verify(mockController.lastRequestId.length > 0)
        emitImportResult({ id: "file-second", name: "Second.pdf", file_type: "pdf", file_size: 20 })
        tryCompare(mockController, "lastImportPath", "/tmp/Third.pdf")
        emitImportResult({ id: "file-third", name: "Third.pdf", file_type: "pdf", file_size: 30 })

        tryVerify(function() { return emittedHtml.length > 0 })
        compare((emittedHtml.match(/data-type=\"document-bundle\"/g) || []).length, 1)
        compare((emittedHtml.match(/file-first/g) || []).length, 1)
        compare((emittedHtml.match(/file-second/g) || []).length, 1)
        compare((emittedHtml.match(/file-third/g) || []).length, 1)
        compare(mockController.importPaths.length, 4)
    }

    function test_multipleFilesCanBeGroupedAfterSequentialImports() {
        uploader.addFiles(["file:///tmp/First.pdf", "file:///tmp/Second%20file.epub"])
        compare(uploader.localFiles.length, 2)
        uploader.groupAsBundle = true
        uploader.startUpload()
        compare(mockController.lastImportPath, "/tmp/First.pdf")
        emitImportResult({ id: "file-1", name: "First.pdf", file_type: "pdf", file_size: 100 })
        tryCompare(mockController, "lastImportPath", "/tmp/Second file.epub")
        emitImportResult({ id: "file-2", name: "Second file.epub", file_type: "epub", file_size: 200 })

        tryVerify(function() { return emittedHtml.length > 0 })
        verify(emittedHtml.indexOf('data-type="document-bundle"') >= 0)
        verify(emittedHtml.indexOf('data-title="Documentos"') >= 0)
        verify(emittedHtml.indexOf("file-1") >= 0)
        verify(emittedHtml.indexOf("file-2") >= 0)
        verify(emittedHtml.indexOf("Second file.epub") >= 0)
        var itemsAttribute = emittedHtml.match(/data-items=\"([^\"]+)\"/)
        verify(itemsAttribute !== null)
        var decodedItems = itemsAttribute[1].replace(/&quot;/g, "\"").replace(/&#39;/g, "'")
            .replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&")
        var parsedBundle = DocumentBundleOperations.parseBundleItems({ "data-items": decodedItems })
        compare(parsedBundle.valid, true)
        compare(parsedBundle.items.length, 2)
        compare(parsedBundle.items[0].fileId, "file-1")
        compare(parsedBundle.items[1].fileType, "epub")
        compare(mockController.importPaths.length, 2)
    }

    function test_multipleFilesCanRemainSeparateWhenGroupingIsOff() {
        var html = PickerOperations.widgetHtmlForUploadedFiles([
            { id: "file-a", name: "A.pdf", fileType: "pdf", fileSize: 10 },
            { id: "file-b", name: "B.txt", fileType: "text", fileSize: 20 }
        ], false, "bundle-id")
        compare((html.match(/data-type=\"file-widget\"/g) || []).length, 2)
        compare(html.indexOf("document-bundle"), -1)
        verify(html.indexOf('data-file-size="20"') >= 0)
    }

    function test_uploadedFileLinkFlagMatchesTheRequestedFlow() {
        var linked = PickerOperations.widgetHtmlForUploadedFiles([
            { id: "linked-upload", name: "Linked.pdf", fileType: "pdf", fileSize: 50, isLink: true }
        ], false)
        verify(linked.indexOf('data-is-link="true"') >= 0)
        var bundle = PickerOperations.widgetHtmlForUploadedFiles([
            { id: "linked-a", name: "A.pdf", fileType: "pdf", fileSize: 10, isLink: true },
            { id: "linked-b", name: "B.pdf", fileType: "pdf", fileSize: 20, isLink: true }
        ], true)
        verify(bundle.indexOf('data-type="document-bundle"') >= 0)
        var itemsAttribute = bundle.match(/data-items=\"([^\"]+)\"/)
        verify(itemsAttribute !== null)
        var serialized = itemsAttribute[1].replace(/&quot;/g, "\"").replace(/&#39;/g, "'")
            .replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&")
        var parsed = DocumentBundleOperations.parseBundleItems({ "data-items": serialized })
        compare(parsed.valid, true)
        compare(parsed.items[0].isLink, true)
        compare(parsed.items[1].isLink, true)
    }

    function test_fileUrlDecodesSpacesPercentAndWindowsSeparators() {
        compare(PickerOperations.filePathFromUrl("file:///tmp/My%20file%25.pdf"), "/tmp/My file%.pdf")
        compare(PickerOperations.filePathFromUrl("file:///C:/Docs/Notes.pdf"), "C:/Docs/Notes.pdf")
        compare(PickerOperations.fileNameFromUrl("file:///tmp/My%20file%25.pdf"), "My file%.pdf")
        compare(PickerOperations.fileNameFromUrl("file:///C:/Docs/Notes.pdf"), "Notes.pdf")
    }
}
