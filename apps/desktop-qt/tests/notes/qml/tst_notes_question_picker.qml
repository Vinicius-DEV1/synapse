import QtQuick
import QtTest
import "../../../qml/notes" as Notes

TestCase {
    id: testCase
    name: "NotesQuestionPicker"
    when: windowShown
    width: 560
    height: 560

    property var modal: null
    property int closeCount: 0
    property string insertedHtml: ""

    QtObject {
        id: mockController
        property var batteries: []
        property var lastCreateArguments: []
        property string createdId: "battery-created-1"

        function getQuizBatteries() {
            return batteries
        }

        function createNoteQuizBattery(title, description, pageId) {
            lastCreateArguments = [title, description, pageId]
            return createdId
        }
    }

    Component {
        id: modalComponent
        Notes.NotesSetupWidgetsModal {
            controller: mockController
            pageId: "notes-page-7"
            onClosed: testCase.closeCount += 1
            onInsertWidgetRequested: function(html) { testCase.insertedHtml = html }
        }
    }

    function init() {
        closeCount = 0
        insertedHtml = ""
        mockController.batteries = [{ id: "battery-existing-42", title: "Review" }]
        mockController.lastCreateArguments = []
        mockController.createdId = "battery-created-1"
        modal = createTemporaryObject(modalComponent, testCase)
        verify(modal !== null)
    }

    function test_createUsesCoreIdAndCurrentPageContext() {
        modal.openMode("question", { query: "New review" })
        var panel = findChild(modal, "notesSetupWidgetPickerPanel")
        verify(panel !== null)
        compare(panel.pageId, "notes-page-7")
        panel.searchFilter = "New review"
        panel.createQuickRecord()

        compare(mockController.lastCreateArguments, ["New review", "", "notes-page-7"])
        verify(insertedHtml.indexOf('data-battery-id="battery-created-1"') >= 0)
        verify(insertedHtml.indexOf('data-battery-id="true"') < 0)
        verify(insertedHtml.indexOf('data-cached-title="New review"') >= 0)
        compare(closeCount, 1)
    }

    function test_existingBatterySelectionUsesItsRealId() {
        modal.openMode("question", {})
        var panel = findChild(modal, "notesSetupWidgetPickerPanel")
        verify(panel !== null)
        panel.insertPickedItem(mockController.batteries[0])

        verify(insertedHtml.indexOf('data-battery-id="battery-existing-42"') >= 0)
        verify(insertedHtml.indexOf('data-battery-id="true"') < 0)
        compare(closeCount, 1)
    }

    function test_failedCreateKeepsModalOpenAndShowsFeedback() {
        mockController.createdId = ""
        modal.openMode("question", { query: "New review" })
        var panel = findChild(modal, "notesSetupWidgetPickerPanel")
        verify(panel !== null)
        panel.searchFilter = "New review"
        panel.createQuickRecord()

        verify(panel.errorMessage.length > 0)
        compare(insertedHtml, "")
        compare(closeCount, 0)
    }
}
