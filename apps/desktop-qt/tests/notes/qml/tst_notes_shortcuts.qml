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
        isPreviewMode: false
    }
    SignalSpy { id: save; target: shortcuts; signalName: "saveRequested" }
    SignalSpy { id: richMark; target: shortcuts; signalName: "richMarkRequested" }
    property bool guideOpen: false
    Notes.NotesHelpDialog { id: guide; parent: testCase; isOpen: testCase.guideOpen; onClosed: testCase.guideOpen = false }
    SignalSpy { id: guideClosed; target: guide; signalName: "closed" }

    function test_spoilerAndBoldShortcuts() {
        richMark.clear()
        keyClick(Qt.Key_S, Qt.ControlModifier | Qt.ShiftModifier)
        compare(richMark.count, 1)
        compare(richMark.signalArguments[0][0], "spoiler")
        keyClick(Qt.Key_B, Qt.ControlModifier)
        compare(richMark.count, 2)
        compare(richMark.signalArguments[1][0], "bold")
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
}
