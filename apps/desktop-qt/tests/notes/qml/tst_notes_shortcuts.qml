import QtQuick
import QtTest
import "../../../qml/notes" as Notes
import "../../../qml/notes/NotesTableTemplate.js" as TableTemplate

TestCase {
    id: testCase
    name: "NotesShortcuts"
    when: windowShown
    width: 320
    height: 200
    property QtObject notesTextOperations: QtObject {
        property var editor: null
        function replace(document, start, end, replacement) {
            editor.text = editor.text.substring(0, start) + replacement + editor.text.substring(end)
            return true
        }
        function isRichTableCell(document, position) { return false }
        function isRichSpoilerAt(document, position) { return false }
    }

    Notes.NotesEditorShortcuts {
        id: shortcuts
        hasPage: true
        contentEditorFocused: true
    }
    SignalSpy { id: formatting; target: shortcuts; signalName: "formatRequested" }
    SignalSpy { id: save; target: shortcuts; signalName: "saveRequested" }
    SignalSpy { id: preview; target: shortcuts; signalName: "previewToggleRequested" }
    SignalSpy { id: richMark; target: shortcuts; signalName: "richMarkRequested" }
    property bool guideOpen: false
    Notes.NotesHelpDialog { id: guide; parent: testCase; isOpen: testCase.guideOpen; onClosed: testCase.guideOpen = false }
    SignalSpy { id: guideClosed; target: guide; signalName: "closed" }
    Component {
        id: canvasComponent
        Notes.NotesEditorCanvas { width: 900; height: 700; activeContent: "hello world" }
    }

    function test_underlineShortcut() {
        formatting.clear()
        shortcuts.isPreviewMode = false
        keyClick(Qt.Key_U, Qt.ControlModifier)
        compare(formatting.count, 1)
        compare(formatting.signalArguments[0][0], "<u>")
        compare(formatting.signalArguments[0][1], "</u>")
        shortcuts.isPreviewMode = true
        keyClick(Qt.Key_U, Qt.ControlModifier)
        compare(formatting.count, 1)
    }

    function test_spoilerShortcutTargetsRichMark() {
        richMark.clear()
        keyClick(Qt.Key_S, Qt.ControlModifier | Qt.ShiftModifier)
        compare(richMark.count, 1)
        compare(richMark.signalArguments[0][0], "spoiler")
        shortcuts.isPreviewMode = true
        keyClick(Qt.Key_S, Qt.ControlModifier | Qt.ShiftModifier)
        compare(richMark.count, 1)
    }

    function test_modalBlocksEditorShortcuts() {
        save.clear()
        preview.clear()
        shortcuts.isHistoryOpen = true
        keyClick(Qt.Key_S, Qt.ControlModifier)
        keyClick(Qt.Key_E, Qt.ControlModifier)
        compare(save.count, 0)
        compare(preview.count, 0)
        shortcuts.isHistoryOpen = false
        keyClick(Qt.Key_S, Qt.ControlModifier)
        keyClick(Qt.Key_E, Qt.ControlModifier)
        compare(save.count, 1)
        compare(preview.count, 1)
    }

    function test_guideCloses() {
        guideClosed.clear()
        guideOpen = true
        tryCompare(guide, "visible", true)
        guide.close()
        tryCompare(guideClosed, "count", 1)
        guideOpen = true
        tryCompare(guide, "visible", true)
        guide.close()
    }

    function test_underlineSelectedSource() {
        var canvas = createTemporaryObject(canvasComponent, testCase)
        verify(canvas !== null)
        var editor = findChild(canvas, "notesSourceEditor")
        verify(editor !== null)
        notesTextOperations.editor = editor
        editor.select(0, 5)
        canvas.insertFormatting("<u>", "</u>")
        compare(editor.text, "<u>hello</u> world")
        compare(editor.selectedText, "hello")
        canvas.insertFormatting("<u>", "</u>")
        compare(editor.text, "hello world")
        compare(editor.selectedText, "hello")
        editor.select(6, 11)
        canvas.insertFormatting("<strong>", "</strong>")
        compare(editor.text, "hello <strong>world</strong>")
        canvas.insertFormatting("<strong>", "</strong>")
        compare(editor.text, "hello world")
    }

    function test_canvasReportsMoveDialog() {
        var canvas = createTemporaryObject(canvasComponent, testCase)
        verify(canvas !== null)
        verify(!canvas.isDialogOpen)
        canvas.allPages = [{ id: "page", title: "Page", parent_id: "" }]
        canvas.openMovePageDialog("page")
        tryCompare(canvas, "isDialogOpen", true)
        var dialog = findChild(canvas, "notesMovePageDialog")
        verify(dialog !== null)
        dialog.close()
        tryCompare(canvas, "isDialogOpen", false)
    }

    function test_blockFormattingPreservesSelection() {
        var canvas = createTemporaryObject(canvasComponent, testCase)
        verify(canvas !== null)
        var editor = findChild(canvas, "notesSourceEditor")
        verify(editor !== null)
        notesTextOperations.editor = editor
        editor.select(0, 5)
        canvas.insertFormatting("<h3>", "</h3>")
        compare(editor.text, "<h3>hello</h3> world")
        canvas.setEditorText("hello world")
        editor.select(0, 5)
        canvas.insertFormatting("<ol><li>", "</li></ol>")
        compare(editor.text, "<ol><li>hello</li></ol> world")
        canvas.setEditorText("hello world")
        editor.select(0, 0)
        canvas.insertFormatting("<hr>", "")
        compare(editor.text, "<hr>hello world")
        canvas.setEditorText("hello world")
        editor.select(0, 5)
        canvas.insertFormatting(TableTemplate.tablePrefix(), TableTemplate.tableSuffix())
        verify(editor.text.startsWith("<table><tbody><tr><th><p>hello</p></th>"))
        compare((editor.text.match(/<th>/g) || []).length, 3)
        compare((editor.text.match(/<td>/g) || []).length, 6)
        verify(editor.text.endsWith("</tbody></table> world"))
    }
}
