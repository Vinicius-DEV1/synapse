import QtQuick
import QtTest
import "../../../qml/notes/NotesMarkdownAiDiff.js" as MarkdownDiff

TestCase {
    name: "NotesMarkdownAiDiff"

    function test_marksInsertedRemovedAndUnchangedLines() {
        var result = MarkdownDiff.compute("# Title\nOld line\nKeep\nEnd",
                                          "# Title\nNew line\nKeep\nLast")
        compare(result.length, 4)
        compare(result[0].kind, "same")
        compare(result[0].text, "# Title")
        compare(result[1].kind, "modified")
        compare(result[1].originalText, "Old line")
        compare(result[1].text, "New line")
        verify(result[1].html.indexOf("Old") >= 0)
        verify(result[1].html.indexOf("New") >= 0)
        compare(result[2].kind, "same")
        compare(result[2].text, "Keep")
        compare(result[3].kind, "modified")
        compare(result[3].originalText, "End")
        compare(result[3].text, "Last")
    }

    function test_identicalAndEmptyDocumentsRemainStable() {
        compare(MarkdownDiff.compute("", "")[0].kind, "same")
        var result = MarkdownDiff.compute("one\ntwo", "one\ntwo")
        compare(result.length, 2)
        compare(result[0].kind, "same")
        compare(result[1].kind, "same")
    }

    function test_inlineMarkupEscapesDocumentHtml() {
        var result = MarkdownDiff.compute("Old <script>alert(1)</script>", "New <script>alert(2)</script>")
        compare(result.length, 1)
        compare(result[0].kind, "modified")
        verify(result[0].html.indexOf("<script>") < 0)
        verify(result[0].html.indexOf("&lt;script&gt;") >= 0)
    }

    function test_largeDocumentsUseBoundedCompactFallback() {
        var oldLines = []
        var newLines = []
        for (var i = 0; i < 710; ++i) {
            oldLines.push("old " + i)
            newLines.push("new " + i)
        }
        var result = MarkdownDiff.compute(oldLines.join("\n"), newLines.join("\n"))
        compare(result.length, 710)
        compare(result[0].kind, "modified")
        compare(result[0].originalText, "old 0")
        compare(result[result.length - 1].kind, "modified")
        compare(result[result.length - 1].text, "new 709")
    }
}
