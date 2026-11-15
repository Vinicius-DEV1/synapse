import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: sequentialModalRoot
    anchors.fill: parent
    color: "#0f0e17"
    visible: false
    z: 140

    property string batteryId: ""
    property string batteryTitle: "Simulado Sequencial"
    property var questions: []
    property int currentIndex: 0
    property int selectedOption: -1
    property string openAnswer: ""
    property bool isConfirmed: false
    property bool showExplanation: false
    property bool isCompleted: false
    property var selectedAnswers: []
    property int score: 0
    property int elapsedSeconds: 0

    signal closed()
    signal recordAttemptRequested(string bId, string qId, int selIndex, bool correct)

    readonly property int totalCount: questions.length
    readonly property var currentQuestion: (currentIndex >= 0 && currentIndex < totalCount) ? questions[currentIndex] : null

    Timer {
        id: quizTimer
        interval: 1000
        running: sequentialModalRoot.visible && !sequentialModalRoot.isCompleted
        repeat: true
        onTriggered: sequentialModalRoot.elapsedSeconds++
    }

    // Keyboard Shortcuts
    Shortcut { sequence: "Escape"; enabled: sequentialModalRoot.visible; onActivated: sequentialModalRoot.closed() }
    Shortcut { sequence: "1"; enabled: sequentialModalRoot.visible && !isConfirmed && !isCompleted; onActivated: selectOption(0) }
    Shortcut { sequence: "2"; enabled: sequentialModalRoot.visible && !isConfirmed && !isCompleted; onActivated: selectOption(1) }
    Shortcut { sequence: "3"; enabled: sequentialModalRoot.visible && !isConfirmed && !isCompleted; onActivated: selectOption(2) }
    Shortcut { sequence: "4"; enabled: sequentialModalRoot.visible && !isConfirmed && !isCompleted; onActivated: selectOption(3) }
    Shortcut { sequence: "Space"; enabled: sequentialModalRoot.visible && !isCompleted; onActivated: showExplanation = !showExplanation }
    Shortcut { sequence: "Return"; enabled: sequentialModalRoot.visible && !isCompleted; onActivated: handleConfirmOrNext() }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // Header
        QuizSequentialHeader {
            Layout.fillWidth: true
            title: sequentialModalRoot.batteryTitle
            currentIndex: sequentialModalRoot.currentIndex
            totalQuestions: sequentialModalRoot.totalCount
            timeElapsedSeconds: sequentialModalRoot.elapsedSeconds
            visible: !sequentialModalRoot.isCompleted
            onExitRequested: sequentialModalRoot.closed()
        }

        // Center Content Area
        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true

            QuizSequentialCard {
                anchors.centerIn: parent
                width: Math.min(parent.width - 48, 800)
                height: Math.min(parent.height - 32, 600)
                question: sequentialModalRoot.currentQuestion
                selectedOption: sequentialModalRoot.selectedOption
                openAnswerText: sequentialModalRoot.openAnswer
                isConfirmed: sequentialModalRoot.isConfirmed
                showExplanation: sequentialModalRoot.showExplanation
                visible: !sequentialModalRoot.isCompleted

                onOptionSelected: function(idx) { selectOption(idx) }
                onOpenAnswerChanged: function(txt) { sequentialModalRoot.openAnswer = txt }
                onToggleExplanation: sequentialModalRoot.showExplanation = !sequentialModalRoot.showExplanation
            }

            QuizSummaryView {
                anchors.fill: parent
                score: sequentialModalRoot.score
                totalQuestions: sequentialModalRoot.totalCount
                questions: sequentialModalRoot.questions
                selectedAnswers: sequentialModalRoot.selectedAnswers
                timeElapsedSeconds: sequentialModalRoot.elapsedSeconds
                visible: sequentialModalRoot.isCompleted

                onRestartRequested: restartQuiz()
                onReturnRequested: sequentialModalRoot.closed()
                onReviewQuestionRequested: function(idx) {
                    sequentialModalRoot.currentIndex = idx
                    sequentialModalRoot.isConfirmed = true
                    sequentialModalRoot.showExplanation = true
                    sequentialModalRoot.selectedOption = (idx < sequentialModalRoot.selectedAnswers.length) ? sequentialModalRoot.selectedAnswers[idx] : -1
                    sequentialModalRoot.isCompleted = false
                }
            }
        }

        // Bottom Controls Dock
        Rectangle {
            Layout.fillWidth: true
            height: 68
            color: "#161524"
            border.color: "#232135"
            border.width: 1
            visible: !sequentialModalRoot.isCompleted

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 24
                anchors.rightMargin: 24
                spacing: 16

                Button {
                    text: "← Anterior"
                    enabled: sequentialModalRoot.currentIndex > 0
                    background: Rectangle {
                        color: parent.enabled ? "#232135" : "#1a1829"
                        radius: 8
                    }
                    contentItem: Text {
                        text: parent.text
                        color: parent.parent.enabled ? "#fffffe" : "#4c4869"
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: {
                        if (sequentialModalRoot.currentIndex > 0) {
                            goToQuestion(sequentialModalRoot.currentIndex - 1)
                        }
                    }
                }

                Button {
                    text: sequentialModalRoot.showExplanation ? "Ocultar Comentário (Espaço)" : "💡 Ver Comentário (Espaço)"
                    background: Rectangle {
                        color: "#232135"
                        radius: 8
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#c4b5fd"
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: sequentialModalRoot.showExplanation = !sequentialModalRoot.showExplanation
                }

                Item { Layout.fillWidth: true }

                Button {
                    text: !sequentialModalRoot.isConfirmed ? "Confirmar Resposta (Enter)" : ((sequentialModalRoot.currentIndex === sequentialModalRoot.totalCount - 1) ? "Ver Resultado" : "Próxima Questão → (Enter)")
                    enabled: (sequentialModalRoot.selectedOption >= 0 || (currentQuestion && currentQuestion.type === "open" && sequentialModalRoot.openAnswer.trim().length > 0)) || sequentialModalRoot.isConfirmed
                    background: Rectangle {
                        color: parent.enabled ? (!sequentialModalRoot.isConfirmed ? "#8b5cf6" : "#10b981") : "#4c4869"
                        radius: 8
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#ffffff"
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: handleConfirmOrNext()
                }
            }
        }
    }

    function selectOption(idx) {
        if (!isConfirmed && !isCompleted) {
            selectedOption = idx
        }
    }

    function handleConfirmOrNext() {
        if (!isConfirmed) {
            // Confirm answer
            isConfirmed = true
            showExplanation = true
            var correctIdx = currentQuestion ? (currentQuestion.correctIndex !== undefined ? currentQuestion.correctIndex : (currentQuestion.correct_index !== undefined ? currentQuestion.correct_index : 0)) : 0
            var isCorrect = (selectedOption === correctIdx)
            if (isCorrect) {
                score++
            }
            var ansList = [...selectedAnswers]
            ansList[currentIndex] = selectedOption
            selectedAnswers = ansList

            if (currentQuestion && (currentQuestion.id || currentQuestion.questionId)) {
                var qId = currentQuestion.id ? currentQuestion.id : currentQuestion.questionId
                sequentialModalRoot.recordAttemptRequested(batteryId, qId, selectedOption, isCorrect)
            }
        } else {
            // Advance or complete
            if (currentIndex < totalCount - 1) {
                goToQuestion(currentIndex + 1)
            } else {
                isCompleted = true
            }
        }
    }

    function goToQuestion(idx) {
        currentIndex = idx
        isConfirmed = (idx < selectedAnswers.length && selectedAnswers[idx] !== undefined && selectedAnswers[idx] !== -1)
        selectedOption = (idx < selectedAnswers.length) ? selectedAnswers[idx] : -1
        showExplanation = isConfirmed
        openAnswer = ""
    }

    function restartQuiz() {
        currentIndex = 0
        selectedOption = -1
        openAnswer = ""
        isConfirmed = false
        showExplanation = false
        isCompleted = false
        selectedAnswers = []
        score = 0
        elapsedSeconds = 0
    }

    function startQuiz(bId, bTitle, qsList) {
        batteryId = bId
        batteryTitle = bTitle || "Simulado Sequencial"
        questions = qsList || []
        restartQuiz()
        visible = true
    }
}
