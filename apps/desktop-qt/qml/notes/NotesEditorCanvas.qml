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
    property bool isBlockMode: false
    property string copiedLinkUrl: ""
    onActivePageIdChanged: copiedLinkUrl = ""

    readonly property bool isEmojiPickerOpen: pageHeader.isEmojiPickerOpen
    readonly property bool isDialogOpen: pageCover.isDialogOpen || movePageDialog.visible ||
                                         sourceEditorSurface.isDialogOpen || previewSurface.isDialogOpen
    readonly property bool contentEditorFocused: (isRichMode && !isBlockMode && richTextEditor.editor.activeFocus) ||
                                                 (isBlockMode && blockListEditor.hasActiveRichFocus) ||
                                                 sourceEditorSurface.editor.activeFocus
    readonly property bool canUseRichMode: richTextEditor.canEditSource || isBlockMode
    readonly property bool richContentInvalid: !isBlockMode && richTextEditor.hasInvalidContent

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
    signal externalLinkRequested(string link)
    signal shareRequested()
    signal widgetSlashCommandRequested(string commandId, int blockIndex)
    signal convertUrlToCardRequested(string url)
    signal askAiRequested(string selection, string blockHtml)
    signal playQuestionRequested(string batteryId, string questionId, string title)
    signal openInQuestionsRequested(string batteryId)
    signal habitStatsRequested(string habitId)
    signal openMediaRequested(string mediaType, string mediaId, string title)
    signal openInNewTabRequested(string pageId)
    signal subPageIconChanged(string pageId, string emoji)
    signal createSubPageWithContentRequested(string title, string html)

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

    function reloadRichEditor() {
        if (isBlockMode) {
            blockListEditor.reloadBlocks()
            return true
        }
        return !isRichMode || richTextEditor.reloadSource()
    }

    function setTitleText(txt) { pageHeader.setTitleText(txt) }
    function setDescriptionText(txt) { pageHeader.setDescriptionText(txt) }
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
            if (!action.success) { pageActionFailed(qsTr("Could not complete this link action.")); return }
            if (action.type === "copy") copiedLinkUrl = action.copiedUrl
            else if (action.type === "open-confirm") previewSurface.openLinkConfirm(action.url, action.title)
            else if (action.type === "menu") previewSurface.openLinkOptionsMenu(action.url, action.start, action.title, action.color, action.notes, action.showNotes)
            else if (action.type === "info") previewSurface.openLinkInfo(action.url, action.start, action.title)
            else if (action.type === "toggle-notes") {
                if (!previewSurface.replaceTextRange(action.start, action.end, action.replacement))
                    pageActionFailed(qsTr("Could not update link note visibility."))
            } else if (action.type === "edit-notes") previewSurface.openLinkNotes(action.url, action.start, action.notes)
            else if (action.type === "color") previewSurface.openLinkColor(action.url, action.start, action.color)
            else if (action.type === "convert") {
                if (!previewSurface.replaceTextRange(action.start, action.end, action.replacement))
                    pageActionFailed(qsTr("Could not convert this preview to a link."))
            } else if (action.type === "delete") previewSurface.openLinkDeleteConfirm(action.url, action.start)
            else contentModified(action.content)
            return
        }
        if (link.indexOf("synapse-youtube://") === 0 || link.indexOf("synapse-mermaid://") === 0) {
            canvasRoot.externalLinkRequested(link)
            return
        }
        if (link.indexOf("synapse-media://open?") === 0) {
            var typeMatch = link.match(/type=([^&]+)/)
            var idMatch = link.match(/id=([^&]+)/)
            var mType = typeMatch ? decodeURIComponent(typeMatch[1]) : "video"
            var mId = idMatch ? decodeURIComponent(idMatch[1]) : ""
            if (mType === "video" && controller && typeof controller.openVideoInFolder === "function") {
                controller.openVideoInFolder(mId)
            }
            return
        }
        if (link.indexOf("synapse-page:") === 0) {
            var pageMatch = link.match(/^synapse-page:\/([^?]+)(?:\?.*)?$/)
            if (pageMatch && pageMatch[1]) {
                pageReferencePreviewRequested(decodeURIComponent(pageMatch[1]))
                return
            }
        }
        if (/^https?:\/\//i.test(link || "")) { previewSurface.openLinkConfirm(link, ""); return }
        if (/^mailto:/i.test(link || "")) Qt.openUrlExternally(link)
    }

    function insertFormatting(prefix, suffix) {
        var start = sourceEditorSurface.editor.selectionStart
        var end = sourceEditorSurface.editor.selectionEnd
        var oldText = sourceEditorSurface.editor.text
        if (prefix === "<strong>" || prefix === "<em>" || prefix === "<u>" || prefix === "<s>" || prefix === "<code>") {
            var result = NotesInlineFormatting.toggle(oldText, start, end, prefix, suffix)
            if (!replaceSourceRange(result.editStart, result.editEnd, result.replacement)) return
            sourceEditorSurface.editor.select(result.start, result.end)
            sourceEditorSurface.editor.forceActiveFocus()
            return
        }
        var selected = oldText.substring(start, end)
        var replacement = prefix + selected + suffix
        if (!replaceSourceRange(start, end, replacement)) return
        sourceEditorSurface.editor.cursorPosition = start + (selected.length === 0 ? prefix.length : String(replacement).length)
    }

    function formatSelection(prefix, suffix) {
        if (isPreviewMode) return
        if (isRichMode || isBlockMode) {
            if (prefix === "<strong>") toggleRichMark("bold")
            else if (prefix === "<em>") toggleRichMark("italic")
            else if (prefix === "<u>") toggleRichMark("underline")
            else if (prefix === "<s>") toggleRichMark("strike")
            else if (prefix === "<code>") toggleRichMark("code")
            else if (prefix === "<spoiler>") toggleRichMark("spoiler")
            return
        }
        if (sourceEditorSurface.editor.activeFocus) insertFormatting(prefix, suffix)
    }

    function toggleRichMark(mark) {
        if (isPreviewMode) return false
        if (isBlockMode) return blockListEditor.toggleActiveMark(mark)
        if (isRichMode) return richTextEditor.toggleMark(mark)
        return false
    }

    function flushRichEditor() {
        if (isBlockMode) return blockListEditor.flushActiveRichSlices()
        return !isRichMode || richTextEditor.commitEditorText()
    }

    function insertWidgetAtBlock(blockIdx, widgetHtml) {
        if (isBlockMode) {
            blockListEditor.insertWidgetHtmlAfter(blockIdx, widgetHtml)
        } else {
            flushRichEditor()
            richContentModified((activeContent || "") + widgetHtml)
        }
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
                isRichMode: canvasRoot.isRichMode || canvasRoot.isBlockMode
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
                onShareRequested: canvasRoot.shareRequested()
                onRichModeRequested: function(enabled) { canvasRoot.richModeRequested(enabled) }
                onMoveRequested: function(pageId) { movePageDialog.openForPage(pageId) }
                onPreviewToggled: function(preview) { canvasRoot.previewToggled(preview) }
                onOpenInNewTabRequested: function(pid) { canvasRoot.openInNewTabRequested(pid) }
                onSubPageIconChanged: function(pid, emoji) { canvasRoot.subPageIconChanged(pid, emoji) }
            }

            NotesEditorStatusBanner {
                actionStatus: canvasRoot.pageActionStatus
                saveFailed: canvasRoot.saveFailed
                onHistoryRequested: canvasRoot.historyRequested()
                onDismissed: canvasRoot.pageActionStatus = ""
            }

            NotesRichTextEditor {
                id: richTextEditor
                visible: !canvasRoot.isPreviewMode && canvasRoot.isRichMode && !canvasRoot.isBlockMode
                Layout.fillWidth: true
                Layout.preferredHeight: Math.max(300, richTextEditor.editor.contentHeight + 40)
                sourceHtml: canvasRoot.activeContent
                pageList: canvasRoot.allPages
                controller: canvasRoot.controller
                parentPageId: canvasRoot.activePageId
                textOperations: canvasRoot.textOperations
                active: visible
                onContentModified: function(html) { canvasRoot.richContentModified(html) }
                onPagePreviewRequested: function(pageId) { canvasRoot.pageReferencePreviewRequested(pageId) }
                onExternalLinkRequested: function(link) { canvasRoot.openExternalLink(link) }
                onWidgetSlashCommandRequested: function(cmd) { canvasRoot.widgetSlashCommandRequested(cmd, 0) }
                onConvertUrlToCardRequested: function(url) { canvasRoot.convertUrlToCardRequested(url) }
                onAskAiRequested: function(sel) { canvasRoot.askAiRequested(sel, canvasRoot.activeContent) }
                onPageHierarchyChanged: canvasRoot.pageHierarchyChanged()
                onValidationChanged: function(invalid, message) {
                    canvasRoot.richValidationChanged(invalid)
                    if (invalid) canvasRoot.pageActionFailed(message)
                }
            }

            NotesBlockListEditor {
                id: blockListEditor
                visible: !canvasRoot.isPreviewMode && canvasRoot.isBlockMode
                active: visible
                sourceHtml: canvasRoot.activeContent
                pageId: canvasRoot.activePageId
                pageTitle: canvasRoot.activeTitle
                pageList: canvasRoot.allPages
                controller: canvasRoot.controller
                textOperations: canvasRoot.textOperations
                onHtmlChanged: function(serializedHtml) { canvasRoot.contentModified(serializedHtml) }
                onPagePreviewRequested: function(pid) { canvasRoot.pageReferencePreviewRequested(pid) }
                onPageOpenRequested: function(pid) { canvasRoot.pageNavigationRequested(pid) }
                onExternalLinkRequested: function(lnk) { canvasRoot.openExternalLink(lnk) }
                onAskAiRequested: function(sel, html) { canvasRoot.askAiRequested(sel, html) }
                onSlashWidgetRequested: function(cmd, idx) { canvasRoot.widgetSlashCommandRequested(cmd, idx) }
                onPlayQuestionRequested: function(bid, qid, title) { canvasRoot.playQuestionRequested(bid, qid, title) }
                onOpenInQuestionsRequested: function(bid) { canvasRoot.openInQuestionsRequested(bid) }
                onYoutubeWatchRequested: function(u, t) {
                    canvasRoot.externalLinkRequested("synapse-youtube://watch?url=" + encodeURIComponent(u) + "&title=" + encodeURIComponent(t))
                }
                onMermaidFullscreenRequested: function(code) {
                    canvasRoot.externalLinkRequested("synapse-mermaid://view?code=" + encodeURIComponent(code))
                }
                onCreateSubPageWithContent: function(t, h) { canvasRoot.createSubPageWithContentRequested(t, h) }
                onHabitStatsRequested: function(hid) { canvasRoot.habitStatsRequested(hid) }
                onOpenMediaRequested: function(mt, mid, t) { canvasRoot.openMediaRequested(mt, mid, t) }
            }

            NotesSourceEditorSurface {
                id: sourceEditorSurface
                visible: !canvasRoot.isPreviewMode && !canvasRoot.isRichMode && !canvasRoot.isBlockMode
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
