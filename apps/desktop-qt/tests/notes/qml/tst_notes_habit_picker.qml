import QtQuick
import QtTest
import "../../../qml/notes" as Notes

TestCase {
    id: testCase
    name: "NotesHabitPicker"
    when: windowShown
    width: 560
    height: 560

    property var modal: null
    property int closeCount: 0
    property string insertedHtml: ""

    QtObject {
        id: mockController
        property var habits: []
        property var lastCreateArguments: []
        property int nextId: 1

        function getHabits() {
            return habits
        }

        function createHabit(title, color, icon, targetDays) {
            lastCreateArguments = [title, color, icon, targetDays]
            habits = habits.concat([{
                id: "new-habit-" + nextId,
                title: title,
                color: color,
                icon: icon,
                target_days_per_week: targetDays
            }])
            nextId += 1
            return true
        }
    }

    Component {
        id: modalComponent
        Notes.NotesSetupWidgetsModal {
            controller: mockController
            onClosed: testCase.closeCount += 1
            onInsertWidgetRequested: function(html) { testCase.insertedHtml = html }
        }
    }

    function init() {
        closeCount = 0
        insertedHtml = ""
        mockController.habits = [{
            id: "habit-1", title: "Meditate", color: "#10b981", icon: "🔥", current_streak: 2
        }]
        mockController.lastCreateArguments = []
        mockController.nextId = 1
        modal = createTemporaryObject(modalComponent, testCase)
        verify(modal !== null)
    }

    function test_duplicateHabitTitleCannotBeCreatedWithDifferentCase() {
        modal.openMode("habito", { query: "mEDITate" })
        var panel = findChild(modal, "notesSetupWidgetPickerPanel")
        verify(panel !== null)
        compare(panel.hasHabitTitleCollision, true)
        compare(panel.showCreateAction, false)
        panel.createQuickRecord()
        compare(mockController.habits.length, 1)
        compare(mockController.lastCreateArguments.length, 0)
        compare(closeCount, 0)
    }

    function test_createHabitUsesReactDefaultsAndLinksTheReturnedRecordId() {
        modal.openMode("habito", { query: "Walk" })
        var panel = findChild(modal, "notesSetupWidgetPickerPanel")
        verify(panel !== null)
        compare(panel.showCreateAction, true)
        panel.createQuickRecord()
        compare(mockController.lastCreateArguments, ["Walk", "#10b981", "🔥", 7])
        verify(insertedHtml.indexOf('data-habit-id="new-habit-1"') >= 0)
        verify(insertedHtml.indexOf('data-habit-id="true"') < 0)
        verify(insertedHtml.indexOf('data-title="Walk"') >= 0)
        compare(closeCount, 1)
    }

    function test_existingHabitSelectionUsesItsRealId() {
        modal.openMode("habito", {})
        var existingHabit = findChild(modal, "notesSetupPickerItem")
        verify(existingHabit !== null)
        existingHabit.click()
        verify(insertedHtml.indexOf('data-habit-id="habit-1"') >= 0)
        verify(insertedHtml.indexOf('data-title="Meditate"') >= 0)
        compare(closeCount, 1)
    }
}
