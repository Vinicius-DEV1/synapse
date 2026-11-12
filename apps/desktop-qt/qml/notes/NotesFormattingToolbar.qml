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
    property bool dividerActive: false
    property bool canMoveDividerUp: false
    property bool canMoveDividerDown: false
    property var dividerDropTarget: null
    property bool richSpoilerActive: false
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

        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            Accessible.name: "Insert link"
            Text { anchors.centerIn: parent; text: "↗"; color: "#c4b5fd"; font.pixelSize: 14 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.linkRequested() }
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
        Rectangle {
            visible: toolbarRoot.richMode
            Layout.preferredWidth: 30
            Layout.preferredHeight: 26
            radius: 4
            color: "#08ffffff"
            Accessible.name: qsTr("Insert 3 by 3 table")
            ToolTip.visible: tableButtonMouse.containsMouse
            ToolTip.text: qsTr("Insert 3 by 3 table")
            Text { anchors.centerIn: parent; text: "▦"; color: "#ffffff"; font.pixelSize: 16 }
            MouseArea {
                id: tableButtonMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: toolbarRoot.richTableRequested()
            }
        }
        Rectangle {
            visible: toolbarRoot.richMode
            Layout.preferredWidth: 30
            Layout.preferredHeight: 26
            radius: 4
            color: "#08ffffff"
            Accessible.name: qsTr("Insert divider")
            ToolTip.visible: dividerButtonMouse.containsMouse
            ToolTip.text: qsTr("Insert divider")
            Text { anchors.centerIn: parent; text: "—"; color: "#ffffff"; font.pixelSize: 16 }
            MouseArea {
                id: dividerButtonMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: toolbarRoot.richDividerRequested()
            }
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
        NotesTableSelectionFormattingAction {
            selectionAvailable: toolbarRoot.richMode && toolbarRoot.canColorSelectedTableCells
            Layout.preferredWidth: 30
            Layout.preferredHeight: 30
            onClearRequested: toolbarRoot.richTableSelectionFormattingClearRequested()
        }

        Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 16; color: "#15ffffff" }

        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Text { anchors.centerIn: parent; text: "H1"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<h1>", "</h1>") }
        }
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Text { anchors.centerIn: parent; text: "H2"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<h2>", "</h2>") }
        }
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Accessible.name: qsTr("Heading 3")
            Text { anchors.centerIn: parent; text: "H3"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<h3>", "</h3>") }
        }
        Repeater {
            model: toolbarRoot.richMode ? [] : [4, 5, 6]
            delegate: Rectangle {
                required property int modelData
                Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
                Accessible.name: qsTr("Heading %1").arg(modelData)
                Text { anchors.centerIn: parent; text: "H" + parent.modelData; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: toolbarRoot.formatRequested("<h" + parent.modelData + ">", "</h" + parent.modelData + ">")
                }
            }
        }
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Text { anchors.centerIn: parent; text: "•"; color: "#ffffff"; font.pixelSize: 14 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<ul><li>", "</li></ul>") }
        }
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Accessible.name: qsTr("Numbered list")
            Text { anchors.centerIn: parent; text: "1."; color: "#ffffff"; font.pixelSize: 12 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<ol><li>", "</li></ol>") }
        }
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Text { anchors.centerIn: parent; text: "”"; color: "#ffffff"; font.pixelSize: 14 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<blockquote>", "</blockquote>") }
        }
        Rectangle {
            Layout.preferredWidth: 32; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Text { anchors.centerIn: parent; text: "ℹ️"; font.pixelSize: 11 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<div class=\"blockquote-toggle\" data-title=\"Nota\" data-color=\"default\" data-is-open=\"true\"><p>", "</p></div>") }
        }
        Rectangle {
            Layout.preferredWidth: 32; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Text { anchors.centerIn: parent; text: "⚠️"; font.pixelSize: 11 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<div class=\"blockquote-toggle\" data-title=\"Atenção\" data-color=\"#f59e0b\" data-is-open=\"true\"><p>", "</p></div>") }
        }
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Accessible.name: qsTr("Divider")
            Text { anchors.centerIn: parent; text: "—"; color: "#ffffff"; font.pixelSize: 16 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<hr>", "") }
        }
        Rectangle {
            Layout.preferredWidth: 32; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Text { anchors.centerIn: parent; text: "{ }"; color: "#a78bfa"; font.pixelSize: 11; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<pre><code>", "</code></pre>") }
        }
    }

}
