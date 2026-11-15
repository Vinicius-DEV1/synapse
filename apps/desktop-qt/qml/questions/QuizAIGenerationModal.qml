import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: aiQuizModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 130

    property string batteryId: ""
    property string batteryName: "Bateria"
    property bool isGenerating: false
    property var generatedQuestions: []

    signal closeRequested()
    signal importQuestionsRequested(string targetBatteryId, var questionsList)

    Shortcut {
        sequence: "Escape"
        enabled: aiQuizModalRoot.visible
        onActivated: aiQuizModalRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: aiQuizModalRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 780)
        height: Math.min(parent.height - 48, 600)
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    width: 32
                    height: 32
                    radius: 8
                    color: "#8b5cf6"
                    Text { anchors.centerIn: parent; text: "🤖"; font.pixelSize: 16 }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text {
                        text: "Gerador de Questões com IA"
                        color: "#fffffe"
                        font.pixelSize: 18
                        font.bold: true
                    }
                    Text {
                        text: "Gere simulados e baterias para " + aiQuizModalRoot.batteryName
                        color: "#94a1b2"
                        font.pixelSize: 12
                    }
                }

                Button {
                    text: "✕"
                    flat: true
                    onClicked: aiQuizModalRoot.closeRequested()
                }
            }

            // Input parameters
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                TextField {
                    id: topicInput
                    Layout.fillWidth: true
                    placeholderText: "Digite o tópico (ex: Direito Constitucional - Direitos Fundamentais)..."
                    color: "#fffffe"
                    background: Rectangle {
                        color: "#1f1d2e"
                        radius: 8
                        border.color: topicInput.activeFocus ? "#8b5cf6" : "#2e2b44"
                    }
                }

                ComboBox {
                    id: countCombo
                    model: ["5 questões", "10 questões", "15 questões"]
                    currentIndex: 0
                    Layout.preferredWidth: 130
                    background: Rectangle {
                        color: "#1f1d2e"
                        radius: 8
                        border.color: "#2e2b44"
                    }
                }

                ComboBox {
                    id: typeCombo
                    model: ["Múltipla Escolha", "Discursiva", "Misto"]
                    currentIndex: 0
                    Layout.preferredWidth: 140
                    background: Rectangle {
                        color: "#1f1d2e"
                        radius: 8
                        border.color: "#2e2b44"
                    }
                }

                Button {
                    text: isGenerating ? "Gerando..." : "Gerar"
                    enabled: !isGenerating && topicInput.text.trim().length > 0
                    background: Rectangle {
                        color: parent.enabled ? "#8b5cf6" : "#4c4869"
                        radius: 8
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#ffffff"
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: generateSampleQuestions()
                }
            }

            // Preview List
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                radius: 10
                color: "#11101a"
                border.color: "#232135"

                ListView {
                    id: previewList
                    anchors.fill: parent
                    anchors.margins: 8
                    clip: true
                    model: aiQuizModalRoot.generatedQuestions
                    spacing: 8

                    delegate: Rectangle {
                        width: previewList.width
                        height: 96
                        radius: 8
                        color: "#1a1829"
                        border.color: "#2e2b44"

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 12

                            Rectangle {
                                width: 28
                                height: 28
                                radius: 6
                                color: "#232135"
                                Text {
                                    anchors.centerIn: parent
                                    text: "" + (index + 1)
                                    color: "#94a1b2"
                                    font.bold: true
                                    font.pixelSize: 12
                                }
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                Text {
                                    text: modelData.prompt || ""
                                    color: "#fffffe"
                                    font.pixelSize: 13
                                    font.bold: true
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }

                                Text {
                                    text: modelData.type === "open"
                                        ? "Discursiva | Resposta: " + (modelData.explanation || "")
                                        : "Gabarito: " + String.fromCharCode(65 + (modelData.correctIndex || 0)) + " | " + (modelData.options ? modelData.options.length : 4) + " opções"
                                    color: "#94a1b2"
                                    font.pixelSize: 11
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }
                            }

                            Button {
                                text: "Remover"
                                flat: true
                                contentItem: Text {
                                    text: "✕"
                                    color: "#f43f5e"
                                    font.bold: true
                                }
                                onClicked: {
                                    var arr = [...aiQuizModalRoot.generatedQuestions]
                                    arr.splice(index, 1)
                                    aiQuizModalRoot.generatedQuestions = arr
                                }
                            }
                        }
                    }

                    Text {
                        anchors.centerIn: parent
                        text: isGenerating ? "A IA está formulando questões..." : "Nenhuma questão gerada ainda. Digite um tópico acima e clique em 'Gerar'."
                        color: "#5c587a"
                        font.pixelSize: 13
                        visible: aiQuizModalRoot.generatedQuestions.length === 0
                    }
                }
            }

            // Footer
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Text {
                    text: aiQuizModalRoot.generatedQuestions.length + " questões prontas para importação"
                    color: "#94a1b2"
                    font.pixelSize: 12
                    Layout.fillWidth: true
                }

                Button {
                    text: "Cancelar"
                    background: Rectangle {
                        color: "#232135"
                        radius: 8
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#fffffe"
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: aiQuizModalRoot.closeRequested()
                }

                Button {
                    text: "Importar para a Bateria"
                    enabled: aiQuizModalRoot.generatedQuestions.length > 0
                    background: Rectangle {
                        color: parent.enabled ? "#10b981" : "#4c4869"
                        radius: 8
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#ffffff"
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: {
                        aiQuizModalRoot.importQuestionsRequested(aiQuizModalRoot.batteryId, aiQuizModalRoot.generatedQuestions)
                        aiQuizModalRoot.closeRequested()
                    }
                }
            }
        }
    }

    function generateSampleQuestions() {
        isGenerating = true
        var count = [5, 10, 15][countCombo.currentIndex]
        var qType = typeCombo.currentIndex // 0: MC, 1: Open, 2: Mixed
        var topic = topicInput.text.trim()

        var results = []
        for (var i = 1; i <= count; i++) {
            var isCurrentOpen = (qType === 1) || (qType === 2 && i % 2 === 0)
            if (isCurrentOpen) {
                results.push({
                    prompt: "Explique os principais aspectos de " + topic + " (Tópico #" + i + "):",
                    type: "open",
                    options: [],
                    correctIndex: 0,
                    explanation: "Critérios fundamentais: análise sistemática dos requisitos e aplicação prática em " + topic + ".",
                    tags: [topic.split(" ")[0].toLowerCase(), "discursiva"]
                })
            } else {
                results.push({
                    prompt: "Acerca de " + topic + ", assinale a assertiva correta referente ao ponto #" + i + ":",
                    type: "multiple_choice",
                    options: [
                        "Assertiva prioritária e em conformidade estrita com o regramento de " + topic + ".",
                        "Hipótese que incorre em vedação expressa nos casos correlatos.",
                        "Disposição revogada e inaplicável ao contexto contemporâneo.",
                        "Exceção secundária sem amparo na regra geral de regência."
                    ],
                    correctIndex: 0,
                    explanation: "A alternativa A reflete com precisão os postulados fundamentais de " + topic + ".",
                    tags: [topic.split(" ")[0].toLowerCase(), "simulado"]
                })
            }
        }
        aiQuizModalRoot.generatedQuestions = results
        isGenerating = false
    }
}
