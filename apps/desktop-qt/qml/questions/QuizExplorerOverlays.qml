import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: overlaysRoot
    anchors.fill: parent

    property bool isSessionActive: false
    property bool isResultsOpen: false
    property int score: 0
    property int totalQuestions: 0
    property var questions: []
    property var selectedAnswers: []
    property string sessionNotice: ""
    property bool isSimulationBuilderOpen: false
    property var availableTags: []
    property bool isQuestionHelpOpen: false
    property bool isDeleteConfirmationOpen: false
    property string pendingDeleteBatteryId: ""
    property var pendingDeleteBattery: null
    property bool isCreatingBattery: false
    property var editingBattery: null
    property bool isCreatingQuestion: false
    property var editingQuestion: null
    property var targetBatteryForQuestion: null
    property bool isBatteryQuestionsOpen: false
    property var inspectBattery: null
    property var batteryQuestionsList: []

    // AI & Import modals
    property bool isAIGenerationOpen: false
    property bool isImportModalOpen: false
    property var aiTargetBattery: null

    signal sessionNoticeDismissed()
    signal startSimulationRequested(var tags, string status, int limit, bool shuffle)
    signal reviewQuestionRequested(int index)
    signal returnToBatteries()
    signal restartSession()
    signal questionHelpClosed()
    signal deleteBatteryConfirmed(string batteryId)
    signal batteryCreationRequested(string title, string description)
    signal batteryUpdateRequested(string batteryId, string title, string description)
    signal createBatteryModalClosed()
    signal questionCreationRequested(string batteryId, string prompt, var options, int correctIndex, string explanation, var tags)
    signal questionUpdateRequested(string questionId, string batteryId, string prompt, var options, int correctIndex, string explanation, var tags)
    signal questionDeleteRequested(string questionId)
    signal createQuestionModalClosed()
    signal batchQuestionsImported(string batteryId, var questionsList)
    signal sequentialModeRequested(var battery)

    QuizResultsModal {
        isOpen: overlaysRoot.isResultsOpen
        score: overlaysRoot.score
        totalQuestions: overlaysRoot.totalQuestions
        questions: overlaysRoot.questions
        selectedAnswers: overlaysRoot.selectedAnswers

        onReviewQuestionRequested: function(index) { overlaysRoot.reviewQuestionRequested(index) }
        onReturnToBatteries: overlaysRoot.returnToBatteries()
        onRestartSession: overlaysRoot.restartSession()
    }

    QuizSessionNotice {
        isActive: !overlaysRoot.isSessionActive
        message: overlaysRoot.sessionNotice
        onDismissed: overlaysRoot.sessionNoticeDismissed()
    }

    QuizCustomSimulationDialog {
        isOpen: overlaysRoot.isSimulationBuilderOpen
        availableTags: overlaysRoot.availableTags
        onClosed: overlaysRoot.isSimulationBuilderOpen = false
        onStartRequested: function(tags, status, limit, shuffle) {
            overlaysRoot.startSimulationRequested(tags, status, limit, shuffle)
        }
    }

    QuizHelpDialog {
        isOpen: overlaysRoot.isQuestionHelpOpen
        onClosed: overlaysRoot.questionHelpClosed()
    }

    BatteryDeleteModal {
        isOpen: overlaysRoot.isDeleteConfirmationOpen
        battery: overlaysRoot.pendingDeleteBattery
        onClosed: {
            overlaysRoot.isDeleteConfirmationOpen = false
            overlaysRoot.pendingDeleteBattery = null
            overlaysRoot.pendingDeleteBatteryId = ""
        }
        onConfirmed: function(batteryId) {
            overlaysRoot.deleteBatteryConfirmed(batteryId)
        }
    }

    CreateBatteryModal {
        isOpen: overlaysRoot.isCreatingBattery
        editingBattery: overlaysRoot.editingBattery
        onClosed: overlaysRoot.createBatteryModalClosed()
        onBatteryCreated: function(title, description) {
            overlaysRoot.batteryCreationRequested(title, description)
        }
        onBatteryUpdated: function(batteryId, title, description) {
            overlaysRoot.batteryUpdateRequested(batteryId, title, description)
        }
    }

    CreateQuestionModal {
        isOpen: overlaysRoot.isCreatingQuestion
        targetBattery: overlaysRoot.targetBatteryForQuestion
        editingQuestion: overlaysRoot.editingQuestion
        onClosed: overlaysRoot.createQuestionModalClosed()
        onQuestionCreated: function(batteryId, prompt, options, correctIndex, explanation, tags) {
            overlaysRoot.questionCreationRequested(batteryId, prompt, options, correctIndex, explanation, tags)
        }
        onQuestionUpdated: function(questionId, batteryId, prompt, options, correctIndex, explanation, tags) {
            overlaysRoot.questionUpdateRequested(questionId, batteryId, prompt, options, correctIndex, explanation, tags)
        }
    }

    BatteryQuestionsModal {
        isOpen: overlaysRoot.isBatteryQuestionsOpen
        battery: overlaysRoot.inspectBattery
        questions: overlaysRoot.batteryQuestionsList
        onClosed: overlaysRoot.isBatteryQuestionsOpen = false
        onRequestAddQuestion: function(bat) {
            overlaysRoot.targetBatteryForQuestion = bat
            overlaysRoot.editingQuestion = null
            overlaysRoot.isCreatingQuestion = true
        }
        onRequestEditQuestion: function(q) {
            overlaysRoot.editingQuestion = q
            overlaysRoot.targetBatteryForQuestion = overlaysRoot.inspectBattery
            overlaysRoot.isCreatingQuestion = true
        }
        onRequestDeleteQuestion: function(qId) {
            overlaysRoot.questionDeleteRequested(qId)
        }
        onRequestAIGeneration: function(bat) {
            overlaysRoot.aiTargetBattery = bat
            overlaysRoot.isAIGenerationOpen = true
        }
        onRequestImport: function(bat) {
            overlaysRoot.aiTargetBattery = bat
            overlaysRoot.isImportModalOpen = true
        }
        onRequestSequentialMode: function(bat) {
            overlaysRoot.sequentialModeRequested(bat)
        }
    }

    QuizAIGenerationModal {
        visible: overlaysRoot.isAIGenerationOpen
        batteryId: overlaysRoot.aiTargetBattery ? (overlaysRoot.aiTargetBattery.id || "") : ""
        batteryName: overlaysRoot.aiTargetBattery ? (overlaysRoot.aiTargetBattery.title || "Bateria") : "Bateria"
        onCloseRequested: overlaysRoot.isAIGenerationOpen = false
        onImportQuestionsRequested: function(tBatId, qs) {
            overlaysRoot.batchQuestionsImported(tBatId, qs)
        }
    }

    QuizImportModal {
        visible: overlaysRoot.isImportModalOpen
        batteryId: overlaysRoot.aiTargetBattery ? (overlaysRoot.aiTargetBattery.id || "") : ""
        batteryName: overlaysRoot.aiTargetBattery ? (overlaysRoot.aiTargetBattery.title || "Bateria") : "Bateria"
        onCloseRequested: overlaysRoot.isImportModalOpen = false
        onImportQuestionsRequested: function(tBatId, qs) {
            overlaysRoot.batchQuestionsImported(tBatId, qs)
        }
    }
}
