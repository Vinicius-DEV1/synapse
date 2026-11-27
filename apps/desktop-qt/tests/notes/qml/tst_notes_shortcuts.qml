import QtQuick
import QtTest
import "../../../qml/notes" as Notes

TestCase {
    id: testCase
    name: "NotesShortcuts"
    when: windowShown
    width: 320
    height: 200

    Notes.NotesEditorShortcuts {
        id: shortcuts
        hasPage: true
        contentEditorFocused: true
    }
    SignalSpy { id: save; target: shortcuts; signalName: "saveRequested" }
    SignalSpy { id: richMark; target: shortcuts; signalName: "richMarkRequested" }
    SignalSpy { id: format; target: shortcuts; signalName: "formatRequested" }
    property bool guideOpen: false
    Notes.NotesHelpDialog { id: guide; parent: testCase; isOpen: testCase.guideOpen; onClosed: testCase.guideOpen = false }
    SignalSpy { id: guideClosed; target: guide; signalName: "closed" }

    function verifyGuideHasNoRemovedModes(text) {
        var normalized = String(text).toLowerCase()
        verify(!normalized.includes("source mode"))
        verify(!normalized.includes("preview mode"))
        verify(!normalized.includes("source/preview"))
        verify(!normalized.includes("ctrl/cmd+e"))
    }

    function test_formattingShortcutsMatchGuide() {
        format.clear()
        keyClick(Qt.Key_B, Qt.ControlModifier)
        compare(format.count, 1)
        compare(format.signalArguments[0][0], "<strong>")
        compare(format.signalArguments[0][1], "</strong>")
        keyClick(Qt.Key_I, Qt.ControlModifier)
        compare(format.count, 2)
        compare(format.signalArguments[1][0], "<em>")
        compare(format.signalArguments[1][1], "</em>")
        keyClick(Qt.Key_U, Qt.ControlModifier)
        compare(format.count, 3)
        compare(format.signalArguments[2][0], "<u>")
        compare(format.signalArguments[2][1], "</u>")
        keyClick(Qt.Key_X, Qt.ControlModifier | Qt.ShiftModifier)
        compare(format.count, 4)
        compare(format.signalArguments[3][0], "<s>")
        compare(format.signalArguments[3][1], "</s>")

        richMark.clear()
        keyClick(Qt.Key_S, Qt.ControlModifier | Qt.ShiftModifier)
        compare(richMark.count, 1)
        compare(richMark.signalArguments[0][0], "spoiler")
    }

    function test_modalBlocksEditorShortcuts() {
        save.clear()
        shortcuts.isHistoryOpen = true
        keyClick(Qt.Key_S, Qt.ControlModifier)
        compare(save.count, 0)
        shortcuts.isHistoryOpen = false
        keyClick(Qt.Key_S, Qt.ControlModifier)
        compare(save.count, 1)
    }

    function test_guideCloses() {
        guideClosed.clear()
        guideOpen = true
        tryCompare(guide, "visible", true)
        guide.close()
        tryCompare(guideClosed, "count", 1)
    }

    function test_guideSectionsDescribeCurrentNotesActions() {
        guideOpen = true
        tryCompare(guide, "visible", true)
        var content = findChild(guide, "notesHelpContent")
        verify(content !== null)

        guide.section = 0
        verifyGuideHasNoRemovedModes(content.text)
        verify(content.text.includes("Use /evento to create an agenda event"))
        verify(content.text.includes("A table filter is a read-only view"))
        verify(content.text.includes("The editor saves changes automatically"))

        guide.section = 1
        verifyGuideHasNoRemovedModes(content.text)
        verify(content.text.includes("create, rename, move, pin, duplicate, or delete pages"))
        verify(content.text.includes("inspect or restore a saved revision"))

        guide.section = 2
        verifyGuideHasNoRemovedModes(content.text)
        verify(content.text.includes("Ctrl/Cmd+S: save"))
        verify(content.text.includes("Ctrl/Cmd+B: bold"))
        verify(content.text.includes("Ctrl/Cmd+Shift+X: strikeout"))
        verify(content.text.includes("Up/Down: move through menu results"))
        verify(content.text.includes("Space: close the menu and insert a space"))
        guide.close()
    }
}
