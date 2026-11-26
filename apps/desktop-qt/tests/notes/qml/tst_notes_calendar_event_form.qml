import QtQuick
import QtTest
import "../../../qml/notes" as Notes

TestCase {
    id: testCase
    name: "NotesCalendarEventForm"
    when: windowShown
    width: 560
    height: 440

    property var form: null
    property int closeCount: 0
    property int createCount: 0
    property string insertedHtml: ""

    QtObject {
        id: mockController
        property var lastCreateArguments: []

        function createNoteCalendarEvent(title, description, start, end, type, color, pageId, reminders, recurrence) {
            createCount += 1
            lastCreateArguments = [title, description, start, end, type, color, pageId, reminders, recurrence]
            return { id: "event-17", title: title, start_date: start, status: "pending" }
        }
    }

    Component {
        id: formComponent
        Notes.NotesCalendarEventForm {
            controller: mockController
            onInsertWidgetRequested: function(html) { testCase.insertedHtml = html }
            onCloseRequested: testCase.closeCount += 1
        }
    }

    function init() {
        closeCount = 0
        createCount = 0
        insertedHtml = ""
        mockController.lastCreateArguments = []
        form = createTemporaryObject(formComponent, testCase)
        verify(form !== null)
        form.openForTitle("Review session")
    }

    function test_cancelButtonClosesWithoutCreatingAnEvent() {
        var cancelButton = findChild(form, "notesCalendarEventCancelButton")
        verify(cancelButton !== null)
        compare(cancelButton.text, "Cancelar")
        cancelButton.click()
        compare(closeCount, 1)
        compare(createCount, 0)
        compare(insertedHtml, "")
    }

    function test_createButtonBuildsLinkedEventAndCloses() {
        var createButton = findChild(form, "notesCalendarEventCreateButton")
        verify(createButton !== null)
        compare(createButton.text, "Criar Evento Inline")
        verify(createButton.enabled)
        form.pageId = "page-4"
        form.pageTitle = "Study plan"
        createButton.click()
        compare(createCount, 1)
        compare(mockController.lastCreateArguments[0], "Review session")
        compare(mockController.lastCreateArguments[1], "Evento vinculado à página: Study plan")
        compare(mockController.lastCreateArguments[4], "mentoria")
        compare(mockController.lastCreateArguments[6], "page-4")
        compare(mockController.lastCreateArguments[7], [1440, 120, 15, 0])
        verify(insertedHtml.indexOf('data-event-id="event-17"') >= 0)
        verify(insertedHtml.indexOf('data-page-id="page-4"') >= 0)
        compare(closeCount, 1)
    }
}
