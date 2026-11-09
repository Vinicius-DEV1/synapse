import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

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

    // Default fallback questions if database battery is empty
    property var defaultSampleQuestions: [
        {
            "id": "sample-1",
            "prompt": "Qual o modo de operação de cifra de bloco recomendado no Synapse para garantir confidencialidade e autenticidade (AEAD) nos arquivos de vídeo e banco de dados?",
            "options": [
                "AES-256-CBC com PKCS#7 padding",
                "AES-256-GCM com autenticação em Galois Field GF(2^128)",
                "AES-128-ECB determinístico",
                "DES clássico com chave tripla"
            ],
            "correctIndex": 1,
            "explanation": "O padrão de projeto criptográfico adotado pelo Caderno / Synapse estabelece estritamente o uso de AES-256-GCM (Galois/Counter Mode). Ele oferece criptografia autenticada (AEAD), detectando qualquer adulteração ou corrupção de bytes em tempo de execução."
        },
        {
            "id": "sample-2",
            "prompt": "Qual a principal vantagem do algoritmo FSRS v5 (Free Spaced Repetition Scheduler) sobre o algoritmo legado SM-2 do Anki?",
            "options": [
                "O FSRS modela a memória humana em dois componentes contínuos: Estabilidade (S) e Dificuldade (D), otimizando intervalos com regressão estatística real.",
                "O FSRS apenas dobra os dias a cada resposta correta, reduzindo a complexidade de cálculo.",
                "O FSRS não permite a avaliação 'Errei' quando o cartão é maduro.",
                "O FSRS necessita de conexão com a internet para calcular novos intervalos."
            ],
            "correctIndex": 0,
            "explanation": "Diferente do SM-2 heurístico de 1987, o FSRS v5 é baseado no modelo de 3 variáveis da memória (Retrievability, Stability, Difficulty) proposto por Piotr Wozniak e expandido com otimização estocástica, proporcionando retenção de 90% com ~30% menos revisões."
        },
        {
            "id": "sample-3",
            "prompt": "Em arquiteturas de alto desempenho que combinam Qt 6 QML com um motor central em Rust, qual mecanismo garante interoperabilidade com overhead de chamada zero e menor latência?",
            "options": [
                "Chamadas HTTP REST locais via porta TCP loopback 127.0.0.1",
                "Serialização e desserialização constante de strings JSON através de pipes stdin/stdout",
                "Ponte nativa C-ABI direta (extern \"C\") ligando funções C++ exportadas sem overhead de marshaling",
                "Banco de dados intermediário gravado em arquivo a cada evento"
            ],
            "correctIndex": 2,
            "explanation": "A ponte C-ABI (C Application Binary Interface) compila para código de máquina nativo e permite chamadas diretas de ponteiro de função em nanosegundos (zero-copy), eliminando latências de socket e parsing de strings que prejudicariam a fluidez a 60 FPS."
        }
    ]

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
