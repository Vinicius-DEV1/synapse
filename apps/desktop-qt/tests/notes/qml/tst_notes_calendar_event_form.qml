pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Window
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
    property bool failCreate: false

    QtObject {
        id: mockController
        property var lastCreateArguments: []

        function createNoteCalendarEvent(title, description, start, end, type, color, pageId, reminders, recurrence) {
            testCase.createCount += 1
            lastCreateArguments = [title, description, start, end, type, color, pageId, reminders, recurrence]
            if (testCase.failCreate) return { error: "Calendar is locked." }
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

    Component {
        id: setupModalComponent
        Notes.NotesSetupWidgetsModal {
            controller: mockController
            pageId: "page-4"
            pageTitle: "Study plan"
        }
    }

    function init() {
        closeCount = 0
        createCount = 0
        insertedHtml = ""
        failCreate = false
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

    function test_eventFieldsExposeReactLabelsDefaultsAndInitialFocus() {
        var titleLabel = findChild(form, "notesCalendarEventTitleLabel")
        var titleField = findChild(form, "notesCalendarEventTitleField")
        var typeLabel = findChild(form, "notesCalendarEventTypeLabel")
        var typeSelector = findChild(form, "notesCalendarEventTypeSelector")
        var timeField = findChild(form, "notesCalendarEventTimeField")
        verify(titleLabel !== null)
        verify(titleField !== null)
        verify(typeLabel !== null)
        verify(typeSelector !== null)
        verify(timeField !== null)
        compare(titleLabel.text, "Título do Evento *")
        compare(titleField.placeholderText, "Ex: Mentoria 01 - Arquitetura")
        compare(typeLabel.text, "Tipo de Evento")
        compare(timeField.text, "14:00")
        compare(form.eventType, "mentoria")
        compare(form.selectedReminders, [1440, 120, 15, 0])
        tryVerify(function() { return titleField.activeFocus })
        keyClick(Qt.Key_Return)
        compare(createCount, 1)
        compare(closeCount, 1)
    }

    function test_failedCoreCreateShowsRetryableError() {
        failCreate = true
        var createButton = findChild(form, "notesCalendarEventCreateButton")
        verify(createButton !== null)
        createButton.click()
        compare(createCount, 1)
        compare(closeCount, 0)
        compare(insertedHtml, "")
        compare(form.errorMessage, "Calendar is locked.")
        verify(createButton.enabled)
        failCreate = false
        createButton.click()
        compare(createCount, 2)
        compare(closeCount, 1)
    }

    function test_setupModalUsesReactResponsiveEventCard() {
        var setupModal = createTemporaryObject(setupModalComponent,
            testCase.Window.window.contentItem)
        verify(setupModal !== null)
        setupModal.openMode("evento", { title: "Review session" })

        var card = findChild(setupModal, "notesSetupModalCard")
        var title = findChild(setupModal, "notesSetupModalTitle")
        var calendarIcon = findChild(setupModal, "notesCalendarEventHeaderIcon")
        verify(card !== null)
        verify(title !== null)
        verify(calendarIcon !== null)
        compare(card.width, 448)
        compare(title.text, "Criar Evento na Agenda")
        compare(calendarIcon.width, 18)

        testCase.width = 360
        tryCompare(card, "width", 328)
        testCase.width = 560
    }
}
