import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: revealControl
    objectName: "notesRichSpoilerRevealControl"
    property var textEditor
    property var textOperations
    property bool active: false
    property bool invalid: false
    property int spoilerPosition: -1
    property bool revealed: false

    function alignToEditor() {
        if (!textEditor || !parent) return
        var origin = textEditor.mapToItem(parent, 0, 0)
        x = origin.x
        y = origin.y
        width = textEditor.width
        height = textEditor.height
    }

    function refresh() {
        if (!active || invalid || !textEditor || !textEditor.textDocument) {
            spoilerPosition = -1
            revealed = false
            return
        }
        var position = textEditor.cursorPosition
        if (!textOperations.isRichSpoilerAt(textEditor.textDocument, position)) {
            position -= 1
            if (position < 0 || !textOperations.isRichSpoilerAt(textEditor.textDocument, position)) {
                spoilerPosition = -1
                revealed = false
                return
            }
        }
        spoilerPosition = position
        revealed = textOperations.isRichSpoilerRevealedAt(textEditor.textDocument, position)
    }

    function setRevealed(nextState) {
        if (spoilerPosition < 0 || !textEditor || !textEditor.textDocument) return false
        var action = nextState ? "reveal" : "hide"
        if (!textOperations.setRichSpoilerVisibility(textEditor.textDocument, spoilerPosition, action)) return false
        refresh()
        spoilerCheckbox.forceActiveFocus()
        return true
    }

    Component.onCompleted: {
        alignToEditor()
        refresh()
    }
    onTextEditorChanged: alignToEditor()
    onActiveChanged: refresh()
    onInvalidChanged: refresh()

    Connections {
        target: revealControl.textEditor
        function onXChanged() { revealControl.alignToEditor() }
        function onYChanged() { revealControl.alignToEditor() }
        function onWidthChanged() { revealControl.alignToEditor() }
        function onHeightChanged() { revealControl.alignToEditor() }
        function onCursorPositionChanged() { revealControl.refresh() }
        function onTextChanged() { revealControl.refresh() }
    }

    CheckBox {
        id: spoilerCheckbox
        objectName: "notesRichSpoilerCheckbox"
        property rect markerRect: revealControl.spoilerPosition >= 0
            ? revealControl.textEditor.positionToRectangle(revealControl.spoilerPosition)
            : Qt.rect(0, 0, 0, 0)
        visible: revealControl.spoilerPosition >= 0
        width: 20
        height: 20
        x: Math.max(0, markerRect.x - width - 3)
        y: markerRect.y + (markerRect.height - height) / 2
        padding: 0
        checked: revealControl.revealed
        Accessible.name: checked ? qsTr("Hide revealed spoiler") : qsTr("Reveal spoiler")
        Accessible.description: checked
            ? qsTr("Spoiler is revealed. Press Space to hide it.")
            : qsTr("Spoiler is hidden. Press Space to reveal it.")
        Accessible.checkable: true
        Accessible.checked: checked

        indicator: Rectangle {
            x: spoilerCheckbox.leftPadding
            y: (spoilerCheckbox.height - height) / 2
            implicitWidth: 16
            implicitHeight: 16
            radius: 4
            color: spoilerCheckbox.checked ? "#3f3a50" : "#201e2d"
            border.width: spoilerCheckbox.activeFocus ? 2 : 1
            border.color: spoilerCheckbox.activeFocus ? "#d4d4d8"
                : spoilerCheckbox.checked ? "#a7a9be" : "#5c5968"

            Text {
                anchors.centerIn: parent
                text: spoilerCheckbox.checked ? "✓" : "•"
                color: "#fffffe"
                font.pixelSize: 11
                font.bold: true
            }
        }
        contentItem: Item {}

        onToggled: {
            if (checked !== revealControl.revealed) revealControl.setRevealed(checked)
        }
        Keys.onEscapePressed: revealControl.textEditor.forceActiveFocus()
    }
}
