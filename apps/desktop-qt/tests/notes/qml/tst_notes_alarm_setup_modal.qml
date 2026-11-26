import QtQuick
import QtTest
import "../../../qml/notes" as Notes

TestCase {
    id: testCase
    name: "NotesAlarmSetupModal"
    when: windowShown
    width: 800
    height: 720

    property var modal: null
    property int closeCount: 0
    property int createCount: 0
    property string insertedHtml: ""

    QtObject {
        id: mockController
        property var lastCreateArguments: []

        function getAlarms() {
            return [{ id: "alarm-2", label: "Morning", time: "07:30" }]
        }

        function createAlarm(time, label, sound, active, days) {
            createCount += 1
            lastCreateArguments = [time, label, sound, active, days]
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
        createCount = 0
        insertedHtml = ""
        mockController.lastCreateArguments = []
        modal = createTemporaryObject(modalComponent, testCase)
        verify(modal !== null)
        modal.openMode("alarme", { timeStr: "07:30" })
    }

    function test_alarmModalMatchesReactLabelsLayoutAndPrefill() {
        var timeLabel = findChild(modal, "notesAlarmTimeLabel")
        var labelHeading = findChild(modal, "notesAlarmOptionalLabel")
        var timeField = findChild(modal, "notesAlarmTimeField")
        var labelField = findChild(modal, "notesAlarmLabelField")
        var saveButton = findChild(modal, "notesAlarmSaveButton")
        var title = findChild(modal, "notesSetupModalTitle")
        var card = findChild(modal, "notesSetupModalCard")
        verify(timeLabel !== null)
        verify(labelHeading !== null)
        verify(timeField !== null)
        verify(labelField !== null)
        verify(saveButton !== null)
        verify(title !== null)
        verify(card !== null)
        compare(title.text, "Novo Alarme")
        compare(timeLabel.text, "HORÁRIO")
        compare(labelHeading.text, "RÓTULO (OPCIONAL)")
        compare(timeField.text, "07:30")
        compare(labelField.placeholderText, "Ex: Acordar, Almoço")
        compare(saveButton.text, "SALVAR ALARME")
        compare(card.width, 672)
        verify(timeField.font.pixelSize >= 48)
    }

    function test_alarmSaveUsesCurrentFieldsAndClosesOnce() {
        var timeField = findChild(modal, "notesAlarmTimeField")
        var labelField = findChild(modal, "notesAlarmLabelField")
        var saveButton = findChild(modal, "notesAlarmSaveButton")
        labelField.text = "Wake up"
        saveButton.click()
        compare(createCount, 1)
        compare(mockController.lastCreateArguments, ["07:30", "Wake up", "", true, ""])
        compare(closeCount, 1)
        compare(insertedHtml, "")
    }

    function test_invalidTimeDoesNotCreateAlarm() {
        var timeField = findChild(modal, "notesAlarmTimeField")
        var saveButton = findChild(modal, "notesAlarmSaveButton")
        timeField.text = "25:80"
        verify(!saveButton.enabled)
        saveButton.click()
        compare(createCount, 0)
        compare(closeCount, 0)
    }

    function test_existingAlarmCanStillBeLinked() {
        var linkButton = findChild(modal, "notesAlarmLinkExistingButton")
        var alarmForm = findChild(modal, "notesAlarmSetupForm")
        var existingList = findChild(modal, "notesAlarmExistingList")
        verify(linkButton !== null)
        verify(alarmForm !== null)
        verify(existingList !== null)
        compare(alarmForm.alarmItems.length, 1)
        linkButton.click()
        compare(alarmForm.alarmLinksExpanded, true)
        var existingAlarm = findChild(modal, "notesAlarmExistingItem")
        verify(existingAlarm !== null)
        existingAlarm.click()
        verify(insertedHtml.indexOf('data-alarm-id="alarm-2"') >= 0)
        verify(insertedHtml.indexOf('data-time="07:30"') >= 0)
        verify(insertedHtml.indexOf('data-label="Morning"') >= 0)
        compare(closeCount, 1)
    }
}
