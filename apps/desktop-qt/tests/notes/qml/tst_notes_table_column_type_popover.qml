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
    property int filterUpdateCount: 0
    property var emittedFilter: null
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
            onFilterUpdated: function(columnIndex, filterObj) {
                testCase.filterUpdateCount += 1
                testCase.emittedFilter = filterObj
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
        filterUpdateCount = 0
        emittedFilter = null
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
        compare(typeButton.focusPolicy, Qt.StrongFocus)
        mouseClick(typeButton, typeButton.width / 2, typeButton.height / 2)
        compare(pickedColumn, 2)
        compare(selectedType, "number")
        compare(popover.currentType, "number")
        compare(popover.visible, true)
    }

    function test_filterExpansionRepositionsPopoverAboveAnchor() {
        popover.placementViewportWidth = 560
        popover.placementAnchorLeft = 120
        popover.placementAnchorTop = 60
        var initialPopoverHeight = popover.implicitContentHeight + popover.topPadding + popover.bottomPadding
        popover.placementViewportHeight = 60 + initialPopoverHeight + 8
        popover.reposition()
        compare(popover.x, 120)
        compare(popover.y, 60)
        var filterToggle = findVisualChild(popover.contentItem, "notesTableFilterToggle")
        verify(filterToggle !== null)
        mouseClick(filterToggle, filterToggle.width / 2, filterToggle.height / 2)
        tryVerify(function() { return popover.y < 60 })
        verify(popover.y >= 8)
    }

    function test_filterStartsCollapsedAndAppliesOnlyOnRequest() {
        var filterEditor = findVisualChild(popover.contentItem, "notesTableFilterEditor")
        var filterToggle = findVisualChild(popover.contentItem, "notesTableFilterToggle")
        verify(filterEditor !== null)
        verify(filterToggle !== null)
        compare(filterEditor.visible, false)
        mouseClick(filterToggle, filterToggle.width / 2, filterToggle.height / 2)
        tryCompare(filterEditor, "visible", true)

        var valueInput = findVisualChild(filterEditor, "notesTableFilterValue")
        verify(valueInput !== null)
        valueInput.text = "biology"
        valueInput.textEdited()
        compare(filterUpdateCount, 0)

        var applyButton = findVisualChild(filterEditor, "notesTableFilterApply")
        verify(applyButton !== null)
        mouseClick(applyButton, applyButton.width / 2, applyButton.height / 2)
        compare(filterUpdateCount, 1)
        compare(emittedFilter.columnIndex, 2)
        compare(emittedFilter.operator, "contains")
        compare(emittedFilter.value, "biology")
        compare(emittedFilter.value2, "")
        popover.activeFilterObj = emittedFilter
        var clearButton = findVisualChild(filterEditor, "notesTableFilterClear")
        verify(clearButton !== null && clearButton.visible)
        mouseClick(clearButton, clearButton.width / 2, clearButton.height / 2)
        compare(valueInput.text, "")
    }

    function test_clearResetsAppliedFilterAndKeepsEditorExpanded() {
        popover.activeFilterObj = { columnIndex: 2, operator: "contains", value: "draft", value2: "" }
        var filterEditor = findVisualChild(popover.contentItem, "notesTableFilterEditor")
        tryCompare(filterEditor, "visible", true)
        var clearButton = findVisualChild(filterEditor, "notesTableFilterClear")
        var valueInput = findVisualChild(filterEditor, "notesTableFilterValue")
        verify(clearButton !== null && clearButton.visible)
        verify(valueInput !== null)
        mouseClick(clearButton, clearButton.width / 2, clearButton.height / 2)
        compare(filterUpdateCount, 1)
        compare(emittedFilter, null)
        compare(filterEditor.visible, true)
        compare(valueInput.text, "")
    }

    function test_selectCheckboxAndDateFiltersUseTypedControls() {
        var filterEditor = findVisualChild(popover.contentItem, "notesTableFilterEditor")
        var filterSection = findVisualChild(popover.contentItem, "notesTableColumnFilterSection")
        verify(filterSection !== null)
        var filterToggle = findVisualChild(popover.contentItem, "notesTableFilterToggle")
        mouseClick(filterToggle, filterToggle.width / 2, filterToggle.height / 2)
        tryCompare(filterEditor, "visible", true)
        popover.selectOptions = ["Study", "Review"]

        popover.currentType = "select"
        var selectValue = findVisualChild(filterEditor, "notesTableFilterSelectValue")
        verify(selectValue !== null && selectValue.visible)
        compare(selectValue.options.length, 3)
        compare(filterSection.operatorList.length, 4)

        popover.currentType = "checkbox"
        var checkboxValue = findVisualChild(filterEditor, "notesTableFilterCheckboxValue")
        verify(checkboxValue !== null && checkboxValue.visible)
        compare(filterSection.operatorList.length, 2)

        popover.currentType = "date"
        filterSection.draftOperator = "between"
        var secondValue = findVisualChild(filterEditor, "notesTableFilterValueTo")
        verify(secondValue !== null && secondValue.visible)
        compare(filterSection.needsSecondValue, true)
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
