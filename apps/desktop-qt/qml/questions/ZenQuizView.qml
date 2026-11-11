import QtQuick 2.15
import "QuizSessionData.js" as QuizSessionData

Rectangle {
    id: quizRoot
    color: "#0f0e17" // Dark canvas

    property var batteries: []
    property var quizStats: ({})
    property var availableQuestionTags: []
    property var activeBattery: null
    property var sessionQuestions: []
    property var sessionAnswers: []
    property int currentIndex: 0
    property int selectedOption: -1
    property bool isConfirmed: false
    property bool showExplanation: false
    property int score: 0
    property bool isSessionActive: false
    property bool isFinishDialogOpen: false
    property bool isReviewingResult: false

    readonly property int totalQuestions: sessionQuestions.length
    readonly property var currentQ: (sessionQuestions.length > 0 && currentIndex < sessionQuestions.length)
        ? sessionQuestions[currentIndex]
        : { "prompt": "", "options": [], "correctIndex": 0, "explanation": "" }

    Component.onCompleted: {
        loadBatteries()
    }

    function showSessionNotice(message) {
        questionOverlays.sessionNotice = message
    }

    function loadBatteries() {
        batteries = dataController.getQuizBatteries()
        quizStats = dataController.getQuizStats()
        availableQuestionTags = dataController.getAllQuizTags()
    }

    function startBatterySession(battery) {
        var raw = battery ? dataController.getBatteryQuestions(battery.id) : dataController.getAllQuizQuestions()
        var qs = QuizSessionData.mapQuestionRows(raw)
        if (qs.length === 0) {
            showSessionNotice("Não há questões de múltipla escolha válidas para iniciar esta sessão.")
            return
        }

        sessionQuestions = qs
        sessionAnswers = []
        activeBattery = battery || { "title": "Simulado Geral" }
        currentIndex = 0
        selectedOption = -1
        isConfirmed = false
        showExplanation = false
        score = 0
        isSessionActive = true
    }

    function startFilteredSimulationSession(tags, status, limit, shuffle) {
        var rawRows = dataController.getFilteredQuizQuestions(tags, status, limit, shuffle)
        var qs = QuizSessionData.mapQuestionRows(rawRows)
        if (qs.length === 0) {
            showSessionNotice("Nenhuma questão corresponde a esses filtros. Ajuste tags ou estado e tente de novo.")
            return
        }
        sessionQuestions = qs
        sessionAnswers = []
        var tagLabel = tags.length > 0 ? tags.join(", ") : "Geral"
        activeBattery = { "title": "Simulado: " + tagLabel }
        currentIndex = 0
        selectedOption = -1
        isConfirmed = false
        showExplanation = false
        score = 0
        questionOverlays.isSimulationBuilderOpen = false
        isSessionActive = true
    }

    function startErrorNotebookSession() {
        var qs = QuizSessionData.mapQuestionRows(dataController.getErrorNotebookQuestions())
        if (qs.length === 0) {
            showSessionNotice("Você não tem questões de múltipla escolha respondidas incorretamente para revisar.")
            return
        }
        sessionQuestions = qs
        sessionAnswers = []
        activeBattery = { "title": "Caderno de Erros" }
        currentIndex = 0
        selectedOption = -1
        isConfirmed = false
        showExplanation = false
        score = 0
        isSessionActive = true
    }

    function selectOption(index) {
        if (isSessionActive && !isFinishDialogOpen && !isConfirmed && index >= 0 && index < currentQ.options.length) {
            selectedOption = index
        }
    }

    function confirmOrNext() {
        if (!isSessionActive || isFinishDialogOpen) return
        if (!isConfirmed) {
            if (selectedOption === -1) return
            isConfirmed = true
            var isCorrect = (selectedOption === currentQ.correctIndex)
            if (isCorrect) score++
            var answers = sessionAnswers.slice()
            answers[currentIndex] = selectedOption
            sessionAnswers = answers
            if (currentQ.id && currentQ.batteryId
                    && !dataController.recordQuizAttempt(currentQ.batteryId, currentQ.id, selectedOption, isCorrect)) {
                showSessionNotice("Não foi possível salvar esta tentativa no banco de dados.")
            }
        } else if (isReviewingResult) {
            if (currentIndex < totalQuestions - 1) {
                currentIndex++
                selectedOption = sessionAnswers[currentIndex]
                isConfirmed = true
                showExplanation = true
            } else {
                isSessionActive = false
                isReviewingResult = false
                isFinishDialogOpen = true
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
        if (isSessionActive && !isFinishDialogOpen && isConfirmed) {
            showExplanation = !showExplanation
        }
    }

    function deleteBattery(batteryId) {
        if (dataController.deleteQuizBattery(batteryId)) {
            loadBatteries()
        } else {
            showSessionNotice("Não foi possível mover a bateria para a lixeira.")
        }
    }

    function exitSession() {
        if (isReviewingResult) {
            isSessionActive = false
            isReviewingResult = false
            isFinishDialogOpen = true
            return
        }
        isSessionActive = false
        loadBatteries()
    }

    QuizExplorerView {
        visible: !quizRoot.isSessionActive
        quizStats: quizRoot.quizStats
        batteries: quizRoot.batteries
        onRequestStartGeneralPractice: quizRoot.startBatterySession(null)
        onRequestOpenSimulationBuilder: questionOverlays.isSimulationBuilderOpen = true
        onRequestStartErrorNotebook: quizRoot.startErrorNotebookSession()
        onRequestStartBattery: function(battery) { quizRoot.startBatterySession(battery) }
        onRequestCreateBattery: questionOverlays.isCreatingBattery = true
        onRequestShowHelp: questionOverlays.isQuestionHelpOpen = true
        onRequestAddQuestion: function(battery) {
            questionOverlays.targetBatteryForQuestion = battery
            questionOverlays.isCreatingQuestion = true
        }
        onRequestDeleteBattery: function(batteryId) {
            questionOverlays.pendingDeleteBatteryId = batteryId
            questionOverlays.isDeleteConfirmationOpen = true
        }
    }

    QuizZenSession {
        isActive: quizRoot.isSessionActive
        activeBattery: quizRoot.activeBattery
        currentQuestion: quizRoot.currentQ
        currentIndex: quizRoot.currentIndex
        totalQuestions: quizRoot.totalQuestions
        selectedOption: quizRoot.selectedOption
        isConfirmed: quizRoot.isConfirmed
        showExplanation: quizRoot.showExplanation

        onExitRequested: quizRoot.exitSession()
        onOptionSelected: function(index) { quizRoot.selectOption(index) }
        onGabaritoToggled: quizRoot.toggleGabarito()
        onActionRequested: quizRoot.confirmOrNext()
    }

    QuizExplorerOverlays {
        id: questionOverlays
        isSessionActive: quizRoot.isSessionActive
        isResultsOpen: quizRoot.isFinishDialogOpen
        score: quizRoot.score
        totalQuestions: quizRoot.totalQuestions
        questions: quizRoot.sessionQuestions
        selectedAnswers: quizRoot.sessionAnswers
        availableTags: quizRoot.availableQuestionTags

        onSessionNoticeDismissed: questionOverlays.sessionNotice = ""
        onStartSimulationRequested: function(tags, status, limit, shuffle) {
            quizRoot.startFilteredSimulationSession(tags, status, limit, shuffle)
        }
        onReviewQuestionRequested: function(index) {
            quizRoot.currentIndex = index
            quizRoot.selectedOption = quizRoot.sessionAnswers[index]
            quizRoot.isConfirmed = true
            quizRoot.showExplanation = true
            quizRoot.isFinishDialogOpen = false
            quizRoot.isReviewingResult = true
            quizRoot.isSessionActive = true
        }
        onReturnToBatteries: {
            quizRoot.isFinishDialogOpen = false
            quizRoot.isSessionActive = false
            quizRoot.isReviewingResult = false
            quizRoot.sessionQuestions = []
            quizRoot.sessionAnswers = []
            quizRoot.loadBatteries()
        }
        onRestartSession: {
            quizRoot.currentIndex = 0
            quizRoot.selectedOption = -1
            quizRoot.isConfirmed = false
            quizRoot.showExplanation = false
            quizRoot.score = 0
            quizRoot.sessionAnswers = []
            quizRoot.isFinishDialogOpen = false
            quizRoot.isReviewingResult = false
            quizRoot.isSessionActive = true
        }
        onQuestionHelpClosed: questionOverlays.isQuestionHelpOpen = false
        onDeleteBatteryConfirmed: function(batteryId) {
            questionOverlays.isDeleteConfirmationOpen = false
            questionOverlays.pendingDeleteBatteryId = ""
            if (batteryId.length > 0) quizRoot.deleteBattery(batteryId)
        }
        onBatteryCreationRequested: function(title, description) {
            questionOverlays.isCreatingBattery = false
            if (dataController.createQuizBattery(title, description)) {
                quizRoot.loadBatteries()
            } else {
                quizRoot.showSessionNotice("Não foi possível criar a bateria.")
            }
        }
        onCreateBatteryModalClosed: questionOverlays.isCreatingBattery = false
        onQuestionCreationRequested: function(batteryId, prompt, options, correctIndex, explanation, tags) {
            if (dataController.createQuizQuestion(
                batteryId,
                prompt,
                JSON.stringify(options),
                correctIndex,
                explanation,
                JSON.stringify(tags)
            )) {
                quizRoot.loadBatteries()
            } else {
                quizRoot.showSessionNotice("Não foi possível salvar a questão. Confira as alternativas e o gabarito.")
            }
        }
        onCreateQuestionModalClosed: questionOverlays.isCreatingQuestion = false
    }

    Keys.onPressed: function(event) {
        if (!quizRoot.isSessionActive || quizRoot.isFinishDialogOpen) return
        if (event.key === Qt.Key_Escape) {
            if (quizRoot.isSessionActive) {
                quizRoot.exitSession()
                event.accepted = true
            }
        } else if (event.key === Qt.Key_A) { quizRoot.selectOption(0); event.accepted = true; }
        else if (event.key === Qt.Key_B) { quizRoot.selectOption(1); event.accepted = true; }
        else if (event.key === Qt.Key_C) { quizRoot.selectOption(2); event.accepted = true; }
        else if (event.key === Qt.Key_D) { quizRoot.selectOption(3); event.accepted = true; }
        else if (event.key >= Qt.Key_1 && event.key <= Qt.Key_4) {
            quizRoot.selectOption(event.key - Qt.Key_1)
            event.accepted = true
        }
        else if (event.key === Qt.Key_G) { quizRoot.toggleGabarito(); event.accepted = true; }
        else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter || event.key === Qt.Key_Space) {
            quizRoot.confirmOrNext();
            event.accepted = true;
        }
    }
}
