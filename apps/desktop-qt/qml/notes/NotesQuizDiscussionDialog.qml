pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15
import "." as Notes
import "NotesQuizDiscussionPrompt.js" as DiscussionPrompt
import "NotesQuizDiscussionActions.js" as DiscussionActions

Rectangle {
    id: dialogRoot
    anchors.fill: parent
    color: "#cc000000"
    property bool isOpen: false
    visible: isOpen
    z: 190

    property var evaluator: null
    property string batteryTitle: ""
    property string batteryId: ""
    property var question: null
    property var questions: []
    property int questionIndex: 0
    property var chatHistory: []
    property string chatInput: ""
    property bool isSending: false
    property string activeModel: ""
    property string errorText: ""
    property int requestToken: 0
    property string progressStep: "generating"
    property bool isApplying: false

    signal closeRequested()
    signal questionsUpdated(var questions)

    Shortcut {
        sequence: "Escape"
        enabled: dialogRoot.visible && !assistantComposer.showMentionMenu
        onActivated: dialogRoot.requestClose()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: dialogRoot.requestClose()
    }

    Rectangle {
        id: dialogPanel
        anchors.centerIn: parent
        width: Math.min(parent.width - 32, 896)
        height: Math.min(parent.height - 32, parent.height * 0.88)
        radius: 24
        color: "#181620"
        border.color: "#4c1d95"
        clip: true

        MouseArea {
            anchors.fill: parent
            onClicked: function(mouse) { mouse.accepted = true }
        }

        ColumnLayout {
            anchors.fill: parent
            spacing: 0

            Notes.NotesQuizDiscussionHeader {
                activeModel: dialogRoot.activeModel
                hasHistory: dialogRoot.chatHistory.length > 0
                onClearRequested: dialogRoot.clearHistory()
                onCloseRequested: dialogRoot.requestClose()
            }

            ScrollView {
                id: chatScroll
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                padding: 22
                ScrollBar.vertical: ScrollBar {
                    id: chatVerticalScrollBar
                    policy: ScrollBar.AsNeeded
                }

                ColumnLayout {
                    id: messagesColumn
                    width: chatScroll.availableWidth
                    spacing: 18

                    Item {
                        visible: dialogRoot.chatHistory.length === 0 && !dialogRoot.isSending
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        Layout.minimumHeight: 220
                        ColumnLayout {
                            anchors.centerIn: parent
                            width: Math.min(parent.width - 32, 480)
                            spacing: 12
                            Text { Layout.alignment: Qt.AlignHCenter; text: "✦"; color: "#a78bfa"; font.pixelSize: 34 }
                            Text {
                                Layout.fillWidth: true
                                text: qsTr("Como posso ajudar com esta questão?")
                                color: "#f5f3ff"
                                font.pixelSize: 14
                                font.bold: true
                                horizontalAlignment: Text.AlignHCenter
                            }
                            Notes.NotesQuizDiscussionQuickShortcuts {
                                Layout.fillWidth: true
                                enabled: !dialogRoot.isSending
                                onPromptRequested: function(prompt) { assistantComposer.submit(prompt) }
                            }
                            Text {
                                Layout.fillWidth: true
                                text: qsTr("Pergunte sobre o gabarito, a avaliação ou formas de melhorar sua resposta.")
                                color: "#a1a1aa"
                                font.pixelSize: 12
                                wrapMode: Text.Wrap
                                horizontalAlignment: Text.AlignHCenter
                            }
                        }
                    }

                    Repeater {
                        model: dialogRoot.chatHistory
                        delegate: Notes.NotesQuizDiscussionMessage {
                            required property var modelData
                            required property int index
                            role: String(modelData.role || "assistant")
                            bodyText: String(modelData.text || "")
                            actions: modelData.actions || []
                            validationSummary: String(modelData.validationSummary || "")
                            actionsBusy: dialogRoot.isApplying
                            onApplyActionRequested: function(actionId) { dialogRoot.applyActions(index, [actionId]) }
                            onRejectActionRequested: function(actionId) { dialogRoot.rejectActions(index, [actionId]) }
                            onApplyAllRequested: dialogRoot.applyAll(index)
                            onRejectAllRequested: dialogRoot.rejectAll(index)
                        }
                    }

                    Notes.NotesQuizDiscussionQuickShortcuts {
                        visible: dialogRoot.chatHistory.length === 2 && !dialogRoot.isSending
                        Layout.fillWidth: true
                        enabled: !dialogRoot.isSending
                        onPromptRequested: function(prompt) { assistantComposer.submit(prompt) }
                    }

                    Rectangle {
                        visible: dialogRoot.isSending
                        Layout.alignment: Qt.AlignLeft
                        Layout.preferredWidth: 230
                        Layout.preferredHeight: 42
                        radius: 14
                        color: "#321c46"
                        border.color: "#6b21a8"
                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 8
                            Text { text: "◌"; color: "#c4b5fd"; font.pixelSize: 15 }
                            Text {
                                text: dialogRoot.progressStep === "validating"
                                    ? qsTr("Revisando sugestões com IA...") : qsTr("Gerando resposta com IA...")
                                color: "#e9d5ff"
                                font.pixelSize: 11
                            }
                        }
                    }
                }
                onContentHeightChanged: Qt.callLater(function() {
                    if (dialogRoot && dialogRoot.isOpen && chatVerticalScrollBar)
                        chatVerticalScrollBar.position = 1
                })
            }

            Notes.NotesQuizDiscussionComposer {
                id: assistantComposer
                controller: dialogRoot.evaluator ? dialogRoot.evaluator.controller : null
                activeBatteryId: dialogRoot.batteryId
                inputText: dialogRoot.chatInput
                isSending: dialogRoot.isSending
                canSend: Boolean(dialogRoot.question)
                onInputTextUpdated: function(text) { dialogRoot.chatInput = text }
                onSendRequested: function(message, references) { dialogRoot.sendMessage(message, references) }
            }
        }
    }

    function openForQuestion(title, currentBatteryId, currentQuestion, currentIndex, currentQuestions) {
        if (!currentQuestion) return
        dialogRoot.batteryTitle = title || qsTr("Bateria de Exercícios")
        dialogRoot.batteryId = String(currentBatteryId || "")
        dialogRoot.question = currentQuestion
        dialogRoot.questions = Array.isArray(currentQuestions) ? currentQuestions.slice() : [currentQuestion]
        dialogRoot.questionIndex = currentIndex
        dialogRoot.activeModel = evaluator && typeof evaluator.modelName === "function" ? evaluator.modelName() : ""
        dialogRoot.isOpen = true
        var tag = "Questão " + (currentIndex + 1)
        var alreadySent = dialogRoot.chatHistory.some(function(message) {
            return message.role === "user" && message.text.indexOf(tag) >= 0
        })
        if (!alreadySent) {
            sendMessage(DiscussionPrompt.initialDiscussionMessage(currentQuestion, currentIndex))
        }
    }

    function sendMessage(overrideText, referencedBatteries) {
        var messageText = String(overrideText !== undefined ? overrideText : dialogRoot.chatInput).trim()
        if (!messageText || dialogRoot.isSending || !dialogRoot.question || !dialogRoot.evaluator) return
        var userMessage = { id: "user_" + Date.now(), role: "user", text: messageText }
        var history = dialogRoot.chatHistory.slice()
        history.push(userMessage)
        dialogRoot.chatHistory = history
        dialogRoot.chatInput = ""
        dialogRoot.errorText = ""
        dialogRoot.isSending = true
        var token = dialogRoot.requestToken
        var context = dialogRoot.question
        dialogRoot.evaluator.evaluate(dialogRoot.batteryTitle, context, dialogRoot.questionIndex,
                           dialogRoot.questions, history, messageText,
                           function(success, result, failure) {
            if (token !== dialogRoot.requestToken) return
            dialogRoot.isSending = false
            if (success && result) {
                var updated = dialogRoot.chatHistory.slice()
                updated.push({ id: "assistant_" + Date.now(), role: "assistant",
                    text: String(result.message || ""), actions: result.actions || [],
                    validationSummary: String(result.validationSummary || "") })
                dialogRoot.chatHistory = updated
                return
            }
            dialogRoot.errorText = failure || qsTr("Falha na comunicação com a IA. Verifique sua conexão e tente novamente.")
            var failed = dialogRoot.chatHistory.slice()
            failed.push({ id: "assistant_error_" + Date.now(), role: "assistant", text: "⚠️ **Erro de comunicação com a IA**\n\n" + dialogRoot.errorText })
            dialogRoot.chatHistory = failed
        }, function(step, model) {
            if (token !== dialogRoot.requestToken) return
            dialogRoot.progressStep = String(step || "generating")
            if (model) dialogRoot.activeModel = String(model)
        }, referencedBatteries || [])
    }

    function applyActions(messageIndex, requestedIds) { DiscussionActions.applyActions(dialogRoot, messageIndex, requestedIds) }
    function applyAll(messageIndex) { DiscussionActions.applyAll(dialogRoot, messageIndex) }
    function rejectActions(messageIndex, actionIds) { DiscussionActions.rejectActions(dialogRoot, messageIndex, actionIds) }
    function rejectAll(messageIndex) { DiscussionActions.rejectAll(dialogRoot, messageIndex) }

    function clearHistory() {
        dialogRoot.chatHistory = []
        dialogRoot.errorText = ""
    }

    function requestClose() {
        dialogRoot.requestToken++
        dialogRoot.isSending = false
        dialogRoot.isOpen = false
        dialogRoot.closeRequested()
    }

    function closeSession() {
        dialogRoot.requestClose()
        dialogRoot.chatHistory = []
        dialogRoot.question = null
        dialogRoot.questions = []
        dialogRoot.batteryId = ""
        dialogRoot.chatInput = ""
        dialogRoot.errorText = ""
        dialogRoot.isApplying = false
        assistantComposer.clearReferences()
    }
}
