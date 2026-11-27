pragma ComponentBehavior: Bound

import QtQuick
import QtTest
import "../../../qml/notes" as Notes
import "../../../qml/notes/NotesBlockAiSession.js" as BlockAiSession

TestCase {
    id: testCase
    name: "NotesAiPromptModalApply"
    when: windowShown
    width: 640
    height: 480

    property var modal: null
    property string appliedValue: ""
    property string copiedText: ""
    property bool appliedAsCanonicalHtml: false
    property string insertedText: ""
    property int closeCount: 0
    property bool acceptBlockApply: true

    Component {
        id: modalComponent
        Notes.NotesAiPromptModal {
            width: testCase.width
            height: testCase.height
            onApplyHtmlRequested: function(html) { testCase.appliedValue = html }
            onInsertTextRequested: function(text) { testCase.insertedText = text }
            onClosed: testCase.closeCount += 1
        }
    }

    function init() {
        appliedValue = ""
        copiedText = ""
        appliedAsCanonicalHtml = false
        insertedText = ""
        closeCount = 0
        acceptBlockApply = true
        modal = createTemporaryObject(modalComponent, testCase)
        verify(modal !== null)
    }

    function cleanup() {
        if (modal) modal.destroy()
        modal = null
    }

    function test_blockApplyReceivesCanonicalPreviewAndClosesOnSuccess() {
        modal.openModal("selected", "<pre><code>old</code></pre>", function(value, isCanonical) {
            testCase.appliedValue = value
            testCase.appliedAsCanonicalHtml = isCanonical
            return testCase.acceptBlockApply
        })
        modal.aiReply = "model answer"
        modal.previewHtml = "<pre><code>new</code></pre>"
        modal.previewDiffHtml = "<del>old</del><ins>new</ins>"

        verify(modal.applyResponse())
        compare(appliedValue, "<pre><code>new</code></pre>")
        compare(appliedAsCanonicalHtml, true)
        verify(!modal.isOpen)
        compare(closeCount, 1)
    }

    function test_blockApplyUsesRawReplyWhenNoSearchReplacePatchExists() {
        modal.openModal("selected", "<blockquote><p>old</p></blockquote>", function(value, isCanonical) {
            testCase.appliedValue = value
            testCase.appliedAsCanonicalHtml = isCanonical
            return true
        })
        modal.aiReply = "new reply"
        modal.previewHtml = ""

        verify(modal.applyResponse())
        compare(appliedValue, "new reply")
        verify(!appliedAsCanonicalHtml)
        compare(insertedText, "")
    }

    function test_staleBlockApplyShowsErrorAndKeepsModalOpen() {
        modal.openModal("selected", "<p>old</p>", function() { return false })
        modal.aiReply = "stale answer"

        verify(!modal.applyResponse())
        verify(modal.isOpen)
        verify(modal.errorText.length > 0)
        compare(closeCount, 0)
    }

    function test_noteLevelApplyRemainsSeparate() {
        modal.openModal("", "<p>whole note</p>", null)
        modal.aiReply = "new note text"
        verify(modal.applyResponse())
        compare(insertedText, "new note text")
        compare(appliedValue, "")
        compare(closeCount, 1)
    }

    function test_escapeInvalidatesTheCapturedApplyCallback() {
        var callbackCount = 0
        modal.openModal("selected", "<p>old</p>", function() {
            callbackCount++
            return true
        })
        var requestGeneration = modal.requestGeneration
        modal.closeModal()
        verify(modal.requestGeneration > requestGeneration)
        modal.aiReply = "late reply"
        verify(!modal.applyResponse())
        compare(callbackCount, 0)
        compare(closeCount, 1)
    }

    function test_followUpRequestReceivesProviderShapedHistoryWithoutChangingChatRecords() {
        var receivedHistory = []
        modal.aiClientOverride = {
            promptText: function(systemPrompt, userPrompt, history, callback) {
                receivedHistory = history
                callback(true, "Second response", "")
                return null
            }
        }
        modal.openModal("", "", null)
        modal.chatHistory = [
            { role: "user", content: "First request" },
            { role: "assistant", content: "First response" }
        ]

        modal.runPrompt("Follow-up request")

        compare(receivedHistory.length, 2)
        compare(receivedHistory[0].role, "user")
        compare(receivedHistory[0].messageText, "First request")
        compare(receivedHistory[1].role, "assistant")
        compare(receivedHistory[1].messageText, "First response")
        compare(modal.chatHistory[0].content, "First request")
        compare(modal.chatHistory[1].content, "First response")
        compare(modal.chatHistory[3].content, "Second response")
    }

    function test_closeAndRetargetAbortPendingProviderRequestAndIgnoreLateReply() {
        var capturedCallback = null
        var abortCount = 0
        modal.aiClientOverride = {
            promptText: function(systemPrompt, userPrompt, history, callback) {
                capturedCallback = callback
                return { abort: function() { abortCount++ } }
            }
        }
        modal.openModal("first target", "<p>first</p>", null)
        modal.runPrompt("Request for the first target")
        verify(modal.isGenerating)
        verify(typeof capturedCallback === "function")

        modal.openModal("second target", "<p>second</p>", null)
        compare(abortCount, 1)
        verify(modal.isOpen)
        verify(!modal.isGenerating)
        capturedCallback(true, "Late response for the first target", "")
        compare(modal.chatHistory.length, 0)
        compare(modal.aiReply, "")

        modal.runPrompt("Request for the second target")
        verify(modal.isGenerating)
        modal.closeModal()
        compare(abortCount, 2)
        verify(!modal.isGenerating)
        capturedCallback(true, "Late response after close", "")
        compare(modal.chatHistory.length, 0)
        compare(modal.aiReply, "")
    }

    function test_blockAssistantClampsToViewportAndRestoresItsConversation() {
        var sessionId = "page-ai::block-ai"
        BlockAiSession.save(sessionId, [
            { role: "user", content: "Improve this block" },
            { role: "assistant", content: "Stored block proposal" }
        ])
        var handler = function() { return true }
        handler.sessionId = sessionId
        handler.blockType = "codeBlock"
        handler.blockTitle = "IA • Bloco de Código"
        handler.blockSubtitle = "example.js"
        handler.anchorX = 630
        handler.anchorY = 470
        modal.openModal("selected", "old code", handler)

        verify(modal.blockScoped)
        compare(modal.aiReply, "Stored block proposal")
        compare(modal.chatHistory.length, 2)
        var card = findChild(modal, "notesAiPromptCard")
        verify(card !== null)
        tryCompare(card, "width", 370)
        verify(card.x >= 12 && card.x + card.width <= modal.width - 12)
        verify(card.y >= 12 && card.y + card.height <= modal.height - 12)

        modal.closeModal()
        modal.openModal("selected", "old code", handler)
        compare(modal.aiReply, "Stored block proposal")
        modal.clearBlockConversation()
        compare(modal.chatHistory.length, 0)
        compare(BlockAiSession.load(sessionId).length, 0)
    }

    function test_conversationUsesDistinctUserAndAssistantBubbles() {
        modal.openModal("", "", null)
        modal.chatHistory = [
            { role: "user", content: "Contexto:\n\"Current note\"\n\nInstrução:\nMake a summary" },
            { role: "assistant", content: "## Summary\n\n- First point" }
        ]
        modal.aiReply = "## Summary\n\n- First point"
        var conversation = findChild(modal, "notesAiConversation")
        verify(conversation !== null)
        var repeater = findChild(modal, "notesAiMessagesRepeater")
        verify(repeater !== null)
        compare(repeater.count, 2)
        compare(conversation.displayMessage(modal.chatHistory[0], 0), "Make a summary")
        var userRow = repeater.itemAt(0)
        var assistantRow = repeater.itemAt(1)
        verify(userRow !== null)
        verify(assistantRow !== null)
        var userText = findChild(userRow, "notesAiMessageText")
        var assistantText = findChild(assistantRow, "notesAiMessageText")
        compare(userText.textFormat, Text.PlainText)
        compare(assistantText.textFormat, Text.RichText)
        verify(assistantText.text.indexOf("Summary") >= 0)
    }

    function test_conversationScrollsToTheNewestMessages() {
        modal.openModal("", "", null)
        var messages = []
        for (var i = 0; i < 18; ++i)
            messages.push({ role: i % 2 === 0 ? "user" : "assistant", content: "Message " + i + " with enough text to wrap in this narrow assistant conversation panel." })
        modal.chatHistory = messages
        wait(50)

        var scroll = findChild(modal, "notesAiMessageScroll")
        verify(scroll !== null)
        verify(scroll.contentHeight > scroll.height)
        verify(scroll.contentY > 0)
        verify(scroll.contentY >= scroll.contentHeight - scroll.height - 1)
    }

    function test_everyAssistantMessageHasItsOwnProposalActions() {
        var sourceBlock = {
            id: "code-1",
            blockType: "codeBlock",
            attrs: { code: "const oldValue = 1;", language: "js" },
            html: "",
            innerHtml: "const oldValue = 1;"
        }
        var applyHandler = function(value, canonical) {
            testCase.appliedValue = value
            testCase.appliedAsCanonicalHtml = canonical
            return true
        }
        applyHandler.sourceBlockState = JSON.stringify(sourceBlock)
        applyHandler.blockType = "codeBlock"
        applyHandler.blockLanguage = "js"
        applyHandler.insertContent = function(value) {
            testCase.insertedText = value
            return true
        }
        modal.controller = {
            copyToClipboard: function(value) { testCase.copiedText = value },
            computeNoteWordDiffHtml: function(before, after) { return "<del>" + before + "</del><ins>" + after + "</ins>" }
        }
        modal.openModal("", "const oldValue = 1;", applyHandler)
        modal.chatHistory = [
            { role: "user", content: "First request" },
            { role: "assistant", content: "```js\nconst newValue = 2;\n```" },
            { role: "user", content: "Second request" },
            { role: "assistant", content: "```js\nconst finalValue = 3;\n```" }
        ]

        var repeater = findChild(modal, "notesAiMessagesRepeater")
        compare(repeater.count, 4)
        for (var i = 1; i < repeater.count; i += 2) {
            var row = repeater.itemAt(i)
            verify(findChild(row, "notesAiMessageActions") !== null)
            verify(findChild(row, "notesAiApplyMessage") !== null)
            verify(findChild(row, "notesAiDiffMessage") !== null)
            verify(findChild(row, "notesAiInsertMessage") !== null)
            verify(findChild(row, "notesAiCopyMessage") !== null)
        }

        var firstAssistant = repeater.itemAt(1)
        var firstApply = findChild(firstAssistant, "notesAiApplyMessage")
        var firstApplyLabel = findChild(firstApply, "notesAiApplyMessageLabel")
        verify(firstApplyLabel !== null)
        compare(firstApplyLabel.text, "Substituir Código")
        compare(firstApply.background.radius, 4)
        compare(firstApply.background.color.toString(), "#338b5cf6")

        var olderCopy = findChild(firstAssistant, "notesAiCopyMessage")
        olderCopy.clicked()
        compare(copiedText, "const newValue = 2;")
        compare(modal.copiedMessageIndex, 1)

        var olderDiff = findChild(firstAssistant, "notesAiDiffMessage")
        var olderDiffIcon = findChild(olderDiff, "notesAiDiffIcon")
        verify(olderDiffIcon !== null)
        compare(olderDiffIcon.name, "file-diff")
        olderDiff.clicked()
        compare(modal.diffMessageIndex, 1)
        verify(findChild(firstAssistant, "notesAiDiffHeader") !== null)
        verify(findChild(firstAssistant, "notesAiDiffMessageText").text.indexOf("newValue") >= 0)
        tryCompare(findChild(modal, "notesAiPromptCard"), "width", 420)

        findChild(firstAssistant, "notesAiApplyMessage").clicked()
        compare(appliedValue, "```js\nconst newValue = 2;\n```")
        verify(!appliedAsCanonicalHtml)
        verify(!modal.isOpen)

        modal.openModal("", "const oldValue = 1;", applyHandler)
        modal.chatHistory = [
            { role: "assistant", content: "```js\nconst insertedValue = 4;\n```" }
        ]
        var latestRow = findChild(modal, "notesAiMessagesRepeater").itemAt(0)
        findChild(latestRow, "notesAiInsertMessage").clicked()
        compare(insertedText, "const insertedValue = 4;")
        verify(!modal.isOpen)
    }

    function test_surgicalDiffShowsReactEquivalentHeaderAndCount() {
        var sourceBlock = {
            id: "surgical-1",
            blockType: "codeBlock",
            attrs: { code: "const first = 1;\nconst second = 2;", language: "js" },
            html: "",
            innerHtml: "const first = 1;\nconst second = 2;"
        }
        var applyHandler = function() { return true }
        applyHandler.sourceBlockState = JSON.stringify(sourceBlock)
        applyHandler.blockType = "codeBlock"
        modal.controller = {
            copyToClipboard: function() {},
            computeNoteWordDiffHtml: function(before, after) { return "<del>" + before + "</del><ins>" + after + "</ins>" }
        }
        modal.openModal("", sourceBlock.innerHtml, applyHandler)
        modal.chatHistory = [{
            role: "assistant",
            content: "<<<<<<< SEARCH\nconst first = 1;\n=======\nconst first = 10;\n>>>>>>>"
        }]
        wait(20)

        var row = findChild(modal, "notesAiMessagesRepeater").itemAt(0)
        findChild(row, "notesAiDiffMessage").clicked()
        var header = findChild(row, "notesAiDiffHeader")
        verify(row.showingProposalDiff)
        verify(row.proposal.isSearchReplace)
        compare(row.proposal.searchReplaceCount, 1)
        compare(header.height, 18)
        compare(findChild(row, "notesAiDiffCountText").text, "1 cirúrgica(s)")
        verify(findChild(row, "notesAiDiffViewer").height <= 220)
        compare(findChild(row, "notesAiApplyMessageLabel").text, "Aplicar Cirurgicamente (1)")
        compare(findChild(row, "notesAiApplyMessage").background.color.toString(), "#3310b981")
    }
}
