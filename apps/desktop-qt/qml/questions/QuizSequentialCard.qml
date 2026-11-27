import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15
import "../notes" as Notes

Rectangle {
    id: cardRoot
    objectName: "quizSequentialCard"
    color: "#161524"
    radius: 16
    border.color: "#2e2b44"
    border.width: 1

    property var question: null
    property int selectedOption: -1
    property string openAnswerText: ""
    property bool isConfirmed: false
    property bool showExplanation: false
    property bool openAnswerEvaluationEnabled: false
    property bool isEvaluatingOpenAnswer: false
    property var openAnswerFeedback: null
    property string openAnswerError: ""

    signal optionSelected(int index)
    signal openAnswerChanged(string text)
    signal openAnswerFocusChanged(bool focused)
    signal evaluateOpenAnswerRequested()
    signal discussOpenAnswerRequested()
    signal toggleExplanation()

    onOpenAnswerTextChanged: {
        if (openInput.text !== openAnswerText) openInput.text = openAnswerText
    }

    readonly property bool isOpenAnswer: question && question.type === "open"
    readonly property int correctIndex: question ? (question.correctIndex !== undefined ? question.correctIndex : (question.correct_index !== undefined ? question.correct_index : 0)) : 0
    readonly property var optionsList: (question && question.options) ? (Array.isArray(question.options) ? question.options : []) : []

    ScrollView {
        anchors.fill: parent
        anchors.margins: 28
        clip: true

        ColumnLayout {
            width: cardRoot.width - 56
            spacing: 20

            RowLayout {
                visible: cardRoot.openAnswerEvaluationEnabled
                    && Boolean(cardRoot.question
                        && (cardRoot.question.explanation
                            || cardRoot.question.expectedAnswer
                            || cardRoot.question.expected_answer))
                Layout.fillWidth: true
                Layout.preferredHeight: 26
                Item { Layout.fillWidth: true }
                Button {
                    objectName: "notesOpenAnswerExplanationButton"
                    text: cardRoot.showExplanation ? qsTr("Ocultar Gabarito") : qsTr("Gabarito")
                    onClicked: cardRoot.toggleExplanation()
                    background: Rectangle {
                        radius: 8
                        color: cardRoot.showExplanation ? "#26f59e0b" : "#0affffff"
                        border.color: cardRoot.showExplanation ? "#4df59e0b" : "#14ffffff"
                    }
                    contentItem: RowLayout {
                        spacing: 6
                        Text {
                            text: "?"
                            color: cardRoot.showExplanation ? "#fcd34d" : "#a1a1aa"
                            font.pixelSize: 12
                        }
                        Text {
                            text: cardRoot.showExplanation ? qsTr("Ocultar Gabarito") : qsTr("Gabarito")
                            color: cardRoot.showExplanation ? "#fcd34d" : "#a1a1aa"
                            font.pixelSize: 11
                            font.weight: Font.Medium
                        }
                        Text {
                            text: "Alt+G"
                            color: "#71717a"
                            font.pixelSize: 9
                            font.family: "monospace"
                        }
                    }
                }
            }

            // Question prompt
            Text {
                objectName: "notesSequentialQuestionPrompt"
                text: (cardRoot.question && cardRoot.question.prompt) ? cardRoot.question.prompt : ""
                color: "#fffffe"
                font.pixelSize: 18
                font.weight: cardRoot.openAnswerEvaluationEnabled ? Font.Medium : Font.Bold
                textFormat: cardRoot.openAnswerEvaluationEnabled ? Text.MarkdownText : Text.PlainText
                wrapMode: Text.Wrap
                Layout.fillWidth: true
            }

            // Multiple choice options
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 10
                visible: !cardRoot.isOpenAnswer

                Repeater {
                    model: cardRoot.optionsList

                    Rectangle {
                        id: optionRect
                        Layout.fillWidth: true
                        Layout.preferredHeight: Math.max(54, optText.implicitHeight + 20)
                        radius: 10

                        property bool isSelected: cardRoot.selectedOption === index
                        property bool isCorrect: index === cardRoot.correctIndex
                        property bool showFeedback: cardRoot.isConfirmed

                        color: {
                            if (!showFeedback) {
                                return isSelected ? "#2a273f" : (optMouse.containsMouse ? "#1c1a2d" : "#11101a")
                            }
                            if (isCorrect) return "#3310b981"
                            if (isSelected && !isCorrect) return "#33f43f5e"
                            return "#11101a"
                        }

                        border.color: {
                            if (!showFeedback) {
                                return isSelected ? "#8b5cf6" : "#2e2b44"
                            }
                            if (isCorrect) return "#10b981"
                            if (isSelected && !isCorrect) return "#f43f5e"
                            return "#2e2b44"
                        }
                        border.width: isSelected || (showFeedback && isCorrect) ? 2 : 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 12

                            Rectangle {
                                width: 28
                                height: 28
                                radius: 6
                                color: {
                                    if (optionRect.showFeedback && optionRect.isCorrect) return "#10b981"
                                    if (optionRect.showFeedback && optionRect.isSelected && !optionRect.isCorrect) return "#f43f5e"
                                    return optionRect.isSelected ? "#8b5cf6" : "#232135"
                                }
                                Text {
                                    anchors.centerIn: parent
                                    text: String.fromCharCode(65 + index)
                                    color: "#ffffff"
                                    font.bold: true
                                    font.pixelSize: 13
                                }
                            }

                            Text {
                                id: optText
                                text: modelData
                                color: "#fffffe"
                                font.pixelSize: 14
                                textFormat: cardRoot.openAnswerEvaluationEnabled ? Text.MarkdownText : Text.PlainText
                                wrapMode: Text.Wrap
                                Layout.fillWidth: true
                            }
                        }

                        MouseArea {
                            id: optMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            enabled: !cardRoot.isConfirmed
                            onClicked: cardRoot.optionSelected(index)
                        }
                    }
                }
            }

            // Open answer input
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8
                visible: cardRoot.isOpenAnswer

                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        Layout.fillWidth: true
                        text: qsTr("Sua Resposta Discursiva:")
                        color: "#94a1b2"
                        font.pixelSize: cardRoot.openAnswerEvaluationEnabled ? 14 : 12
                        font.weight: Font.Medium
                    }
                    Text {
                        visible: cardRoot.openAnswerEvaluationEnabled
                        text: qsTr("Pressione Enter para enviar (Shift+Enter para nova linha)")
                        color: "#71717a"
                        opacity: 0.8
                        font.pixelSize: 11
                    }
                }

                ScrollView {
                    Layout.fillWidth: true
                    Layout.preferredHeight: Math.min(260, Math.max(72, openInput.contentHeight + 30))

                    TextArea {
                        id: openInput
                        objectName: "notesOpenAnswerInput"
                        placeholderText: cardRoot.openAnswerEvaluationEnabled
                            ? qsTr("Escreva sua resposta completa com clareza... (Shift+Enter para nova linha)")
                            : qsTr("Escreva sua resposta para autoavaliação...")
                        color: "#fffffe"
                        wrapMode: TextEdit.Wrap
                        font.pixelSize: cardRoot.openAnswerEvaluationEnabled ? 16 : 14
                        padding: cardRoot.openAnswerEvaluationEnabled ? 14 : 6
                        enabled: !cardRoot.isConfirmed && !cardRoot.isEvaluatingOpenAnswer
                        background: Rectangle {
                            color: "#11101a"
                            radius: cardRoot.openAnswerEvaluationEnabled ? 12 : 8
                            border.color: openInput.activeFocus ? "#8b5cf6"
                                : (cardRoot.openAnswerEvaluationEnabled ? "#ffffff17" : "#2e2b44")
                        }
                        Component.onCompleted: text = cardRoot.openAnswerText
                        onActiveFocusChanged: cardRoot.openAnswerFocusChanged(activeFocus)
                        onTextChanged: cardRoot.openAnswerChanged(openInput.text)
                        Keys.onReturnPressed: function(event) {
                            if (!(event.modifiers & Qt.ShiftModifier) && cardRoot.openAnswerEvaluationEnabled) {
                                event.accepted = true
                                cardRoot.evaluateOpenAnswerRequested()
                            }
                        }
                        Keys.onEnterPressed: function(event) {
                            if (!(event.modifiers & Qt.ShiftModifier) && cardRoot.openAnswerEvaluationEnabled) {
                                event.accepted = true
                                cardRoot.evaluateOpenAnswerRequested()
                            }
                        }
                    }
                }

                Button {
                    objectName: "notesOpenAnswerEvaluateButton"
                    visible: cardRoot.openAnswerEvaluationEnabled && !cardRoot.isConfirmed
                    Layout.fillWidth: true
                    Layout.preferredHeight: 44
                    enabled: openInput.text.trim().length > 0 && !cardRoot.isEvaluatingOpenAnswer
                    onClicked: cardRoot.evaluateOpenAnswerRequested()
                    background: Rectangle {
                        radius: 12
                        color: parent.enabled ? "#338b5cf6" : "#1a8b5cf6"
                        border.color: "#598b5cf6"
                    }
                    contentItem: RowLayout {
                        spacing: 8
                        Text { text: cardRoot.isEvaluatingOpenAnswer ? "◌" : "✦"; color: "#c4b5fd"; font.pixelSize: 15 }
                        Text {
                            Layout.fillWidth: true
                            text: cardRoot.isEvaluatingOpenAnswer
                                ? qsTr("Avaliando com IA do Gemini...")
                                : (cardRoot.openAnswerError.length > 0
                                   ? qsTr("Tentar avaliação novamente")
                                   : qsTr("Enviar Resposta para Avaliação IA"))
                            color: "#ddd6fe"
                            font.pixelSize: 12
                            font.weight: Font.DemiBold
                            horizontalAlignment: Text.AlignHCenter
                        }
                    }
                }

                Text {
                    visible: cardRoot.openAnswerError.length > 0
                    text: cardRoot.openAnswerError
                    color: "#fda4af"
                    font.pixelSize: 11
                    wrapMode: Text.Wrap
                    Layout.fillWidth: true
                }

                Notes.NotesOpenAnswerFeedback {
                    Layout.fillWidth: true
                    feedback: cardRoot.openAnswerFeedback
                    discussionEnabled: cardRoot.openAnswerEvaluationEnabled
                    onDiscussRequested: cardRoot.discussOpenAnswerRequested()
                }
            }

            // Explanation Section
            Rectangle {
                objectName: "notesOpenAnswerExplanationPanel"
                Layout.fillWidth: true
                radius: 10
                color: cardRoot.openAnswerEvaluationEnabled ? "#0dffffff" : "#1a8b5cf6"
                border.color: cardRoot.openAnswerEvaluationEnabled ? "#14ffffff" : "#8b5cf6"
                border.width: 1
                visible: cardRoot.openAnswerEvaluationEnabled
                    ? cardRoot.showExplanation
                        && Boolean(cardRoot.question
                            && (cardRoot.question.explanation
                                || cardRoot.question.expectedAnswer
                                || cardRoot.question.expected_answer))
                    : cardRoot.showExplanation
                        || (cardRoot.isConfirmed && Boolean(cardRoot.question && cardRoot.question.explanation))
                Layout.preferredHeight: explCol.implicitHeight + 24

                ColumnLayout {
                    id: explCol
                    anchors.fill: parent
                    anchors.margins: 14
                    spacing: cardRoot.openAnswerEvaluationEnabled ? 12 : 6

                    Notes.NotesOpenAnswerReferenceAnswer {
                        Layout.fillWidth: true
                        visible: cardRoot.openAnswerEvaluationEnabled && cardRoot.isOpenAnswer
                        answerText: cardRoot.question
                            ? String(cardRoot.question.expectedAnswer || cardRoot.question.expected_answer || "") : ""
                    }

                    RowLayout {
                        visible: cardRoot.openAnswerEvaluationEnabled
                            && Boolean(cardRoot.question && cardRoot.question.explanation)
                        Layout.fillWidth: true
                        spacing: 7
                        Rectangle {
                            Layout.preferredWidth: 4
                            Layout.preferredHeight: 14
                            radius: 2
                            color: "#71717a"
                        }
                        Text {
                            text: qsTr("Explicação Detalhada:")
                            color: "#a1a1aa"
                            font.weight: Font.DemiBold
                            font.pixelSize: 12
                            font.capitalization: Font.AllUppercase
                            Layout.fillWidth: true
                        }
                    }

                    RowLayout {
                        visible: !cardRoot.openAnswerEvaluationEnabled
                        spacing: 8
                        Text { text: "💡"; font.pixelSize: 14 }
                        Text {
                            text: "Explicação / Resolução:"
                            color: "#c4b5fd"
                            font.bold: true
                            font.pixelSize: 13
                        }
                    }

                    Text {
                        objectName: "notesOpenAnswerDetailedExplanation"
                        text: (cardRoot.question && cardRoot.question.explanation) ? cardRoot.question.explanation : "Sem comentários adicionais."
                        visible: !cardRoot.openAnswerEvaluationEnabled
                            || Boolean(cardRoot.question && cardRoot.question.explanation)
                        color: cardRoot.openAnswerEvaluationEnabled ? "#d4d4d8" : "#e2e8f0"
                        textFormat: cardRoot.openAnswerEvaluationEnabled ? Text.MarkdownText : Text.PlainText
                        font.pixelSize: 13
                        wrapMode: Text.Wrap
                        Layout.fillWidth: true
                    }
                }
            }
        }
    }
}
