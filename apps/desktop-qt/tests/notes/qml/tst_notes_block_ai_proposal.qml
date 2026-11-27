import QtQuick
import QtTest
import "../../../qml/notes/NotesBlockAiProposal.js" as BlockAiProposal

TestCase {
    name: "NotesBlockAiProposal"

    function test_proposalDetailsExposeTargetAwareSurgicalDiff() {
        var block = { id: "code-proposal", blockType: "codeBlock", attrs: { code: "old()", language: "js" }, html: "", innerHtml: "old()" }
        var reply = "<<<<<<< SEARCH\nold()\n=======\nnew()\n>>>>>>>"
        var details = BlockAiProposal.details(block, reply)
        verify(details.valid)
        verify(details.isSearchReplace)
        compare(details.searchReplaceCount, 1)
        compare(details.cleanText, reply)
        compare(details.sourceText, "old()")
        compare(details.replacementText, "new()")
        verify(details.diffAvailable)

        var stale = BlockAiProposal.details(block, "<<<<<<< SEARCH\nmissing()\n=======\nnew()\n>>>>>>>")
        verify(!stale.valid)
    }

    function test_proposalDetailsExtractToggleTitleAndCopyableBody() {
        var block = { id: "toggle-proposal", blockType: "toggleBlock", attrs: { "data-title": "Old title" }, html: "", innerHtml: "<p>Old body</p>" }
        var details = BlockAiProposal.details(block, "Title: New title\n\n**New body**")
        verify(details.valid)
        compare(details.proposedTitle, "New title")
        compare(details.cleanText, "**New body**")
        compare(details.sourceText, "Old body")
        verify(details.replacementText.indexOf("New body") >= 0)
        verify(details.diffAvailable)
    }
}
