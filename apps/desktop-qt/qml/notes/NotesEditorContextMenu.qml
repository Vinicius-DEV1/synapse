import QtQuick 2.15
import QtQuick.Controls 2.15
import "NotesTableTemplate.js" as NotesTableTemplate

Item {
    id: contextMenuRoot

    property var editor: null

    signal formatRequested(string prefix, string suffix)
    signal linkRequested(string selectedHtml, int selectionStart, int selectionEnd)

    MouseArea {
        anchors.fill: parent
        acceptedButtons: Qt.RightButton
        onPressed: function(mouse) {
            if (!contextMenuRoot.editor) return
            var clickedPosition = contextMenuRoot.editor.positionAt(mouse.x, mouse.y)
            var selectionStart = Math.min(contextMenuRoot.editor.selectionStart,
                                          contextMenuRoot.editor.selectionEnd)
            var selectionEnd = Math.max(contextMenuRoot.editor.selectionStart,
                                        contextMenuRoot.editor.selectionEnd)
            if (selectionStart === selectionEnd || clickedPosition < selectionStart || clickedPosition > selectionEnd) {
                contextMenuRoot.editor.cursorPosition = clickedPosition
            }
            contextMenuRoot.editor.forceActiveFocus()
            editorMenu.popup()
        }
    }

    Menu {
        id: editorMenu
        background: Rectangle { color: "#181720"; radius: 8; border.color: "#20ffffff" }

        MenuItem { text: "Desfazer"; enabled: contextMenuRoot.editor && contextMenuRoot.editor.canUndo; onTriggered: contextMenuRoot.editor.undo() }
        MenuItem { text: "Refazer"; enabled: contextMenuRoot.editor && contextMenuRoot.editor.canRedo; onTriggered: contextMenuRoot.editor.redo() }
        MenuSeparator {}
        MenuItem { text: "Recortar"; enabled: contextMenuRoot.editor && contextMenuRoot.editor.selectedText.length > 0; onTriggered: contextMenuRoot.editor.cut() }
        MenuItem { text: "Copiar"; enabled: contextMenuRoot.editor && contextMenuRoot.editor.selectedText.length > 0; onTriggered: contextMenuRoot.editor.copy() }
        MenuItem { text: "Colar"; enabled: contextMenuRoot.editor !== null; onTriggered: contextMenuRoot.editor.paste() }
        MenuItem { text: "Selecionar tudo"; enabled: contextMenuRoot.editor !== null; onTriggered: contextMenuRoot.editor.selectAll() }
        MenuSeparator {}
        MenuItem {
            text: "Inserir link"
            enabled: contextMenuRoot.editor !== null
            onTriggered: contextMenuRoot.linkRequested(
                contextMenuRoot.editor.selectedText,
                contextMenuRoot.editor.selectionStart,
                contextMenuRoot.editor.selectionEnd)
        }
        MenuSeparator {}
        MenuItem { text: "Negrito"; onTriggered: contextMenuRoot.formatRequested("<strong>", "</strong>") }
        MenuItem { text: "Itálico"; onTriggered: contextMenuRoot.formatRequested("<em>", "</em>") }
        MenuItem { text: qsTr("Underline"); onTriggered: contextMenuRoot.formatRequested("<u>", "</u>") }
        MenuItem { text: "Tachado"; onTriggered: contextMenuRoot.formatRequested("<s>", "</s>") }
        MenuItem { text: "Código"; onTriggered: contextMenuRoot.formatRequested("<code>", "</code>") }
        MenuItem { text: "Título 1"; onTriggered: contextMenuRoot.formatRequested("<h1>", "</h1>") }
        MenuItem { text: "Título 2"; onTriggered: contextMenuRoot.formatRequested("<h2>", "</h2>") }
        MenuItem { text: qsTr("Heading 3"); onTriggered: contextMenuRoot.formatRequested("<h3>", "</h3>") }
        MenuItem { text: "Lista"; onTriggered: contextMenuRoot.formatRequested("<ul><li>", "</li></ul>") }
        MenuItem { text: qsTr("Numbered list"); onTriggered: contextMenuRoot.formatRequested("<ol><li>", "</li></ol>") }
        MenuItem { text: qsTr("Divider"); onTriggered: contextMenuRoot.formatRequested("<hr>", "") }
        MenuItem {
            text: qsTr("Insert table")
            onTriggered: contextMenuRoot.formatRequested(NotesTableTemplate.tablePrefix(), NotesTableTemplate.tableSuffix())
        }
        MenuItem { text: "Citação"; onTriggered: contextMenuRoot.formatRequested("<blockquote>", "</blockquote>") }
        MenuItem { text: "Bloco de código"; onTriggered: contextMenuRoot.formatRequested("<pre><code>", "</code></pre>") }
    }
}
