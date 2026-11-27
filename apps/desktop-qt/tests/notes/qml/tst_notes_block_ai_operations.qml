import QtQuick
import QtTest
import "../../../qml/notes/NotesBlockAiOperations.js" as BlockAiOperations

TestCase {
    name: "NotesBlockAiOperations"

    function test_codeFenceReplacesCodeAndDetectsLanguage() {
        var block = {
            id: "code-1",
            blockType: "codeBlock",
            attrs: { code: "old", language: "auto", "data-label": "example" },
            html: "<pre><code>old</code></pre>",
            innerHtml: "old"
        }
        var result = BlockAiOperations.replacementForBlock(block, "```rust\nfn main() {}\n```")
        compare(result.id, "code-1")
        compare(result.attrs.code, "fn main() {}")
        compare(result.attrs.language, "rust")
        compare(result.attrs["data-label"], "example")
        compare(block.attrs.code, "old")
    }

    function test_codeHtmlIsDecodedBeforeApplying() {
        var block = { id: "code-2", blockType: "codeBlock", attrs: { code: "" }, html: "", innerHtml: "" }
        var result = BlockAiOperations.replacementForBlock(
            block, "<pre><code class=\"language-js\">if (a &lt; b &amp;&amp; b &gt; 0) {}</code></pre>")
        compare(result.attrs.code, "if (a < b && b > 0) {}")
        compare(result.attrs.language, "js")
    }

    function test_plainReplyIsEscapedAndRetainsParagraphBreaks() {
        var block = { id: "quote-1", blockType: "blockquote", attrs: { color: "#123456" }, html: "", innerHtml: "old" }
        var result = BlockAiOperations.replacementForBlock(block, "First <unsafe>\nline two\n\nNext paragraph")
        compare(result.id, "quote-1")
        compare(result.attrs.color, "#123456")
        compare(result.innerHtml, "<p>First &lt;unsafe&gt;<br/>line two</p><p>Next paragraph</p>")
    }

    function test_toggleTitleAndBodyAreReplacedWithoutLosingAttributes() {
        var block = {
            id: "toggle-1",
            blockType: "blockquoteToggle",
            attrs: { "data-title": "Old title", "data-color": "#ffaa00", "data-is-open": "false" },
            html: "",
            innerHtml: "<p>old</p>"
        }
        var result = BlockAiOperations.replacementForBlock(block, "Título: New title\n\n<p>New <strong>body</strong></p>")
        compare(result.attrs["data-title"], "New title")
        compare(result.attrs["data-color"], "#ffaa00")
        compare(result.attrs["data-is-open"], "false")
        compare(result.innerHtml, "<p>New <strong>body</strong></p>")
        compare(block.attrs["data-title"], "Old title")
    }

    function test_markdownProposalKeepsRichBlockFormatting() {
        var block = { id: "quote-2", blockType: "blockquote", attrs: { color: "violet" }, html: "", innerHtml: "old" }
        var result = BlockAiOperations.replacementForBlock(
            block, "## New heading\n\nKeep **important** detail.\n\n- One\n- Two\n\n`inline`")
        compare(result.innerHtml,
                "<h2>New heading</h2><p>Keep <strong>important</strong> detail.</p>" +
                "<ul><li><p>One</p></li><li><p>Two</p></li></ul><p><code>inline</code></p>")
        compare(result.attrs.color, "violet")
    }

    function test_searchReplaceIsBoundToTheSourceBlockContent() {
        var block = { id: "code-3", blockType: "codeBlock", attrs: { code: "const old = 1;", language: "js" }, html: "", innerHtml: "const old = 1;" }
        var result = BlockAiOperations.replacementForBlock(
            block, "<<<<<<< SEARCH\nconst old = 1;\n=======\nconst next = 2;\n>>>>>>>")
        compare(result.attrs.code, "const next = 2;")
        compare(block.attrs.code, "const old = 1;")
        compare(BlockAiOperations.replacementForBlock(
            block, "<<<<<<< SEARCH\nmissing\n=======\nreplacement\n>>>>>>>") , null)
    }

    function test_unsupportedWidgetsCannotReceiveBlockReplacement() {
        var block = { id: "widget-1", blockType: "fileWidget", attrs: {}, html: "", innerHtml: "" }
        compare(BlockAiOperations.replacementForBlock(block, "new"), null)
    }
}
