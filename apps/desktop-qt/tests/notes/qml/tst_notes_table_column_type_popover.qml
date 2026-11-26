import QtQuick
import QtTest
import "../../../qml/notes" as Notes

TestCase {
    id: testCase
    name: "NotesTableColumnTypePopover"
    when: windowShown
    width: 560
    height: 440

    property int pickedColumn: -1
    property string selectedType: ""
    property var popover: null
    property var tableGrips: null

    QtObject {
        id: mockController
        function updateTableColumnSchemaAt(html, tableIndex, columnIndex, columnType) {
            return html.replace('data-column-type="text"', 'data-column-type="' + columnType + '"')
        }
        function parseTableColumnsAt(html, tableIndex) { return [] }
        function validateTableCellsAt(html, tableIndex) { return [] }
        function filterTableRowsForView(html, tableIndex, filterJson) {
            return { html: html + "<!-- projection:" + filterJson + " -->", visibleRowCount: 1 }
        }
    }

    QtObject {
        id: mockTextOperations
        function richSourceForEditorWithPages(html, pages) { return html }
    }

    QtObject {
        id: mockTableActions
        property bool isInsideTable: false
        property string selectionScope: "none"
        property bool canMergeOrSplit: false
        property bool canColorSelectedCells: false
        function canEditTable(action) { return false }
        function selectCells(scope) {}
        function editTable(action) {}
        function setCellBackground(color, scope) {}
        function clearSelectedCellFormatting() {}
    }

    QtObject {
        id: mockEditorRoot
        property string sourceHtml: '<table data-column-type="text"></table>'
        property var controller: mockController
        property var textOperations: mockTextOperations
        property var pageList: []
        property bool hasVisualTableFilter: false
        property int contentModifiedCount: 0
        function contentModified(html) { contentModifiedCount += 1 }
    }

    QtObject {
        id: mockTextEditor
        property bool activeFocus: false
        property var textDocument: null
        property int cursorPosition: 0
        property var cursorRectangle: ({ x: 0, y: 0, height: 16 })
        property string projectedHtml: ""
        property bool projectionIsFiltered: false
        function replaceTableProjection(html, isFiltered) {
            projectedHtml = html
            projectionIsFiltered = isFiltered
        }
    }

    Component {
        id: popoverComponent
        Notes.NotesTableColumnTypePopover {
            onTypePicked: function(columnIndex) { testCase.pickedColumn = columnIndex }
            onTypeSelected: function(columnIndex, columnType) {
                testCase.pickedColumn = columnIndex
                testCase.selectedType = columnType
            }
        }
    }

    Component {
        id: tableGripsComponent
        Notes.NotesTableExcelGrips {
            tableActions: mockTableActions
            editorRoot: mockEditorRoot
            textEditor: mockTextEditor
            activeFilters: ({
                1: { operator: "contains", value: "old type", value2: "" },
                3: { operator: "equals", value: "keep", value2: "" }
            })
        }
    }

    function init() {
        pickedColumn = -1
        selectedType = ""
        popover = createTemporaryObject(popoverComponent, testCase)
        verify(popover !== null)
        popover.columnIndex = 2
        popover.currentType = "text"
        popover.open()
        tryCompare(popover, "visible", true)
        wait(50)
    }

    function cleanup() {
        if (popover) popover.destroy()
        popover = null
    }

    function findVisualChild(parentItem, targetName) {
        if (!parentItem || !parentItem.children) return null
        for (var index = 0; index < parentItem.children.length; ++index) {
            var child = parentItem.children[index]
            if (child.objectName === targetName) return child
            var nested = findVisualChild(child, targetName)
            if (nested) return nested
        }
        return null
    }

    function test_typeGridMatchesReactDimensionsAndKeepsPopoverOpen() {
        compare(popover.width, 240)
        var typeButton = findVisualChild(popover.contentItem, "notesTableColumnType_number")
        verify(typeButton !== null)
        mouseClick(typeButton, typeButton.width / 2, typeButton.height / 2)
        compare(pickedColumn, 2)
        compare(selectedType, "number")
        compare(popover.currentType, "number")
        compare(popover.visible, true)
    }

    function test_closeButtonDismissesPopover() {
        var closeButton = findChild(popover, "notesTableColumnTypeCloseButton")
        verify(closeButton !== null)
        mouseClick(closeButton, closeButton.width / 2, closeButton.height / 2)
        tryCompare(popover, "visible", false)
        compare(selectedType, "")
    }

    function test_typeChangeClearsOnlyCurrentColumnFilter() {
        tableGrips = createTemporaryObject(tableGripsComponent, testCase)
        verify(tableGrips !== null)
        verify(tableGrips.clearColumnFilter(1))
        compare(tableGrips.activeFilters[1], undefined)
        compare(tableGrips.activeFilters[3].value, "keep")
        compare(tableGrips.clearColumnFilter(1), false)
        tableGrips.destroy()
        tableGrips = null
    }

    function test_schemaChangeReappliesOtherFiltersToCanonicalSource() {
        tableGrips = createTemporaryObject(tableGripsComponent, testCase)
        verify(tableGrips !== null)
        tableGrips.unfilteredSourceHtml = mockEditorRoot.sourceHtml
        tableGrips.clearColumnFilter(1)
        var hostedPopover = findChild(tableGrips, "notesTableColumnTypePopover")
        verify(hostedPopover !== null)
        hostedPopover.typeSelected(1, "number", [], "decimal", "YYYY-MM-DD")
        compare(mockEditorRoot.sourceHtml, '<table data-column-type="number"></table>')
        compare(mockEditorRoot.contentModifiedCount, 1)
        compare(tableGrips.unfilteredSourceHtml, mockEditorRoot.sourceHtml)
        tryVerify(function() { return mockTextEditor.projectionIsFiltered })
        verify(mockTextEditor.projectedHtml.indexOf('"columnIndex":3') >= 0)
        verify(mockTextEditor.projectedHtml.indexOf('"columnIndex":1') < 0)
        verify(mockTextEditor.projectedHtml.indexOf(mockEditorRoot.sourceHtml) === 0)
        compare(tableGrips.activeFilterCount, 1)
        tableGrips.destroy()
        tableGrips = null
    }
}
