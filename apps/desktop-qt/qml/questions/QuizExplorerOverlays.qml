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
    property bool isCreatingBattery: false
    property bool isCreatingQuestion: false
    property var targetBatteryForQuestion: null

    signal sessionNoticeDismissed()
    signal startSimulationRequested(var tags, string status, int limit, bool shuffle)
    signal reviewQuestionRequested(int index)
    signal returnToBatteries()
    signal restartSession()
    signal questionHelpClosed()
    signal deleteBatteryConfirmed(string batteryId)
    signal batteryCreationRequested(string title, string description)
    signal createBatteryModalClosed()
    signal questionCreationRequested(string batteryId, string prompt, var options, int correctIndex, string explanation, var tags)
    signal createQuestionModalClosed()

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

    Dialog {
        id: batteryDeleteDialog
        anchors.centerIn: parent
        width: Math.min(parent.width - 32, 420)
        modal: true
        title: "Excluir bateria"
        standardButtons: Dialog.Yes | Dialog.No
        visible: overlaysRoot.isDeleteConfirmationOpen

        contentItem: Text {
            text: "A bateria será movida para a lixeira. Deseja continuar?"
            color: "#d4d4d8"
            wrapMode: Text.Wrap
        }

        onAccepted: overlaysRoot.deleteBatteryConfirmed(overlaysRoot.pendingDeleteBatteryId)
        onRejected: {
            overlaysRoot.isDeleteConfirmationOpen = false
            overlaysRoot.pendingDeleteBatteryId = ""
        }
    }

    CreateBatteryModal {
        isOpen: overlaysRoot.isCreatingBattery
        onClosed: overlaysRoot.createBatteryModalClosed()
        onBatteryCreated: function(title, description) {
            overlaysRoot.batteryCreationRequested(title, description)
        }
    }

    CreateQuestionModal {
        isOpen: overlaysRoot.isCreatingQuestion
        targetBattery: overlaysRoot.targetBatteryForQuestion
        onClosed: overlaysRoot.createQuestionModalClosed()
        onQuestionCreated: function(batteryId, prompt, options, correctIndex, explanation, tags) {
            overlaysRoot.questionCreationRequested(batteryId, prompt, options, correctIndex, explanation, tags)
        }
    }
}
