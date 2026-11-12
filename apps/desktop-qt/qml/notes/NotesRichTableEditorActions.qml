pragma ComponentBehavior: Bound

import QtQml 2.15

QtObject {
    id: tableActions
    objectName: "notesRichTableEditorActions"
    property var textEditor
    property var textOperations
    property bool active: false
    property bool invalid: false
    readonly property bool isInsideTable: textEditor &&
        textOperations.isRichTableCell(textEditor.textDocument, textEditor.cursorPosition)
    readonly property bool isOnDivider: active && !invalid && textEditor &&
        textOperations.isRichDivider(textEditor.textDocument, textEditor.cursorPosition)
    readonly property bool canMoveDividerUp: isOnDivider &&
        textOperations.canMoveRichDivider(textEditor.textDocument, textEditor.cursorPosition, true)
    readonly property bool canMoveDividerDown: isOnDivider &&
        textOperations.canMoveRichDivider(textEditor.textDocument, textEditor.cursorPosition, false)

    signal contentModified()

    function finishEdit() {
        contentModified()
        textEditor.forceActiveFocus()
        return true
    }

    function insertTable() {
        if (!active || invalid) return false
        var position = textOperations.insertRichTable(
                    textEditor.textDocument, textEditor.selectionStart, textEditor.selectionEnd)
        if (position < 0) return false
        textEditor.cursorPosition = position
        return finishEdit()
    }

    function editTable(action) {
        if (!active || invalid || !textOperations.applyRichTableAction(
                textEditor.textDocument, textEditor.cursorPosition, action)) return false
        return finishEdit()
    }

    function setCellBackground(color, scope) {
        if (!active || invalid || !isInsideTable || !textOperations.setRichTableCellBackground(
                textEditor.textDocument, textEditor.cursorPosition, color, scope || "cell")) return false
        return finishEdit()
    }

    function canEditTable(action) {
        return active && !invalid && textOperations.canApplyRichTableAction(
                    textEditor.textDocument, textEditor.cursorPosition, action)
    }

    function insertDivider() {
        if (!active || invalid) return false
        var position = textOperations.insertRichDivider(
                    textEditor.textDocument, textEditor.selectionStart, textEditor.selectionEnd)
        if (position < 0) return false
        textEditor.cursorPosition = position
        return finishEdit()
    }

    function editDivider(action) {
        if (!isOnDivider) return false
        var position = -1
        if (action === "moveUp")
            position = textOperations.moveRichDivider(textEditor.textDocument, textEditor.cursorPosition, true)
        else if (action === "moveDown")
            position = textOperations.moveRichDivider(textEditor.textDocument, textEditor.cursorPosition, false)
        else if (action === "addBelow")
            position = textOperations.insertRichParagraphBelowDivider(textEditor.textDocument, textEditor.cursorPosition)
        if (position < 0) return false
        textEditor.cursorPosition = position
        return finishEdit()
    }

    function setColor(background, color) {
        if (!active || invalid || textEditor.selectionStart === textEditor.selectionEnd ||
                !textOperations.setRichColor(textEditor.textDocument, textEditor.selectionStart,
                                                   textEditor.selectionEnd, color, background)) return false
        return finishEdit()
    }
}
