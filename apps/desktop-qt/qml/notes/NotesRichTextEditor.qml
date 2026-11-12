import QtQuick 2.15

Item {
    id: richRoot
    objectName: "notesRichTextEditorRoot"
    property string sourceHtml: ""
    property var pageList: []
    property var controller: null
    property string parentPageId: ""
    property var textOperations: notesTextOperations
    property bool active: false
    property bool isLoading: false
    property bool hasPendingChanges: false
    property bool hasInvalidContent: false
    property string validationMessage: ""
    property bool canEditSource: sourceHtml.length === 0
    readonly property int commitDelayMs: 180
    readonly property alias editor: richTextInput.editor
    property alias tableActions: richTableActions
    property alias calloutRevision: richCommands.calloutRevision
    property alias codeBlockRevision: richCommands.codeBlockRevision
    property alias codeBlockCopyRevision: richCommands.codeBlockCopyRevision
    property alias codeBlockCopySucceeded: richCommands.codeBlockCopySucceeded
    readonly property alias codeBlockActive: richCommands.codeBlockActive
    readonly property alias codeBlockLanguage: richCommands.codeBlockLanguage
    readonly property alias codeBlockCanMoveUp: richCommands.codeBlockCanMoveUp
    readonly property alias codeBlockCanMoveDown: richCommands.codeBlockCanMoveDown
    readonly property alias calloutAtCursor: richCommands.calloutAtCursor
    readonly property alias calloutColorAtCursor: richCommands.calloutColorAtCursor
    readonly property alias spoilerAtCursor: richCommands.spoilerAtCursor

    signal contentModified(string html)
    signal validationChanged(bool invalid, string message)
    signal pagePreviewRequested(string pageId)
    signal externalLinkRequested(string link)
    signal pageHierarchyChanged()

    function createLinkedPage(title) {
        var pageTitle = String(title || "").trim()
        if (!controller || !parentPageId || pageTitle.length === 0) return ""
        var pageId = controller.createSubPage(parentPageId, pageTitle, "📄")
        if (!pageId) return ""
        pageHierarchyChanged()
        return String(pageId)
    }

    function loadSource() {
        if (active && hasPendingChanges) return false
        canEditSource = textOperations.supportsRichSource(sourceHtml)
        if (!canEditSource) {
            hasInvalidContent = false
            validationMessage = qsTr("This note contains formatting that is not available in visual editing. Switch to source editing to preserve it.")
            return false
        }
        isLoading = true
        richCommands.clearPendingMarks()
        var editorSource = textOperations.richSourceForEditorWithPages(sourceHtml, pageList)
        if (sourceHtml.length > 0 && editorSource.length === 0) {
            canEditSource = false
            validationMessage = qsTr("This note contains task markup that cannot be preserved safely in visual editing.")
            return false
        }
        editor.text = editorSource.length > 0 ? editorSource : "<p></p>"
        if (!textOperations.prepareRichImages(editor.textDocument)) {
            isLoading = false
            canEditSource = false
            validationMessage = qsTr("This note contains an image that the native editor could not load safely. Switch to source editing to preserve it.")
            return false
        }
        if (!textOperations.prepareRichPageReferenceBoundaries(editor.textDocument)) {
            isLoading = false
            canEditSource = false
            validationMessage = qsTr("This note contains page references that the native editor could not load safely. Switch to source editing to preserve them.")
            return false
        }
        var prepared = textOperations.prepareRichHeadings(editor.textDocument, sourceHtml)
        if (!prepared) {
            isLoading = false
            canEditSource = false
            validationMessage = qsTr("This note contains formatting that the native editor could not load safely. Switch to source editing to preserve it.")
            return false
        }
        if (!textOperations.prepareRichCodeBlocks(editor.textDocument, sourceHtml)) {
            isLoading = false
            canEditSource = false
            validationMessage = qsTr("This note contains a code block that the native editor could not load safely. Switch to source editing to preserve it.")
            return false
        }
        codeBlockRevision += 1
        if (!textOperations.prepareRichCallouts(editor.textDocument, sourceHtml)) {
            isLoading = false
            canEditSource = false
            validationMessage = qsTr("This note contains a callout that the native editor could not load safely. Switch to source editing to preserve it.")
            return false
        }
        calloutRevision += 1
        if (!textOperations.prepareRichSpoilers(editor.textDocument)) {
            isLoading = false
            canEditSource = false
            validationMessage = qsTr("This note contains spoiler formatting that the native editor could not load safely. Switch to source editing to preserve it.")
            return false
        }
        taskListControls.refreshCheckboxes()
        spoilerRevealControl.refresh()
        isLoading = false
        lastPublishedHtml = sourceHtml
        hasPendingChanges = false
        hasInvalidContent = false
        validationMessage = ""
        return true
    }

    function commitEditorText() {
        commitTimer.stop()
        if (!hasPendingChanges) return !hasInvalidContent
        var result = textOperations.serializeRich(editor.textDocument)
        if (!result.ok) {
            hasInvalidContent = true
            validationMessage = qsTr("This change uses formatting that cannot be saved safely. Undo it or switch to source editing after undoing the change.")
            validationChanged(true, validationMessage)
            return false
        }
        hasPendingChanges = false
        hasInvalidContent = false
        validationMessage = ""
        if (result.html !== sourceHtml) {
            lastPublishedHtml = result.html
            sourceHtml = result.html
            contentModified(result.html)
        } else {
            lastPublishedHtml = result.html
        }
        validationChanged(false, "")
        return true
    }

    function toggleMark(mark) { return richCommands.toggleMark(mark) }
    function setSpoilerVisibility(position, action) { return richCommands.setSpoilerVisibility(position, action) }
    function toggleBlock(blockType) { return richCommands.toggleBlock(blockType) }
    function dropDividerAt(targetPosition, afterTarget) {
        return richCommands.dropDividerAt(targetPosition, afterTarget)
    }
    function setCalloutColor(color) { return richCommands.setCalloutColor(color) }
    function setCodeBlockLanguage(language) { return richCommands.setCodeBlockLanguage(language) }
    function moveCodeBlock(upward) { return richCommands.moveCodeBlock(upward) }
    function dropCodeBlockAt(targetPosition, afterTarget) {
        return richCommands.dropCodeBlockAt(targetPosition, afterTarget)
    }
    function copyCodeBlock() { return richCommands.copyCodeBlock() }
    function insertParagraphBelowCodeBlock() { return richCommands.insertParagraphBelowCodeBlock() }
    function deleteCodeBlock() { return richCommands.deleteCodeBlock() }
    function openLinkDialog() { return richCommands.openLinkDialog() }
    function setLink(url) { return richCommands.setLink(url) }
    function refreshCodeSyntaxHighlighting() { richCommands.refreshCodeSyntaxHighlighting() }
    function openImagePicker() { return richImageActions.openForPosition() }

    onSourceHtmlChanged: {
        if (!isLoading && sourceHtml !== lastPublishedHtml) eligibilityTimer.restart()
    }
    onActiveChanged: if (active && !hasPendingChanges) loadSource()
    Component.onCompleted: eligibilityTimer.restart()

    property string lastPublishedHtml: ""

    Timer {
        id: commitTimer
        interval: richRoot.commitDelayMs
        repeat: false
        onTriggered: richRoot.commitEditorText()
    }

    Timer {
        id: eligibilityTimer
        interval: richRoot.commitDelayMs
        repeat: false
        onTriggered: richRoot.loadSource()
    }

    NotesRichTextInput {
        id: richTextInput
        anchors.fill: parent
        editorRoot: richRoot
        taskListControls: taskListControls
        spoilerRevealControl: spoilerRevealControl
        richCommands: richCommands
        commitTimer: commitTimer
        onPagePreviewRequested: function(pageId) { richRoot.pagePreviewRequested(pageId) }
        onExternalLinkRequested: function(link) { richRoot.externalLinkRequested(link) }
    }

    NotesRichTextCommands {
        id: richCommands
        editorRoot: richRoot
        textEditor: richTextInput.editor
        textOperations: richRoot.textOperations
        linkDialog: richLinkDialog
        spoilerRevealControl: spoilerRevealControl
    }

    Connections {
        target: richCommands
        function onContentModified() {
            richRoot.hasPendingChanges = true
            commitTimer.restart()
        }
    }

    NotesRichTableEditorActions {
        id: richTableActions
        textEditor: richTextInput.editor
        textOperations: richRoot.textOperations
        active: richRoot.active
        invalid: richRoot.hasInvalidContent
        onContentModified: {
            richRoot.hasPendingChanges = true
            commitTimer.restart()
        }
    }

    NotesRichImageActions {
        id: richImageActions
        anchors.fill: parent
        textEditor: richTextInput.editor
        textOperations: richRoot.textOperations
        controller: richRoot.controller
        commitTimer: commitTimer
        pageId: richRoot.parentPageId
        active: richRoot.active && !richRoot.hasInvalidContent
        onContentModified: {
            richRoot.hasPendingChanges = true
            commitTimer.restart()
        }
    }

    NotesRichTaskListControls {
        id: taskListControls
        textEditor: richTextInput.editor
        textOperations: richRoot.textOperations
        active: richRoot.active
        invalid: richRoot.hasInvalidContent
        onContentModified: {
            richRoot.hasPendingChanges = true
            commitTimer.restart()
        }
    }

    NotesRichSpoilerRevealControl {
        id: spoilerRevealControl
        anchors.fill: richTextInput.editor
        textEditor: richTextInput.editor
        textOperations: richRoot.textOperations
        active: richRoot.active
        invalid: richRoot.hasInvalidContent
        z: 3
    }

    Text {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        visible: richRoot.active && richRoot.validationMessage.length > 0
        text: richRoot.validationMessage
        color: richRoot.hasInvalidContent ? "#fda4af" : "#a7a9be"
        font.pixelSize: 11
        wrapMode: Text.Wrap
        padding: 8
        z: 2
    }

    NotesLinkDialog {
        id: richLinkDialog
        objectName: "notesRichLinkDialog"
        anchors.centerIn: parent
        onLinkCreated: function(html) {
            var match = String(html).match(/^<a href="([^"]+)">[\s\S]*<\/a>$/)
            if (!match) return
            var url = match[1].replace(/&amp;/g, "&")
            richRoot.setLink(url)
        }
        onLinkRemoved: richRoot.setLink("")
    }
}
