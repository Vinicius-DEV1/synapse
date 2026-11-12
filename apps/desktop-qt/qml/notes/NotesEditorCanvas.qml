import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesInlineFormatting.js" as NotesInlineFormatting
import "NotesRichLinkPreviewActions.js" as NotesLinkPreviewActions

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
    property var textOperations: notesTextOperations
    property string activePageId: ""
    property string pageActionStatus: ""
    property string plainTextContent: ""
    property bool isDirty: false
    property bool saveFailed: false
    property bool isPreviewMode: false
    property bool isRichMode: false
    property string copiedLinkUrl: ""
    onActivePageIdChanged: copiedLinkUrl = ""
    readonly property bool isEmojiPickerOpen: pageHeader.isEmojiPickerOpen
    readonly property bool isDialogOpen: pageCover.isDialogOpen || movePageDialog.visible ||
                                         sourceEditorSurface.isDialogOpen || previewSurface.isDialogOpen
    readonly property bool contentEditorFocused: isRichMode ? richTextEditor.editor.activeFocus : sourceEditorSurface.editor.activeFocus
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
        sourceEditorSurface.setText(txt)
        plainTextContent = sourceEditorSurface.plainTextFromSource(txt)
    }

    function setTitleText(txt) {
        pageHeader.setTitleText(txt)
    }

    function setDescriptionText(txt) {
        pageHeader.setDescriptionText(txt)
    }

    function openMovePageDialog(pageId) { movePageDialog.openForPage(pageId) }

    function replaceSourceRange(start, end, replacement) {
        return textOperations && textOperations.replace(
                    sourceEditorSurface.editor.textDocument, start, end, replacement)
    }

    function openExternalLink(link) {
        var action = NotesLinkPreviewActions.activate(
                    link, sourceEditorSurface.editor.text || activeContent || "",
                    controller, previewSurface)
        if (action.handled) {
            if (!action.success) {
                pageActionFailed(qsTr("Could not complete this link action."))
                return
            }
            if (action.type === "copy") copiedLinkUrl = action.copiedUrl
            else if (action.type === "toggle-notes") {
                if (!previewSurface.replaceTextRange(action.start, action.end, action.replacement))
                    pageActionFailed(qsTr("Could not update link note visibility."))
            }
            else if (action.type === "edit-notes") {
                previewSurface.openLinkNotes(action.url, action.start, action.notes)
            }
            else if (action.type === "color") {
                previewSurface.openLinkColor(action.url, action.start, action.color)
            }
            else if (action.type === "convert") {
                if (!previewSurface.replaceTextRange(action.start, action.end, action.replacement)) {
                    pageActionFailed(qsTr("Could not convert this preview to a link."))
                }
            }
            else contentModified(action.content)
            return
        }
        if (/^(https?:\/\/|mailto:)/i.test(link || "")) Qt.openUrlExternally(link)
    }

    function insertFormatting(prefix, suffix) {
        var start = sourceEditorSurface.editor.selectionStart
        var end = sourceEditorSurface.editor.selectionEnd
        var oldText = sourceEditorSurface.editor.text
        if (prefix === "<strong>" || prefix === "<em>" || prefix === "<u>" || prefix === "<s>" || prefix === "<code>") {
            var result = NotesInlineFormatting.toggle(oldText, start, end, prefix, suffix)
            if (!replaceSourceRange(result.editStart, result.editEnd, result.replacement)) {
                console.error("[Notes] Could not apply inline formatting to the selected source range")
                return
            }
            sourceEditorSurface.editor.select(result.start, result.end)
            sourceEditorSurface.editor.forceActiveFocus()
            return
        }
        var selected = oldText.substring(start, end)
        var replacement = prefix + selected + suffix
        if (!replaceSourceRange(start, end, replacement)) {
            console.error("[Notes] Could not apply formatting to the selected source range")
            return
        }
        sourceEditorSurface.editor.cursorPosition = start + (selected.length === 0 ? prefix.length : String(replacement).length)
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
        if (sourceEditorSurface.editor.activeFocus) insertFormatting(prefix, suffix)
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

            NotesEditorPageHeader {
                id: pageHeader
                Layout.fillWidth: true
                activeTitle: canvasRoot.activeTitle
                activeDescription: canvasRoot.activeDescription
                activeIcon: canvasRoot.activeIcon
                activeDate: canvasRoot.activeDate
                activePageId: canvasRoot.activePageId
                actionStatus: canvasRoot.pageActionStatus
                breadcrumbs: canvasRoot.activeBreadcrumbs
                childPages: canvasRoot.childPages
                pages: canvasRoot.allPages
                hierarchyActions: canvasRoot.hierarchyActions
                isDirty: canvasRoot.isDirty
                saveFailed: canvasRoot.saveFailed
                isPreviewMode: canvasRoot.isPreviewMode
                isRichMode: canvasRoot.isRichMode
                canUseRichMode: canvasRoot.canUseRichMode
                wordCount: canvasRoot.plainTextContent.trim().length > 0
                           ? canvasRoot.plainTextContent.trim().split(/\s+/).length : 0
                characterCount: canvasRoot.plainTextContent.length
                onPageSelected: function(pageId) { canvasRoot.pageNavigationRequested(pageId) }
                onCreateSubPageRequested: canvasRoot.createSubPageRequested()
                onTitleModified: function(title) { canvasRoot.titleModified(title) }
                onDescriptionModified: function(description) { canvasRoot.descriptionModified(description) }
                onIconModified: function(icon) { canvasRoot.iconModified(icon) }
                onSaveRequested: canvasRoot.saveRequested()
                onDeleteRequested: canvasRoot.deleteRequested()
                onHistoryRequested: canvasRoot.historyRequested()
                onHelpRequested: canvasRoot.helpRequested()
                onRichModeRequested: function(enabled) { canvasRoot.richModeRequested(enabled) }
                onMoveRequested: function(pageId) { movePageDialog.openForPage(pageId) }
                onPreviewToggled: function(preview) { canvasRoot.previewToggled(preview) }
            }

            NotesEditorFormattingToolbar {
                isPreviewMode: canvasRoot.isPreviewMode
                isRichMode: canvasRoot.isRichMode
                richEditor: richTextEditor
                sourceEditor: sourceEditorSurface.editor
                linkInsertionDialog: sourceEditorSurface.linkInsertionDialog
                onFormatRequested: function(prefix, suffix) { canvasRoot.formatSelection(prefix, suffix) }
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

            NotesSourceEditorSurface {
                id: sourceEditorSurface
                visible: !canvasRoot.isPreviewMode && !canvasRoot.isRichMode
                sourceHtml: canvasRoot.activeContent
                Layout.fillWidth: true
                onContentModified: function(content) { canvasRoot.contentModified(content) }
                onPlainTextModified: function(text) { canvasRoot.plainTextContent = text }
                onFormatRequested: function(prefix, suffix) { canvasRoot.formatSelection(prefix, suffix) }
            }

            NotesPreviewSurface {
                id: previewSurface
                visible: canvasRoot.isPreviewMode
                sourceHtml: canvasRoot.activeContent || sourceEditorSurface.editor.text || ""
                controller: canvasRoot.controller
                sourceEditor: sourceEditorSurface.editor
                textOperations: canvasRoot.textOperations
                copiedLinkUrl: canvasRoot.copiedLinkUrl
                Layout.fillWidth: true
                onLinkActivated: function(link) { canvasRoot.openExternalLink(link) }
                onActionFailed: function(message) { canvasRoot.pageActionFailed(message) }
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
