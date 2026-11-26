import QtQuick
import QtTest
import "../../../qml/notes" as Notes

TestCase {
    id: testCase
    name: "NotesLinkDuplicatesDialog"
    when: windowShown
    width: 900
    height: 700

    property var duplicatesDialog: null

    QtObject {
        id: mockController
        property int pageTreeCalls: 0

        function getPageTree() {
            pageTreeCalls += 1
            return [
                { id: "root", title: "Root", icon: "🏠", parent_id: "" },
                { id: "parent", title: "Parent", icon: "📚", parent_id: "root" },
                { id: "target", title: "Target page", icon: "📄", parent_id: "parent" }
            ]
        }
    }

    Component {
        id: dialogComponent
        Notes.NotesLinkDuplicatesDialog {
            controller: mockController
        }
    }

    SignalSpy {
        id: navigationSpy
        target: testCase.duplicatesDialog
        signalName: "navigateToPage"
    }

    function findVisualChild(parentItem, targetName) {
        if (!parentItem || !parentItem.children) return null
        for (var index = 0; index < parentItem.children.length; ++index) {
            var child = parentItem.children[index]
            if (child.objectName === targetName) return child
            var nested = findVisualChild(child, targetName)
            if (nested) return nested
        }
        return null
    }

    function init() {
        duplicatesDialog = createTemporaryObject(dialogComponent, testCase)
        verify(duplicatesDialog !== null)
        navigationSpy.clear()
        mockController.pageTreeCalls = 0
    }

    function test_dialogShowsResourceAndAncestorPath() {
        duplicatesDialog.openFor("https://example.test/article", "Example article", [
            { pageId: "target", pageTitle: "Target page", pageIcon: "📄" }
        ])

        verify(duplicatesDialog.visible)
        compare(duplicatesDialog.url, "https://example.test/article")
        compare(duplicatesDialog.linkTitle, "Example article")
        compare(mockController.pageTreeCalls, 1)
        compare(duplicatesDialog.displayPages.length, 1)
        compare(duplicatesDialog.displayPages[0].ancestors.length, 2)
        compare(duplicatesDialog.displayPages[0].ancestors[0].title, "Root")
        compare(duplicatesDialog.displayPages[0].ancestors[1].title, "Parent")
    }

    function test_emptyDuplicatesDoNotOpenAndSelectingRowNavigates() {
        duplicatesDialog.openFor("https://example.test/article", "", [])
        verify(!duplicatesDialog.visible)

        duplicatesDialog.openFor("https://example.test/article", "", [
            { pageId: "target", pageTitle: "Target page", pageIcon: "📄" }
        ])
        var pageButton = findVisualChild(duplicatesDialog.contentItem, "notesLinkDuplicatePageRow")
        verify(pageButton !== null)
        mouseClick(pageButton, pageButton.width / 2, pageButton.height / 2)

        compare(navigationSpy.count, 1)
        compare(navigationSpy.signalArguments[0][0], "target")
        tryVerify(function() { return !duplicatesDialog.visible })
    }

    function test_escapeClosesDialog() {
        duplicatesDialog.openFor("https://example.test/article", "", [
            { pageId: "target", pageTitle: "Target page", pageIcon: "📄" }
        ])
        verify(duplicatesDialog.visible)
        keyClick(Qt.Key_Escape)
        tryVerify(function() { return !duplicatesDialog.visible })
    }

    function test_outsideClickClosesDialog() {
        duplicatesDialog.openFor("https://example.test/article", "", [
            { pageId: "target", pageTitle: "Target page", pageIcon: "📄" }
        ])
        verify(duplicatesDialog.visible)
        mouseClick(testCase, 10, 10)
        tryVerify(function() { return !duplicatesDialog.visible })
    }
}
