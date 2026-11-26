import QtQuick
import QtTest
import "../../../qml/notes" as Notes
import "../../../qml/notes/NotesMediaWidgetPickerOperations.js" as PickerOperations

TestCase {
    id: testCase
    name: "NotesMediaWidgetPicker"
    when: windowShown
    width: 560
    height: 440

    property var picker: null
    property string insertedHtml: ""

    QtObject {
        id: mockController
        signal fileOperationFinished(var result)
        function getFiles(folderId) { return [] }
    }

    Component {
        id: pickerComponent
        Notes.NotesMediaWidgetPickerModal {
            controller: mockController
            onInsertWidgetRequested: function(html) { testCase.insertedHtml = html }
        }
    }

    function init() {
        insertedHtml = ""
        picker = createTemporaryObject(pickerComponent, testCase)
        verify(picker !== null)
    }

    function cleanup() {
        if (picker) picker.destroy()
        picker = null
    }

    function test_localUploadUsesMatchingImportResult() {
        picker.openMode("documento", "", false)
        picker.pendingLocalUploadRequestId = "upload-current"
        picker.waitingLocalUpload = true

        mockController.fileOperationFinished({
            operation: "import",
            requestId: "upload-current",
            success: true,
            id: "file-7",
            name: "Plano & notas.pdf",
            file_type: "pdf",
            file_size: 2048
        })

        verify(insertedHtml.indexOf('data-file-id="file-7"') >= 0)
        verify(insertedHtml.indexOf('data-name="Plano &amp; notas.pdf"') >= 0)
        verify(insertedHtml.indexOf('data-file-type="pdf"') >= 0)
        compare(picker.activeMode, "")
        compare(picker.waitingLocalUpload, false)
    }

    function test_staleAndUnrelatedOperationResultsAreIgnored() {
        picker.openMode("documento", "", false)
        picker.pendingLocalUploadRequestId = "upload-current"
        picker.waitingLocalUpload = true

        mockController.fileOperationFinished({
            operation: "export",
            requestId: "upload-current",
            success: true,
            id: "wrong-operation"
        })
        mockController.fileOperationFinished({
            operation: "import",
            requestId: "upload-old",
            success: true,
            id: "stale-file"
        })

        compare(insertedHtml, "")
        compare(picker.waitingLocalUpload, true)
        compare(picker.pendingLocalUploadRequestId, "upload-current")
        compare(PickerOperations.localUploadCompletion("", {
            operation: "import",
            success: true,
            id: "unscoped-file"
        }, "error"), null)
    }

    function test_importFailureLeavesDialogOpenWithFeedback() {
        picker.openMode("documento", "", false)
        picker.pendingLocalUploadRequestId = "upload-current"
        picker.waitingLocalUpload = true

        mockController.fileOperationFinished({
            operation: "import",
            requestId: "upload-current",
            success: false,
            error: "Vault is locked."
        })

        compare(insertedHtml, "")
        compare(picker.activeMode, "documento")
        compare(picker.localUploadError, "Vault is locked.")
        compare(picker.waitingLocalUpload, false)
    }

    function test_localFileUrlDecodesPathSeparatorsAndPercentSigns() {
        compare(PickerOperations.filePathFromUrl("file:///tmp/My%20file%25.pdf"), "/tmp/My file%.pdf")
    }
}
