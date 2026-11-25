pragma ComponentBehavior: Bound

import QtQml 2.15

QtObject {
    id: tableActions
    objectName: "notesRichTableEditorActions"
    property var textEditor
    property var textOperations
    property bool active: false
    property bool invalid: false
    readonly property bool isInsideTable: Boolean(textOperations && textEditor && textEditor.textDocument &&
        typeof textOperations.isRichTableCell === "function" &&
        textOperations.isRichTableCell(textEditor.textDocument, textEditor.cursorPosition))
    readonly property bool canMergeOrSplit: Boolean(active && !invalid && textOperations && textEditor && textEditor.textDocument &&
        typeof textOperations.canMergeOrSplitRichTable === "function" &&
        textOperations.canMergeOrSplitRichTable(textEditor.textDocument, textEditor.cursorPosition,
                                                textEditor.selectionStart, textEditor.selectionEnd))
    readonly property bool canColorSelectedCells: Boolean(active && !invalid && textOperations && textEditor && textEditor.textDocument &&
        typeof textOperations.canSetRichTableBackgroundOnSelection === "function" &&
        textOperations.canSetRichTableBackgroundOnSelection(
            textEditor.textDocument, textEditor.selectionStart, textEditor.selectionEnd))
    readonly property string selectionScope: active && !invalid && textOperations && textEditor && textEditor.textDocument &&
        typeof textOperations.richTableSelectionScope === "function"
        ? textOperations.richTableSelectionScope(textEditor.textDocument, textEditor.cursorPosition,
                                                  textEditor.selectionStart, textEditor.selectionEnd)
        : "none"
    readonly property bool isOnDivider: Boolean(active && !invalid && textOperations && textEditor && textEditor.textDocument &&
        typeof textOperations.isRichDivider === "function" &&
        textOperations.isRichDivider(textEditor.textDocument, textEditor.cursorPosition))
    readonly property bool canMoveDividerUp: Boolean(isOnDivider && textOperations && textEditor && textEditor.textDocument &&
        typeof textOperations.canMoveRichDivider === "function" &&
        textOperations.canMoveRichDivider(textEditor.textDocument, textEditor.cursorPosition, true))
    readonly property bool canMoveDividerDown: Boolean(isOnDivider && textOperations && textEditor && textEditor.textDocument &&
        typeof textOperations.canMoveRichDivider === "function" &&
        textOperations.canMoveRichDivider(textEditor.textDocument, textEditor.cursorPosition, false))

    signal contentModified()

    function finishEdit() {
        contentModified()
        if (textEditor) textEditor.forceActiveFocus()
        return true
    }

    function insertTable() {
        if (!active || invalid || !textOperations || !textEditor || !textEditor.textDocument) return false
        var position = textOperations.insertRichTable(
                    textEditor.textDocument, textEditor.selectionStart, textEditor.selectionEnd)
        if (position < 0) return false
        textEditor.cursorPosition = position
        return finishEdit()
    }

    function editTable(action) {
        if (!textOperations || !textEditor || !textEditor.textDocument) return false
        if (action === "mergeOrSplit") {
            if (!canMergeOrSplit || !textOperations.mergeOrSplitRichTable(
                        textEditor.textDocument, textEditor.cursorPosition,
                        textEditor.selectionStart, textEditor.selectionEnd)) return false
            return finishEdit()
        }
        if (!active || invalid || !textOperations.applyRichTableAction(
                textEditor.textDocument, textEditor.cursorPosition, action,
                textEditor.selectionStart, textEditor.selectionEnd)) return false
        return finishEdit()
    }

    function setCellBackground(color, scope) {
        if (!active || invalid || !isInsideTable || !textOperations || !textEditor || !textEditor.textDocument ||
                !textOperations.setRichTableCellBackground(
                    textEditor.textDocument, textEditor.cursorPosition, color, scope || "cell",
                    textEditor.selectionStart, textEditor.selectionEnd)) return false
        return finishEdit()
    }

    function selectCells(scope) {
        if (!active || invalid || !isInsideTable || !textOperations || !textEditor || !textEditor.textDocument) return false
        var activePosition = textEditor.selectionStart !== textEditor.selectionEnd
                ? textEditor.selectionStart : textEditor.cursorPosition
        var range = textOperations.richTableSelectionRange(
                    textEditor.textDocument, activePosition, scope)
        if (!range || range.start === undefined || range.end < range.start) return false
        textEditor.select(range.start, range.end)
        textEditor.forceActiveFocus()
        return true
    }

    function clearSelectedCellFormatting() {
        if (!active || invalid || !canColorSelectedCells || !textOperations || !textEditor || !textEditor.textDocument ||
                !textOperations.clearRichTableFormattingOnSelection(
                    textEditor.textDocument, textEditor.selectionStart, textEditor.selectionEnd)) return false
        return finishEdit()
    }

    function canEditTable(action) {
        return Boolean(active && !invalid && textOperations && textEditor && textEditor.textDocument &&
                       typeof textOperations.canApplyRichTableAction === "function" &&
                       textOperations.canApplyRichTableAction(
                           textEditor.textDocument, textEditor.cursorPosition, action,
                           textEditor.selectionStart, textEditor.selectionEnd))
    }

    function insertDivider() {
        if (!active || invalid || !textOperations || !textEditor || !textEditor.textDocument) return false
        var position = textOperations.insertRichDivider(
                    textEditor.textDocument, textEditor.selectionStart, textEditor.selectionEnd)
        if (position < 0) return false
        textEditor.cursorPosition = position
        return finishEdit()
    }

    function editDivider(action) {
        if (!isOnDivider || !textOperations || !textEditor || !textEditor.textDocument) return false
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
        if (!active || invalid || !textOperations || !textEditor || !textEditor.textDocument ||
                textEditor.selectionStart === textEditor.selectionEnd ||
                !textOperations.setRichColor(textEditor.textDocument, textEditor.selectionStart,
                                             textEditor.selectionEnd, color, background)) return false
        return finishEdit()
    }
}
