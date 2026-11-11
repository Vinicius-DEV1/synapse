import QtQuick 2.15
import "../../qml/notes"

Item {
    width: 960
    height: 520

    NotesFormattingToolbar {
        id: formattingToolbar
        width: parent.width
        richMode: true
        tableCellActive: richEditor.tableActions.isInsideTable
        canMoveTableRowUp: richEditor.tableActions.canEditTable("moveRowUp")
        canMoveTableRowDown: richEditor.tableActions.canEditTable("moveRowDown")
        canMoveTableColumnLeft: richEditor.tableActions.canEditTable("moveColumnLeft")
        canMoveTableColumnRight: richEditor.tableActions.canEditTable("moveColumnRight")
        canDeleteTableRow: richEditor.tableActions.canEditTable("deleteRow")
        canDeleteTableColumn: richEditor.tableActions.canEditTable("deleteColumn")
        richSpoilerActive: richEditor.spoilerAtCursor
    }

    NotesRichTextEditor {
        id: richEditor
        objectName: "richTableEditor"
        y: 48
        width: parent.width
        height: parent.height - 48
        sourceHtml: "<p>BeforeAfter</p>"
        active: false
    }

    Connections {
        target: formattingToolbar
        function onRichTableRequested() { richEditor.tableActions.insertTable() }
        function onRichTableActionRequested(action) { richEditor.tableActions.editTable(action) }
        function onRichCellBackgroundRequested(color, scope) {
            richEditor.tableActions.setCellBackground(color, scope)
        }
        function onRichDividerRequested() { richEditor.tableActions.insertDivider() }
        function onRichBlockRequested(blockType) { richEditor.toggleBlock(blockType) }
        function onRichMarkRequested(mark) { richEditor.toggleMark(mark) }
    }
}
