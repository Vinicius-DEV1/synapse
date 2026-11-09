import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: explorerRoot
    anchors.fill: parent

    property var quizStats: ({})
    property var batteries: []

    signal requestStartGeneralPractice()
    signal requestStartRandomSimulation()
    signal requestStartErrorNotebook()
    signal requestStartBattery(var battery)
    signal requestCreateBattery()
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

            Item { height: 16 }

            // Header
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

                // Quick Practice button
                Rectangle {
                    width: 150; height: 38; radius: 10
                    color: "#1a1924"
                    border.color: "#ffffff15"

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 6
                        Text { text: "⚡"; font.pixelSize: 13 }
                        Text { text: "Simulado Geral"; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: explorerRoot.requestStartGeneralPractice()
                    }
                }

                // "+ Nova Bateria" button
                Rectangle {
                    width: 140; height: 38; radius: 10
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
            GridLayout {
                Layout.fillWidth: true
                columns: 4
                columnSpacing: 14
                rowSpacing: 14

                // Total Questions
                Rectangle {
                    Layout.fillWidth: true
                    height: 90
                    radius: 12
                    color: "#161524"
                    border.color: "#ffffff0f"
                    border.width: 1

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 14
                        spacing: 4
                        Text { text: "TOTAL DE QUESTÕES"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }
                        Text { text: (explorerRoot.quizStats.total_questions || 0).toString(); color: "#fffffe"; font.pixelSize: 22; font.bold: true }
                        Text { text: "em " + (explorerRoot.quizStats.total_batteries || 0) + " baterias"; color: "#64748b"; font.pixelSize: 11 }
                    }
                }

                // Answered Attempts
                Rectangle {
                    Layout.fillWidth: true
                    height: 90
                    radius: 12
                    color: "#161524"
                    border.color: "#ffffff0f"
                    border.width: 1

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 14
                        spacing: 4
                        Text { text: "RESPONDIDAS"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }
                        Text { text: (explorerRoot.quizStats.total_attempts || 0).toString(); color: "#38bdf8"; font.pixelSize: 22; font.bold: true }
                        Text { text: "tentativas registradas"; color: "#64748b"; font.pixelSize: 11 }
                    }
                }

                // Accuracy Rate
                Rectangle {
                    Layout.fillWidth: true
                    height: 90
                    radius: 12
                    color: "#161524"
                    border.color: "#ffffff0f"
                    border.width: 1

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 14
                        spacing: 4
                        Text { text: "TAXA DE ACERTO"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }
                        Text { text: (explorerRoot.quizStats.accuracy_rate || 0) + "%"; color: "#34d399"; font.pixelSize: 22; font.bold: true }
                        Text { text: (explorerRoot.quizStats.correct_attempts || 0) + " respostas corretas"; color: "#64748b"; font.pixelSize: 11 }
                    }
                }

                // Mistakes to review
                Rectangle {
                    Layout.fillWidth: true
                    height: 90
                    radius: 12
                    color: "#161524"
                    border.color: "#ffffff0f"
                    border.width: 1

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 14
                        spacing: 4
                        Text { text: "ERROS A REVISAR"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }
                        Text { text: (explorerRoot.quizStats.incorrect_attempts || 0).toString(); color: "#fb7185"; font.pixelSize: 22; font.bold: true }
                        Text { text: "no caderno de erros"; color: "#64748b"; font.pixelSize: 11 }
                    }
                }
            }

            // Quick Action Banners: Caderno de Erros & Simulado Dinâmico
            RowLayout {
                Layout.fillWidth: true
                spacing: 14

                // Caderno de Erros Banner
                Rectangle {
                    Layout.fillWidth: true
                    height: 105
                    radius: 12
                    color: "#f43f5e0a"
                    border.color: "#f43f5e25"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 14

                        Text { text: "📕"; font.pixelSize: 32 }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 3
                            Text { text: "Caderno de Erros"; color: "#fda4af"; font.pixelSize: 15; font.bold: true }
                            Text {
                                Layout.fillWidth: true
                                text: "Revise especificamente as questões com erros recentes para consolidar o aprendizado."
                                color: "#94a3b8"
                                font.pixelSize: 12
                                wrapMode: Text.Wrap
                            }
                        }

                        Rectangle {
                            width: 130; height: 36; radius: 8
                            color: "#f43f5e"

                            Text {
                                anchors.centerIn: parent
                                text: "Revisar (" + (explorerRoot.quizStats.incorrect_attempts || 0) + ")"
                                color: "#ffffff"
                                font.pixelSize: 12
                                font.bold: true
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: explorerRoot.requestStartErrorNotebook()
                            }
                        }
                    }
                }

                // Simulado Rápido Banner
                Rectangle {
                    Layout.fillWidth: true
                    height: 105
                    radius: 12
                    color: "#6366f10a"
                    border.color: "#6366f125"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 14

                        Text { text: "⚡"; font.pixelSize: 32 }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 3
                            Text { text: "Simulado Dinâmico"; color: "#c7d2fe"; font.pixelSize: 15; font.bold: true }
                            Text {
                                Layout.fillWidth: true
                                text: "Gera um simulado aleatório com 10 questões entre todas as suas baterias."
                                color: "#94a3b8"
                                font.pixelSize: 12
                                wrapMode: Text.Wrap
                            }
                        }

                        Rectangle {
                            width: 130; height: 36; radius: 8
                            color: "#6366f1"

                            Text {
                                anchors.centerIn: parent
                                text: "Iniciar Simulado"
                                color: "#ffffff"
                                font.pixelSize: 12
                                font.bold: true
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: explorerRoot.requestStartRandomSimulation()
                            }
                        }
                    }
                }
            }

            // Section Title: Suas Baterias
            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                Text { text: "📚"; font.pixelSize: 16 }
                Text {
                    text: "Baterias de Questões (" + explorerRoot.batteries.length + ")"
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                }
            }

            // Batteries Grid
            GridView {
                id: batteryGrid
                Layout.fillWidth: true
                Layout.preferredHeight: Math.max(300, Math.ceil(explorerRoot.batteries.length / Math.max(1, Math.floor(width / 340))) * 180)
                clip: true
                cellWidth: 340
                cellHeight: 180
                model: explorerRoot.batteries

                delegate: Rectangle {
                    width: 320
                    height: 160
                    radius: 12
                    color: "#1a1924"
                    border.color: batMouse.containsMouse ? "#6366f166" : "#ffffff0f"
                    border.width: 1

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 18
                        spacing: 10

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8
                            Text { text: "📦"; font.pixelSize: 16 }
                            Text {
                                Layout.fillWidth: true
                                text: modelData.title || "Bateria sem título"
                                color: "#fffffe"
                                font.pixelSize: 15
                                font.bold: true
                                elide: Text.ElideRight
                            }
                            Rectangle {
                                width: countText.contentWidth + 12
                                height: 22
                                radius: 11
                                color: "#6366f120"
                                Text {
                                    id: countText
                                    anchors.centerIn: parent
                                    text: (modelData.question_count || 0) + " Q"
                                    color: "#a78bfa"
                                    font.pixelSize: 11
                                    font.bold: true
                                }
                            }
                        }

                        Text {
                            Layout.fillWidth: true
                            text: modelData.description || "Sem descrição"
                            color: "#a7a9be"
                            font.pixelSize: 12
                            elide: Text.ElideRight
                        }

                        Item { Layout.fillHeight: true }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8

                            Rectangle {
                                Layout.fillWidth: true
                                height: 32
                                radius: 8
                                color: "#6366f1"

                                RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 6
                                    Text { text: "▶"; color: "#ffffff"; font.pixelSize: 10 }
                                    Text { text: "Resolver"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                                }

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: explorerRoot.requestStartBattery(modelData)
                                }
                            }

                            Rectangle {
                                width: 32; height: 32; radius: 8
                                color: "#ffffff0a"

                                Text { anchors.centerIn: parent; text: "+"; color: "#a7a9be"; font.pixelSize: 16; font.bold: true }

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: explorerRoot.requestAddQuestion(modelData)
                                }
                            }

                            Rectangle {
                                width: 32; height: 32; radius: 8
                                color: "#ffffff0a"

                                Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 11 }

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: explorerRoot.requestDeleteBattery(modelData.id)
                                }
                            }
                        }
                    }

                    MouseArea {
                        id: batMouse
                        anchors.fill: parent
                        z: -1
                        hoverEnabled: true
                    }
                }
            }

            // If no custom batteries, show quick start banner
            Rectangle {
                visible: explorerRoot.batteries.length === 0
                Layout.fillWidth: true
                height: 220
                radius: 16
                color: "#161524"
                border.color: "#ffffff0f"

                ColumnLayout {
                    anchors.centerIn: parent
                    spacing: 12
                    Text { Layout.alignment: Qt.AlignHCenter; text: "💡"; font.pixelSize: 36 }
                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "Nenhuma bateria personalizada criada ainda"
                        color: "#fffffe"
                        font.pixelSize: 16
                        font.bold: true
                    }
                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "Você pode criar uma bateria agora ou experimentar o Simulado Geral com questões exemplo de Criptografia e FSRS."
                        color: "#a7a9be"
                        font.pixelSize: 13
                    }
                    Item { height: 4 }
                    Rectangle {
                        Layout.alignment: Qt.AlignHCenter
                        width: 180; height: 38; radius: 8
                        color: "#6366f1"
                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            Text { text: "▶"; color: "#ffffff"; font.pixelSize: 10 }
                            Text { text: "Iniciar Simulado Exemplo"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                        }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: explorerRoot.requestStartGeneralPractice()
                        }
                    }
                }
            }

            Item { height: 48 }
        }
    }
}
