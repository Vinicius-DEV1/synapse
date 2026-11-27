import QtQuick
import QtTest
import "../../../qml/notes/NotesBlockAiProposal.js" as BlockAiProposal
import "NotesCoreSearchReplaceFixture.js" as CoreSearchReplaceFixture

TestCase {
    name: "NotesBlockAiProposal"

    function test_proposalDetailsExposeTargetAwareSurgicalDiff() {
        var block = { id: "code-proposal", blockType: "codeBlock", attrs: { code: "old()", language: "js" }, html: "", innerHtml: "old()" }
        var reply = "<<<<<<< SEARCH\nold()\n=======\nnew()\n>>>>>>>"
        var controller = CoreSearchReplaceFixture.controllerWithResults([
            CoreSearchReplaceFixture.success("new()"),
            CoreSearchReplaceFixture.missing(block.attrs.code)
        ])
        var details = BlockAiProposal.details(block, reply, controller)
        verify(details.valid)
        verify(details.isSearchReplace)
        compare(details.searchReplaceCount, 1)
        compare(details.cleanText, reply)
        compare(details.sourceText, "old()")
        compare(details.replacementText, "new()")
        verify(details.diffAvailable)
        compare(controller.callCount(), 1)

        var stale = BlockAiProposal.details(block, "<<<<<<< SEARCH\nmissing()\n=======\nnew()\n>>>>>>>", controller)
        verify(!stale.valid)
        compare(controller.callCount(), 2)
    }

    function test_flexibleSearchMarkersUseCoreParsedCount() {
        var block = { id: "code-spacing", blockType: "codeBlock", attrs: { code: "old()", language: "js" }, html: "", innerHtml: "old()" }
        var reply = "<<<<<<<  SEARCH  \nold()\n=======\nnew()\n>>>>>>>"
        var controller = CoreSearchReplaceFixture.controllerWithResults([
            CoreSearchReplaceFixture.success("new()")
        ])
        var details = BlockAiProposal.details(block, reply, controller)
        verify(details.valid)
        verify(details.isSearchReplace)
        compare(details.searchReplaceCount, 1)
        compare(details.replacementText, "new()")
        compare(controller.callCount(), 1)
    }

    function test_richTextSearchUsesSameParagraphsForAnalysisAndApply() {
        var block = {
            id: "quote-paragraphs",
            blockType: "blockquote",
            attrs: {},
            html: "",
            innerHtml: "<p>First paragraph</p><p>Second paragraph</p>"
        }
        var reply = "<<<<<<< SEARCH\nFirst paragraph\nSecond paragraph\n=======\nUpdated paragraph\n>>>>>>>"
        var controller = CoreSearchReplaceFixture.controllerWithResults([
            CoreSearchReplaceFixture.success("Updated paragraph")
        ])
        var details = BlockAiProposal.details(block, reply, controller)
        verify(details.valid)
        compare(details.sourceText, "First paragraph\nSecond paragraph")
        compare(details.replacementText, "Updated paragraph")
        compare(details.searchReplaceCount, 1)
        compare(controller.callCount(), 1)
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
