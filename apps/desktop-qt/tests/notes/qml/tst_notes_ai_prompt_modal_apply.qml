pragma ComponentBehavior: Bound

import QtQuick
import QtTest
import "../../../qml/notes" as Notes

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
}
