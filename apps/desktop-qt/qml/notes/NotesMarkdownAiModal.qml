import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesMarkdownAiResponse.js" as Response
import "NotesMarkdownAiPrompt.js" as Prompt
import "NotesQuizBatteryMentions.js" as BatteryMentions
import "../ui"

Rectangle {
    id: root
    objectName: "notesMarkdownAiModal"
    anchors.fill: parent
    z: 170
    visible: false
    color: "#99000000"

    property var aiClient: null
    property var controller: null
    property string documentName: ""
    property string documentText: ""
    property string documentFileId: ""
    property var messages: []
    property string proposal: ""
    property string errorText: ""
    property bool isGenerating: false
    property bool saving: false
    property bool contextWasTrimmed: false
    property string inputText: ""
    property string mentionQuery: ""
    property bool showMentionMenu: false
    property int selectedMentionIndex: 0
    property string batteryLoadError: ""
    property var availableBatteries: []
    property var attachedBatteries: []
    readonly property var filteredBatteries: BatteryMentions.filterBatteries(
        availableBatteries, mentionQuery, attachedBatteries)
    property int requestGeneration: 0
    property var activeRequest: null
    readonly property int contextLimit: 48000

    signal applyProposalRequested(string markdown)
    signal closed()

    function openForDocument(name, content, fileId) {
        cancelRequest()
        documentName = String(name || "")
        documentText = String(content || "")
        documentFileId = String(fileId || "")
        contextWasTrimmed = documentText.length > contextLimit
        messages = [{ role: "assistant", text: qsTr("Posso explicar, resumir ou sugerir uma edição para este documento.") }]
        inputText = ""
        attachedBatteries = []
        mentionQuery = ""
        showMentionMenu = false
        selectedMentionIndex = 0
        loadAvailableBatteries()
        proposal = ""
        errorText = ""
        isGenerating = false
        visible = true
        aiDialog.focusComposer()
    }

    function loadAvailableBatteries() {
        availableBatteries = []
        batteryLoadError = ""
        if (!controller || typeof controller.getQuizBatteries !== "function") return
        try {
            availableBatteries = BatteryMentions.normalizeBatteries(controller.getQuizBatteries() || [], "")
        } catch (error) {
            batteryLoadError = qsTr("Não foi possível carregar as baterias de questões.")
            console.warn("Could not load Notes batteries for Markdown AI references.", error)
        }
    }

    function updatePromptInput(value) {
        inputText = String(value || "")
        var detectedQuery = BatteryMentions.mentionQuery(inputText)
        showMentionMenu = detectedQuery !== null
        mentionQuery = detectedQuery === null ? "" : detectedQuery
        selectedMentionIndex = 0
    }

    function selectBatteryMention(batteryId) {
        var battery = null
        for (var i = 0; i < availableBatteries.length; ++i) {
            if (String(availableBatteries[i].id) === String(batteryId)) {
                battery = availableBatteries[i]
                break
            }
        }
        if (!battery || !controller) return
        var attached = BatteryMentions.attachBattery(controller, battery)
        if (!attachedBatteries.some(function(item) { return item.id === attached.id }))
            attachedBatteries = attachedBatteries.concat([attached])
        inputText = BatteryMentions.removeMention(inputText)
        showMentionMenu = false
        mentionQuery = ""
        selectedMentionIndex = 0
        aiDialog.focusComposer()
    }

    function removeAttachedBattery(batteryId) {
        attachedBatteries = attachedBatteries.filter(function(item) {
            return String(item.id) !== String(batteryId)
        })
    }

    function dismissBatteryMenu() {
        showMentionMenu = false
        mentionQuery = ""
    }

    function cancelRequest() {
        requestGeneration++
        if (activeRequest && typeof activeRequest.abort === "function") activeRequest.abort()
        activeRequest = null
        isGenerating = false
    }

    function closeModal(forceClose) {
        if (saving && !forceClose) return
        cancelRequest()
        visible = false
        documentName = ""
        documentText = ""
        documentFileId = ""
        messages = []
        proposal = ""
        errorText = ""
        batteryLoadError = ""
        attachedBatteries = []
        availableBatteries = []
        inputText = ""
        closed()
    }

    function lastUserPrompt() {
        for (var i = messages.length - 1; i >= 0; --i) {
            if (messages[i].role === "user") return String(messages[i].text || "")
        }
        return ""
    }

    function sendMessage(rawPrompt, isRetry) {
        var prompt = String(rawPrompt || "").trim()
        if (!prompt || isGenerating || !aiClient || typeof aiClient.promptText !== "function") return
        if (!isRetry) {
            messages = messages.concat([{ role: "user", text: prompt }])
            proposal = ""
            inputText = ""
            showMentionMenu = false
            mentionQuery = ""
        }
        errorText = ""
        isGenerating = true
        var generation = ++requestGeneration
        var history = messages.slice(1, -1).map(function(message) {
            return { role: message.role, text: message.text }
        })
        var boundedText = contextWasTrimmed
            ? documentText.substring(0, 36000) + "\n\n[...trecho intermediário omitido por limite de contexto...]\n\n" + documentText.slice(-12000)
            : documentText
        var systemPrompt = Prompt.build(documentName, boundedText, attachedBatteries)
        var request = aiClient.promptText(systemPrompt, prompt, history, function(success, reply, error) {
            if (!root.visible || generation !== root.requestGeneration) return
            root.activeRequest = null
            root.isGenerating = false
            if (!success) {
                root.errorText = String(error || qsTr("Não foi possível consultar a IA."))
                return
            }

            var parsed = Response.extract(reply)
            if (parsed.proposal.length > 100000) {
                root.errorText = qsTr("A proposta excede o limite seguro de tamanho e não pode ser aplicada.")
                root.messages = root.messages.concat([{ role: "assistant", text: parsed.answer }])
                return
            }
            root.proposal = parsed.proposal
            var targetBattery = parsed.generatedQuestions.length > 0 && root.attachedBatteries.length > 0
                ? root.attachedBatteries[0] : null
            root.messages = root.messages.concat([{
                role: "assistant",
                text: parsed.answer,
                proposal: parsed.proposal,
                generatedQuestions: parsed.generatedQuestions,
                targetBattery: targetBattery,
                questionsAdded: false,
                questionAddError: ""
            }])
        })
        activeRequest = request
    }

    function retryLast() {
        sendMessage(lastUserPrompt(), true)
    }

    function applyProposal() {
        if (!saving && proposal.length > 0) applyProposalRequested(proposal)
    }

    function addGeneratedQuestions(messageIndex) {
        var message = messages[messageIndex]
        var battery = message && message.targetBattery
        if (!controller || typeof controller.applyQuizAssistantActions !== "function" ||
                !battery || !Array.isArray(message.generatedQuestions) || message.generatedQuestions.length === 0) {
            setQuestionResult(messageIndex, false, qsTr("Não foi possível acessar a bateria de questões."))
            return
        }
        var actions = message.generatedQuestions.map(function(question) {
            return {
                actionType: "create",
                type: question.type,
                question: question.question,
                options: question.options,
                correctIndex: question.correctIndex,
                expectedAnswer: question.expectedAnswer,
                explanation: question.explanation,
                tags: question.tags
            }
        })
        var result = controller.applyQuizAssistantActions(String(battery.id), actions)
        if (!result || !result.success) {
            setQuestionResult(messageIndex, false, String(result && result.error || qsTr("Não foi possível adicionar as questões.")))
            return
        }
        var refreshedBattery = BatteryMentions.attachBattery(controller, battery)
        var nextBatteries = attachedBatteries.map(function(item) {
            return String(item.id) === String(battery.id) ? refreshedBattery : item
        })
        attachedBatteries = nextBatteries
        var updated = Object.assign({}, message, { questionsAdded: true, questionAddError: "", targetBattery: refreshedBattery })
        var nextMessages = messages.slice()
        nextMessages[messageIndex] = updated
        messages = nextMessages
    }

    function setQuestionResult(messageIndex, added, error) {
        var message = messages[messageIndex]
        if (!message) return
        var updated = Object.assign({}, message, { questionsAdded: added, questionAddError: error })
        var nextMessages = messages.slice()
        nextMessages[messageIndex] = updated
        messages = nextMessages
    }

    MouseArea { anchors.fill: parent; onClicked: root.closeModal() }

    NotesMarkdownAiDialog {
        id: aiDialog
        anchors.fill: parent
        documentName: root.documentName
        documentText: root.documentText
        proposal: root.proposal
        inputText: root.inputText
        errorText: root.errorText
        batteryLoadError: root.batteryLoadError
        mentionQuery: root.mentionQuery
        contextWasTrimmed: root.contextWasTrimmed
        isGenerating: root.isGenerating
        saving: root.saving
        showMentionMenu: root.showMentionMenu
        selectedMentionIndex: root.selectedMentionIndex
        messages: root.messages
        attachedBatteries: root.attachedBatteries
        filteredBatteries: root.filteredBatteries
        onCloseRequested: root.closeModal()
        onSendRequested: function(prompt) { root.sendMessage(prompt, false) }
        onCancelRequested: root.cancelRequest()
        onRetryRequested: root.retryLast()
        onDiscardProposalRequested: root.proposal = ""
        onApplyProposalRequested: root.applyProposal()
        onPromptEdited: function(value) { root.updatePromptInput(value) }
        onBatterySelected: function(batteryId) { root.selectBatteryMention(batteryId) }
        onBatteryRemoved: function(batteryId) { root.removeAttachedBattery(batteryId) }
        onMentionSelectionChanged: function(index) { root.selectedMentionIndex = index }
        onMentionMenuDismissed: root.dismissBatteryMenu()
        onAddQuestionsRequested: function(index) { root.addGeneratedQuestions(index) }
        onViewProposalRequested: function(markdown) { root.proposal = markdown }
    }

    Shortcut {
        sequence: "Escape"
        enabled: root.visible && !root.saving && !root.showMentionMenu
        onActivated: root.closeModal()
    }
}
