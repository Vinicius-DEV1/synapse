pragma ComponentBehavior: Bound

import QtQuick
import QtTest
import "../../../qml/notes" as Notes

TestCase {
    id: testCase
    name: "NotesBlockAiApply"
    when: windowShown
    width: 640
    height: 600

    property string pageId: "page-1"
    property var parsedBlocks: []
    property var serializedBlocks: []
    property var capturedApplyHandler: null
    property string capturedAiSelection: ""
    property int htmlChangeCount: 0
    property var editor: null
    property var toggle: null

    QtObject {
        id: mockTextOperations
        function createRichCodeSyntaxHighlighter(document) { return null }
        function releaseRichCodeSyntaxHighlighter(highlighter) { }
        function refreshRichCodeSyntaxHighlighting(highlighter) { }
    }

    QtObject {
        id: mockController
        function parseNoteBlocks(html) {
            return testCase.parsedBlocks
        }
        function serializeNoteBlocks(blocks) {
            testCase.serializedBlocks = blocks
            return JSON.stringify(blocks)
        }
    }

    Component {
        id: editorComponent
        Notes.BlockListEditor {
            width: 580
            height: 500
            pageId: testCase.pageId
            controller: mockController
            textOperations: mockTextOperations
            active: false
            onAskAiRequested: function(selection, blockHtml, applyBlockResult) {
                testCase.capturedApplyHandler = applyBlockResult
            }
            onHtmlChanged: testCase.htmlChangeCount += 1
        }
    }

    Component {
        id: toggleComponent
        Notes.NotesToggleBlock {
            width: 560
            height: 420
            pageId: testCase.pageId
            controller: mockController
            textOperations: mockTextOperations
            blockData: ({ id: "toggle-outer", blockType: "toggleBlock", attrs: { "data-title": "Nested" },
                          html: "<div data-type=\"toggle-block\"><pre><code>old</code></pre></div>",
                          innerHtml: "<pre><code>old</code></pre>" })
            onAskAiRequested: function(selection, blockHtml, applyBlockResult) {
                testCase.capturedAiSelection = selection
                testCase.capturedApplyHandler = applyBlockResult
            }
        }
    }

    function init() {
        pageId = "page-1"
        parsedBlocks = []
        serializedBlocks = []
        capturedApplyHandler = null
        capturedAiSelection = ""
        htmlChangeCount = 0
        toggle = null
        editor = createTemporaryObject(editorComponent, testCase)
        verify(editor !== null)
        editor.blocks = [
            { id: "code-1", blockType: "codeBlock", attrs: { code: "old", language: "js", "data-label": "kept" },
              html: "<pre><code>old</code></pre>", innerHtml: "old" },
            { id: "text-2", blockType: "richText", attrs: {}, html: "<p>Neighbor</p>", innerHtml: "<p>Neighbor</p>" }
        ]
        editor.lastEmittedHtml = "original-html"
    }

    function cleanup() {
        if (toggle) toggle.destroy()
        toggle = null
        if (editor) editor.destroy()
        editor = null
    }

    function test_replyUpdatesOnlyTheTargetBlockAndKeepsItsIdentity() {
        var original = JSON.stringify(editor.blocks[0])
        verify(editor.applyAiBlockResult("page-1", "code-1", original, "```js\nconst next = 2;\n```", false))
        compare(editor.blocks.length, 2)
        compare(editor.blocks[0].id, "code-1")
        compare(editor.blocks[0].attrs.code, "const next = 2;")
        compare(editor.blocks[1].html, "<p>Neighbor</p>")
        compare(htmlChangeCount, 1)
        compare(serializedBlocks.length, 2)
    }

    function test_codeBlockButtonCarriesTargetedApplyCallback() {
        var aiButton = findChild(editor, "notesCodeBlockAiButton")
        verify(aiButton !== null)
        verify(aiButton.enabled)
        compare(aiButton.focusPolicy, Qt.TabFocus)
        compare(aiButton.Accessible.name, "Assistente de IA")
        aiButton.clicked()
        verify(typeof capturedApplyHandler === "function")
        compare(capturedApplyHandler.sessionId, "page-1::code-1")
        compare(capturedApplyHandler.blockType, "codeBlock")
        verify(capturedApplyHandler.call(null, "```js\nconst fromAction = true;\n```", false))
        compare(editor.blocks[0].attrs.code, "const fromAction = true;")
        compare(editor.blocks[1].html, "<p>Neighbor</p>")
    }

    function test_targetCanMoveButStaleContentCannotBeOverwritten() {
        var original = JSON.stringify(editor.blocks[0])
        editor.blocks = [editor.blocks[1], editor.blocks[0]]
        verify(editor.applyAiBlockResult("page-1", "code-1", original, "new code", false))
        compare(editor.blocks[1].attrs.code, "new code")
        compare(editor.blocks[0].html, "<p>Neighbor</p>")

        var staleSnapshot = JSON.stringify(editor.blocks[1])
        editor.blocks[1] = Object.assign({}, editor.blocks[1], {
            attrs: Object.assign({}, editor.blocks[1].attrs, { code: "concurrent edit" })
        })
        var previousCount = htmlChangeCount
        verify(!editor.applyAiBlockResult("page-1", "code-1", staleSnapshot, "stale proposal", false))
        compare(editor.blocks[1].attrs.code, "concurrent edit")
        compare(htmlChangeCount, previousCount)
    }

    function test_pageChangeRejectsTheOldCallback() {
        var original = JSON.stringify(editor.blocks[0])
        pageId = "page-2"
        verify(!editor.applyAiBlockResult("page-1", "code-1", original, "new code", false))
        compare(editor.blocks[0].attrs.code, "old")
        compare(htmlChangeCount, 0)
    }

    function test_onlyReactBlockAssistantTypesGetReplacementCallbacks() {
        editor.blocks = [
            { id: "rich-1", blockType: "richText", attrs: {}, html: "<p>Selected text</p>", innerHtml: "" },
            { id: "file-1", blockType: "fileWidget", attrs: {}, html: "", innerHtml: "" },
            { id: "quote-1", blockType: "blockquote", attrs: {}, html: "", innerHtml: "quote" }
        ]

        compare(editor.createAiBlockApplyHandler(0), null)
        compare(editor.createAiBlockApplyHandler(1), null)
        verify(typeof editor.createAiBlockApplyHandler(2) === "function")
    }

    function test_insertActionAddsContentInsideTheSourceBlock() {
        var insertHandler = editor.createAiBlockApplyHandler(0)
        verify(typeof insertHandler.insertContent === "function")
        verify(insertHandler.insertContent.call(null, "```js\nconst added = true;\n```"))
        compare(editor.blocks[0].attrs.code, "old\nconst added = true;")
        compare(editor.blocks[1].html, "<p>Neighbor</p>")
    }

    function test_nestedBlockCallbackSurvivesToggleForwarding() {
        parsedBlocks = [
            { id: "nested-code", blockType: "codeBlock", attrs: { code: "old", language: "js" },
              html: "<pre><code>old</code></pre>", innerHtml: "old" }
        ]
        capturedApplyHandler = null
        toggle = createTemporaryObject(toggleComponent, testCase)
        verify(toggle !== null)
        tryVerify(function() { return findChild(toggle, "notesCodeBlockAiButton") !== null })

        var aiButton = findChild(toggle, "notesCodeBlockAiButton")
        verify(aiButton !== null)
        aiButton.clicked()
        verify(typeof capturedApplyHandler === "function")
        verify(capturedApplyHandler.call(null, "```js\nconst nested = 3;\n```", false))
        compare(serializedBlocks.length, 1)
        compare(serializedBlocks[0].id, "nested-code")
        compare(serializedBlocks[0].attrs.code, "const nested = 3;")
    }

    function test_toggleAssistantAnchorPointsToItsAiAction() {
        toggle = createTemporaryObject(toggleComponent, testCase)
        verify(toggle !== null)
        var aiButton = findChild(toggle, "notesToggleBlockAiButton")
        verify(aiButton !== null)
        compare(toggle.aiButtonItem, aiButton)
        compare(aiButton.focusPolicy, Qt.TabFocus)
        compare(aiButton.Accessible.name, "Assistente de IA")

        var toolbar = findChild(toggle, "notesToggleBlockToolbar")
        verify(toolbar !== null)
        aiButton.clicked()
        compare(capturedAiSelection, "Nested\nold")
        aiButton.forceActiveFocus()
        tryCompare(toolbar, "opacity", 1)
    }

    function test_toggleAssistantActionAppliesToItsStableBlock() {
        editor.blocks = [{
            id: "toggle-target",
            blockType: "toggleBlock",
            attrs: { "data-title": "Current title", "data-is-open": "true" },
            html: "",
            innerHtml: "<p>Current body</p>"
        }]
        tryVerify(function() { return findChild(editor, "notesToggleBlockAiButton") !== null })

        var aiButton = findChild(editor, "notesToggleBlockAiButton")
        verify(aiButton !== null)
        aiButton.clicked()
        verify(typeof capturedApplyHandler === "function")
        compare(capturedApplyHandler.sessionId, "page-1::toggle-target")
        compare(capturedApplyHandler.blockType, "toggleBlock")
        verify(capturedApplyHandler.call(null, "Title: Revised title\nRevised body", false))
        compare(editor.blocks[0].id, "toggle-target")
        compare(editor.blocks[0].attrs["data-title"], "Revised title")
        verify(editor.blocks[0].innerHtml.indexOf("Revised body") >= 0)
    }

    function test_blockquoteToggleAssistantActionKeepsItsCalloutType() {
        editor.blocks = [{
            id: "callout-toggle-target",
            blockType: "blockquoteToggle",
            attrs: { "class": "blockquote-toggle", "data-color": "#3b82f6", "data-title": "Current title" },
            html: "",
            innerHtml: "<p>Current body</p>"
        }]
        tryVerify(function() { return findChild(editor, "notesToggleBlockAiButton") !== null })

        var aiButton = findChild(editor, "notesToggleBlockAiButton")
        verify(aiButton !== null)
        aiButton.clicked()
        verify(typeof capturedApplyHandler === "function")
        compare(capturedApplyHandler.sessionId, "page-1::callout-toggle-target")
        compare(capturedApplyHandler.blockType, "blockquoteToggle")
        verify(capturedApplyHandler.call(null, "Title: Revised callout\nRevised body", false))
        compare(editor.blocks[0].id, "callout-toggle-target")
        compare(editor.blocks[0].blockType, "blockquoteToggle")
        compare(editor.blocks[0].attrs["data-title"], "Revised callout")
        compare(editor.blocks[0].attrs["data-color"], "#3b82f6")
        verify(editor.blocks[0].innerHtml.indexOf("Revised body") >= 0)
    }

    function test_coreParsedResultMustRemainTheSameBlockType() {
        var original = JSON.stringify(editor.blocks[0])
        parsedBlocks = [{ id: "fresh-id", blockType: "codeBlock", attrs: { code: "parsed", language: "js" }, html: "", innerHtml: "" }]
        verify(editor.applyAiBlockResult("page-1", "code-1", original, "<pre><code>parsed</code></pre>", true))
        compare(editor.blocks[0].id, "code-1")
        compare(editor.blocks[0].attrs.code, "parsed")
        compare(editor.blocks[0].attrs.language, "js")
        compare(editor.blocks[0].attrs["data-label"], "kept")

        parsedBlocks = [{ id: "text-id", blockType: "richText", attrs: {}, html: "<p>wrong</p>", innerHtml: "<p>wrong</p>" }]
        var latest = JSON.stringify(editor.blocks[0])
        verify(!editor.applyAiBlockResult("page-1", "code-1", latest, "<p>wrong</p>", true))
        compare(editor.blocks[0].attrs.code, "parsed")
    }
}
