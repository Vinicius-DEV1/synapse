import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: explorerRoot
    anchors.fill: parent

    property var quizStats: ({})
    property var batteries: []

    signal requestStartGeneralPractice()
    signal requestOpenSimulationBuilder()
    signal requestStartErrorNotebook()
    signal requestStartBattery(var battery)
    signal requestCreateBattery()
    signal requestEditBattery(var battery)
    signal requestInspectBattery(var battery)
    signal requestShowHelp()
    signal requestAddQuestion(var battery)
    signal requestDeleteBattery(string batteryId)

    ScrollView {
        anchors.fill: parent
        clip: true
        contentWidth: width

        ColumnLayout {
            width: Math.min(parent.width - 64, 1024)
            anchors.horizontalCenter: parent.horizontalCenter
            spacing: 24

            Item { Layout.preferredHeight: 16 }

            // Header Row
            RowLayout {
                Layout.fillWidth: true
                spacing: 16

                ColumnLayout {
                    spacing: 4
                    RowLayout {
                        spacing: 10
                        Text { text: "🎯"; font.pixelSize: 28 }
                        Text {
                            text: "Banco de Questões & Simulado Zen"
                            color: "#fffffe"
                            font.pixelSize: 26
                            font.bold: true
                        }
                    }
                    Text {
                        text: "Resolução imersiva de questões de concursos e certificações • Design Zen sem poluição visual"
                        color: "#a7a9be"
                        font.pixelSize: 13
                    }
                }

                Item { Layout.fillWidth: true }

                Button {
                    Layout.preferredWidth: 82
                    Layout.preferredHeight: 38
                    text: "Guia"
                    onClicked: explorerRoot.requestShowHelp()
                }

                // Quick Practice button
                Rectangle {
                    Layout.preferredWidth: 150
                    Layout.preferredHeight: 38
                    radius: 10
                    color: "#1a1924"
                    border.color: "#15ffffff"
                    opacity: (explorerRoot.quizStats.total_questions || 0) > 0 ? 1 : 0.45

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 6
                        Text { text: "⚡"; font.pixelSize: 13 }
                        Text { text: "Simulado Geral"; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        enabled: (explorerRoot.quizStats.total_questions || 0) > 0
                        onClicked: explorerRoot.requestStartGeneralPractice()
                    }
                }

                // "+ Nova Bateria" button
                Rectangle {
                    Layout.preferredWidth: 140
                    Layout.preferredHeight: 38
                    radius: 10
                    color: "#6366f1"

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 6
                        Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                        Text { text: "Nova Bateria"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: explorerRoot.requestCreateBattery()
                    }
                }
            }

            // Top Metric Cards Grid
            QuizKpiCards {
                quizStats: explorerRoot.quizStats
            }

            // Quick Action Banners: Caderno de Erros & Simulado Dinâmico
            QuizActionBanners {
                incorrectAttemptsCount: explorerRoot.quizStats.reviewable_incorrect_questions || 0
                totalQuestions: explorerRoot.quizStats.total_questions || 0
                onStartErrorNotebookRequested: explorerRoot.requestStartErrorNotebook()
                onOpenSimulationBuilderRequested: explorerRoot.requestOpenSimulationBuilder()
            }

            // Batteries Grid
            QuizBatteriesGrid {
                batteries: explorerRoot.batteries
                onStartBatteryRequested: function(bat) { explorerRoot.requestStartBattery(bat) }
                onAddQuestionRequested: function(bat) { explorerRoot.requestAddQuestion(bat) }
                onEditBatteryRequested: function(bat) { explorerRoot.requestEditBattery(bat) }
                onInspectBatteryRequested: function(bat) { explorerRoot.requestInspectBattery(bat) }
                onDeleteBatteryRequested: function(batId) { explorerRoot.requestDeleteBattery(batId) }
                onStartGeneralPracticeRequested: explorerRoot.requestStartGeneralPractice()
                onCreateBatteryRequested: explorerRoot.requestCreateBattery()
            }

            Item { Layout.preferredHeight: 48 }
        }
    }
}
