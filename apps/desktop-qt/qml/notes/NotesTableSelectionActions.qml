pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: actionsRoot
    objectName: "notesTableSelectionActions"
    visible: active
    spacing: 1

    property bool active: false
    property string currentScope: "none"

    signal selectionRequested(string scope)

    NotesTableSelectionButton {
        objectName: "notesTableSelectColumn"
        scope: "column"
        currentScope: actionsRoot.currentScope
        glyph: "▥"
        accessibleLabel: qsTr("Select current column")
        onSelectionRequested: function(selectedScope) {
            actionsRoot.selectionRequested(selectedScope)
        }
    }
    NotesTableSelectionButton {
        objectName: "notesTableSelectRow"
        scope: "row"
        currentScope: actionsRoot.currentScope
        glyph: "≡"
        accessibleLabel: qsTr("Select current row")
        onSelectionRequested: function(selectedScope) {
            actionsRoot.selectionRequested(selectedScope)
        }
    }
    NotesTableSelectionButton {
        objectName: "notesTableSelectTable"
        scope: "table"
        currentScope: actionsRoot.currentScope
        glyph: "▦"
        accessibleLabel: qsTr("Select entire table")
        onSelectionRequested: function(selectedScope) {
            actionsRoot.selectionRequested(selectedScope)
        }
    }
}
