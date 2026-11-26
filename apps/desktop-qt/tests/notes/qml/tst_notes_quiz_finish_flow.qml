import QtQuick
import QtTest
import "../../../qml/questions" as Questions

TestCase {
    id: testCase
    name: "NotesQuizFinishFlow"
    when: windowShown
    width: 900
    height: 640

    property var quizModal: null

    Component {
        id: quizModalComponent
        Questions.QuizSequentialFocusModal {
            requireFinishConfirmation: true
        }
    }

    function init() {
        quizModal = createTemporaryObject(quizModalComponent, testCase)
        verify(quizModal !== null)
        quizModal.startQuiz("battery-42", "Target battery", [{
            id: "question-1",
            battery_id: "battery-42",
            type: "multiple_choice",
            question: "Which answer is correct?",
            options: "[\"A\",\"B\"]",
            correct_index: 0,
            correctIndex: 0
        }])
    }

    function test_lastQuestionOpensFinishConfirmationBeforeResults() {
        quizModal.selectedOption = 0
        quizModal.handleConfirmOrNext()
        compare(quizModal.answeredCount, 1)
        quizModal.handleConfirmOrNext()

        verify(quizModal.showFinishConfirmation)
        verify(!quizModal.isCompleted)
        const dialog = findChild(quizModal, "notesQuizFinishConfirmDialog")
        verify(dialog !== null)
        compare(dialog.answeredCount, 1)

        dialog.accept()
        verify(quizModal.isCompleted)
        verify(!quizModal.showFinishConfirmation)
    }

    function test_reviewReturnsToQuestionWithoutCompleting() {
        quizModal.selectedOption = 0
        quizModal.handleConfirmOrNext()
        quizModal.handleConfirmOrNext()
        verify(quizModal.showFinishConfirmation)

        const dialog = findChild(quizModal, "notesQuizFinishConfirmDialog")
        verify(dialog !== null)
        dialog.reject()

        verify(!quizModal.showFinishConfirmation)
        verify(!quizModal.isCompleted)
        compare(quizModal.currentIndex, 0)
    }
}
