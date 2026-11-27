import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15
import "../notes" as Notes
import "../notes/NotesOpenAnswerSession.js" as OpenAnswerSession
import "../notes/NotesQuizAssistantSession.js" as AssistantSession

Rectangle {
    id: sequentialModalRoot
    anchors.fill: parent
    color: "#0f0e17"
    visible: false
    focus: visible && enableNotesOpenAnswerEvaluation
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
    property bool requireFinishConfirmation: false
    property bool enableNotesOpenAnswerEvaluation: false
    property var notesController: null
    property var openAnswerEvaluator: null
    property bool showFinishConfirmation: false
    property var selectedAnswers: []
    property var answeredQuestions: []
    property var openAnswersByQuestion: ({})
    property var openFeedbackByQuestion: ({})
    property var evaluationErrorsByQuestion: ({})
    property var evaluatingByQuestion: ({})
    property var pendingEvaluationsByQuestion: ({})
    property bool openAnswerInputFocused: false
    property bool discussionDialogOpen: false
    property bool sessionActive: false
    property int evaluationSessionToken: 0
    property int score: 0
    property int elapsedSeconds: 0

    signal closed()
    signal recordAttemptRequested(string bId, string qId, int selIndex, bool correct)
    signal discussionRequested(string title, string batteryId, var question, int questionIndex, var questions)

    readonly property int totalCount: questions.length
    readonly property int answeredCount: answeredQuestions.filter(function(answered) { return answered }).length
    readonly property var currentQuestion: (currentIndex >= 0 && currentIndex < totalCount) ? questions[currentIndex] : null
    readonly property string currentQuestionKey: OpenAnswerSession.questionKey(currentQuestion, currentIndex)
    readonly property bool currentQuestionIsEvaluating: Boolean(evaluatingByQuestion[currentQuestionKey])
    readonly property var currentOpenAnswerFeedback: pendingEvaluationsByQuestion[currentQuestionKey]
        || openFeedbackByQuestion[currentQuestionKey]
        || (currentQuestion ? currentQuestion.aiFeedback : null)
    readonly property string currentOpenAnswerError: evaluationErrorsByQuestion[currentQuestionKey] || ""
    readonly property bool notesPlainGShortcutEnabled: enableNotesOpenAnswerEvaluation
        && !openAnswerInputFocused && !isCompleted && !discussionDialogOpen
        && !(currentQuestion && currentQuestion.type === "multiple_choice"
             && currentQuestion.options && currentQuestion.options.length > 6)
    readonly property bool notesPlainArrowShortcutsEnabled: enableNotesOpenAnswerEvaluation
        && !openAnswerInputFocused && !isCompleted && !showFinishConfirmation
        && !discussionDialogOpen
    readonly property bool notesModifiedArrowShortcutsEnabled: enableNotesOpenAnswerEvaluation
        && !isCompleted && !showFinishConfirmation && !discussionDialogOpen
    readonly property bool notesSpaceNavigationEnabled: enableNotesOpenAnswerEvaluation
        && isConfirmed && !openAnswerInputFocused && !isCompleted
        && !showFinishConfirmation && !discussionDialogOpen
    readonly property bool notesOptionShortcutsEnabled: enableNotesOpenAnswerEvaluation
        && currentQuestion && currentQuestion.type === "multiple_choice"
        && !openAnswerInputFocused && !isConfirmed && !isCompleted
        && !discussionDialogOpen && !showFinishConfirmation

    Keys.onPressed: function(event) {
        if (!sequentialModalRoot.notesOptionShortcutsEnabled) return

        var letterKey = event.key >= Qt.Key_A && event.key <= Qt.Key_Z
        if (letterKey && (event.modifiers & (Qt.AltModifier | Qt.ControlModifier)) !== 0) return

        var optionIndex = sequentialModalRoot.notesOptionIndexForKey(event.key)
        if (optionIndex < 0) return
        event.accepted = true
        sequentialModalRoot.selectNotesOptionByShortcut(optionIndex)
    }

    Timer {
        id: quizTimer
        interval: 1000
        running: sequentialModalRoot.visible && !sequentialModalRoot.isCompleted
        repeat: true
        onTriggered: sequentialModalRoot.elapsedSeconds++
    }

    // Keyboard Shortcuts
    Shortcut { sequence: "Escape"; enabled: sequentialModalRoot.visible && !sequentialModalRoot.showFinishConfirmation && !sequentialModalRoot.discussionDialogOpen; onActivated: OpenAnswerSession.close(sequentialModalRoot) }
    Shortcut { sequence: "1"; enabled: sequentialModalRoot.visible && !enableNotesOpenAnswerEvaluation && !isConfirmed && !isCompleted && !sequentialModalRoot.discussionDialogOpen; onActivated: selectOption(0) }
    Shortcut { sequence: "2"; enabled: sequentialModalRoot.visible && !enableNotesOpenAnswerEvaluation && !isConfirmed && !isCompleted && !sequentialModalRoot.discussionDialogOpen; onActivated: selectOption(1) }
    Shortcut { sequence: "3"; enabled: sequentialModalRoot.visible && !enableNotesOpenAnswerEvaluation && !isConfirmed && !isCompleted && !sequentialModalRoot.discussionDialogOpen; onActivated: selectOption(2) }
    Shortcut { sequence: "4"; enabled: sequentialModalRoot.visible && !enableNotesOpenAnswerEvaluation && !isConfirmed && !isCompleted && !sequentialModalRoot.discussionDialogOpen; onActivated: selectOption(3) }
    Shortcut { sequence: "Space"; enabled: sequentialModalRoot.visible && !enableNotesOpenAnswerEvaluation && !isCompleted && !sequentialModalRoot.discussionDialogOpen; onActivated: sequentialModalRoot.toggleExplanation() }
    Shortcut {
        objectName: "notesAnsweredSpaceNavigationShortcut"
        sequence: "Space"
        enabled: sequentialModalRoot.visible && sequentialModalRoot.notesSpaceNavigationEnabled
        onActivated: sequentialModalRoot.navigateNotesNext()
    }
    Shortcut {
        objectName: "notesOpenAnswerExplanationShortcut"
        sequences: ["Alt+G", "Ctrl+G"]
        enabled: sequentialModalRoot.visible && sequentialModalRoot.enableNotesOpenAnswerEvaluation
            && !sequentialModalRoot.isCompleted && !sequentialModalRoot.discussionDialogOpen
        onActivated: sequentialModalRoot.toggleExplanation()
    }
    Shortcut {
        objectName: "notesOpenAnswerPlainGExplanationShortcut"
        sequence: "G"
        enabled: sequentialModalRoot.visible && sequentialModalRoot.notesPlainGShortcutEnabled
        onActivated: sequentialModalRoot.toggleExplanation()
    }
    Shortcut {
        objectName: "notesPlainNextQuestionShortcut"
        sequences: ["Right", ">"]
        enabled: sequentialModalRoot.visible && sequentialModalRoot.notesPlainArrowShortcutsEnabled
        onActivated: sequentialModalRoot.navigateNotesNext()
    }
    Shortcut {
        objectName: "notesPlainPreviousQuestionShortcut"
        sequences: ["Left", "<"]
        enabled: sequentialModalRoot.visible && sequentialModalRoot.notesPlainArrowShortcutsEnabled
        onActivated: sequentialModalRoot.navigateNotesPrevious()
    }
    Shortcut {
        objectName: "notesModifiedNextQuestionShortcut"
        sequence: "Alt+Right"
        enabled: sequentialModalRoot.visible && sequentialModalRoot.notesModifiedArrowShortcutsEnabled
        onActivated: sequentialModalRoot.navigateNotesNext()
    }
    Shortcut {
        objectName: "notesModifiedPreviousQuestionShortcut"
        sequence: "Alt+Left"
        enabled: sequentialModalRoot.visible && sequentialModalRoot.notesModifiedArrowShortcutsEnabled
        onActivated: sequentialModalRoot.navigateNotesPrevious()
    }
    Shortcut { sequence: "Return"; enabled: sequentialModalRoot.visible && !isCompleted && !sequentialModalRoot.showFinishConfirmation && !sequentialModalRoot.discussionDialogOpen && (!enableNotesOpenAnswerEvaluation || !openAnswerInputFocused); onActivated: handleConfirmOrNext() }

    Notes.NotesQuizFinishConfirmDialog {
        visible: sequentialModalRoot.showFinishConfirmation
        total: sequentialModalRoot.totalCount
        answeredCount: sequentialModalRoot.answeredCount
        onCancelled: sequentialModalRoot.showFinishConfirmation = false
        onConfirmed: {
            sequentialModalRoot.showFinishConfirmation = false
            sequentialModalRoot.isCompleted = true
        }
    }

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
            onExitRequested: OpenAnswerSession.close(sequentialModalRoot)
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
                openAnswerEvaluationEnabled: sequentialModalRoot.enableNotesOpenAnswerEvaluation
                isEvaluatingOpenAnswer: sequentialModalRoot.currentQuestionIsEvaluating
                openAnswerFeedback: sequentialModalRoot.currentOpenAnswerFeedback
                openAnswerError: sequentialModalRoot.currentOpenAnswerError
                visible: !sequentialModalRoot.isCompleted

                onOptionSelected: function(idx) { selectOption(idx) }
                onOpenAnswerChanged: function(txt) { OpenAnswerSession.handleInput(sequentialModalRoot, txt) }
                onOpenAnswerFocusChanged: function(focused) { OpenAnswerSession.handleFocus(sequentialModalRoot, focused) }
                onEvaluateOpenAnswerRequested: OpenAnswerSession.evaluate(sequentialModalRoot)
                onDiscussOpenAnswerRequested: {
                    sequentialModalRoot.discussionDialogOpen = true
                    sequentialModalRoot.discussionRequested(
                        sequentialModalRoot.batteryTitle,
                        sequentialModalRoot.batteryId,
                        sequentialModalRoot.currentQuestion,
                        sequentialModalRoot.currentIndex,
                        sequentialModalRoot.questions
                    )
                }
                onToggleExplanation: sequentialModalRoot.toggleExplanation()
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
                onReturnRequested: OpenAnswerSession.close(sequentialModalRoot)
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
                    visible: !sequentialModalRoot.enableNotesOpenAnswerEvaluation
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
                    onClicked: sequentialModalRoot.toggleExplanation()
                }

                Item { Layout.fillWidth: true }

                Button {
                    visible: !sequentialModalRoot.enableNotesOpenAnswerEvaluation
                        || !sequentialModalRoot.currentQuestion
                        || sequentialModalRoot.currentQuestion.type !== "open"
                        || sequentialModalRoot.isConfirmed
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

    function selectNotesOptionByShortcut(index) {
        if (!notesOptionShortcutsEnabled || index < 0 || index >= optionsListLength(currentQuestion)) return
        selectOption(index)
    }

    function notesOptionIndexForKey(key) {
        if (key >= Qt.Key_1 && key <= Qt.Key_9) {
            var numberIndex = key - Qt.Key_1
            return numberIndex < optionsListLength(currentQuestion) ? numberIndex : -1
        }
        if (key >= Qt.Key_A && key <= Qt.Key_Z) {
            var letterIndex = key - Qt.Key_A
            return letterIndex < optionsListLength(currentQuestion) ? letterIndex : -1
        }
        return -1
    }

    function optionsListLength(question) {
        if (!question || !question.options) return 0
        var length = question.options.length
        return typeof length === "number" && isFinite(length) && length >= 0
            ? Math.floor(length) : 0
    }

    function handleConfirmOrNext() {
        if (!isConfirmed) {
            if (enableNotesOpenAnswerEvaluation && currentQuestion && currentQuestion.type === "open") {
                OpenAnswerSession.evaluate(sequentialModalRoot)
                return
            }
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
            var answeredList = [...answeredQuestions]
            answeredList[currentIndex] = true
            answeredQuestions = answeredList

            if (currentQuestion && (currentQuestion.id || currentQuestion.questionId)) {
                var qId = currentQuestion.id ? currentQuestion.id : currentQuestion.questionId
                sequentialModalRoot.recordAttemptRequested(batteryId, qId, selectedOption, isCorrect)
            }
        } else {
            // Advance or complete
            if (currentIndex < totalCount - 1) {
                goToQuestion(currentIndex + 1)
            } else if (requireFinishConfirmation) {
                showFinishConfirmation = true
            } else {
                isCompleted = true
            }
        }
    }

    function goToQuestion(idx) {
        currentIndex = idx
        isConfirmed = idx < answeredQuestions.length && answeredQuestions[idx] === true
        selectedOption = (idx < selectedAnswers.length) ? selectedAnswers[idx] : -1
        showExplanation = enableNotesOpenAnswerEvaluation ? false : isConfirmed
        var targetQuestion = questions[idx]
        if (enableNotesOpenAnswerEvaluation) {
            var targetKey = OpenAnswerSession.questionKey(targetQuestion, idx)
            openAnswer = String(openAnswersByQuestion[targetKey]
                                || (targetQuestion ? targetQuestion.userTypedAnswer : "") || "")
        } else {
            openAnswer = ""
        }
    }

    function navigateNotesNext() {
        if (!enableNotesOpenAnswerEvaluation || isCompleted || showFinishConfirmation) return
        if (currentIndex < totalCount - 1) {
            goToQuestion(currentIndex + 1)
        } else if (requireFinishConfirmation) {
            showFinishConfirmation = true
        } else {
            isCompleted = true
        }
    }

    function navigateNotesPrevious() {
        if (!enableNotesOpenAnswerEvaluation || isCompleted || showFinishConfirmation) return
        if (currentIndex > 0) goToQuestion(currentIndex - 1)
    }

    function restartQuiz() {
        OpenAnswerSession.reset(sequentialModalRoot)
        currentIndex = 0
        selectedOption = -1
        openAnswer = ""
        isConfirmed = false
        showExplanation = false
        isCompleted = false
        showFinishConfirmation = false
        selectedAnswers = []
        answeredQuestions = []
        openAnswerInputFocused = false
        score = 0
        elapsedSeconds = 0
    }

    function replaceQuestionsFromAssistant(updatedQuestions) {
        AssistantSession.replaceQuestions(sequentialModalRoot, updatedQuestions)
    }

    function toggleExplanation() {
        showExplanation = !showExplanation
    }

    function startQuiz(bId, bTitle, qsList) {
        batteryId = bId
        batteryTitle = bTitle || "Simulado Sequencial"
        questions = qsList || []
        restartQuiz()
        if (enableNotesOpenAnswerEvaluation) OpenAnswerSession.restore(sequentialModalRoot)
        sessionActive = true
        visible = true
    }
}
