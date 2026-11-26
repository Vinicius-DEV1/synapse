import QtQuick
import QtTest
import "../../../qml/notes/NotesMarkdownAiDiff.js" as MarkdownDiff

TestCase {
    name: "NotesMarkdownAiDiff"

    function test_marksInsertedRemovedAndUnchangedLines() {
        var result = MarkdownDiff.compute("# Title\nOld line\nKeep\nEnd",
                                          "# Title\nNew line\nKeep\nLast")
        compare(result.length, 6)
        compare(result[0].kind, "same")
        compare(result[0].text, "# Title")
        compare(result[1].kind, "removed")
        compare(result[1].text, "Old line")
        compare(result[2].kind, "added")
        compare(result[2].text, "New line")
        compare(result[3].kind, "same")
        compare(result[3].text, "Keep")
        compare(result[4].kind, "removed")
        compare(result[5].kind, "added")
    }

    function test_identicalAndEmptyDocumentsRemainStable() {
        compare(MarkdownDiff.compute("", "")[0].kind, "same")
        var result = MarkdownDiff.compute("one\ntwo", "one\ntwo")
        compare(result.length, 2)
        compare(result[0].kind, "same")
        compare(result[1].kind, "same")
    }

    function test_largeDocumentsUseBoundedCompactFallback() {
        var oldLines = []
        var newLines = []
        for (var i = 0; i < 710; ++i) {
            oldLines.push("old " + i)
            newLines.push("new " + i)
        }
        var result = MarkdownDiff.compute(oldLines.join("\n"), newLines.join("\n"))
        compare(result.length, 1420)
        compare(result[0].kind, "removed")
        compare(result[709].kind, "removed")
        compare(result[710].kind, "added")
        compare(result[result.length - 1].kind, "added")
    }
}
