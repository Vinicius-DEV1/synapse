import QtQuick 2.15
import QtTest 1.2
import "../../../qml/notes" as Notes

TestCase {
    id: testCase
    name: "NotesFileAttachmentRoute"
    when: windowShown
    width: 720
    height: 260

    property string requestedFileId: ""
    property string requestedFileName: ""
    property bool requestedOpenActions: false
    property bool requestedAudio: false
    property bool requestedFolder: false

    QtObject {
        id: mockController
        signal filesChanged()
        function getFileWidgetMetadata(fileId) {
            return { id: fileId, name: "Study folder", file_type: testCase.currentType, file_size: 0 }
        }
    }

    property string currentType: "folder"

    Notes.FileAttachmentWidget {
        id: attachment
        width: 600
        controller: mockController
        blockData: ({ attrs: {
            "data-file-id": "attachment-1",
            "data-name": "Study folder",
            "data-file-type": testCase.currentType
        } })
        onPreviewFileRequested: function(fileId, fileName, showOpenActions, playAudio, openFolder) {
            testCase.requestedFileId = fileId
            testCase.requestedFileName = fileName
            testCase.requestedOpenActions = showOpenActions
            testCase.requestedAudio = playAudio
            testCase.requestedFolder = openFolder
        }
    }

    function resetResult() {
        requestedFileId = ""
        requestedFileName = ""
        requestedOpenActions = false
        requestedAudio = false
        requestedFolder = false
    }

    function init() {
        currentType = "folder"
        attachment.blockData = ({ attrs: {
            "data-file-id": "attachment-1",
            "data-name": "Study folder",
            "data-file-type": "folder"
        } })
        resetResult()
    }

    function test_folderAttachmentRequestsFolderNavigation() {
        currentType = "folder"
        resetResult()
        attachment.openFilePreview()
        compare(requestedFileId, "attachment-1")
        compare(requestedFileName, "Study folder")
        verify(!requestedOpenActions)
        verify(!requestedAudio)
        verify(requestedFolder)
    }

    function test_nonFolderAttachmentDoesNotRequestFolderNavigation() {
        currentType = "document"
        attachment.blockData = ({ attrs: {
            "data-file-id": "attachment-document",
            "data-name": "Guide.txt",
            "data-file-type": "document"
        } })
        resetResult()
        attachment.openFilePreview()
        compare(requestedFileId, "attachment-document")
        verify(!requestedOpenActions)
        verify(!requestedAudio)
        verify(!requestedFolder)
    }

    function test_audioFilenameKeepsAudioRoute() {
        currentType = "other"
        attachment.blockData = ({ attrs: {
            "data-file-id": "attachment-audio",
            "data-name": "Lecture.MP3",
            "data-file-type": "other"
        } })
        resetResult()
        attachment.openFilePreview()
        compare(requestedFileId, "attachment-audio")
        verify(!requestedOpenActions)
        verify(requestedAudio)
        verify(!requestedFolder)
    }

    function test_pdfAttachmentRequestsDocumentActions() {
        currentType = "pdf"
        attachment.blockData = ({ attrs: {
            "data-file-id": "attachment-pdf",
            "data-name": "Guide.pdf",
            "data-file-type": "pdf"
        } })
        resetResult()
        attachment.openFilePreview()
        compare(requestedFileId, "attachment-pdf")
        verify(requestedOpenActions)
        verify(!requestedAudio)
        verify(!requestedFolder)
    }
}
