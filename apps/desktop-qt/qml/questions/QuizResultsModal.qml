import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: resultsRoot
    objectName: "quizResults"
    anchors.fill: parent
    color: "#ee0f0e17"
    visible: resultsRoot.isOpen
    z: 100

    property bool isOpen: false
    property int score: 0
    property int totalQuestions: 0
    property var questions: []
    property var selectedAnswers: []

    signal returnToBatteries()
    signal restartSession()
    signal reviewQuestionRequested(int index)

    MouseArea { anchors.fill: parent }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 32, 760)
        height: Math.min(parent.height - 32, 680)
        radius: 18
        color: "#161524"
        border.color: "#18ffffff"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 28
            spacing: 18

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: "Bateria Concluída!"
                color: "#ffffff"
                font.pixelSize: 24
                font.bold: true
            }

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: "Confira seu desempenho e selecione uma questão para revisar."
                color: "#a7a9be"
                font.pixelSize: 12
            }

            RowLayout {
                Layout.alignment: Qt.AlignHCenter
                spacing: 32

                ColumnLayout {
                    spacing: 3
                    Text { text: "ACERTOS"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }
                    Text {
                        text: resultsRoot.score + " / " + resultsRoot.totalQuestions
                        color: "#f4f4f5"
                        font.pixelSize: 24
                        font.bold: true
                        font.family: "Monospace"
                    }
                }

                Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 42; color: "#16ffffff" }

                ColumnLayout {
                    spacing: 3
                    Text { text: "APROVEITAMENTO"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }
                    Text {
                        text: (resultsRoot.totalQuestions > 0 ? Math.round(resultsRoot.score * 100 / resultsRoot.totalQuestions) : 0) + "%"
                        color: resultsRoot.totalQuestions > 0 && resultsRoot.score * 100 / resultsRoot.totalQuestions >= 70 ? "#6ee7b7" : "#fbbf24"
                        font.pixelSize: 24
                        font.bold: true
                        font.family: "Monospace"
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 1
                color: "#0fffffff"
            }

            Text {
                text: "QUESTÕES RESPONDIDAS"
                color: "#a7a9be"
                font.pixelSize: 10
                font.bold: true
                font.letterSpacing: 1
            }

            ListView {
                id: resultQuestionList
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                spacing: 8
                model: resultsRoot.questions

                delegate: Rectangle {
                    id: resultQuestionRow
                    required property int index
                    required property var modelData
                    width: resultQuestionList.width
                    height: 70
                    radius: 10
                    property int selectedIndex: resultsRoot.selectedAnswers[index] === undefined
                        ? -1 : resultsRoot.selectedAnswers[index]
                    property bool isCorrect: selectedIndex === modelData.correctIndex
                    color: isCorrect ? "#171f20" : "#211820"
                    border.color: isCorrect ? "#296e52" : "#6d3346"

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 4
                        Text {
                            Layout.fillWidth: true
                            text: "#" + (resultQuestionRow.index + 1) + ". " + resultQuestionRow.modelData.prompt
                            color: resultQuestionRow.isCorrect ? "#d1fae5" : "#ffe4e6"
                            font.pixelSize: 12
                            font.bold: true
                            elide: Text.ElideRight
                        }
                        Text {
                            Layout.fillWidth: true
                            text: resultQuestionRow.selectedIndex >= 0
                                ? "Sua resposta: " + resultQuestionRow.modelData.options[resultQuestionRow.selectedIndex]
                                : "Sem resposta"
                            color: "#a7a9be"
                            font.pixelSize: 11
                            elide: Text.ElideRight
                        }
                    }

                    Text {
                        anchors.right: parent.right
                        anchors.rightMargin: 14
                        anchors.verticalCenter: parent.verticalCenter
                        text: resultQuestionRow.isCorrect ? "✓" : "×"
                        color: resultQuestionRow.isCorrect ? "#6ee7b7" : "#fda4af"
                        font.pixelSize: 20
                        font.bold: true
                    }

                    MouseArea {
                        anchors.fill: parent
                        anchors.rightMargin: 48
                        cursorShape: Qt.PointingHandCursor
                        onClicked: resultsRoot.reviewQuestionRequested(resultQuestionRow.index)
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 1
                color: "#0fffffff"
            }

            RowLayout {
                Layout.alignment: Qt.AlignHCenter
                spacing: 12

                Button {
                    text: "Voltar às Baterias"
                    onClicked: resultsRoot.returnToBatteries()
                }

                Button {
                    text: "Refazer Bateria"
                    highlighted: true
                    onClicked: resultsRoot.restartSession()
                }
            }
        }
    }
}
