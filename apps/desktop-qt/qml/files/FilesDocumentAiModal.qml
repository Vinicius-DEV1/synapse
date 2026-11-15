import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root
    anchors.fill: parent
    color: "#80000000"
    visible: false
    z: 200

    property var fileItem: null
    property var messages: []
    property bool isLoading: false
    property string inputText: ""

    signal closeRequested()
    signal questionsGenerated(var questions)

    function openForFile(item) {
        fileItem = item
        messages = [
            {
                role: "assistant",
                text: "Olá! Sou seu assistente de leitura e análise de documentos. Como posso ajudar com '" + (item ? item.name : "este documento") + "'?"
            }
        ]
        inputText = ""
        isLoading = false
        visible = true
    }

    function closeModal() {
        visible = false
        closeRequested()
    }

    function sendMessage(text) {
        var query = (text || inputText).trim()
        if (query.length === 0 || isLoading) return

        var newMsgs = messages.slice()
        newMsgs.push({ role: "user", text: query })
        messages = newMsgs
        inputText = ""
        isLoading = true

        aiTimer.start()
    }

    Timer {
        id: aiTimer
        interval: 1000
        repeat: false
        onTriggered: {
            root.isLoading = false
            var newMsgs = root.messages.slice()
            var lastUser = newMsgs[newMsgs.length - 1].text.toLowerCase()
            var reply = ""

            if (lastUser.indexOf("resumo") !== -1 || lastUser.indexOf("resumir") !== -1) {
                reply = "### Resumo Executivo\n\n1. **Objetivo Principal**: O documento aborda conceitos essenciais de arquitetura de dados e estruturação modular.\n2. **Tópicos Relevantes**: Tratamento de exceções, conformidade de segurança e padrões recomendados de criptografia E2EE.\n3. **Conclusão**: O conteúdo serve como base sólida para estudos e consultas futuras."
            } else if (lastUser.indexOf("quest") !== -1 || lastUser.indexOf("pergunta") !== -1 || lastUser.indexOf("quiz") !== -1) {
                reply = "### Questões Geradas com Base no Documento\n\n**Questão 1:** Qual a principal vantagem do modelo arquitetural apresentado?\n- A) Menor complexidade operacional\n- B) Criptografia e separação estrita de camadas (Correta)\n- C) Ausência de validação de esquemas\n- D) Execução mono-thread exclusiva"
                root.questionsGenerated([
                    {
                        statement: "Qual a principal vantagem do modelo arquitetural apresentado no documento?",
                        options: ["Menor complexidade operacional", "Criptografia e separação estrita de camadas", "Ausência de validação de esquemas", "Execução mono-thread exclusiva"],
                        correct_option_index: 1,
                        explanation: "A separação estrita de camadas e a segurança E2EE garantem consistência e proteção dos dados.",
                        tags: "DocumentAI, Leitura"
                    }
                ])
            } else {
                reply = "Analisando o documento sob a perspectiva de '" + query + "': os tópicos indicam conformidade com os requisitos estipulados e aderência às melhores práticas de engenharia."
            }

            newMsgs.push({ role: "assistant", text: reply })
            root.messages = newMsgs
        }
    }

    MouseArea {
        anchors.fill: parent
        onClicked: root.closeModal()
    }

    Rectangle {
        id: card
        width: Math.min(parent.width - 32, 560)
        height: Math.min(parent.height - 48, 560)
        anchors.centerIn: parent
        radius: 16
        color: "#161524"
        border.color: "#25ffffff"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 16
            spacing: 12

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Text { text: "🤖"; font.pixelSize: 22 }
                ColumnLayout {
                    spacing: 2
                    Text {
                        text: "Document AI Assistant"
                        color: "#fffffe"
                        font.pixelSize: 16
                        font.bold: true
                    }
                    Text {
                        text: root.fileItem ? root.fileItem.name : "Documento"
                        color: "#818cf8"
                        font.pixelSize: 11
                        elide: Text.ElideRight
                        Layout.maximumWidth: 320
                    }
                }

                Item { Layout.fillWidth: true }

                Rectangle {
                    width: 28; height: 28; radius: 6
                    color: "#15ffffff"
                    Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.closeModal()
                    }
                }
            }

            // Quick actions pills
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Button {
                    text: "📝 Gerar Resumo"
                    onClicked: root.sendMessage("Gerar resumo dos pontos chave")
                    background: Rectangle { color: "#252438"; radius: 6; border.color: "#30ffffff" }
                    contentItem: Text { text: parent.text; color: "#ddd6fe"; font.pixelSize: 11; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }

                Button {
                    text: "❓ Criar Questões"
                    onClicked: root.sendMessage("Gerar questões de prova sobre o documento")
                    background: Rectangle { color: "#252438"; radius: 6; border.color: "#30ffffff" }
                    contentItem: Text { text: parent.text; color: "#ddd6fe"; font.pixelSize: 11; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }

                Item { Layout.fillWidth: true }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: "#10ffffff" }

            // Chat Messages List
            ListView {
                id: msgList
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                spacing: 10
                model: root.messages

                delegate: ColumnLayout {
                    width: msgList.width
                    spacing: 4

                    Rectangle {
                        Layout.alignment: modelData.role === "user" ? Qt.AlignRight : Qt.AlignLeft
                        Layout.maximumWidth: msgList.width * 0.85
                        implicitWidth: msgText.implicitWidth + 24
                        implicitHeight: msgText.implicitHeight + 20
                        radius: 12
                        color: modelData.role === "user" ? "#4f46e5" : "#201f30"
                        border.color: modelData.role === "user" ? "transparent" : "#18ffffff"

                        Text {
                            id: msgText
                            anchors.fill: parent
                            anchors.margins: 10
                            text: modelData.text
                            color: "#fffffe"
                            font.pixelSize: 12
                            wrapMode: Text.Wrap
                        }
                    }
                }

                onCountChanged: msgList.positionViewAtEnd()
            }

            // Loading indicator
            RowLayout {
                visible: root.isLoading
                Layout.fillWidth: true
                spacing: 8
                BusyIndicator { running: root.isLoading; Layout.preferredWidth: 20; Layout.preferredHeight: 20 }
                Text { text: "Analisando contexto do arquivo…"; color: "#a78bfa"; font.pixelSize: 11 }
            }

            // Input Bar
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                TextField {
                    id: promptInput
                    Layout.fillWidth: true
                    Layout.preferredHeight: 38
                    placeholderText: "Pergunte algo sobre o documento…"
                    color: "#fffffe"
                    font.pixelSize: 13
                    placeholderTextColor: "#64748b"
                    text: root.inputText
                    onTextChanged: root.inputText = text
                    onAccepted: root.sendMessage()

                    background: Rectangle {
                        color: "#1a1928"
                        radius: 8
                        border.color: promptInput.activeFocus ? "#818cf8" : "#20ffffff"
                    }
                }

                Button {
                    Layout.preferredWidth: 42
                    Layout.preferredHeight: 38
                    text: "➤"
                    enabled: root.inputText.trim().length > 0 && !root.isLoading
                    onClicked: root.sendMessage()

                    background: Rectangle {
                        color: parent.enabled ? "#6366f1" : "#242332"
                        radius: 8
                    }
                    contentItem: Text {
                        text: parent.text
                        color: parent.enabled ? "#ffffff" : "#64748b"
                        font.pixelSize: 15
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }
    }

    Shortcut {
        sequence: "Escape"
        enabled: root.visible
        onActivated: root.closeModal()
    }
}
