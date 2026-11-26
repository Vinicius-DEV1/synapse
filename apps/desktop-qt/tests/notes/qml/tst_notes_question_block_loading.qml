import QtQuick
import QtTest
import "../../../qml/notes" as Notes

TestCase {
    id: testCase
    name: "NotesQuestionBlockLoading"
    when: windowShown
    width: 600
    height: 320

    property var block: null

    QtObject {
        id: mockController
        property int batterySummaryCalls: 0
        property int batteryQuestionCalls: 0
        property int singleQuestionCalls: 0
        property int allBatteryListCalls: 0
        property int allQuestionListCalls: 0
        property string lastBatteryId: ""
        property string lastQuestionId: ""

        function getQuizBattery(batteryId) {
            batterySummaryCalls += 1
            lastBatteryId = batteryId
            return {
                id: batteryId,
                title: "Target battery",
                description: "Point lookup summary",
                question_count: 2
            }
        }

        function getBatteryQuestions(batteryId) {
            batteryQuestionCalls += 1
            lastBatteryId = batteryId
            return [{ id: "q-1", battery_id: batteryId, question: "First question" }]
        }

        function getQuizQuestion(questionId) {
            singleQuestionCalls += 1
            lastQuestionId = questionId
            return { id: questionId, question: "Single question" }
        }

        function getQuizBatteries() {
            allBatteryListCalls += 1
            return []
        }

        function getAllQuizQuestions() {
            allQuestionListCalls += 1
            return []
        }
    }

    Component {
        id: batteryBlockComponent
        Notes.QuestionBlock {
            controller: mockController
            blockData: ({ attrs: {
                "data-battery-id": "battery-42",
                "data-cached-title": "Cached title",
                "data-cached-count": "2"
            } })
        }
    }

    Component {
        id: questionBlockComponent
        Notes.QuestionBlock {
            controller: mockController
            blockData: ({ attrs: { "data-question-id": "question-7" } })
        }
    }

    function init() {
        mockController.batterySummaryCalls = 0
        mockController.batteryQuestionCalls = 0
        mockController.singleQuestionCalls = 0
        mockController.allBatteryListCalls = 0
        mockController.allQuestionListCalls = 0
        mockController.lastBatteryId = ""
        mockController.lastQuestionId = ""
        block = null
    }

    function test_batteryMetadataLoadsByIdAndPreviewQuestionsLoadOnDemand() {
        block = createTemporaryObject(batteryBlockComponent, testCase)
        verify(block !== null)

        compare(mockController.batterySummaryCalls, 1)
        compare(mockController.lastBatteryId, "battery-42")
        compare(mockController.batteryQuestionCalls, 0)
        compare(mockController.allBatteryListCalls, 0)
        compare(mockController.allQuestionListCalls, 0)
        compare(block.cachedTitle, "Target battery")
        compare(block.totalCount, 2)
        compare(block.questionList.length, 0)

        block.expanded = true
        compare(mockController.batteryQuestionCalls, 1)
        compare(mockController.lastBatteryId, "battery-42")
        compare(block.questionList.length, 1)
        compare(block.questionList[0].question, "First question")
    }

    function test_singleQuestionPreviewLoadsByIdOnlyWhenExpanded() {
        block = createTemporaryObject(questionBlockComponent, testCase)
        verify(block !== null)

        compare(mockController.singleQuestionCalls, 0)
        compare(mockController.allQuestionListCalls, 0)
        block.expanded = true
        compare(mockController.singleQuestionCalls, 1)
        compare(mockController.lastQuestionId, "question-7")
        compare(block.questionList.length, 1)
        compare(block.questionList[0].question, "Single question")
    }
}
