pragma ComponentBehavior: Bound

import QtQuick 2.15

Item {
    id: taskControls
    objectName: "notesRichTaskListControls"
    anchors.fill: parent
    property var textEditor
    property var textOperations
    property bool active: false
    property bool invalid: false
    property var taskItems: []
    property int focusPositionToRestore: -1
    enabled: active && !invalid

    signal contentModified()

    function refreshCheckboxes() {
        if (!textEditor || !textEditor.textDocument || !textOperations ||
            typeof textOperations.richTaskCheckboxes !== "function") {
            taskItems = []
            return
        }
        var focusedPosition = checkboxOverlay.focusedTaskPosition()
        if (focusedPosition >= 0) focusPositionToRestore = focusedPosition
        taskItems = textOperations.richTaskCheckboxes(textEditor.textDocument)
        if (focusPositionToRestore >= 0) {
            var positionToRestore = focusPositionToRestore
            Qt.callLater(function() {
                if (checkboxOverlay.focusTask(positionToRestore)) focusPositionToRestore = -1
            })
        }
    }

    function toggleItem(position, retainCheckboxFocus) {
        if (!active || invalid || !textOperations || !textEditor || !textEditor.textDocument ||
                typeof textOperations.toggleRichTaskItem !== "function" ||
                !textOperations.toggleRichTaskItem(textEditor.textDocument, position)) return false
        refreshCheckboxes()
        contentModified()
        if (retainCheckboxFocus !== true) textEditor.forceActiveFocus()
        return true
    }

    function toggleFromCursor() {
        if (!active || invalid || !textOperations || !textEditor || !textEditor.textDocument ||
                typeof textOperations.toggleRichTaskItemFromCursor !== "function" ||
                !textOperations.toggleRichTaskItemFromCursor(
                    textEditor.textDocument, textEditor.cursorPosition)) return false
        refreshCheckboxes()
        contentModified()
        return true
    }

    function changeListIndent(outdent) {
        if (!active || invalid || !textOperations || !textEditor || !textEditor.textDocument ||
                textEditor.selectionStart !== textEditor.selectionEnd ||
                typeof textOperations.changeRichListIndent !== "function" ||
                !textOperations.changeRichListIndent(textEditor.textDocument, textEditor.cursorPosition, outdent))
            return false
        contentModified()
        textEditor.forceActiveFocus()
        return true
    }

    function handleKey(event) {
        if (event.key === Qt.Key_Space) return toggleFromCursor()
        if (event.key !== Qt.Key_Tab && event.key !== Qt.Key_Backtab) return false
        var outdent = event.key === Qt.Key_Backtab || (event.modifiers & Qt.ShiftModifier) !== 0
        if (!changeListIndent(outdent)) {
            var focusTarget = textEditor.nextItemInFocusChain(!outdent)
            if (focusTarget) focusTarget.forceActiveFocus(outdent ? Qt.BacktabFocusReason : Qt.TabFocusReason)
        }
        return true
    }

    Connections {
        target: taskControls.textEditor
        function onTextChanged() { taskControls.refreshCheckboxes() }
    }

    NotesRichTaskCheckboxOverlay {
        id: checkboxOverlay
        z: 1
        textEditor: taskControls.textEditor
        taskItems: taskControls.taskItems
        visible: taskControls.active
        onToggleRequested: function(position) { taskControls.toggleItem(position, true) }
    }
}
