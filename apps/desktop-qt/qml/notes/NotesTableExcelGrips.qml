import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"
import "components/table"
import "components/table/TableGripsHelpers.js" as Helpers

// Excel-style Table Grips, Drag-to-Reorder Col/Row, Visual Filter Hide/Reset & Width Resize.
Item {
    id: gripsRoot
    visible: Boolean(tableActions && tableActions.isInsideTable && textEditor && textEditor.activeFocus)
    z: 98

    property var tableActions: null
    property var richCommands: null
    property var textEditor: null
    property var editorRoot: parent
    property var columnConfigs: []
    property var activeFilters: ({})
    property int invalidCellCount: 0
    property int visibleFilteredRowCount: -1
    property string unfilteredSourceHtml: ""
    property int dragColIndex: -1
    property int dropColIndex: -1
    property int dragRowIndex: -1
    property int dropRowIndex: -1
    property var tableGeom: ({ valid: false, x: 0, y: 0, width: 0, height: 0, rows: 0, columns: 0, currentRow: 0, currentCol: 0, currentCellText: "", colWidths: [], rowHeights: [] })

    readonly property var ctrl: editorRoot && editorRoot.controller ? editorRoot.controller : null
    readonly property int columnCount: Math.max(1, tableGeom.valid ? tableGeom.columns : columnConfigs.length)
    readonly property int rowCount: Math.max(0, tableGeom.valid ? tableGeom.rows : 0)
    readonly property int activeFilterCount: Object.keys(activeFilters || ({})).length
    readonly property bool isFiltering: activeFilterCount > 0
    readonly property var currentColConfig: (columnConfigs && (tableGeom.currentCol || 0) < columnConfigs.length) ? columnConfigs[tableGeom.currentCol || 0] : null
    readonly property string currentColType: currentColConfig ? (currentColConfig.col_type || currentColConfig.colType || "text") : "text"

    x: 0; y: 0
    width: parent ? parent.width : 600
    height: parent ? parent.height : 400

    function syncSchemaFromHtml() {
        if (!editorRoot || !ctrl) return
        var html = unfilteredSourceHtml.length > 0 ? unfilteredSourceHtml : (editorRoot.sourceHtml || "")
        var tableIndex = tableGeom.valid ? Number(tableGeom.tableIndex || 0) : 0
        if (typeof ctrl.parseTableColumnsAt === "function") columnConfigs = ctrl.parseTableColumnsAt(html, tableIndex) || []
        if (typeof ctrl.validateTableCellsAt === "function") {
            var vals = ctrl.validateTableCellsAt(html, tableIndex) || []
            var inv = 0
            for (var i = 0; i < vals.length; ++i) if (!vals[i].valid) inv += 1
            invalidCellCount = inv
            if (editorRoot.textOperations && typeof editorRoot.textOperations.applyRichTableValidationHighlights === "function" &&
                    textEditor && textEditor.textDocument) {
                editorRoot.textOperations.applyRichTableValidationHighlights(textEditor.textDocument, textEditor.cursorPosition, vals)
            }
        }
        if (editorRoot.textOperations && typeof editorRoot.textOperations.richTableGeometry === "function" && textEditor && textEditor.textDocument) {
            tableGeom = editorRoot.textOperations.richTableGeometry(textEditor.textDocument, textEditor.cursorPosition)
        }
    }

    function applyVisualFilterEvaluation() {
        if (!editorRoot || !ctrl || typeof ctrl.filterTableRowsForView !== "function" ||
                !textEditor || !editorRoot.textOperations) {
            visibleFilteredRowCount = -1
            return
        }
        var canonical = unfilteredSourceHtml.length > 0 ? unfilteredSourceHtml : (editorRoot.sourceHtml || "")
        var filterArr = Helpers.buildFilterArray(activeFilters)
        if (filterArr.length === 0) {
            visibleFilteredRowCount = -1
            if (unfilteredSourceHtml.length > 0) {
                var restore = unfilteredSourceHtml
                unfilteredSourceHtml = ""
                editorRoot.hasVisualTableFilter = false
                textEditor.replaceTableProjection(
                    editorRoot.textOperations.richSourceForEditorWithPages(restore, editorRoot.pageList || []), false)
            }
            return
        }
        if (unfilteredSourceHtml.length === 0) unfilteredSourceHtml = canonical
        var tableIndex = tableGeom.valid ? Number(tableGeom.tableIndex || 0) : 0
        var projection = ctrl.filterTableRowsForView(canonical, tableIndex, JSON.stringify(filterArr)) || ({})
        if (!projection.html) {
            clearVisualFilters()
            return
        }
        visibleFilteredRowCount = Number(projection.visibleRowCount || 0)
        editorRoot.hasVisualTableFilter = true
        textEditor.replaceTableProjection(
            editorRoot.textOperations.richSourceForEditorWithPages(projection.html, editorRoot.pageList || []), true)
    }

    function clearVisualFilters() {
        activeFilters = ({})
        visibleFilteredRowCount = -1
        if (!editorRoot) return
        var restore = unfilteredSourceHtml.length > 0 ? unfilteredSourceHtml : (editorRoot.sourceHtml || "")
        unfilteredSourceHtml = ""
        editorRoot.hasVisualTableFilter = false
        if (textEditor && editorRoot.textOperations) {
            textEditor.replaceTableProjection(
                editorRoot.textOperations.richSourceForEditorWithPages(restore, editorRoot.pageList || []), false)
        }
    }

    function commitReorderedHtml(nextHtml) {
        if (!nextHtml || nextHtml === editorRoot.sourceHtml) return
        if (isFiltering) clearVisualFilters()
        editorRoot.sourceHtml = nextHtml
        editorRoot.contentModified(nextHtml)
        if (editorRoot.textOperations && textEditor) {
            textEditor.replaceTableProjection(
                editorRoot.textOperations.richSourceForEditorWithPages(nextHtml, editorRoot.pageList || []), false)
        }
        syncSchemaFromHtml()
    }

    onVisibleChanged: if (visible) syncSchemaFromHtml()
    Connections {
        target: gripsRoot.textEditor; ignoreUnknownSignals: true
        function onCursorPositionChanged() { if (gripsRoot.visible) gripsRoot.syncSchemaFromHtml() }
    }
    Connections {
        target: gripsRoot.editorRoot; ignoreUnknownSignals: true
        function onParentPageIdChanged() { if (gripsRoot.isFiltering) gripsRoot.clearVisualFilters() }
        function onSourceHtmlChanged() {
            if (gripsRoot.unfilteredSourceHtml.length > 0 &&
                    gripsRoot.editorRoot.sourceHtml !== gripsRoot.unfilteredSourceHtml) {
                gripsRoot.activeFilters = ({})
                gripsRoot.unfilteredSourceHtml = ""
                gripsRoot.visibleFilteredRowCount = -1
                gripsRoot.editorRoot.hasVisualTableFilter = false
                Qt.callLater(function() {
                    if (gripsRoot.textEditor && gripsRoot.editorRoot.textOperations) {
                        gripsRoot.textEditor.replaceTableProjection(
                            gripsRoot.editorRoot.textOperations.richSourceForEditorWithPages(
                                gripsRoot.editorRoot.sourceHtml || "", gripsRoot.editorRoot.pageList || []), false)
                    }
                })
            }
        }
    }

    TableToolbar {
        x: gripsRoot.textEditor ? Math.max(4, Math.min(gripsRoot.width - width - 4, gripsRoot.textEditor.cursorRectangle.x - 24)) : 4
        y: gripsRoot.tableGeom.valid ? Math.max(4, gripsRoot.tableGeom.y - 62) : 4
        tableActions: gripsRoot.tableActions; richCommands: gripsRoot.richCommands
        active: gripsRoot.visible && !gripsRoot.isFiltering
        enabled: !gripsRoot.isFiltering
        invalidCellCount: gripsRoot.invalidCellCount; visibleFilteredRowCount: gripsRoot.visibleFilteredRowCount
        onDeleteTableRequested: if (gripsRoot.tableActions) { gripsRoot.tableActions.selectCells("table"); gripsRoot.tableActions.editTable("deleteTable") }
    }

    ToolButton {
        visible: gripsRoot.tableGeom.valid
        x: Math.max(0, gripsRoot.tableGeom.x - 24); y: Math.max(0, gripsRoot.tableGeom.y - 22)
        width: 22; height: 20; focusPolicy: Qt.NoFocus
        ToolTip.visible: hovered
        ToolTip.text: gripsRoot.activeFilterCount > 0 ? qsTr("Limpar %1 filtro(s)").arg(gripsRoot.activeFilterCount) : qsTr("Selecionar tabela inteira")
        onClicked: {
            if (gripsRoot.activeFilterCount > 0) { gripsRoot.activeFilters = ({}); gripsRoot.applyVisualFilterEvaluation() }
            else if (gripsRoot.tableActions) gripsRoot.tableActions.selectCells("table")
        }
        background: Rectangle { radius: 4; color: gripsRoot.activeFilterCount > 0 ? "#44f59e0b" : "#e6161524"; border.color: "#22ffffff" }
        contentItem: Text { text: gripsRoot.activeFilterCount > 0 ? "✕" : "⤡"; color: gripsRoot.activeFilterCount > 0 ? "#fcd34d" : "#c4b5fd"; font.pixelSize: 11; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
    }

    Row {
        visible: gripsRoot.tableGeom.valid && !gripsRoot.isFiltering
        x: gripsRoot.tableGeom.x; y: Math.max(0, gripsRoot.tableGeom.y - 22); spacing: 2
        Repeater {
            model: gripsRoot.columnCount
            delegate: Item {
                id: colGripItem; required property int index
                readonly property string letter: String.fromCharCode(65 + (index % 26))
                readonly property var cfg: (gripsRoot.columnConfigs && index < gripsRoot.columnConfigs.length) ? gripsRoot.columnConfigs[index] : null
                readonly property string colType: cfg ? (cfg.col_type || cfg.colType || "text") : "text"
                readonly property bool hasFilter: Boolean(gripsRoot.activeFilters[index])
                readonly property real colW: (gripsRoot.tableGeom.colWidths && index < gripsRoot.tableGeom.colWidths.length) ? Math.max(32, gripsRoot.tableGeom.colWidths[index] - 2) : 64
                width: colW; height: 20
                Rectangle {
                    anchors.fill: parent; radius: 4
                    color: hasFilter ? "#44f59e0b" : (colType !== "text" ? "#338b5cf6" : (colArea.containsMouse ? "#26ffffff" : "#e6161524"))
                    border.color: gripsRoot.dropColIndex === index ? "#f59e0b" : (gripsRoot.tableGeom.currentCol === index ? "#668b5cf6" : "#22ffffff")
                    border.width: gripsRoot.dropColIndex === index ? 2 : 1
                    Text { anchors.centerIn: parent; text: colGripItem.letter + (colGripItem.colType !== "text" ? " •" : ""); color: colGripItem.hasFilter ? "#fcd34d" : "#e2e8f0"; font.pixelSize: 10; font.bold: true }
                    MouseArea {
                        id: colArea; anchors.fill: parent; anchors.rightMargin: 5; hoverEnabled: true
                        property real startX: 0; property bool dragged: false
                        onPressed: function(m) { startX = mapToGlobal(m.x, 0).x; dragged = false }
                        onPositionChanged: function(m) {
                            if (!pressed) return
                            var gx = mapToGlobal(m.x, 0).x
                            if (!dragged && Math.abs(gx - startX) > 8) { dragged = true; gripsRoot.dragColIndex = colGripItem.index }
                            if (dragged) {
                                var lx = gripsRoot.mapFromGlobal(gx, 0).x - gripsRoot.tableGeom.x; var acc = 0
                                for (var ci = 0; ci < gripsRoot.columnCount; ++ci) {
                                    acc += (gripsRoot.tableGeom.colWidths && ci < gripsRoot.tableGeom.colWidths.length) ? gripsRoot.tableGeom.colWidths[ci] : 64
                                    if (lx <= acc || ci === gripsRoot.columnCount - 1) { gripsRoot.dropColIndex = ci; break }
                                }
                            }
                        }
                        onReleased: {
                            if (dragged && gripsRoot.dragColIndex >= 0 && gripsRoot.dropColIndex >= 0 && gripsRoot.dragColIndex !== gripsRoot.dropColIndex &&
                                    gripsRoot.ctrl && typeof gripsRoot.ctrl.moveTableColumnAt === "function") {
                                gripsRoot.commitReorderedHtml(gripsRoot.ctrl.moveTableColumnAt(
                                    gripsRoot.editorRoot.sourceHtml || "", gripsRoot.tableGeom.tableIndex || 0,
                                    gripsRoot.dragColIndex, gripsRoot.dropColIndex))
                            } else if (!dragged) {
                                colTypePopover.columnIndex = colGripItem.index; colTypePopover.currentType = colGripItem.colType
                                colTypePopover.selectOptions = (colGripItem.cfg && colGripItem.cfg.options) ? colGripItem.cfg.options : []
                                colTypePopover.numberFormat = (colGripItem.cfg && colGripItem.cfg.number_format) ? colGripItem.cfg.number_format : "decimal"
                                colTypePopover.dateFormat = (colGripItem.cfg && colGripItem.cfg.date_format) ? colGripItem.cfg.date_format : "YYYY-MM-DD"
                                colTypePopover.activeFilterObj = gripsRoot.activeFilters[colGripItem.index] || null
                                colTypePopover.x = Math.min(gripsRoot.width - 284, gripsRoot.tableGeom.x + colGripItem.x); colTypePopover.y = gripsRoot.tableGeom.y
                                colTypePopover.open()
                            }
                            gripsRoot.dragColIndex = -1; gripsRoot.dropColIndex = -1; dragged = false
                        }
                    }
                    MouseArea {
                        anchors.top: parent.top; anchors.bottom: parent.bottom; anchors.right: parent.right; width: 6; cursorShape: Qt.SplitHCursor
                        property real resizeStartX: 0
                        onPressed: function(m) { resizeStartX = mapToGlobal(m.x, 0).x }
                        onReleased: function(m) {
                            var dx = mapToGlobal(m.x, 0).x - resizeStartX
                            if (Math.abs(dx) >= 6 && gripsRoot.editorRoot) {
                                var tableIndex = gripsRoot.tableGeom.tableIndex || 0
                                var upd = gripsRoot.ctrl && typeof gripsRoot.ctrl.updateTableColumnWidthAt === "function"
                                    ? gripsRoot.ctrl.updateTableColumnWidthAt(
                                        gripsRoot.editorRoot.sourceHtml || "", tableIndex, colGripItem.index,
                                        Math.round(colGripItem.colW + dx))
                                    : gripsRoot.editorRoot.sourceHtml
                                if (upd !== gripsRoot.editorRoot.sourceHtml) { gripsRoot.editorRoot.sourceHtml = upd; gripsRoot.editorRoot.contentModified(upd) }
                            }
                        }
                    }
                }
            }
        }
    }

    Column {
        visible: gripsRoot.tableGeom.valid && !gripsRoot.isFiltering; x: Math.max(0, gripsRoot.tableGeom.x - 24); y: gripsRoot.tableGeom.y; spacing: 2
        Repeater {
            model: gripsRoot.rowCount
            delegate: Rectangle {
                id: rowGripItem; required property int index
                readonly property real rowH: (gripsRoot.tableGeom.rowHeights && index < gripsRoot.tableGeom.rowHeights.length) ? Math.max(22, gripsRoot.tableGeom.rowHeights[index] - 2) : 30
                width: 22; height: rowH; radius: 4
                color: gripsRoot.tableGeom.currentRow === index ? "#338b5cf6" : (rowArea.containsMouse ? "#26ffffff" : "#e6161524")
                border.color: gripsRoot.dropRowIndex === index ? "#f59e0b" : (gripsRoot.tableGeom.currentRow === index ? "#668b5cf6" : "#22ffffff")
                border.width: gripsRoot.dropRowIndex === index ? 2 : 1
                Text { anchors.centerIn: parent; text: String(rowGripItem.index + 1); color: gripsRoot.tableGeom.currentRow === rowGripItem.index ? "#c4b5fd" : "#94a1b2"; font.pixelSize: 9; font.bold: true }
                MouseArea {
                    id: rowArea; anchors.fill: parent; hoverEnabled: true
                    property real startY: 0; property bool dragged: false
                    onPressed: function(m) { if (rowGripItem.index > 0) { startY = mapToGlobal(0, m.y).y; dragged = false } }
                    onPositionChanged: function(m) {
                        if (!pressed || rowGripItem.index <= 0) return
                        var gy = mapToGlobal(0, m.y).y
                        if (!dragged && Math.abs(gy - startY) > 8) { dragged = true; gripsRoot.dragRowIndex = rowGripItem.index }
                        if (dragged) {
                            var ly = gripsRoot.mapFromGlobal(0, gy).y - gripsRoot.tableGeom.y; var acc = 0
                            for (var ri = 0; ri < gripsRoot.rowCount; ++ri) {
                                acc += (gripsRoot.tableGeom.rowHeights && ri < gripsRoot.tableGeom.rowHeights.length) ? gripsRoot.tableGeom.rowHeights[ri] : 30
                                if (ly <= acc || ri === gripsRoot.rowCount - 1) { gripsRoot.dropRowIndex = Math.max(1, ri); break }
                            }
                        }
                    }
                    onReleased: {
                        if (dragged && gripsRoot.dragRowIndex > 0 && gripsRoot.dropRowIndex > 0 && gripsRoot.dragRowIndex !== gripsRoot.dropRowIndex &&
                                gripsRoot.ctrl && typeof gripsRoot.ctrl.moveTableRowAt === "function") {
                            gripsRoot.commitReorderedHtml(gripsRoot.ctrl.moveTableRowAt(
                                gripsRoot.editorRoot.sourceHtml || "", gripsRoot.tableGeom.tableIndex || 0,
                                gripsRoot.dragRowIndex, gripsRoot.dropRowIndex))
                        } else if (!dragged && gripsRoot.tableActions) gripsRoot.tableActions.selectCells("row")
                        gripsRoot.dragRowIndex = -1; gripsRoot.dropRowIndex = -1; dragged = false
                    }
                }
            }
        }
    }

    TableCellOverlay {
        visible: gripsRoot.tableGeom.valid && !gripsRoot.isFiltering
        x: gripsRoot.textEditor ? Math.max(8, Math.min(gripsRoot.width - width - 8, gripsRoot.textEditor.cursorRectangle.x)) : 8
        y: gripsRoot.textEditor ? gripsRoot.textEditor.cursorRectangle.y + gripsRoot.textEditor.cursorRectangle.height + 6 : 8
        isActiveCell: gripsRoot.tableGeom.valid && gripsRoot.tableGeom.currentRow > 0
        colType: gripsRoot.currentColType; currentCellText: gripsRoot.tableGeom.currentCellText || ""
        selectOptions: (gripsRoot.currentColConfig && gripsRoot.currentColConfig.options) ? gripsRoot.currentColConfig.options : []
        isCellInvalid: gripsRoot.invalidCellCount > 0
        onApplyCellValue: function(val) {
            if (gripsRoot.editorRoot && gripsRoot.editorRoot.textOperations) {
                gripsRoot.editorRoot.textOperations.setRichTableCellText(gripsRoot.textEditor.textDocument, gripsRoot.textEditor.cursorPosition, val)
                gripsRoot.syncSchemaFromHtml()
            }
        }
    }

    NotesTableColumnTypePopover {
        id: colTypePopover
        onTypeSelected: function(colIdx, colType, opts, numFmt, dateFmt) {
            if (!gripsRoot.editorRoot) return
            var tableIndex = gripsRoot.tableGeom.tableIndex || 0
            var upd = gripsRoot.ctrl && typeof gripsRoot.ctrl.updateTableColumnSchemaAt === "function"
                ? gripsRoot.ctrl.updateTableColumnSchemaAt(
                    gripsRoot.editorRoot.sourceHtml || "", tableIndex, colIdx, colType, opts, numFmt, dateFmt)
                : gripsRoot.editorRoot.sourceHtml
            if (upd !== gripsRoot.editorRoot.sourceHtml) { gripsRoot.editorRoot.sourceHtml = upd; gripsRoot.editorRoot.contentModified(upd); gripsRoot.syncSchemaFromHtml() }
        }
        onFilterUpdated: function(colIdx, obj) {
            var next = Object.assign({}, gripsRoot.activeFilters)
            if (obj) next[colIdx] = obj
            else delete next[colIdx]
            gripsRoot.activeFilters = next
            gripsRoot.applyVisualFilterEvaluation()
        }
        onInsertColumnRequested: function(right) { if (gripsRoot.tableActions) gripsRoot.tableActions.editTable(right ? "columnAfter" : "columnBefore") }
        onDeleteColumnRequested: { if (gripsRoot.tableActions) gripsRoot.tableActions.editTable("deleteColumn") }
    }
}
