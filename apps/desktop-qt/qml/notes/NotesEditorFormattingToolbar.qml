import QtQuick 2.15
import QtQuick.Layouts 1.15

Item {
    id: toolbarBinding
    property bool isPreviewMode: false
    property bool isRichMode: false
    property var richEditor: null
    property var sourceEditor: null
    property var linkInsertionDialog: null
    signal formatRequested(string prefix, string suffix)
    visible: !isPreviewMode && (isRichMode
             ? richEditor.editor.activeFocus
             : sourceEditor.activeFocus && sourceEditor.selectionStart !== sourceEditor.selectionEnd)
    Layout.fillWidth: true
    Layout.alignment: Qt.AlignRight
    Layout.bottomMargin: 8
    implicitHeight: formattingToolbar.implicitHeight

    NotesFormattingToolbar {
        id: formattingToolbar
        anchors.fill: parent
        visible: !toolbarBinding.isPreviewMode && (toolbarBinding.isRichMode
                 ? toolbarBinding.richEditor.editor.activeFocus
                 : toolbarBinding.sourceEditor.activeFocus &&
                   toolbarBinding.sourceEditor.selectionStart !== toolbarBinding.sourceEditor.selectionEnd)
        richMode: toolbarBinding.isRichMode
        tableCellActive: toolbarBinding.richEditor.tableActions.isInsideTable
        canMoveTableRowUp: toolbarBinding.richEditor.tableActions.canEditTable("moveRowUp")
        canMoveTableRowDown: toolbarBinding.richEditor.tableActions.canEditTable("moveRowDown")
        canMoveTableColumnLeft: toolbarBinding.richEditor.tableActions.canEditTable("moveColumnLeft")
        canMoveTableColumnRight: toolbarBinding.richEditor.tableActions.canEditTable("moveColumnRight")
        canDeleteTableRow: toolbarBinding.richEditor.tableActions.canEditTable("deleteRow")
        canDeleteTableColumn: toolbarBinding.richEditor.tableActions.canEditTable("deleteColumn")
        canMergeOrSplitTableCells: toolbarBinding.richEditor.tableActions.canMergeOrSplit
        canColorSelectedTableCells: toolbarBinding.richEditor.tableActions.canColorSelectedCells
        richTableSelectionScope: toolbarBinding.richEditor.tableActions.selectionScope
        dividerActive: toolbarBinding.richEditor.tableActions.isOnDivider
        canMoveDividerUp: toolbarBinding.richEditor.tableActions.canMoveDividerUp
        canMoveDividerDown: toolbarBinding.richEditor.tableActions.canMoveDividerDown
        dividerDropTarget: toolbarBinding.richEditor.editor
        richSpoilerActive: toolbarBinding.richEditor.spoilerAtCursor
        boldActive: toolbarBinding.richEditor.boldAtCursor
        italicActive: toolbarBinding.richEditor.italicAtCursor
        underlineActive: toolbarBinding.richEditor.underlineAtCursor
        strikeActive: toolbarBinding.richEditor.strikeAtCursor
        codeActive: toolbarBinding.richEditor.codeAtCursor
        calloutActive: toolbarBinding.richEditor.calloutAtCursor
        calloutColor: toolbarBinding.richEditor.calloutColorAtCursor
        codeBlockActive: toolbarBinding.richEditor.codeBlockActive
        codeBlockLanguage: toolbarBinding.richEditor.codeBlockLanguage
        codeBlockCanMoveUp: toolbarBinding.richEditor.codeBlockCanMoveUp
        codeBlockCanMoveDown: toolbarBinding.richEditor.codeBlockCanMoveDown
        codeBlockCopySucceeded: toolbarBinding.richEditor.codeBlockCopySucceeded
        codeBlockCopyRevision: toolbarBinding.richEditor.codeBlockCopyRevision
        richImageSelected: toolbarBinding.richEditor.richImageSelected
        richImageAlignment: toolbarBinding.richEditor.richImageAlignment
        richImageCanMoveUp: toolbarBinding.richEditor.richImageCanMoveUp
        richImageCanMoveDown: toolbarBinding.richEditor.richImageCanMoveDown
        richImageActionsEnabled: toolbarBinding.richEditor.richImageActionsEnabled
        richImageCopyState: toolbarBinding.richEditor.richImageCopyState
        onFormatRequested: function(prefix, suffix) { toolbarBinding.formatRequested(prefix, suffix) }
        onRichColorRequested: function(background, color) {
            toolbarBinding.richEditor.tableActions.setColor(background, color)
        }
        onRichBlockRequested: function(blockType) { toolbarBinding.richEditor.toggleBlock(blockType) }
        onRichCalloutRequested: function(color) { toolbarBinding.richEditor.setCalloutColor(color) }
        onRichTableRequested: toolbarBinding.richEditor.tableActions.insertTable()
        onRichImageRequested: toolbarBinding.richEditor.openImagePicker()
        onRichImageAlignmentRequested: function(alignment) {
            toolbarBinding.richEditor.setImageAlignment(alignment)
        }
        onRichImageMoveRequested: function(upward) { toolbarBinding.richEditor.moveImage(upward) }
        onRichImageFitRequested: toolbarBinding.richEditor.fitImageToWidth()
        onRichImageResetRequested: toolbarBinding.richEditor.resetImageSize()
        onRichImageParagraphBelowRequested: toolbarBinding.richEditor.insertParagraphBelowImage()
        onRichImageCopyRequested: toolbarBinding.richEditor.copyRichImage()
        onRichImageDownloadRequested: toolbarBinding.richEditor.downloadRichImage()
        onRichImageViewRequested: toolbarBinding.richEditor.viewRichImage()
        onRichImageDeleteRequested: toolbarBinding.richEditor.requestImageDelete()
        onRichTableActionRequested: function(action) { toolbarBinding.richEditor.tableActions.editTable(action) }
        onRichTableSelectionRequested: function(scope) {
            toolbarBinding.richEditor.tableActions.selectCells(scope)
        }
        onRichCellBackgroundRequested: function(color, scope) {
            toolbarBinding.richEditor.tableActions.setCellBackground(color, scope)
        }
        onRichTableSelectionFormattingClearRequested:
            toolbarBinding.richEditor.tableActions.clearSelectedCellFormatting()
        onRichDividerRequested: toolbarBinding.richEditor.tableActions.insertDivider()
        onRichDividerActionRequested: function(action) { toolbarBinding.richEditor.tableActions.editDivider(action) }
        onRichDividerDropRequested: function(targetPosition, afterTarget) {
            toolbarBinding.richEditor.dropDividerAt(targetPosition, afterTarget)
        }
        onRichCodeLanguageRequested: function(language) {
            toolbarBinding.richEditor.setCodeBlockLanguage(language)
        }
        onRichCodeMoveRequested: function(upward) { toolbarBinding.richEditor.moveCodeBlock(upward) }
        onRichCodeDropRequested: function(targetPosition, afterTarget) {
            toolbarBinding.richEditor.dropCodeBlockAt(targetPosition, afterTarget)
        }
        onRichCodeCopyRequested: toolbarBinding.richEditor.copyCodeBlock()
        onRichCodeParagraphBelowRequested: toolbarBinding.richEditor.insertParagraphBelowCodeBlock()
        onRichCodeDeleteConfirmed: toolbarBinding.richEditor.deleteCodeBlock()
        onRichMarkRequested: function(mark) { toolbarBinding.richEditor.toggleMark(mark) }
        onLinkRequested: {
            if (toolbarBinding.isRichMode) toolbarBinding.richEditor.openLinkDialog()
            else toolbarBinding.linkInsertionDialog.openFor(
                     toolbarBinding.sourceEditor.selectedText,
                     toolbarBinding.sourceEditor.selectionStart,
                     toolbarBinding.sourceEditor.selectionEnd)
        }
    }
}
