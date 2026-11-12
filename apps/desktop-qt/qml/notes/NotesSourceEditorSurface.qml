import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: sourceSurface
    property string sourceHtml: ""
    readonly property alias editor: noteEditorArea
    readonly property alias linkInsertionDialog: linkInsertion
    readonly property bool isDialogOpen: linkInsertion.isDialogOpen
    signal contentModified(string content)
    signal plainTextModified(string text)

    Layout.fillWidth: true
    implicitHeight: Math.max(300, noteEditorArea.implicitHeight + 40)
    color: "transparent"

    function setText(value) { noteEditorArea.text = value }
    function plainTextFromSource(value) {
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
    function openLinkInsertion(selectedHtml, selectionStart, selectionEnd) {
        linkInsertion.openFor(selectedHtml, selectionStart, selectionEnd)
    }

    TextArea {
        id: noteEditorArea
        objectName: "notesSourceEditor"
        anchors.fill: parent
        text: sourceSurface.sourceHtml
        color: "#fffffe"
        font.pixelSize: 15
        font.family: "Inter, -apple-system, sans-serif"
        wrapMode: Text.Wrap
        selectByMouse: true
        background: null
        onTextChanged: {
            sourceSurface.plainTextModified(sourceSurface.plainTextFromSource(text))
            if (text !== sourceSurface.sourceHtml) sourceSurface.contentModified(text)
        }
    }

    NotesEditorContextMenu {
        anchors.fill: noteEditorArea
        editor: noteEditorArea
        onFormatRequested: function(prefix, suffix) { sourceSurface.formatRequested(prefix, suffix) }
        onLinkRequested: function(selectedHtml, selectionStart, selectionEnd) {
            sourceSurface.openLinkInsertion(selectedHtml, selectionStart, selectionEnd)
        }
    }

    NotesLinkInsertion {
        id: linkInsertion
        anchors.fill: noteEditorArea
        editor: noteEditorArea
    }

    signal formatRequested(string prefix, string suffix)
}
