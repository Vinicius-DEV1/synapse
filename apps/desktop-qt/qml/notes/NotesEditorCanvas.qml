import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ScrollView {
    id: canvasRoot
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
    readonly property bool isEmojiPickerOpen: iconPicker.isOpen
    readonly property bool contentEditorFocused: noteEditorArea.activeFocus

    signal saveRequested()
    signal deleteRequested()
    signal historyRequested()
    signal titleModified(string newTitle)
    signal descriptionModified(string newDescription)
    signal contentModified(string newContent)
    signal iconModified(string newIcon)
    signal previewToggled(bool preview)
    signal formatRequested(string prefix, string suffix)
    signal pageNavigationRequested(string pageId)
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
        var selected = oldText.substring(start, end)
        var replacement = prefix + selected + suffix
        noteEditorArea.text = oldText.substring(0, start) + replacement + oldText.substring(end)
        noteEditorArea.cursorPosition = start + (selected.length === 0 ? prefix.length : replacement.length)
    }

    function formatSelection(prefix, suffix) {
        if (!isPreviewMode && noteEditorArea.activeFocus) insertFormatting(prefix, suffix)
    }

    ColumnLayout {
        width: canvasRoot.width
        spacing: 0

        NotesPageCover {
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
                    Layout.preferredWidth: 210
                    isDirty: canvasRoot.isDirty
                    saveFailed: canvasRoot.saveFailed
                    isPreviewMode: canvasRoot.isPreviewMode
                    actionsVisible: pageTitleHover.hovered || noteTitleInput.activeFocus || notesEditorHeader.activeFocus
                    pageDate: canvasRoot.activeDate
                    wordCount: canvasRoot.plainTextContent.trim().length > 0 ? canvasRoot.plainTextContent.trim().split(/\s+/).length : 0
                    characterCount: canvasRoot.plainTextContent.length
                    onSaveRequested: canvasRoot.saveRequested()
                    onDeleteRequested: canvasRoot.deleteRequested()
                    onHistoryRequested: canvasRoot.historyRequested()
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
                visible: !canvasRoot.isPreviewMode && noteEditorArea.activeFocus && noteEditorArea.selectionStart !== noteEditorArea.selectionEnd
                Layout.alignment: Qt.AlignRight
                Layout.bottomMargin: 8
                onFormatRequested: function(prefix, suffix) { canvasRoot.insertFormatting(prefix, suffix) }
                onLinkRequested: linkInsertion.openFor(
                    noteEditorArea.selectedText, noteEditorArea.selectionStart, noteEditorArea.selectionEnd)
            }

            Rectangle {
                visible: !canvasRoot.isPreviewMode
                Layout.fillWidth: true
                implicitHeight: Math.max(300, noteEditorArea.implicitHeight + 40)
                color: "transparent"
                TextArea {
                    id: noteEditorArea
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

            Item { height: 48 }
        }
    }

    NotesMovePageDialog {
        id: movePageDialog
        pages: canvasRoot.allPages
        hierarchyActions: canvasRoot.hierarchyActions
    }

}
