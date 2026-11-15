import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: cardRoot
    color: "#161524"
    radius: 16
    border.color: "#2e2b44"
    border.width: 1

    property var question: null
    property int selectedOption: -1
    property string openAnswerText: ""
    property bool isConfirmed: false
    property bool showExplanation: false

    signal optionSelected(int index)
    signal openAnswerChanged(string text)
    signal toggleExplanation()

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

            // Question prompt
            Text {
                text: (cardRoot.question && cardRoot.question.prompt) ? cardRoot.question.prompt : ""
                color: "#fffffe"
                font.pixelSize: 18
                font.bold: true
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

                Text {
                    text: "Sua Resposta Discursiva:"
                    color: "#94a1b2"
                    font.pixelSize: 12
                }

                ScrollView {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 140

                    TextArea {
                        id: openInput
                        placeholderText: "Escreva sua resposta para autoavaliação..."
                        color: "#fffffe"
                        wrapMode: TextEdit.Wrap
                        font.pixelSize: 14
                        enabled: !cardRoot.isConfirmed
                        background: Rectangle {
                            color: "#11101a"
                            radius: 8
                            border.color: openInput.activeFocus ? "#8b5cf6" : "#2e2b44"
                        }
                        onTextChanged: cardRoot.openAnswerChanged(openInput.text)
                    }
                }
            }

            // Explanation Section
            Rectangle {
                Layout.fillWidth: true
                radius: 10
                color: "#1a8b5cf6"
                border.color: "#8b5cf6"
                border.width: 1
                visible: cardRoot.showExplanation || (cardRoot.isConfirmed && Boolean(cardRoot.question && cardRoot.question.explanation))
                Layout.preferredHeight: explCol.implicitHeight + 24

                ColumnLayout {
                    id: explCol
                    anchors.fill: parent
                    anchors.margins: 14
                    spacing: 6

                    RowLayout {
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
                        text: (cardRoot.question && cardRoot.question.explanation) ? cardRoot.question.explanation : "Sem comentários adicionais."
                        color: "#e2e8f0"
                        font.pixelSize: 13
                        wrapMode: Text.Wrap
                        Layout.fillWidth: true
                    }
                }
            }
        }
    }
}
