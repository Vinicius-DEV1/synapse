import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: inputRoot
    property var editorRoot
    property var taskListControls
    property var spoilerRevealControl
    property var commitTimer
    readonly property alias editor: richEditor

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
            onTapped: function(point) {
                var position = richEditor.positionAt(point.position.x, point.position.y)
                inputRoot.editorRoot.setSpoilerVisibility(position, "toggle")
            }
        }
        TapHandler {
            acceptedButtons: Qt.LeftButton
            acceptedModifiers: Qt.NoModifier
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
            if (inputRoot.editorRoot.isLoading) return
            inputRoot.editorRoot.hasPendingChanges = true
            inputRoot.commitTimer.restart()
            inputRoot.spoilerRevealControl.refresh()
        }
    }
}
