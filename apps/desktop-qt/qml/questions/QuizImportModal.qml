import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: quizImportRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 130

    property string batteryId: ""
    property string batteryName: "Bateria"
    property var parsedQuestions: []

    signal closeRequested()
    signal importQuestionsRequested(string targetBatteryId, var questionsList)

    Shortcut {
        sequence: "Escape"
        enabled: quizImportRoot.visible
        onActivated: quizImportRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: quizImportRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 800)
        height: Math.min(parent.height - 48, 620)
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 14

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    width: 32
                    height: 32
                    radius: 8
                    color: "#3b82f6"
                    Text { anchors.centerIn: parent; text: "📄"; font.pixelSize: 16 }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text {
                        text: "Importar Questões de Documento ou Texto"
                        color: "#fffffe"
                        font.pixelSize: 18
                        font.bold: true
                    }
                    Text {
                        text: "Cole enunciados formatados para " + quizImportRoot.batteryName
                        color: "#94a1b2"
                        font.pixelSize: 12
                    }
                }

                Button {
                    text: "✕"
                    flat: true
                    onClicked: quizImportRoot.closeRequested()
                }
            }

            // Split View: Text Input on Left, Parsed Preview on Right
            RowLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 16

                // Input Side
                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    Layout.preferredWidth: 1
                    spacing: 8

                    Text {
                        text: "Formato suportado (1. Enunciado, A) Opção..., Gabarito: A):"
                        color: "#94a1b2"
                        font.pixelSize: 11
                    }

                    ScrollView {
                        Layout.fillWidth: true
                        Layout.fillHeight: true

                        TextArea {
                            id: rawTextInput
                            placeholderText: "1. Qual é a capital do Brasil?\nA) São Paulo\nB) Brasília\nC) Rio de Janeiro\nD) Salvador\nGabarito: B\n\n2. Quem promulgou a Constituição de 1988?\nA) Assembleia Constituinte\nB) D. Pedro II\nC) Getúlio Vargas\nD) Juscelino Kubitschek\nGabarito: A"
                            color: "#fffffe"
                            wrapMode: TextEdit.Wrap
                            font.pixelSize: 12
                            background: Rectangle {
                                color: "#11101a"
                                radius: 8
                                border.color: "#2e2b44"
                            }
                        }
                    }

                    Button {
                        text: "Processar Texto"
                        Layout.fillWidth: true
                        background: Rectangle {
                            color: "#3b82f6"
                            radius: 8
                        }
                        contentItem: Text {
                            text: parent.text
                            color: "#ffffff"
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        onClicked: parseInputText()
                    }
                }

                // Preview Side
                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    Layout.preferredWidth: 1
                    spacing: 8

                    Text {
                        text: "Questões Detectadas (" + quizImportRoot.parsedQuestions.length + "):"
                        color: "#94a1b2"
                        font.pixelSize: 11
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        radius: 8
                        color: "#11101a"
                        border.color: "#2e2b44"

                        ListView {
                            id: previewList
                            anchors.fill: parent
                            anchors.margins: 8
                            clip: true
                            model: quizImportRoot.parsedQuestions
                            spacing: 8

                            delegate: Rectangle {
                                width: previewList.width
                                height: 72
                                radius: 6
                                color: "#1a1829"
                                border.color: "#2e2b44"

                                ColumnLayout {
                                    anchors.fill: parent
                                    anchors.margins: 8
                                    spacing: 4

                                    Text {
                                        text: (index + 1) + ". " + (modelData.prompt || "")
                                        color: "#fffffe"
                                        font.pixelSize: 12
                                        font.bold: true
                                        elide: Text.ElideRight
                                        Layout.fillWidth: true
                                    }

                                    Text {
                                        text: "Opções: " + (modelData.options ? modelData.options.length : 0) + " | Gabarito: " + String.fromCharCode(65 + (modelData.correctIndex || 0))
                                        color: "#10b981"
                                        font.pixelSize: 11
                                    }
                                }
                            }

                            Text {
                                anchors.centerIn: parent
                                text: "Clique em 'Processar Texto' para pré-visualizar."
                                color: "#5c587a"
                                font.pixelSize: 12
                                visible: quizImportRoot.parsedQuestions.length === 0
                            }
                        }
                    }
                }
            }

            // Footer
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Item { Layout.fillWidth: true }

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
                    onClicked: quizImportRoot.closeRequested()
                }

                Button {
                    text: "Importar " + quizImportRoot.parsedQuestions.length + " Questões"
                    enabled: quizImportRoot.parsedQuestions.length > 0
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
                        quizImportRoot.importQuestionsRequested(quizImportRoot.batteryId, quizImportRoot.parsedQuestions)
                        quizImportRoot.closeRequested()
                    }
                }
            }
        }
    }

    function parseInputText() {
        var text = rawTextInput.text || ""
        if (text.trim().length === 0) {
            quizImportRoot.parsedQuestions = []
            return
        }
        if (typeof dataController !== "undefined" && dataController && typeof dataController.parseQuizImportText === "function") {
            var rustParsed = dataController.parseQuizImportText(text) || []
            var mapped = []
            for (var r = 0; r < rustParsed.length; r++) {
                var item = rustParsed[r]
                if (!item || !item.prompt || !item.options || item.options.length < 2) continue
                mapped.push({
                    prompt: item.prompt,
                    options: item.options,
                    correctIndex: typeof item.correctIndex === "number" ? item.correctIndex : (typeof item.correct_index === "number" ? item.correct_index : 0),
                    explanation: item.explanation || "",
                    tags: item.tags || ["importado"]
                })
            }
            quizImportRoot.parsedQuestions = mapped
            return
        }
        quizImportRoot.parsedQuestions = []
    }
}
