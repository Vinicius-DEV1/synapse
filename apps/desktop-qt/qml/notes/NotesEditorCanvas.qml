import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesInlineFormatting.js" as NotesInlineFormatting

ScrollView {
    id: canvasRoot
    objectName: "notesEditorCanvas"
    Layout.fillWidth: true
    Layout.fillHeight: true
    clip: true
    contentWidth: width

    property string activeTitle: ""
    property string activeDescription: ""
    property string activeContent: ""
    property string activeIcon: "📄"
    property string activeCoverImage: ""
    property string activeDate: ""
    property var activeBreadcrumbs: []
    property var childPages: []
    property var allPages: []
    property var controller: null
    property string activePageId: ""
    property string pageActionStatus: ""
    property string plainTextContent: ""
    property bool isDirty: false
    property bool saveFailed: false
    property bool isPreviewMode: false
    property bool isRichMode: false
    readonly property bool isEmojiPickerOpen: iconPicker.isOpen
    readonly property bool isDialogOpen: pageCover.isDialogOpen || movePageDialog.visible || linkInsertion.isDialogOpen
    readonly property bool contentEditorFocused: isRichMode ? richTextEditor.editor.activeFocus : noteEditorArea.activeFocus
    readonly property bool canUseRichMode: richTextEditor.canEditSource
    readonly property bool richContentInvalid: richTextEditor.hasInvalidContent

    signal saveRequested()
    signal deleteRequested()
    signal historyRequested()
    signal helpRequested()
    signal richModeRequested(bool enabled)
    signal richValidationChanged(bool invalid)
    signal richColorRequested(bool background, string color)
    signal titleModified(string newTitle)
    signal descriptionModified(string newDescription)
    signal contentModified(string newContent)
    signal richContentModified(string newContent)
    signal iconModified(string newIcon)
    signal previewToggled(bool preview)
    signal formatRequested(string prefix, string suffix)
    signal pageNavigationRequested(string pageId)
    signal pageReferencePreviewRequested(string pageId)
    signal createSubPageRequested()
    signal pageHierarchyChanged()
    signal pageActionFailed(string message)
    signal coverModified(string imageUrl)

    property var hierarchyActions: NotesHierarchyActions {
        controller: canvasRoot.controller
        parentPageId: canvasRoot.activePageId
        onStructureChanged: canvasRoot.pageHierarchyChanged()
        onActionFailed: function(message) { canvasRoot.pageActionFailed(message) }
    }

    function setEditorText(txt) {
        noteEditorArea.text = txt
        plainTextContent = plainTextFromContent(txt)
    }

    function setTitleText(txt) {
        noteTitleInput.text = txt
    }

    function setDescriptionText(txt) {
        noteDescriptionInput.text = txt
    }

    function openMovePageDialog(pageId) { movePageDialog.openForPage(pageId) }

    function isHtmlDocument(value) {
        return /<[a-z][^>]*>/i.test(value || "")
    }

    function plainTextFromContent(value) {
        return String(value || "")
            .replace(/<br\s*\/?\s*>/gi, "\n")
            .replace(/<\/(p|div|li|h[1-6]|blockquote|pre)>/gi, "\n")
            .replace(/<[^>]*>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">")
            .replace(/&quot;/gi, "\"")
            .replace(/&#39;/gi, "'")
    }

    function openExternalLink(link) {
        if (/^(https?:\/\/|mailto:)/i.test(link || "")) Qt.openUrlExternally(link)
    }

    function insertFormatting(prefix, suffix) {
        var start = noteEditorArea.selectionStart
        var end = noteEditorArea.selectionEnd
        var oldText = noteEditorArea.text
        if (prefix === "<strong>" || prefix === "<em>" || prefix === "<u>" || prefix === "<s>" || prefix === "<code>") {
            var result = NotesInlineFormatting.toggle(oldText, start, end, prefix, suffix)
            if (!notesTextOperations.replace(noteEditorArea.textDocument, result.editStart, result.editEnd, result.replacement)) {
                console.error("[Notes] Could not apply inline formatting to the selected source range")
                return
            }
            noteEditorArea.select(result.start, result.end)
            noteEditorArea.forceActiveFocus()
            return
        }
        var selected = oldText.substring(start, end)
        var replacement = prefix + selected + suffix
        if (!notesTextOperations.replace(noteEditorArea.textDocument, start, end, replacement)) {
            console.error("[Notes] Could not apply formatting to the selected source range")
            return
        }
        noteEditorArea.cursorPosition = start + (selected.length === 0 ? prefix.length : String(replacement).length)
    }

    function formatSelection(prefix, suffix) {
        if (isPreviewMode) return
        if (isRichMode) {
            if (prefix === "<strong>") richTextEditor.toggleMark("bold")
            else if (prefix === "<em>") richTextEditor.toggleMark("italic")
            else if (prefix === "<u>") richTextEditor.toggleMark("underline")
            else if (prefix === "<s>") richTextEditor.toggleMark("strike")
            else if (prefix === "<code>") richTextEditor.toggleMark("code")
            else if (prefix === "<spoiler>") richTextEditor.toggleMark("spoiler")
            return
        }
        if (noteEditorArea.activeFocus) insertFormatting(prefix, suffix)
    }

    function toggleRichMark(mark) {
        if (!isPreviewMode && isRichMode) return richTextEditor.toggleMark(mark)
        return false
    }

    function flushRichEditor() {
        return !isRichMode || richTextEditor.commitEditorText()
    }

    ColumnLayout {
        width: canvasRoot.width
        spacing: 0

        NotesPageCover {
            id: pageCover
            coverImage: canvasRoot.activeCoverImage
            controller: canvasRoot.controller
            pageId: canvasRoot.activePageId
            onCoverSaved: function(url) { canvasRoot.coverModified(url) }
            onActionFailed: function(message) { canvasRoot.pageActionFailed(message) }
        }

        ColumnLayout {
            Layout.fillWidth: false
            Layout.preferredWidth: Math.max(0, Math.min(parent.width - 96, 928))
            Layout.alignment: Qt.AlignHCenter
            Layout.topMargin: canvasRoot.activeCoverImage.length > 0 ? 32 : 0
            spacing: 0

            RowLayout {
                id: pageTitleRow
                Layout.fillWidth: true
                Layout.preferredHeight: 28
                Layout.bottomMargin: 24
                spacing: 4
                NotesSiblingNavigation {
                    pages: canvasRoot.allPages
                    pageId: canvasRoot.activePageId
                    onPageSelected: function(pageId) { canvasRoot.pageNavigationRequested(pageId) }
                }
                NotesBreadcrumbs {
                    Layout.fillWidth: true
                    pages: canvasRoot.activeBreadcrumbs
                    onPageSelected: function(pageId) { canvasRoot.pageNavigationRequested(pageId) }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                Layout.preferredHeight: 64
                Layout.bottomMargin: 8
                spacing: 12
                NotesIconPicker {
                    id: iconPicker
                    activeIcon: canvasRoot.activeIcon
                    onIconSelected: function(icon) { canvasRoot.iconModified(icon) }
                }
                TextField {
                    id: noteTitleInput
                    Layout.fillWidth: true
                    text: canvasRoot.activeTitle
                    color: "#fffffe"
                    font.pixelSize: 36
                    font.bold: true
                    background: null
                    selectByMouse: true
                    placeholderText: qsTr("Untitled")
                    placeholderTextColor: "#80a7a9be"
                    onTextChanged: if (text !== canvasRoot.activeTitle) canvasRoot.titleModified(text)
                }
                NotesEditorHeader {
                    id: notesEditorHeader
                    Layout.preferredWidth: 278
                    isDirty: canvasRoot.isDirty
                    saveFailed: canvasRoot.saveFailed
                    isPreviewMode: canvasRoot.isPreviewMode
                    isRichMode: canvasRoot.isRichMode
                    canUseRichMode: canvasRoot.canUseRichMode
                    actionsVisible: pageTitleHover.hovered || noteTitleInput.activeFocus || notesEditorHeader.activeFocus
                    pageDate: canvasRoot.activeDate
                    wordCount: canvasRoot.plainTextContent.trim().length > 0 ? canvasRoot.plainTextContent.trim().split(/\s+/).length : 0
                    characterCount: canvasRoot.plainTextContent.length
                    onSaveRequested: canvasRoot.saveRequested()
                    onDeleteRequested: canvasRoot.deleteRequested()
                    onHistoryRequested: canvasRoot.historyRequested()
                    onHelpRequested: canvasRoot.helpRequested()
                    onRichModeRequested: function(enabled) { canvasRoot.richModeRequested(enabled) }
                    onMoveRequested: movePageDialog.openForPage(canvasRoot.activePageId)
                    onPreviewToggled: function(preview) { canvasRoot.previewToggled(preview) }
                }

                HoverHandler { id: pageTitleHover; target: pageTitleRow }
            }

            TextField {
                id: noteDescriptionInput
                Layout.fillWidth: true
                Layout.preferredHeight: 24
                Layout.leftMargin: 56
                Layout.bottomMargin: 32
                text: canvasRoot.activeDescription
                color: "#a7a9be"
                font.pixelSize: 16
                background: null
                selectByMouse: true
                placeholderText: qsTr("Add a description")
                placeholderTextColor: "#4da7a9be"
                onEditingFinished: {
                    var nextDescription = text.trim()
                    if (nextDescription !== canvasRoot.activeDescription) canvasRoot.descriptionModified(nextDescription)
                }
            }

            NotesSubPageGrid {
                visible: canvasRoot.childPages.length > 0
                pages: canvasRoot.childPages
                actionStatus: canvasRoot.pageActionStatus
                Layout.fillWidth: true
                onPageSelected: function(pageId) { canvasRoot.pageNavigationRequested(pageId) }
                onCreateRequested: canvasRoot.createSubPageRequested()
                onReorderRequested: function(orderedPageIds) { canvasRoot.hierarchyActions.reorder(orderedPageIds) }
                onMoveRequested: function(pageId, newParentId) { canvasRoot.hierarchyActions.move(pageId, newParentId) }
                onMoveToRequested: function(pageId) { movePageDialog.openForPage(pageId) }
            }

            NotesFormattingToolbar {
                visible: !canvasRoot.isPreviewMode && (canvasRoot.isRichMode
                         ? richTextEditor.editor.activeFocus
                         : noteEditorArea.activeFocus && noteEditorArea.selectionStart !== noteEditorArea.selectionEnd)
                richMode: canvasRoot.isRichMode
                tableCellActive: richTextEditor.tableActions.isInsideTable
                canMoveTableRowUp: richTextEditor.tableActions.canEditTable("moveRowUp")
                canMoveTableRowDown: richTextEditor.tableActions.canEditTable("moveRowDown")
                canMoveTableColumnLeft: richTextEditor.tableActions.canEditTable("moveColumnLeft")
                canMoveTableColumnRight: richTextEditor.tableActions.canEditTable("moveColumnRight")
                canDeleteTableRow: richTextEditor.tableActions.canEditTable("deleteRow")
                canDeleteTableColumn: richTextEditor.tableActions.canEditTable("deleteColumn")
                dividerActive: richTextEditor.tableActions.isOnDivider
                canMoveDividerUp: richTextEditor.tableActions.canMoveDividerUp
                canMoveDividerDown: richTextEditor.tableActions.canMoveDividerDown
                dividerDropTarget: richTextEditor.editor
                richSpoilerActive: richTextEditor.spoilerAtCursor
                calloutActive: richTextEditor.calloutAtCursor
                calloutColor: richTextEditor.calloutColorAtCursor
                codeBlockActive: richTextEditor.codeBlockActive
                codeBlockLanguage: richTextEditor.codeBlockLanguage
                codeBlockCanMoveUp: richTextEditor.codeBlockCanMoveUp
                codeBlockCanMoveDown: richTextEditor.codeBlockCanMoveDown
                codeBlockCopySucceeded: richTextEditor.codeBlockCopySucceeded
                codeBlockCopyRevision: richTextEditor.codeBlockCopyRevision
                richImageSelected: richTextEditor.richImageSelected
                richImageAlignment: richTextEditor.richImageAlignment
                richImageCanMoveUp: richTextEditor.richImageCanMoveUp
                richImageCanMoveDown: richTextEditor.richImageCanMoveDown
                richImageActionsEnabled: richTextEditor.richImageActionsEnabled
                richImageCopyState: richTextEditor.richImageCopyState
                Layout.alignment: Qt.AlignRight
                Layout.bottomMargin: 8
                onFormatRequested: function(prefix, suffix) { canvasRoot.formatSelection(prefix, suffix) }
                onRichColorRequested: function(background, color) {
                    richTextEditor.tableActions.setColor(background, color)
                }
                onRichBlockRequested: function(blockType) { richTextEditor.toggleBlock(blockType) }
                onRichCalloutRequested: function(color) { richTextEditor.setCalloutColor(color) }
                onRichTableRequested: richTextEditor.tableActions.insertTable()
                onRichImageRequested: richTextEditor.openImagePicker()
                onRichImageAlignmentRequested: function(alignment) {
                    richTextEditor.setImageAlignment(alignment)
                }
                onRichImageMoveRequested: function(upward) { richTextEditor.moveImage(upward) }
                onRichImageFitRequested: richTextEditor.fitImageToWidth()
                onRichImageResetRequested: richTextEditor.resetImageSize()
                onRichImageParagraphBelowRequested: richTextEditor.insertParagraphBelowImage()
                onRichImageCopyRequested: richTextEditor.copyRichImage()
                onRichImageDownloadRequested: richTextEditor.downloadRichImage()
                onRichImageDeleteRequested: richTextEditor.requestImageDelete()
                onRichTableActionRequested: function(action) { richTextEditor.tableActions.editTable(action) }
                onRichCellBackgroundRequested: function(color, scope) {
                    richTextEditor.tableActions.setCellBackground(color, scope)
                }
                onRichDividerRequested: richTextEditor.tableActions.insertDivider()
                onRichDividerActionRequested: function(action) { richTextEditor.tableActions.editDivider(action) }
                onRichDividerDropRequested: function(targetPosition, afterTarget) {
                    richTextEditor.dropDividerAt(targetPosition, afterTarget)
                }
                onRichCodeLanguageRequested: function(language) {
                    richTextEditor.setCodeBlockLanguage(language)
                }
                onRichCodeMoveRequested: function(upward) { richTextEditor.moveCodeBlock(upward) }
                onRichCodeDropRequested: function(targetPosition, afterTarget) {
                    richTextEditor.dropCodeBlockAt(targetPosition, afterTarget)
                }
                onRichCodeCopyRequested: richTextEditor.copyCodeBlock()
                onRichCodeParagraphBelowRequested: richTextEditor.insertParagraphBelowCodeBlock()
                onRichCodeDeleteConfirmed: richTextEditor.deleteCodeBlock()
                onRichMarkRequested: function(mark) { canvasRoot.toggleRichMark(mark) }
                onLinkRequested: {
                    if (canvasRoot.isRichMode) richTextEditor.openLinkDialog()
                    else linkInsertion.openFor(noteEditorArea.selectedText,
                                               noteEditorArea.selectionStart,
                                               noteEditorArea.selectionEnd)
                }
            }

            NotesRichTextEditor {
                id: richTextEditor
                visible: !canvasRoot.isPreviewMode && canvasRoot.isRichMode
                Layout.fillWidth: true
                Layout.preferredHeight: Math.max(300, richTextEditor.editor.contentHeight + 40)
                sourceHtml: canvasRoot.activeContent
                pageList: canvasRoot.allPages
                controller: canvasRoot.controller
                parentPageId: canvasRoot.activePageId
                active: visible
                onContentModified: function(html) { canvasRoot.richContentModified(html) }
                onPagePreviewRequested: function(pageId) { canvasRoot.pageReferencePreviewRequested(pageId) }
                onExternalLinkRequested: function(link) { canvasRoot.openExternalLink(link) }
                onPageHierarchyChanged: canvasRoot.pageHierarchyChanged()
                onValidationChanged: function(invalid, message) {
                    canvasRoot.richValidationChanged(invalid)
                    if (invalid) canvasRoot.pageActionFailed(message)
                }
            }

            Rectangle {
                visible: !canvasRoot.isPreviewMode && !canvasRoot.isRichMode
                Layout.fillWidth: true
                implicitHeight: Math.max(300, noteEditorArea.implicitHeight + 40)
                color: "transparent"
                TextArea {
                    id: noteEditorArea
                    objectName: "notesSourceEditor"
                    anchors.fill: parent
                    text: canvasRoot.activeContent
                    color: "#fffffe"
                    font.pixelSize: 15
                    font.family: "Inter, -apple-system, sans-serif"
                    wrapMode: Text.Wrap
                    selectByMouse: true
                    background: null
                    onTextChanged: {
                        canvasRoot.plainTextContent = canvasRoot.plainTextFromContent(text)
                        if (text !== canvasRoot.activeContent) canvasRoot.contentModified(text)
                    }
                }

                NotesEditorContextMenu {
                    anchors.fill: noteEditorArea
                    editor: noteEditorArea
                    onFormatRequested: function(prefix, suffix) { canvasRoot.insertFormatting(prefix, suffix) }
                    onLinkRequested: function(selectedHtml, selectionStart, selectionEnd) {
                        linkInsertion.openFor(selectedHtml, selectionStart, selectionEnd)
                    }
                }

                NotesLinkInsertion {
                    id: linkInsertion
                    anchors.fill: noteEditorArea
                    editor: noteEditorArea
                }
            }

            Rectangle {
                visible: canvasRoot.isPreviewMode
                Layout.fillWidth: true
                implicitHeight: Math.max(300, markdownDisplayArea.implicitHeight + 60)
                color: "transparent"
                Text {
                    id: markdownDisplayArea
                    anchors.fill: parent
                    text: noteEditorArea.text || canvasRoot.activeContent || ""
                    textFormat: canvasRoot.isHtmlDocument(noteEditorArea.text || canvasRoot.activeContent) ? Text.RichText : Text.MarkdownText
                    color: "#fffffe"
                    font.pixelSize: 15
                    font.family: "Inter, -apple-system, sans-serif"
                    wrapMode: Text.Wrap
                    lineHeight: 1.45
                    onLinkActivated: function(link) { canvasRoot.openExternalLink(link) }
                }
            }

            Item { Layout.preferredHeight: 48 }
        }
    }

    NotesMovePageDialog {
        id: movePageDialog
        objectName: "notesMovePageDialog"
        pages: canvasRoot.allPages
        hierarchyActions: canvasRoot.hierarchyActions
    }

}
