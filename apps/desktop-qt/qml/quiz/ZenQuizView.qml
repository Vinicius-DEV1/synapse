import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "QuizDefaultQuestions.js" as DefaultQuestions

Rectangle {
    id: quizRoot
    color: "#0f0e17" // Dark canvas

    property var batteries: []
    property var quizStats: ({})
    property var activeBattery: null
    property var sessionQuestions: []
    property int currentIndex: 0
    property int selectedOption: -1
    property bool isConfirmed: false
    property bool showExplanation: false
    property int score: 0
    property bool isSessionActive: false
    property bool isFinishDialogOpen: false

    // Modals
    property bool isCreatingBattery: false
    property bool isCreatingQuestion: false
    property var targetBatteryForQuestion: null

    // Default fallback questions from library
    property var defaultSampleQuestions: DefaultQuestions.defaultSampleQuestions

    readonly property int totalQuestions: sessionQuestions.length
    readonly property var currentQ: (sessionQuestions.length > 0 && currentIndex < sessionQuestions.length)
        ? sessionQuestions[currentIndex]
        : { "prompt": "", "options": [], "correctIndex": 0, "explanation": "" }

    Component.onCompleted: {
        loadBatteries()
    }

    function loadBatteries() {
        batteries = dataController.getQuizBatteries()
        quizStats = dataController.getQuizStats()
    }

    function startBatterySession(battery) {
        activeBattery = battery
        var qs = []
        if (battery) {
            var raw = dataController.getBatteryQuestions(battery.id)
            for (var i = 0; i < raw.length; ++i) {
                var item = raw[i]
                var opts = []
                try {
                    opts = JSON.parse(item.options)
                } catch(e) {
                    opts = ["Opção A", "Opção B", "Opção C", "Opção D"]
                }
                qs.push({
                    "id": item.id,
                    "prompt": item.prompt,
                    "options": opts,
                    "correctIndex": item.correct_index,
                    "explanation": item.explanation || "Sem comentário disponível para esta questão."
                })
            }
        }

        if (qs.length === 0) {
            qs = defaultSampleQuestions
        }

        sessionQuestions = qs
        currentIndex = 0
        selectedOption = -1
        isConfirmed = false
        showExplanation = false
        score = 0
        isSessionActive = true
    }

    function startRandomSimulationSession() {
        var raw = dataController.getRandomSimulationQuestions(10)
        var qs = []
        for (var i = 0; i < raw.length; ++i) {
            var item = raw[i]
            var opts = []
            try {
                opts = JSON.parse(item.options)
            } catch(e) {
                opts = ["A", "B", "C", "D"]
            }
            qs.push({
                "id": item.id,
                "prompt": item.prompt,
                "options": opts,
                "correctIndex": item.correct_index,
                "explanation": item.explanation || ""
            })
        }
        if (qs.length === 0) {
            qs = defaultSampleQuestions
        }
        sessionQuestions = qs
        activeBattery = { "title": "Simulado Aleatório (10 Questões)" }
        currentIndex = 0
        selectedOption = -1
        isConfirmed = false
        showExplanation = false
        score = 0
        isSessionActive = true
    }

    function startErrorNotebookSession() {
        var raw = dataController.getErrorNotebookQuestions()
        var qs = []
        for (var i = 0; i < raw.length; ++i) {
            var item = raw[i]
            var opts = []
            try {
                opts = JSON.parse(item.options)
            } catch(e) {
                opts = ["A", "B", "C", "D"]
            }
            qs.push({
                "id": item.id,
                "prompt": item.prompt,
                "options": opts,
                "correctIndex": item.correct_index,
                "explanation": item.explanation || ""
            })
        }
        if (qs.length === 0) {
            qs = defaultSampleQuestions
        }
        sessionQuestions = qs
        activeBattery = { "title": "Caderno de Erros" }
        currentIndex = 0
        selectedOption = -1
        isConfirmed = false
        showExplanation = false
        score = 0
        isSessionActive = true
    }

    function selectOption(index) {
        if (!isConfirmed && index >= 0 && index < currentQ.options.length) {
            selectedOption = index
        }
    }

    function confirmOrNext() {
        if (!isConfirmed) {
            if (selectedOption === -1) return
            isConfirmed = true
            var isCorrect = (selectedOption === currentQ.correctIndex)
            if (isCorrect) score++
            if (currentQ.id && currentQ.id.indexOf("sample-") === -1) {
                dataController.recordQuestionAttempt(currentQ.id, selectedOption, isCorrect)
            }
        } else {
            if (currentIndex < totalQuestions - 1) {
                currentIndex++
                selectedOption = -1
                isConfirmed = false
                showExplanation = false
            } else {
                isFinishDialogOpen = true
            }
        }
    }

    function toggleGabarito() {
        if (isConfirmed) {
            showExplanation = !showExplanation
        }
    }

    function deleteBattery(batteryId) {
        dataController.deleteQuizBattery(batteryId)
        loadBatteries()
    }

    // ===================================================================
    // 1. Batteries Explorer View (When Simulado is Not Active)
    // ===================================================================
    QuizExplorerView {
        visible: !quizRoot.isSessionActive
        quizStats: quizRoot.quizStats
        batteries: quizRoot.batteries
        onRequestStartGeneralPractice: quizRoot.startBatterySession(null)
        onRequestStartRandomSimulation: quizRoot.startRandomSimulationSession()
        onRequestStartErrorNotebook: quizRoot.startErrorNotebookSession()
        onRequestStartBattery: function(battery) { quizRoot.startBatterySession(battery) }
        onRequestCreateBattery: quizRoot.isCreatingBattery = true
        onRequestAddQuestion: function(battery) {
            quizRoot.targetBatteryForQuestion = battery
            quizRoot.isCreatingQuestion = true
        }
        onRequestDeleteBattery: function(batteryId) { quizRoot.deleteBattery(batteryId) }
    }

    // ===================================================================
    // 2. Zen Focus Session Mode
    // ===================================================================
    QuizZenSession {
        isActive: quizRoot.isSessionActive
        activeBattery: quizRoot.activeBattery
        currentQuestion: quizRoot.currentQ
        currentIndex: quizRoot.currentIndex
        totalQuestions: quizRoot.totalQuestions
        selectedOption: quizRoot.selectedOption
        isConfirmed: quizRoot.isConfirmed
        showExplanation: quizRoot.showExplanation

        onExitRequested: quizRoot.isSessionActive = false
        onOptionSelected: function(index) { quizRoot.selectOption(index) }
        onGabaritoToggled: quizRoot.toggleGabarito()
        onActionRequested: quizRoot.confirmOrNext()
    }

    // ===================================================================
    // 3. Completion Dialog Screen
    // ===================================================================
    QuizResultsModal {
        isOpen: quizRoot.isFinishDialogOpen
        score: quizRoot.score
        totalQuestions: quizRoot.totalQuestions

        onReturnToBatteries: {
            quizRoot.isFinishDialogOpen = false
            quizRoot.isSessionActive = false
            quizRoot.loadBatteries()
        }
        onRestartSession: {
            quizRoot.currentIndex = 0
            quizRoot.selectedOption = -1
            quizRoot.isConfirmed = false
            quizRoot.showExplanation = false
            quizRoot.score = 0
            quizRoot.isFinishDialogOpen = false
        }
    }

    // ===================================================================
    // 4. Create Battery Modal
    // ===================================================================
    CreateBatteryModal {
        isOpen: quizRoot.isCreatingBattery
        onClosed: quizRoot.isCreatingBattery = false
        onBatteryCreated: function(title, description) {
            dataController.createQuizBattery(title, description)
            quizRoot.loadBatteries()
        }
    }

    // ===================================================================
    // 5. Create Question Modal
    // ===================================================================
    CreateQuestionModal {
        isOpen: quizRoot.isCreatingQuestion
        targetBattery: quizRoot.targetBatteryForQuestion
        onClosed: quizRoot.isCreatingQuestion = false
        onQuestionCreated: function(batteryId, prompt, options, correctIndex, explanation) {
            dataController.createQuizQuestion(
                batteryId,
                prompt,
                JSON.stringify(options),
                correctIndex,
                explanation
            )
            quizRoot.loadBatteries()
        }
    }

    // Hardware Keyboard-First Fluidity
    Keys.onDigit1Pressed: quizRoot.selectOption(0)
    Keys.onDigit2Pressed: quizRoot.selectOption(1)
    Keys.onDigit3Pressed: quizRoot.selectOption(2)
    Keys.onDigit4Pressed: quizRoot.selectOption(3)

    Keys.onPressed: function(event) {
        if (event.key === Qt.Key_Escape) {
            if (quizRoot.isSessionActive) {
                quizRoot.isSessionActive = false
                event.accepted = true
            }
        } else if (event.key === Qt.Key_A) { quizRoot.selectOption(0); event.accepted = true; }
        else if (event.key === Qt.Key_B) { quizRoot.selectOption(1); event.accepted = true; }
        else if (event.key === Qt.Key_C) { quizRoot.selectOption(2); event.accepted = true; }
        else if (event.key === Qt.Key_D) { quizRoot.selectOption(3); event.accepted = true; }
        else if (event.key === Qt.Key_G) { quizRoot.toggleGabarito(); event.accepted = true; }
        else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter || event.key === Qt.Key_Space) {
            quizRoot.confirmOrNext();
            event.accepted = true;
        }
    }
}
