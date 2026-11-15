import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: summaryRoot
    color: "#0f0e17"
    radius: 16

    property int score: 0
    property int totalQuestions: 0
    property var questions: []
    property var selectedAnswers: []
    property int timeElapsedSeconds: 0

    signal restartRequested()
    signal returnRequested()
    signal reviewQuestionRequested(int index)

    readonly property double percentage: totalQuestions > 0 ? (score / totalQuestions) * 100 : 0

    ScrollView {
        anchors.fill: parent
        anchors.margins: 32
        clip: true

        ColumnLayout {
            width: summaryRoot.width - 64
            spacing: 24

            // Trophy / Result Header
            ColumnLayout {
                Layout.alignment: Qt.AlignHCenter
                spacing: 8

                Rectangle {
                    Layout.alignment: Qt.AlignHCenter
                    width: 64
                    height: 64
                    radius: 32
                    color: summaryRoot.percentage >= 70 ? "#10b981" : (summaryRoot.percentage >= 50 ? "#f59e0b" : "#f43f5e")
                    Text {
                        anchors.centerIn: parent
                        text: summaryRoot.percentage >= 70 ? "🏆" : (summaryRoot.percentage >= 50 ? "📈" : "🎯")
                        font.pixelSize: 28
                    }
                }

                Text {
                    Layout.alignment: Qt.AlignHCenter
                    text: "Sessão Concluída!"
                    color: "#fffffe"
                    font.pixelSize: 22
                    font.bold: true
                }

                Text {
                    Layout.alignment: Qt.AlignHCenter
                    text: summaryRoot.score + " de " + summaryRoot.totalQuestions + " acertos (" + Math.round(summaryRoot.percentage) + "%)"
                    color: summaryRoot.percentage >= 70 ? "#10b981" : (summaryRoot.percentage >= 50 ? "#f59e0b" : "#f43f5e")
                    font.pixelSize: 16
                    font.bold: true
                }
            }

            // Quick stats strip
            RowLayout {
                Layout.alignment: Qt.AlignHCenter
                spacing: 24

                Rectangle {
                    width: 140
                    height: 64
                    radius: 10
                    color: "#161524"
                    border.color: "#2e2b44"
                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 2
                        Text { text: "Precisão"; color: "#94a1b2"; font.pixelSize: 11; Layout.alignment: Qt.AlignHCenter }
                        Text { text: Math.round(summaryRoot.percentage) + "%"; color: "#fffffe"; font.pixelSize: 16; font.bold: true; Layout.alignment: Qt.AlignHCenter }
                    }
                }

                Rectangle {
                    width: 140
                    height: 64
                    radius: 10
                    color: "#161524"
                    border.color: "#2e2b44"
                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 2
                        Text { text: "Tempo"; color: "#94a1b2"; font.pixelSize: 11; Layout.alignment: Qt.AlignHCenter }
                        Text {
                            text: {
                                var m = Math.floor(summaryRoot.timeElapsedSeconds / 60)
                                var s = summaryRoot.timeElapsedSeconds % 60
                                return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s
                            }
                            color: "#fffffe"
                            font.pixelSize: 16
                            font.bold: true
                            Layout.alignment: Qt.AlignHCenter
                        }
                    }
                }

                Rectangle {
                    width: 140
                    height: 64
                    radius: 10
                    color: "#161524"
                    border.color: "#2e2b44"
                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 2
                        Text { text: "Erros"; color: "#94a1b2"; font.pixelSize: 11; Layout.alignment: Qt.AlignHCenter }
                        Text { text: "" + (summaryRoot.totalQuestions - summaryRoot.score); color: "#f43f5e"; font.pixelSize: 16; font.bold: true; Layout.alignment: Qt.AlignHCenter }
                    }
                }
            }

            // Review List
            Text {
                text: "Revisão das Questões:"
                color: "#fffffe"
                font.pixelSize: 15
                font.bold: true
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8

                Repeater {
                    model: summaryRoot.questions

                    Rectangle {
                        Layout.fillWidth: true
                        height: 56
                        radius: 8
                        color: "#161524"
                        border.color: "#2e2b44"

                        property int userAns: (summaryRoot.selectedAnswers && index < summaryRoot.selectedAnswers.length) ? summaryRoot.selectedAnswers[index] : -1
                        property int correctAns: modelData.correctIndex !== undefined ? modelData.correctIndex : (modelData.correct_index !== undefined ? modelData.correct_index : 0)
                        property bool isCorrect: userAns === correctAns

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 12

                            Rectangle {
                                width: 28
                                height: 28
                                radius: 6
                                color: parent.parent.isCorrect ? "#3310b981" : "#33f43f5e"
                                Text {
                                    anchors.centerIn: parent
                                    text: parent.parent.isCorrect ? "✓" : "✗"
                                    color: parent.parent.isCorrect ? "#10b981" : "#f43f5e"
                                    font.bold: true
                                }
                            }

                            Text {
                                text: (index + 1) + ". " + (modelData.prompt || "")
                                color: "#fffffe"
                                font.pixelSize: 13
                                elide: Text.ElideRight
                                Layout.fillWidth: true
                            }

                            Button {
                                text: "Ver Detalhes"
                                background: Rectangle {
                                    color: "#232135"
                                    radius: 6
                                }
                                contentItem: Text {
                                    text: parent.text
                                    color: "#8b5cf6"
                                    font.pixelSize: 11
                                    font.bold: true
                                }
                                onClicked: summaryRoot.reviewQuestionRequested(index)
                            }
                        }
                    }
                }
            }

            // Action Buttons
            RowLayout {
                Layout.fillWidth: true
                Layout.alignment: Qt.AlignHCenter
                spacing: 16

                Button {
                    text: "Refazer Simulado"
                    background: Rectangle {
                        color: "#232135"
                        radius: 8
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#fffffe"
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: summaryRoot.restartRequested()
                }

                Button {
                    text: "Concluir e Voltar"
                    background: Rectangle {
                        color: "#10b981"
                        radius: 8
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#ffffff"
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: summaryRoot.returnRequested()
                }
            }
        }
    }
}
