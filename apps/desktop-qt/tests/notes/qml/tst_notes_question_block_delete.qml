import QtQuick
import QtTest
import "../../../qml/notes" as Notes

TestCase {
    id: testCase
    name: "NotesQuestionBlockDelete"
    when: windowShown
    width: 640
    height: 360

    property var questionBlock: null

    Component {
        id: blockComponent
        Notes.QuestionBlock {
            controller: QtObject { }
            blockData: ({ attrs: { "data-cached-title": "Target battery" } })
        }
    }

    SignalSpy {
        id: removeSpy
        target: testCase.questionBlock
        signalName: "removeRequested"
    }

    function init() {
        questionBlock = null
        removeSpy.clear()
    }

    function test_cancelKeepsQuestionBlock() {
        questionBlock = createTemporaryObject(blockComponent, testCase)
        verify(questionBlock !== null)
        const dialog = findChild(questionBlock, "notesQuestionBlockDeleteDialog")
        verify(dialog !== null)

        dialog.open()
        verify(dialog.visible)
        dialog.reject()

        compare(removeSpy.count, 0)
        verify(!dialog.visible)
    }

    function test_confirmRequestsOnlyNoteBlockRemoval() {
        questionBlock = createTemporaryObject(blockComponent, testCase)
        verify(questionBlock !== null)
        const dialog = findChild(questionBlock, "notesQuestionBlockDeleteDialog")
        verify(dialog !== null)

        dialog.open()
        dialog.accept()

        compare(removeSpy.count, 1)
        verify(!dialog.visible)
    }
}
