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
        mockController.batteries = [{ id: "battery-existing-42", title: "Review", question_count: 3 }]
        mockController.lastCreateArguments = []
        mockController.createdId = "battery-created-1"
        modal = createTemporaryObject(modalComponent, testCase)
        verify(modal !== null)
    }

    function test_createUsesCoreIdAndCurrentPageContext() {
        modal.openMode("question", { query: "New review" })
        var form = findChild(modal, "notesQuestionCreateForm")
        verify(form !== null)
        compare(form.pageId, "notes-page-7")
        modal.searchFilter = "New review"
        form.createBattery()

        compare(mockController.lastCreateArguments, ["New review", "", "notes-page-7"])
        verify(insertedHtml.indexOf('data-battery-id="battery-created-1"') >= 0)
        verify(insertedHtml.indexOf('data-battery-id="true"') < 0)
        verify(insertedHtml.indexOf('data-cached-title="New review"') >= 0)
        compare(closeCount, 1)
    }

    function test_existingBatterySelectionUsesItsRealId() {
        modal.openMode("question", {})
        var form = findChild(modal, "notesQuestionCreateForm")
        verify(form !== null)
        form.insertBattery(mockController.batteries[0])

        verify(insertedHtml.indexOf('data-battery-id="battery-existing-42"') >= 0)
        verify(insertedHtml.indexOf('data-battery-id="true"') < 0)
        compare(closeCount, 1)
    }

    function test_failedCreateKeepsModalOpenAndShowsFeedback() {
        mockController.createdId = ""
        modal.openMode("question", { query: "New review" })
        var form = findChild(modal, "notesQuestionCreateForm")
        verify(form !== null)
        modal.searchFilter = "New review"
        form.createBattery()

        verify(form.errorMessage.length > 0)
        compare(insertedHtml, "")
        compare(closeCount, 0)
    }

    function test_questionFormMatchesReactFieldAndEmptyStateHierarchy() {
        modal.openMode("question", {})
        var form = findChild(modal, "notesQuestionCreateForm")
        var title = findChild(modal, "notesSetupModalTitle")
        var helpIcon = findChild(modal, "notesSetupModalContextIcon")
        var card = findChild(modal, "notesSetupModalCard")
        var titleField = findChild(modal, "notesQuestionTitleField")
        var createButton = findChild(modal, "notesQuestionCreateButton")
        var heading = findChild(modal, "notesQuestionExistingHeading")
        var viewport = findChild(modal, "notesQuestionResultsViewport")
        var emptyState = findChild(modal, "notesQuestionEmptyState")
        var emptyMessage = findChild(modal, "notesQuestionEmptyMessage")

        compare(title.text, "Criar Widget de Questões")
        verify(helpIcon !== null)
        compare(helpIcon.name, "help")
        compare(helpIcon.width, 18)
        compare(helpIcon.height, 18)
        compare(card.width, 450)
        compare(titleField.height, 48)
        verify(!createButton.enabled)
        compare(heading.text, "Widgets Existentes no App")
        compare(form.filteredBatteries.length, 1)
        compare(form.resultsViewportHeight, 48)
        modal.searchFilter = "No matching battery"
        compare(form.filteredBatteries.length, 0)
        compare(form.resultsViewportHeight, 80)
        verify(emptyState !== null)
        compare(emptyMessage.text, "Nenhuma bateria encontrada.")
        mockController.batteries = [{ id: "a", title: "A" }, { id: "b", title: "B" },
                                    { id: "c", title: "C" }, { id: "d", title: "D" },
                                    { id: "e", title: "E" }]
        modal.searchFilter = ""
        modal.openMode("question", {})
        compare(form.filteredBatteries.length, 5)
        compare(form.resultsViewportHeight, 220)
    }
}
