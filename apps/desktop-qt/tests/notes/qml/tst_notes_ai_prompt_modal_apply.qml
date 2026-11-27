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
        compare(card.width, 370)
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
        var repeater = findChild(modal, "notesAiMessagesRepeater")
        verify(repeater !== null)
        compare(repeater.count, 2)
        compare(modal.displayMessage(modal.chatHistory[0], 0), "Make a summary")
        var userRow = repeater.itemAt(0)
        var assistantRow = repeater.itemAt(1)
        verify(userRow !== null)
        verify(assistantRow !== null)
        var userText = findChild(userRow, "notesAiMessageText")
        var assistantText = findChild(assistantRow, "notesAiMessageText")
        compare(userText.textFormat, Text.PlainText)
        compare(assistantText.textFormat, Text.RichText)
        verify(assistantText.text.indexOf("<ul>") >= 0)
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
        var flickable = scroll.contentItem
        verify(flickable.contentHeight > scroll.height)
        verify(flickable.contentY > 0)
        verify(flickable.contentY >= flickable.contentHeight - scroll.height - 1)
    }
}
