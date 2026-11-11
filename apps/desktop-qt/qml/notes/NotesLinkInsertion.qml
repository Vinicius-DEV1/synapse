import QtQuick 2.15

Item {
    id: insertion

    property var editor: null
    readonly property bool isDialogOpen: linkDialog.visible
    property int selectionStart: 0
    property int selectionEnd: 0

    function plainTextFromHtml(value) {
        return String(value || "")
            .replace(/<br\s*\/?\s*>/gi, "\n")
            .replace(/<\/(p|div|li|h[1-6]|blockquote|pre)>/gi, "\n")
            .replace(/<[^>]*>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">")
            .replace(/&quot;/gi, "\"")
            .replace(/&#39;/gi, "'")
    }

    function openFor(selectedHtml, start, end) {
        if (!editor) return
        selectionStart = Math.min(start, end)
        selectionEnd = Math.max(start, end)
        linkDialog.openFor(selectedHtml, plainTextFromHtml(selectedHtml))
    }

    function insertLink(html) {
        if (!editor) return
        if (!notesTextOperations.replace(editor.textDocument, selectionStart, selectionEnd, html)) {
            console.error("[Notes] Could not insert link into the selected source range")
            return
        }
        editor.cursorPosition = selectionStart + html.length
        editor.forceActiveFocus()
    }

    NotesLinkDialog {
        id: linkDialog
        anchors.centerIn: parent
        onLinkCreated: function(html) { insertion.insertLink(html) }
    }
}
