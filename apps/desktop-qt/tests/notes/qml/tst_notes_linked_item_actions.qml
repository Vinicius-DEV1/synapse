pragma ComponentBehavior: Bound

import QtQuick
import QtTest
import "../../../qml/notes" as Notes

TestCase {
    id: testCase
    name: "NotesLinkedItemActions"
    when: windowShown
    width: 480
    height: 360

    property string requestedKind: ""
    property string requestedId: ""
    property string requestedTitle: ""
    property string requestedAction: ""
    property var actionDialog: null

    Component {
        id: actionDialogComponent
        Notes.NotesLinkedItemActionDialog {
            onPreviewRequested: function(itemId, itemTitle) {
                testCase.requestedAction = "preview"
                testCase.requestedId = itemId
                testCase.requestedTitle = itemTitle
            }
            onOpenCurrentTabRequested: function(itemKind, itemId, itemTitle) {
                testCase.requestedAction = "current"
                testCase.requestedKind = itemKind
                testCase.requestedId = itemId
                testCase.requestedTitle = itemTitle
            }
            onOpenNewTabRequested: function(itemKind, itemId, itemTitle) {
                testCase.requestedAction = "new"
                testCase.requestedKind = itemKind
                testCase.requestedId = itemId
                testCase.requestedTitle = itemTitle
            }
        }
    }

    function init() {
        requestedAction = ""
        requestedKind = ""
        requestedId = ""
        requestedTitle = ""
        actionDialog = createTemporaryObject(actionDialogComponent, testCase)
        verify(actionDialog !== null)
    }

    function cleanup() {
        if (actionDialog) actionDialog.destroy()
        actionDialog = null
    }

    function test_fileQuickPreviewRetainsIdentity() {
        actionDialog.openFor("file", "file-123", "Study notes.pdf")
        tryCompare(actionDialog, "visible", true)
        wait(80)
        compare(actionDialog.width, Math.min(actionDialog.parent.width - 32, 400))
        var prompt = findChild(actionDialog, "notesLinkedItemActionPrompt")
        verify(prompt !== null)
        compare(prompt.text, "Como deseja abrir o arquivo Study notes.pdf?")
        var quickPreview = findChild(actionDialog, "notesLinkedItemQuickPreviewButton")
        verify(quickPreview !== null && quickPreview.visible)
        mouseClick(quickPreview, quickPreview.width / 2, quickPreview.height / 2)
        compare(requestedAction, "preview")
        compare(requestedId, "file-123")
        compare(requestedTitle, "Study notes.pdf")
    }

    function test_fileCurrentAndNewReaderRetainIdentity() {
        actionDialog.openFor("file", "file-456", "Reference.pdf")
        tryCompare(actionDialog, "visible", true)
        wait(80)
        var currentTab = findChild(actionDialog, "notesLinkedItemCurrentTabButton")
        verify(currentTab !== null)
        mouseClick(currentTab, currentTab.width / 2, currentTab.height / 2)
        compare(requestedAction, "current")
        compare(requestedKind, "file")
        compare(requestedId, "file-456")

        actionDialog.openFor("file", "file-789", "Workbook.pdf")
        tryCompare(actionDialog, "visible", true)
        wait(80)
        var newTab = findChild(actionDialog, "notesLinkedItemNewTabButton")
        verify(newTab !== null)
        mouseClick(newTab, newTab.width / 2, newTab.height / 2)
        compare(requestedAction, "new")
        compare(requestedKind, "file")
        compare(requestedId, "file-789")
        compare(requestedTitle, "Workbook.pdf")
    }

    function test_mediaHidesFilePreviewAndSupportsCurrentAndNewTab() {
        actionDialog.openFor("video", "video-123", "Lecture")
        tryCompare(actionDialog, "visible", true)
        wait(80)
        var prompt = findChild(actionDialog, "notesLinkedItemActionPrompt")
        verify(prompt !== null)
        compare(prompt.text, "Como deseja abrir Lecture?")
        var quickPreview = findChild(actionDialog, "notesLinkedItemQuickPreviewButton")
        verify(quickPreview !== null && !quickPreview.visible)
        var currentTab = findChild(actionDialog, "notesLinkedItemCurrentTabButton")
        verify(currentTab !== null)
        mouseClick(currentTab, currentTab.width / 2, currentTab.height / 2)
        compare(requestedAction, "current")
        compare(requestedKind, "video")
        compare(requestedId, "video-123")

        actionDialog.openFor("book", "book-123", "Field Guide")
        tryCompare(actionDialog, "visible", true)
        wait(80)
        var newTab = findChild(actionDialog, "notesLinkedItemNewTabButton")
        verify(newTab !== null)
        mouseClick(newTab, newTab.width / 2, newTab.height / 2)
        compare(requestedAction, "new")
        compare(requestedKind, "book")
        compare(requestedId, "book-123")
        compare(requestedTitle, "Field Guide")
    }

    function test_filePromptUsesReactFallbackTitle() {
        actionDialog.openFor("file", "file-no-title", "")
        tryCompare(actionDialog, "visible", true)
        var prompt = findChild(actionDialog, "notesLinkedItemActionPrompt")
        verify(prompt !== null)
        compare(prompt.text, "Como deseja abrir o arquivo Documento?")
    }

    function test_actionDialogFitsNarrowNotesViewport() {
        width = 360
        actionDialog.openFor("file", "file-compact", "Compact.pdf")
        tryCompare(actionDialog, "visible", true)
        tryCompare(actionDialog, "width", 328)
        verify(actionDialog.x >= 0)
        verify(actionDialog.x + actionDialog.width <= width)
    }

    function test_escapeClosesWithoutOpeningTarget() {
        actionDialog.openFor("video", "video-999", "Lecture")
        tryCompare(actionDialog, "visible", true)
        keyClick(Qt.Key_Escape)
        tryCompare(actionDialog, "visible", false)
        compare(requestedAction, "")
    }
}
