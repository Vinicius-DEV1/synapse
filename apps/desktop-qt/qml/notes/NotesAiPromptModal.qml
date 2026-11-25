import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: aiModalRoot
    anchors.fill: parent
    visible: isOpen
    z: 140

    property var controller: null
    property bool isOpen: false
    property string selectedText: ""
    property string noteContextHtml: ""
    property bool isGenerating: false
    property var chatHistory: []
    property string aiReply: ""
    property string previewHtml: ""
    property string previewDiffHtml: ""
    property string errorText: ""

    signal applyHtmlRequested(string html)
    signal insertTextRequested(string text)
    signal closed()

    function openModal(selection, fullHtml) {
        selectedText = String(selection || "")
        noteContextHtml = String(fullHtml || "")
        chatHistory = []
        aiReply = ""
        previewHtml = ""
        previewDiffHtml = ""
        errorText = ""
        customInput.text = ""
        isOpen = true
        customInput.forceActiveFocus()
    }

    function runPrompt(instruction) {
        if (isGenerating || !instruction.trim()) return
        isGenerating = true
        errorText = ""
        previewHtml = ""
        previewDiffHtml = ""

        var baseText = selectedText.trim().length > 0
            ? selectedText
            : noteContextHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 3500)

        var sysPrompt = "Você é um assistente de edição de notas no Synapse. Responda de forma clara e direta em português. Quando reescrever ou editar um trecho existente, devolva o novo texto limpo em HTML simples (<p>, <ul>, <li>, <strong>, <em>)."
        var userPrompt = (chatHistory.length === 0 && baseText.length > 0)
            ? ("Instrução: " + instruction + "\n\nConteúdo de referência:\n" + baseText)
            : instruction

        var c = aiModalRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
        var historySnapshot = chatHistory.slice()
        aiClient.promptText(sysPrompt, userPrompt, historySnapshot, function(ok, reply, err) {
            aiModalRoot.isGenerating = false
            if (!ok) {
                aiModalRoot.errorText = err || qsTr("Falha ao consultar IA.")
                return
            }
            var replyStr = String(reply || "").trim()
            aiModalRoot.aiReply = replyStr
            aiModalRoot.chatHistory = historySnapshot.concat([
                { role: "user", content: userPrompt },
                { role: "assistant", content: replyStr }
            ])
            customInput.text = ""
            if (aiModalRoot.noteContextHtml.length > 0 && c && typeof c.applyNoteSearchReplace === "function") {
                var patched = c.applyNoteSearchReplace(aiModalRoot.noteContextHtml, replyStr)
                if (patched && patched.success && patched.replacedCount > 0) {
                    aiModalRoot.previewHtml = patched.result
                    aiModalRoot.previewDiffHtml = c.computeNoteWordDiffHtml(aiModalRoot.noteContextHtml, patched.result)
                    return
                }
            }
            aiModalRoot.previewHtml = ""
        })
    }

    AiClient {
        id: aiClient
        dataController: aiModalRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
    }

    Rectangle {
        anchors.fill: parent
        color: "#b0000000"
        MouseArea { anchors.fill: parent; onClicked: aiModalRoot.closed() }
    }

    Rectangle {
        width: Math.min(parent.width - 48, 560)
        height: Math.min(parent.height - 48, contentCol.implicitHeight + 40)
        anchors.centerIn: parent
        radius: 16
        color: "#161522"
        border.color: "#338b5cf6"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: contentCol
            anchors.fill: parent
            anchors.margins: 20
            spacing: 12

            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                Rectangle {
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 28
                    radius: 8
                    color: "#268b5cf6"
                    AppIcon { anchors.centerIn: parent; name: "sparkles"; color: "#c4b5fd"; width: 15; height: 15 }
                }
                Text {
                    text: aiModalRoot.selectedText.length > 0 ? qsTr("Editar seleção com IA") : qsTr("Gerar conteúdo com IA")
                    color: "#fffffe"
                    font.pixelSize: 15
                    font.bold: true
                    Layout.fillWidth: true
                }
                ToolButton {
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 28
                    onClicked: aiModalRoot.closed()
                    background: Rectangle { radius: 6; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#94a1b2"; width: 13; height: 13 }
                }
            }

            Flow {
                Layout.fillWidth: true
                spacing: 6
                Repeater {
                    model: [
                        { label: "Resumir", prompt: "Resuma os pontos principais em tópicos objetivos." },
                        { label: "Melhorar escrita", prompt: "Melhore a clareza, coesão e tom acadêmico mantendo o significado." },
                        { label: "Corrigir gramática", prompt: "Corrija ortografia e gramática sem mudar o estilo." },
                        { label: "Explicar simples", prompt: "Explique este conteúdo de maneira didática com um exemplo." },
                        { label: "Expandir", prompt: "Expanda e aprofunde este tópico com mais detalhes." }
                    ]
                    delegate: Button {
                        required property var modelData
                        Layout.preferredHeight: 26
                        padding: 8
                        onClicked: aiModalRoot.runPrompt(modelData.prompt)
                        background: Rectangle { radius: 13; color: parent.hovered ? "#288b5cf6" : "#1f1e2e"; border.color: "#2e2e38" }
                        contentItem: Text { text: modelData.label; color: "#ddd6fe"; font.pixelSize: 11 }
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                TextField {
                    id: customInput
                    Layout.fillWidth: true
                    placeholderText: qsTr("Peça qualquer coisa à IA...")
                    placeholderTextColor: "#52525b"
                    color: "#fffffe"
                    font.pixelSize: 13
                    background: Rectangle { radius: 8; color: "#0f0e17"; border.color: activeFocus ? "#8b5cf6" : "#2e2e38" }
                    onAccepted: aiModalRoot.runPrompt(text)
                }
                Button {
                    Layout.preferredHeight: 36
                    padding: 12
                    enabled: !aiModalRoot.isGenerating && customInput.text.trim().length > 0
                    onClicked: aiModalRoot.runPrompt(customInput.text)
                    background: Rectangle { radius: 8; color: enabled ? "#7c3aed" : "#27272a" }
                    contentItem: Text { text: aiModalRoot.isGenerating ? qsTr("Gerando...") : qsTr("Enviar"); color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                }
            }

            Text {
                visible: aiModalRoot.errorText.length > 0
                text: aiModalRoot.errorText
                color: "#fda4af"
                font.pixelSize: 12
                wrapMode: Text.Wrap
                Layout.fillWidth: true
            }

            Rectangle {
                visible: aiModalRoot.aiReply.length > 0
                Layout.fillWidth: true
                Layout.preferredHeight: 190
                radius: 8
                color: "#0f0e17"
                border.color: "#24ffffff"
                ScrollView {
                    anchors.fill: parent
                    anchors.margins: 10
                    clip: true
                    Text {
                        width: parent.width
                        text: aiModalRoot.previewDiffHtml.length > 0 ? aiModalRoot.previewDiffHtml : aiModalRoot.aiReply
                        textFormat: aiModalRoot.previewDiffHtml.length > 0 ? Text.RichText : Text.PlainText
                        color: "#e2e8f0"
                        font.pixelSize: 12
                        wrapMode: Text.WordWrap
                    }
                }
            }

            RowLayout {
                visible: aiModalRoot.aiReply.length > 0
                Layout.fillWidth: true
                spacing: 8
                Item { Layout.fillWidth: true }
                Button {
                    Layout.preferredHeight: 32
                    padding: 10
                    onClicked: {
                        if (aiModalRoot.previewHtml.length > 0) aiModalRoot.applyHtmlRequested(aiModalRoot.previewHtml)
                        else aiModalRoot.insertTextRequested(aiModalRoot.aiReply)
                        aiModalRoot.closed()
                    }
                    background: Rectangle { radius: 8; color: "#7c3aed" }
                    contentItem: Text {
                        text: aiModalRoot.previewHtml.length > 0 ? qsTr("Aplicar alterações") : qsTr("Inserir na nota")
                        color: "#ffffff"
                        font.pixelSize: 12
                        font.bold: true
                    }
                }
            }
        }
    }
}
