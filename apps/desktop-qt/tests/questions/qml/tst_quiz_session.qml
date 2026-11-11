import QtQuick
import QtTest
import "../../../qml/questions" as Questions

TestCase {
    id: testCase
    name: "QuizSessionFlow"
    when: windowShown
    width: 900
    height: 700

    property int attempts: 0
    property QtObject dataController: QtObject {
        function getQuizBatteries() { return [] }
        function getQuizStats() { return ({}) }
        function getAllQuizTags() { return [] }
        function getAllQuizQuestions() {
            return [
                { id: "q1", battery_id: "b1", question: "First", options: '["A","B"]', correct_index: 0 },
                { id: "q2", battery_id: "b1", question: "Second", options: '["A","B"]', correct_index: 1 }
            ]
        }
        function recordQuizAttempt(batteryId, questionId, selected, correct) {
            testCase.attempts++
            return true
        }
    }

    Component { id: quizComponent; Questions.ZenQuizView { width: 900; height: 700 } }

    function test_summaryReviewCycle() {
        attempts = 0
        var quiz = createTemporaryObject(quizComponent, testCase)
        verify(quiz !== null)
        quiz.startBatterySession(null)
        compare(quiz.totalQuestions, 2)
        quiz.selectOption(0)
        quiz.confirmOrNext()
        quiz.confirmOrNext()
        quiz.selectOption(0)
        quiz.confirmOrNext()
        quiz.confirmOrNext()
        compare(attempts, 2)
        compare(quiz.score, 1)
        verify(quiz.isFinishDialogOpen)
        quiz.confirmOrNext()
        quiz.selectOption(1)
        compare(attempts, 2)
        compare(quiz.score, 1)
        var results = findChild(quiz, "quizResults")
        verify(results !== null)
        results.reviewQuestionRequested(0)
        verify(quiz.isSessionActive)
        verify(quiz.isReviewingResult)
        compare(quiz.selectedOption, 0)
        quiz.confirmOrNext()
        compare(quiz.currentIndex, 1)
        compare(quiz.selectedOption, 0)
        quiz.confirmOrNext()
        verify(quiz.isFinishDialogOpen)
        compare(attempts, 2)
        results.reviewQuestionRequested(1)
        quiz.exitSession()
        verify(quiz.isFinishDialogOpen)
        results.restartSession()
        verify(quiz.isSessionActive)
        compare(quiz.score, 0)
        compare(quiz.sessionAnswers.length, 0)
        quiz.exitSession()
        quiz.selectOption(0)
        quiz.confirmOrNext()
        compare(attempts, 2)
        quiz.startBatterySession(null)
        quiz.selectOption(0)
        quiz.confirmOrNext()
        quiz.confirmOrNext()
        quiz.selectOption(1)
        quiz.confirmOrNext()
        quiz.confirmOrNext()
        results.returnToBatteries()
        verify(!quiz.isSessionActive)
        verify(!quiz.isFinishDialogOpen)
        compare(quiz.sessionQuestions.length, 0)
    }
}
