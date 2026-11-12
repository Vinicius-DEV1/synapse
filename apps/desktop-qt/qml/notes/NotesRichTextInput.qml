import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: inputRoot
    property var editorRoot
    property var taskListControls
    property var spoilerRevealControl
    property var richCommands
    property var commitTimer
    property string previousPlainText: ""
    readonly property alias editor: richEditor

    Component.onCompleted: previousPlainText = editorRoot.textOperations.richPlainText(richEditor.textDocument)

    TextArea {
        id: richEditor
        objectName: "notesRichTextEditor"
        anchors.fill: parent
        visible: inputRoot.editorRoot.active
        textFormat: TextEdit.RichText
        Accessible.description: inputRoot.spoilerRevealControl.spoilerPosition < 0
            ? qsTr("Move the caret into spoiler text and press Alt+R to reveal it.")
            : inputRoot.spoilerRevealControl.revealed
                ? qsTr("The caret is inside a revealed spoiler. Press Alt+R to hide it.")
                : qsTr("The caret is inside a hidden spoiler. Press Alt+R to reveal it.")
        color: "#fffffe"
        font.pixelSize: 15
        font.family: "Inter, -apple-system, sans-serif"
        wrapMode: TextEdit.Wrap
        selectByMouse: true
        selectByKeyboard: true
        background: null
        Keys.priority: Keys.BeforeItem
        Keys.onPressed: function(event) {
            var commandModifier = (event.modifiers & (Qt.ControlModifier | Qt.MetaModifier)) !== 0
            if (event.key === Qt.Key_Left || event.key === Qt.Key_Right || event.key === Qt.Key_Up ||
                    event.key === Qt.Key_Down || event.key === Qt.Key_Home || event.key === Qt.Key_End ||
                    event.key === Qt.Key_PageUp || event.key === Qt.Key_PageDown || event.key === Qt.Key_Tab ||
                    event.key === Qt.Key_Backtab || (commandModifier && event.key === Qt.Key_A)) {
                inputRoot.richCommands.clearPendingMarks()
            }
            if (commandModifier && event.key === Qt.Key_Z) {
                if ((event.modifiers & Qt.ShiftModifier) !== 0) richEditor.redo()
                else richEditor.undo()
                inputRoot.editorRoot.refreshCodeSyntaxHighlighting()
                event.accepted = true
                return
            }
            if (commandModifier && event.key === Qt.Key_Y) {
                richEditor.redo()
                inputRoot.editorRoot.refreshCodeSyntaxHighlighting()
                event.accepted = true
                return
            }
            if (event.key === Qt.Key_R && (event.modifiers & Qt.AltModifier) !== 0 &&
                    inputRoot.spoilerRevealControl.spoilerPosition >= 0) {
                inputRoot.spoilerRevealControl.setRevealed(!inputRoot.spoilerRevealControl.revealed)
                event.accepted = true
                return
            }
            if (inputRoot.taskListControls.handleKey(event)) {
                event.accepted = true
                return
            }
        }
        TapHandler {
            acceptedButtons: Qt.LeftButton
            acceptedModifiers: Qt.AltModifier
            onPressedChanged: if (pressed) inputRoot.richCommands.clearPendingMarks()
            onTapped: function(point) {
                var position = richEditor.positionAt(point.position.x, point.position.y)
                inputRoot.editorRoot.setSpoilerVisibility(position, "toggle")
            }
        }
        TapHandler {
            acceptedButtons: Qt.LeftButton
            acceptedModifiers: Qt.NoModifier
            onPressedChanged: if (pressed) inputRoot.richCommands.clearPendingMarks()
            onTapped: function(point) {
                var position = richEditor.positionAt(point.position.x, point.position.y)
                if (inputRoot.editorRoot.setSpoilerVisibility(position, "reveal")) return
                inputRoot.taskListControls.toggleItem(position, false)
            }
            onDoubleTapped: function(point) {
                var position = richEditor.positionAt(point.position.x, point.position.y)
                inputRoot.editorRoot.setSpoilerVisibility(position, "hide")
            }
        }
        onTextChanged: {
            var currentPlainText = inputRoot.editorRoot.textOperations.richPlainText(richEditor.textDocument)
            if (inputRoot.editorRoot.isLoading) {
                inputRoot.previousPlainText = currentPlainText
                return
            }
            var previousPlainText = inputRoot.previousPlainText
            inputRoot.previousPlainText = currentPlainText
            if (currentPlainText !== previousPlainText) {
                inputRoot.editorRoot.textOperations.applyRichPendingMarks(
                            richEditor.textDocument, previousPlainText, currentPlainText, richEditor.cursorPosition)
            }
            inputRoot.editorRoot.hasPendingChanges = true
            inputRoot.commitTimer.restart()
            inputRoot.spoilerRevealControl.refresh()
        }
    }
}
