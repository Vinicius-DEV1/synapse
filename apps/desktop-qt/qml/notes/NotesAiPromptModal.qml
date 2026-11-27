pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"
import "NotesBlockAiSession.js" as BlockAiSession
import "NotesBlockAiPrompt.js" as BlockAiPrompt

Item {
    id: aiModalRoot
    objectName: "notesAiPromptModal"
    anchors.fill: parent
    visible: isOpen
    z: 140

    property var controller: null
    property bool isOpen: false
    property string selectedText: ""
    property string noteContextHtml: ""
    property bool isGenerating: false
    property var chatHistory: []
    property var blockApplyHandler: null
    property int requestGeneration: 0
    property bool showDiff: false
    property int copiedMessageIndex: -1
    readonly property bool blockScoped: typeof blockApplyHandler === "function"
    readonly property real blockAnchorX: blockAnchor("anchorX", parent ? parent.width / 2 - 185 : 0)
    readonly property real blockAnchorY: blockAnchor("anchorY", 16)
    property string aiReply: ""
    property string previewHtml: ""
    property string previewDiffHtml: ""
    property string errorText: ""

    signal applyHtmlRequested(string html)
    signal insertTextRequested(string text)
    signal closed()

    function blockMetadata(name) {
        if (!blockScoped || !blockApplyHandler) return ""
        return String(blockApplyHandler[name] || "")
    }

    function blockAnchor(name, fallback) {
        if (!blockScoped || !blockApplyHandler) return fallback
        var value = Number(blockApplyHandler[name])
        return isFinite(value) && value >= 0 ? value : fallback
    }

    function hasBlockInsertAction() {
        return blockScoped && blockApplyHandler && typeof blockApplyHandler.insertContent === "function"
    }

    function openModal(selection, fullHtml, applyHandler) {
        requestGeneration++
        selectedText = String(selection || "")
        noteContextHtml = String(fullHtml || "")
        blockApplyHandler = typeof applyHandler === "function" ? applyHandler : null
        chatHistory = blockScoped ? BlockAiSession.load(blockApplyHandler.sessionId) : []
        aiReply = ""
        for (var i = chatHistory.length - 1; i >= 0; --i) {
            if (chatHistory[i].role === "assistant") {
                aiReply = String(chatHistory[i].content || "")
                break
            }
        }
        previewHtml = ""
        previewDiffHtml = ""
        errorText = ""
        showDiff = false
        copiedMessageIndex = -1
        customInput.text = ""
        isOpen = true
        customInput.forceActiveFocus()
    }

    function closeModal() {
        requestGeneration++
        isGenerating = false
        isOpen = false
        blockApplyHandler = null
        closed()
    }

    function clearBlockConversation() {
        if (!blockScoped) return
        BlockAiSession.clear(blockApplyHandler.sessionId)
        chatHistory = []
        aiReply = ""
        previewHtml = ""
        previewDiffHtml = ""
        errorText = ""
        showDiff = false
    }

    function copyBlockResponse() {
        var c = aiModalRoot.controller
        if (!blockScoped || !aiReply || !c || typeof c.copyToClipboard !== "function") return false
        c.copyToClipboard(aiReply)
        copiedMessageIndex = chatHistory.length - 1
        return true
    }

    function applyResponse() {
        if (!isOpen || isGenerating || aiReply.length === 0) return false
        var response = previewHtml.length > 0 ? previewHtml : aiReply
        if (typeof blockApplyHandler === "function") {
            var applied = false
            try {
                applied = Boolean(blockApplyHandler.call(null, response, previewHtml.length > 0))
            } catch (error) {
                console.error("[Notes:BlockAI] Could not apply the response to its source block:", error)
            }
            if (!applied) {
                errorText = qsTr("Não foi possível aplicar a proposta. O bloco pode ter mudado ou a resposta ser incompatível.")
                return false
            }
            closeModal()
            return true
        }
        if (previewHtml.length > 0) applyHtmlRequested(previewHtml)
        else insertTextRequested(aiReply)
        closeModal()
        return true
    }

    function runPrompt(instruction) {
        if (isGenerating || !instruction.trim()) return
        isGenerating = true
        errorText = ""
        previewHtml = ""
        previewDiffHtml = ""
        var generation = ++requestGeneration

        var blockScoped = typeof blockApplyHandler === "function"
        var baseText = blockScoped
            ? BlockAiPrompt.contextFor(blockApplyHandler)
            : selectedText.trim().length > 0
                ? selectedText
                : noteContextHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 3500)
        var sysPrompt = blockScoped
            ? BlockAiPrompt.systemInstruction(blockApplyHandler.blockType, blockApplyHandler.blockLanguage)
            : "Você é um assistente de edição de notas no Synapse. Responda de forma clara e direta em português. Quando reescrever ou editar um trecho existente, devolva o novo texto limpo em HTML simples (<p>, <ul>, <li>, <strong>, <em>)."
        var userPrompt = (chatHistory.length === 0 && baseText.length > 0)
            ? ("Instrução: " + instruction + "\n\nConteúdo de referência:\n" + baseText)
            : instruction

        var c = aiModalRoot.controller
        var historySnapshot = chatHistory.slice()
        aiClient.promptText(sysPrompt, userPrompt, historySnapshot, function(ok, reply, err) {
            if (!aiModalRoot.isOpen || generation !== aiModalRoot.requestGeneration) return
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
            if (blockScoped) BlockAiSession.save(aiModalRoot.blockApplyHandler.sessionId, aiModalRoot.chatHistory)
            customInput.text = ""
            if (!blockScoped && aiModalRoot.noteContextHtml.length > 0 && c && typeof c.applyNoteSearchReplace === "function") {
                var patched = c.applyNoteSearchReplace(aiModalRoot.noteContextHtml, replyStr)
                if (patched && patched.success && patched.replacedCount > 0) {
                    aiModalRoot.previewHtml = patched.result
                    aiModalRoot.previewDiffHtml = c.computeNoteWordDiffHtml(aiModalRoot.noteContextHtml, patched.result)
                    return
                }
            }
            if (blockScoped && aiModalRoot.noteContextHtml.length > 0 && c &&
                    typeof c.computeNoteWordDiffHtml === "function") {
                aiModalRoot.previewDiffHtml = c.computeNoteWordDiffHtml(aiModalRoot.noteContextHtml, replyStr)
            }
            aiModalRoot.previewHtml = ""
        })
    }

    AiClient {
        id: aiClient
        dataController: aiModalRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
    }

    Shortcut {
        sequence: "Escape"
        context: Qt.WindowShortcut
        enabled: aiModalRoot.isOpen
        onActivated: aiModalRoot.closeModal()
    }

    Rectangle {
        anchors.fill: parent
        color: aiModalRoot.blockScoped ? "transparent" : "#b0000000"
        MouseArea { anchors.fill: parent; onClicked: aiModalRoot.closeModal() }
    }

    Rectangle {
        objectName: "notesAiPromptCard"
        x: aiModalRoot.blockScoped
            ? Math.max(12, Math.min(aiModalRoot.blockAnchorX, parent.width - width - 12))
            : (parent.width - width) / 2
        y: aiModalRoot.blockScoped
            ? Math.max(12, Math.min(aiModalRoot.blockAnchorY, parent.height - height - 12))
            : (parent.height - height) / 2
        width: aiModalRoot.blockScoped ? Math.min(parent.width - 24, aiModalRoot.showDiff ? 420 : 370)
            : Math.min(parent.width - 48, 560)
        height: Math.min(parent.height - 24, aiModalRoot.blockScoped ? 520 : contentCol.implicitHeight + 40)
        radius: aiModalRoot.blockScoped ? 12 : 16
        color: aiModalRoot.blockScoped ? "#12141a" : "#161522"
        border.color: aiModalRoot.blockScoped ? "#1affffff" : "#338b5cf6"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: contentCol
            anchors.fill: parent
            anchors.margins: aiModalRoot.blockScoped ? 12 : 20
            spacing: aiModalRoot.blockScoped ? 8 : 12

            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                Rectangle {
                    visible: !aiModalRoot.blockScoped
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 28
                    radius: 8
                    color: "#268b5cf6"
                    AppIcon { anchors.centerIn: parent; name: "sparkles"; color: "#c4b5fd"; width: 15; height: 15 }
                }
                AppIcon {
                    visible: aiModalRoot.blockScoped
                    name: "sparkles"
                    color: "#a78bfa"
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                }
                Text {
                    text: aiModalRoot.blockScoped ? aiModalRoot.blockMetadata("blockTitle")
                        : aiModalRoot.selectedText.length > 0 ? qsTr("Editar seleção com IA") : qsTr("Gerar conteúdo com IA")
                    color: "#fffffe"
                    font.pixelSize: aiModalRoot.blockScoped ? 12 : 15
                    font.bold: true
                    Layout.fillWidth: true
                }
                Text {
                    visible: aiModalRoot.blockMetadata("blockSubtitle").length > 0
                    text: aiModalRoot.blockMetadata("blockSubtitle")
                    color: "#a7a9be"
                    font.pixelSize: 10
                    elide: Text.ElideRight
                    Layout.maximumWidth: 90
                }
                ToolButton {
                    id: clearChatButton
                    visible: aiModalRoot.blockScoped && aiModalRoot.chatHistory.length > 0
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 26
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Limpar conversa")
                    onClicked: aiModalRoot.clearBlockConversation()
                    contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: clearChatButton.hovered ? "#fb7185" : "#94a1b2"; width: 13; height: 13 }
                }
                ToolButton {
                    id: closeButton
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 28
                    onClicked: aiModalRoot.closeModal()
                    background: Rectangle { radius: 6; color: closeButton.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#94a1b2"; width: 13; height: 13 }
                }
            }

            Flow {
                visible: !aiModalRoot.blockScoped
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
                        id: quickPromptButton
                        required property var modelData
                        Layout.preferredHeight: 26
                        padding: 8
                        onClicked: aiModalRoot.runPrompt(modelData.prompt)
                        background: Rectangle { radius: 13; color: quickPromptButton.hovered ? "#288b5cf6" : "#1f1e2e"; border.color: "#2e2e38" }
                        contentItem: Text { text: quickPromptButton.modelData.label; color: "#ddd6fe"; font.pixelSize: 11 }
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                TextField {
                    id: customInput
                    Layout.fillWidth: true
                    placeholderText: aiModalRoot.blockScoped
                        ? qsTr("Instrução para a IA neste bloco...") : qsTr("Peça qualquer coisa à IA...")
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

            ColumnLayout {
                visible: aiModalRoot.blockScoped && aiModalRoot.chatHistory.length === 0 && !aiModalRoot.isGenerating
                Layout.fillWidth: true
                Layout.preferredHeight: 140
                spacing: 8
                AppIcon { Layout.alignment: Qt.AlignHCenter; Layout.preferredWidth: 22; Layout.preferredHeight: 22; name: "sparkles"; color: "#8b5cf6"; opacity: 0.4 }
                Text {
                    Layout.fillWidth: true
                    text: qsTr("Como posso ajudar com este bloco?")
                    color: "#d4d4d8"
                    font.pixelSize: 12
                    font.weight: Font.Medium
                    horizontalAlignment: Text.AlignHCenter
                }
                Text {
                    Layout.fillWidth: true
                    text: qsTr("O escopo de edição está restrito a este elemento.")
                    color: "#71717a"
                    font.pixelSize: 11
                    horizontalAlignment: Text.AlignHCenter
                    wrapMode: Text.Wrap
                }
            }

            Rectangle {
                visible: aiModalRoot.aiReply.length > 0
                Layout.fillWidth: true
                Layout.preferredHeight: aiModalRoot.blockScoped ? 210 : 190
                radius: 8
                color: "#0f0e17"
                border.color: "#24ffffff"
                ScrollView {
                    anchors.fill: parent
                    anchors.margins: 10
                    clip: true
                    Text {
                        width: parent.width
                        text: aiModalRoot.showDiff && aiModalRoot.previewDiffHtml.length > 0
                            ? aiModalRoot.previewDiffHtml
                            : aiModalRoot.chatHistory.map(function(message) {
                                return (message.role === "user" ? qsTr("Você") : "IA") + ": " + String(message.content || "")
                            }).join("\n\n")
                        textFormat: aiModalRoot.showDiff && aiModalRoot.previewDiffHtml.length > 0
                            ? Text.RichText : Text.PlainText
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
                    visible: aiModalRoot.blockScoped && aiModalRoot.previewDiffHtml.length > 0
                    Layout.preferredHeight: 32
                    padding: 8
                    onClicked: aiModalRoot.showDiff = !aiModalRoot.showDiff
                    background: Rectangle { radius: 8; color: aiModalRoot.showDiff ? "#33f59e0b" : "#1affffff" }
                    contentItem: Text {
                        text: aiModalRoot.showDiff ? qsTr("Ver resposta") : qsTr("Ver diferenças")
                        color: aiModalRoot.showDiff ? "#fcd34d" : "#a7a9be"
                        font.pixelSize: 10
                    }
                }
                Button {
                    visible: aiModalRoot.blockScoped
                    Layout.preferredHeight: 32
                    padding: 8
                    onClicked: aiModalRoot.copyBlockResponse()
                    background: Rectangle { radius: 8; color: "#1affffff" }
                    contentItem: Text {
                        text: aiModalRoot.copiedMessageIndex === aiModalRoot.chatHistory.length - 1
                            ? qsTr("Copiado") : qsTr("Copiar")
                        color: "#a7a9be"
                        font.pixelSize: 10
                    }
                }
                Button {
                    visible: aiModalRoot.hasBlockInsertAction()
                    Layout.preferredHeight: 32
                    padding: 8
                    enabled: !aiModalRoot.isGenerating
                    onClicked: {
                        if (aiModalRoot.blockApplyHandler.insertContent.call(null, aiModalRoot.aiReply))
                            aiModalRoot.closeModal()
                        else aiModalRoot.errorText = qsTr("Não foi possível inserir conteúdo neste bloco.")
                    }
                    background: Rectangle { radius: 8; color: "#1affffff" }
                    contentItem: Text { text: qsTr("Inserir"); color: "#a7a9be"; font.pixelSize: 10 }
                }
                Button {
                    Layout.preferredHeight: 32
                    padding: 10
                    enabled: !aiModalRoot.isGenerating
                    onClicked: aiModalRoot.applyResponse()
                    background: Rectangle { radius: 8; color: "#7c3aed" }
                    contentItem: Text {
                        text: typeof aiModalRoot.blockApplyHandler === "function"
                            ? (aiModalRoot.blockMetadata("blockType") === "codeBlock"
                                ? qsTr("Substituir Código") : qsTr("Substituir no Bloco"))
                            : aiModalRoot.previewHtml.length > 0 ? qsTr("Aplicar alterações") : qsTr("Inserir na nota")
                        color: "#ffffff"
                        font.pixelSize: 12
                        font.bold: true
                    }
                }
            }
        }
    }
}
