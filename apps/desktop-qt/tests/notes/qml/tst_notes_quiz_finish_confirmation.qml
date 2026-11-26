import QtQuick
import QtTest
import "../../../qml/notes" as Notes

TestCase {
    id: testCase
    name: "NotesQuizFinishConfirmation"
    when: windowShown
    width: 640
    height: 360

    property var finishDialog: null

    Component {
        id: dialogComponent
        Notes.NotesQuizFinishConfirmDialog {
            total: 4
            answeredCount: 3
        }
    }

    SignalSpy {
        id: confirmedSpy
        target: testCase.finishDialog
        signalName: "confirmed"
    }

    SignalSpy {
        id: cancelledSpy
        target: testCase.finishDialog
        signalName: "cancelled"
    }

    function init() {
        finishDialog = null
        confirmedSpy.clear()
        cancelledSpy.clear()
    }

    function test_unansweredStatusAndReviewAction() {
        finishDialog = createTemporaryObject(dialogComponent, testCase)
        verify(finishDialog !== null)
        compare(finishDialog.pendingCount, 1)
        verify(!finishDialog.allAnswered)
        compare(finishDialog.statusText, "3 de 4 questões respondidas (1 pendente)")

        finishDialog.open()
        finishDialog.reject()

        compare(cancelledSpy.count, 1)
        compare(confirmedSpy.count, 0)
        verify(!finishDialog.visible)
    }

    function test_allAnsweredStatusAndConfirmAction() {
        finishDialog = createTemporaryObject(dialogComponent, testCase)
        verify(finishDialog !== null)
        finishDialog.answeredCount = 4
        compare(finishDialog.pendingCount, 0)
        verify(finishDialog.allAnswered)
        compare(finishDialog.statusText, "Todas as 4 questões respondidas")

        finishDialog.open()
        finishDialog.accept()

        compare(confirmedSpy.count, 1)
        compare(cancelledSpy.count, 0)
        verify(!finishDialog.visible)
    }

    function test_backdropCloseCancelsFinish() {
        finishDialog = createTemporaryObject(dialogComponent, testCase)
        verify(finishDialog !== null)
        finishDialog.open()
        finishDialog.close()

        compare(cancelledSpy.count, 1)
        compare(confirmedSpy.count, 0)
    }
}
