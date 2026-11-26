import QtQuick 2.15

FocusScope {
    id: keyboardActionsRoot

    property bool selected: false
    property bool shortcutsBlocked: false

    signal deleteRequested()

    focus: selected
    Keys.priority: Keys.BeforeItem
    Keys.onPressed: function(event) {
        if (!keyboardActionsRoot.selected || keyboardActionsRoot.shortcutsBlocked ||
                event.modifiers !== Qt.NoModifier) return
        if (event.key === Qt.Key_Delete || event.key === Qt.Key_Backspace) {
            event.accepted = true
            keyboardActionsRoot.deleteRequested()
        }
    }
}
