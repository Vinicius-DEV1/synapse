pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: toolbarRoot
    objectName: "notesFormattingToolbar"
    Layout.fillWidth: true
    height: 38
    radius: 8
    color: "#161524"
    border.color: "#0fffffff"

    signal formatRequested(string prefix, string suffix)
    signal linkRequested()
    signal richColorRequested(bool background, string color)
    signal richBlockRequested(string blockType)
    signal richCalloutRequested(string color)
    signal richTableRequested()
    signal richImageRequested()
    signal richImageAlignmentRequested(string alignment)
    signal richImageMoveRequested(bool upward)
    signal richImageFitRequested()
    signal richImageResetRequested()
    signal richImageParagraphBelowRequested()
    signal richImageCopyRequested()
    signal richImageDownloadRequested()
    signal richImageViewRequested()
    signal richImageDeleteRequested()
    signal richTableActionRequested(string action)
    signal richTableSelectionRequested(string scope)
    signal richCellBackgroundRequested(string color, string scope)
    signal richTableSelectionFormattingClearRequested()
    signal richDividerRequested()
    signal richDividerActionRequested(string action)
    signal richDividerDropRequested(int targetPosition, bool afterTarget)
    signal richCodeLanguageRequested(string language)
    signal richCodeMoveRequested(bool upward)
    signal richCodeDropRequested(int targetPosition, bool afterTarget)
    signal richCodeCopyRequested()
    signal richCodeParagraphBelowRequested()
    signal richCodeDeleteConfirmed()
    signal richMarkRequested(string mark)
    property bool richMode: false
    property bool tableCellActive: false
    property bool canMoveTableRowUp: false
    property bool canMoveTableRowDown: false
    property bool canMoveTableColumnLeft: false
    property bool canMoveTableColumnRight: false
    property bool canDeleteTableRow: false
    property bool canDeleteTableColumn: false
    property bool canMergeOrSplitTableCells: false
    property bool canColorSelectedTableCells: false
    property string richTableSelectionScope: "none"
    property bool dividerActive: false
    property bool canMoveDividerUp: false
    property bool canMoveDividerDown: false
    property var dividerDropTarget: null
    property bool richSpoilerActive: false
    property bool boldActive: false
    property bool italicActive: false
    property bool underlineActive: false
    property bool strikeActive: false
    property bool codeActive: false
    property bool calloutActive: false
    property string calloutColor: "default"
    property bool codeBlockActive: false
    property string codeBlockLanguage: "auto"
    property bool codeBlockCanMoveUp: false
    property bool codeBlockCanMoveDown: false
    property bool codeBlockCopySucceeded: false
    property int codeBlockCopyRevision: 0
    property bool richImageSelected: false
    property string richImageAlignment: "center"
    property bool richImageCanMoveUp: false
    property bool richImageCanMoveDown: false
    property bool richImageActionsEnabled: false
    property string richImageCopyState: "idle"

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 8
        anchors.rightMargin: 8
        spacing: 4

        ToolButton {
            id: linkButton
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            padding: 2
            Accessible.name: qsTr("Insert link")
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Insert link")
            background: Rectangle {
                radius: 4
                color: linkButton.hovered ? "#1affffff" : "#08ffffff"
                border.color: linkButton.hovered ? "#20ffffff" : "transparent"
            }
            contentItem: Text {
                anchors.centerIn: parent
                text: "↗"
                color: linkButton.hovered ? "#ffffff" : "#c4b5fd"
                font.pixelSize: 14
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: toolbarRoot.linkRequested()
        }

        NotesRichColorPalette {
            richMode: toolbarRoot.richMode
            Layout.preferredWidth: 30
            Layout.preferredHeight: 30
            onColorSelected: function(background, color) {
                toolbarRoot.richColorRequested(background, color)
            }
        }
        Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 16; color: "#15ffffff" }

        NotesInlineMarkToolbar {
            richMode: toolbarRoot.richMode
            boldActive: toolbarRoot.boldActive
            italicActive: toolbarRoot.italicActive
            underlineActive: toolbarRoot.underlineActive
            strikeActive: toolbarRoot.strikeActive
            codeActive: toolbarRoot.codeActive
            spoilerActive: toolbarRoot.richSpoilerActive
            Layout.preferredWidth: implicitWidth
            Layout.preferredHeight: implicitHeight
            onFormatRequested: function(prefix, suffix) { toolbarRoot.formatRequested(prefix, suffix) }
            onRichMarkRequested: function(mark) { toolbarRoot.richMarkRequested(mark) }
        }
        NotesRichImageInsertButton {
            visible: toolbarRoot.richMode
            Layout.preferredWidth: implicitWidth
            Layout.preferredHeight: implicitHeight
            onClicked: toolbarRoot.richImageRequested()
        }
        NotesRichImageToolbar {
            active: toolbarRoot.richMode && toolbarRoot.richImageSelected
            alignment: toolbarRoot.richImageAlignment
            canMoveUp: toolbarRoot.richImageCanMoveUp
            canMoveDown: toolbarRoot.richImageCanMoveDown
            actionsEnabled: toolbarRoot.richImageActionsEnabled
            copyState: toolbarRoot.richImageCopyState
            Layout.preferredWidth: implicitWidth
            Layout.preferredHeight: implicitHeight
            onAlignmentRequested: function(value) { toolbarRoot.richImageAlignmentRequested(value) }
            onMoveRequested: function(upward) { toolbarRoot.richImageMoveRequested(upward) }
            onFitRequested: toolbarRoot.richImageFitRequested()
            onResetRequested: toolbarRoot.richImageResetRequested()
            onParagraphBelowRequested: toolbarRoot.richImageParagraphBelowRequested()
            onCopyRequested: toolbarRoot.richImageCopyRequested()
            onDownloadRequested: toolbarRoot.richImageDownloadRequested()
            onViewRequested: toolbarRoot.richImageViewRequested()
            onDeleteRequested: toolbarRoot.richImageDeleteRequested()
        }
        Rectangle { visible: toolbarRoot.richMode; Layout.preferredWidth: 1; Layout.preferredHeight: 16; color: "#15ffffff" }
        NotesBlockStyleActions {
            visible: toolbarRoot.richMode
            onBlockRequested: function(blockType) { toolbarRoot.richBlockRequested(blockType) }
        }
        NotesCodeBlockHeaderActions {
            visible: toolbarRoot.richMode && toolbarRoot.codeBlockActive
            language: toolbarRoot.codeBlockLanguage
            canMoveUp: toolbarRoot.codeBlockCanMoveUp
            canMoveDown: toolbarRoot.codeBlockCanMoveDown
            dropTarget: toolbarRoot.dividerDropTarget
            copySucceeded: toolbarRoot.codeBlockCopySucceeded
            copyRevision: toolbarRoot.codeBlockCopyRevision
            onLanguageRequested: function(language) { toolbarRoot.richCodeLanguageRequested(language) }
            onMoveRequested: function(upward) { toolbarRoot.richCodeMoveRequested(upward) }
            onDropRequested: function(targetPosition, afterTarget) {
                toolbarRoot.richCodeDropRequested(targetPosition, afterTarget)
            }
            onCopyRequested: toolbarRoot.richCodeCopyRequested()
            onParagraphBelowRequested: toolbarRoot.richCodeParagraphBelowRequested()
            onDeleteRequested: toolbarRoot.richCodeDeleteConfirmed()
        }
        NotesCalloutPalette {
            active: toolbarRoot.richMode && toolbarRoot.calloutActive
            currentColor: toolbarRoot.calloutColor
            Layout.preferredWidth: 30
            Layout.preferredHeight: 30
            onColorSelected: function(color) { toolbarRoot.richCalloutRequested(color) }
        }
        ToolButton {
            id: tableButton
            visible: toolbarRoot.richMode
            Layout.preferredWidth: 30
            Layout.preferredHeight: 26
            padding: 2
            Accessible.name: qsTr("Insert 3 by 3 table")
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Insert 3 by 3 table")
            background: Rectangle {
                radius: 4
                color: tableButton.hovered ? "#1affffff" : "#08ffffff"
                border.color: tableButton.hovered ? "#20ffffff" : "transparent"
            }
            contentItem: Text {
                anchors.centerIn: parent
                text: "▦"
                color: tableButton.hovered ? "#c4b5fd" : "#ffffff"
                font.pixelSize: 16
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: toolbarRoot.richTableRequested()
        }
        ToolButton {
            id: dividerButton
            visible: toolbarRoot.richMode
            Layout.preferredWidth: 30
            Layout.preferredHeight: 26
            padding: 2
            Accessible.name: qsTr("Insert divider")
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Insert divider")
            background: Rectangle {
                radius: 4
                color: dividerButton.hovered ? "#1affffff" : "#08ffffff"
                border.color: dividerButton.hovered ? "#20ffffff" : "transparent"
            }
            contentItem: Text {
                anchors.centerIn: parent
                text: "—"
                color: dividerButton.hovered ? "#c4b5fd" : "#ffffff"
                font.pixelSize: 16
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: toolbarRoot.richDividerRequested()
        }
        NotesDividerActions {
            id: dividerActions
            active: toolbarRoot.richMode && toolbarRoot.dividerActive
            canMoveUp: toolbarRoot.canMoveDividerUp
            canMoveDown: toolbarRoot.canMoveDividerDown
            dropTarget: toolbarRoot.dividerDropTarget
            onActionRequested: function(action) { toolbarRoot.richDividerActionRequested(action) }
            onDropRequested: function(targetPosition, afterTarget) {
                toolbarRoot.richDividerDropRequested(targetPosition, afterTarget)
            }
        }
        NotesTableStructureActions {
            active: toolbarRoot.richMode &&
                    (toolbarRoot.tableCellActive || toolbarRoot.canMergeOrSplitTableCells)
            currentCellActive: toolbarRoot.tableCellActive
            canMoveRowUp: toolbarRoot.canMoveTableRowUp
            canMoveRowDown: toolbarRoot.canMoveTableRowDown
            canMoveColumnLeft: toolbarRoot.canMoveTableColumnLeft
            canMoveColumnRight: toolbarRoot.canMoveTableColumnRight
            canDeleteRow: toolbarRoot.canDeleteTableRow
            canDeleteColumn: toolbarRoot.canDeleteTableColumn
            canMergeOrSplit: toolbarRoot.canMergeOrSplitTableCells
            onActionRequested: function(action) { toolbarRoot.richTableActionRequested(action) }
        }
        NotesTableCellBackgroundPalette {
            active: toolbarRoot.richMode && toolbarRoot.tableCellActive
            selectionAvailable: toolbarRoot.canColorSelectedTableCells
            Layout.preferredWidth: 30
            Layout.preferredHeight: 30
            onColorSelected: function(color, scope) { toolbarRoot.richCellBackgroundRequested(color, scope) }
        }
        NotesTableSelectionActions {
            active: toolbarRoot.richMode && toolbarRoot.tableCellActive
            currentScope: toolbarRoot.richTableSelectionScope
            Layout.preferredWidth: implicitWidth
            Layout.preferredHeight: implicitHeight
            onSelectionRequested: function(scope) { toolbarRoot.richTableSelectionRequested(scope) }
        }
        NotesTableSelectionFormattingAction {
            selectionAvailable: toolbarRoot.richMode && toolbarRoot.canColorSelectedTableCells
            Layout.preferredWidth: 30
            Layout.preferredHeight: 30
            onClearRequested: toolbarRoot.richTableSelectionFormattingClearRequested()
        }
    }

}
