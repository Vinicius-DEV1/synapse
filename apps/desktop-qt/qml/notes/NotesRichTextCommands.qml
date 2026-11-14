import QtQuick 2.15

Item {
    id: commands
    property var editorRoot
    property var textEditor
    property var textOperations
    property var linkDialog
    property var spoilerRevealControl
    property int calloutRevision: 0
    property int codeBlockRevision: 0
    property int codeBlockCopyRevision: 0
    property int markRevision: 0
    property bool codeBlockCopySucceeded: false
    property int linkSelectionStart: 0
    property int linkSelectionEnd: 0
    property var codeSyntaxHighlighter: null
    readonly property bool codeBlockActive: {
        var revision = codeBlockRevision
        return Boolean(textOperations && textEditor && textEditor.textDocument &&
            textOperations.isRichCodeBlock(textEditor.textDocument, textEditor.cursorPosition))
    }
    readonly property string codeBlockLanguage: {
        var revision = codeBlockRevision
        return (codeBlockActive && textOperations && textEditor && textEditor.textDocument)
            ? textOperations.richCodeBlockLanguage(textEditor.textDocument, textEditor.cursorPosition) : "auto"
    }
    readonly property bool codeBlockCanMoveUp: {
        var revision = codeBlockRevision
        return Boolean(codeBlockActive && textOperations && textEditor && textEditor.textDocument &&
            textOperations.canMoveRichCodeBlock(textEditor.textDocument, textEditor.cursorPosition, true))
    }
    readonly property bool codeBlockCanMoveDown: {
        var revision = codeBlockRevision
        return Boolean(codeBlockActive && textOperations && textEditor && textEditor.textDocument &&
            textOperations.canMoveRichCodeBlock(textEditor.textDocument, textEditor.cursorPosition, false))
    }
    readonly property bool calloutAtCursor: {
        var revision = calloutRevision
        return Boolean(textOperations && textEditor && textEditor.textDocument &&
            textOperations.isRichCalloutAt(textEditor.textDocument, textEditor.cursorPosition))
    }
    readonly property string calloutColorAtCursor: {
        var revision = calloutRevision
        return (textOperations && textEditor && textEditor.textDocument)
            ? textOperations.richCalloutColorAt(textEditor.textDocument, textEditor.cursorPosition) : ""
    }
    readonly property bool spoilerAtCursor: Boolean(textOperations && textEditor && textEditor.textDocument &&
        textOperations.isRichSpoilerAt(textEditor.textDocument, textEditor.cursorPosition))
    readonly property bool boldAtCursor: {
        var revision = markRevision
        return textOperations && typeof textOperations.isRichMarkActive === "function"
            ? textOperations.isRichMarkActive(
                textEditor.textDocument, textEditor.selectionStart, textEditor.selectionEnd, "bold")
            : false
    }
    readonly property bool italicAtCursor: {
        var revision = markRevision
        return textOperations && typeof textOperations.isRichMarkActive === "function"
            ? textOperations.isRichMarkActive(
                textEditor.textDocument, textEditor.selectionStart, textEditor.selectionEnd, "italic")
            : false
    }
    readonly property bool underlineAtCursor: {
        var revision = markRevision
        return textOperations && typeof textOperations.isRichMarkActive === "function"
            ? textOperations.isRichMarkActive(
                textEditor.textDocument, textEditor.selectionStart, textEditor.selectionEnd, "underline")
            : false
    }
    readonly property bool strikeAtCursor: {
        var revision = markRevision
        return textOperations && typeof textOperations.isRichMarkActive === "function"
            ? textOperations.isRichMarkActive(
                textEditor.textDocument, textEditor.selectionStart, textEditor.selectionEnd, "strike")
            : false
    }
    readonly property bool codeAtCursor: {
        var revision = markRevision
        return textOperations && typeof textOperations.isRichMarkActive === "function"
            ? textOperations.isRichMarkActive(
                textEditor.textDocument, textEditor.selectionStart, textEditor.selectionEnd, "code")
            : false
    }

    signal contentModified()

    Component.onCompleted: attachCodeSyntaxHighlighter()
    Component.onDestruction: {
        if (codeSyntaxHighlighter) textOperations.releaseRichCodeSyntaxHighlighter(codeSyntaxHighlighter)
        codeSyntaxHighlighter = null
    }

    function toggleMark(mark) {
        if (!editorRoot.active || editorRoot.hasInvalidContent) return false
        if (textEditor.selectionStart === textEditor.selectionEnd) {
            var appliedAtCursor = textOperations.toggleRichAtCursor(
                        textEditor.textDocument, textEditor.cursorPosition, mark)
            if (appliedAtCursor) {
                markRevision += 1
                textEditor.forceActiveFocus()
            }
            return appliedAtCursor
        }
        if (!textOperations.toggleRich(
                textEditor.textDocument, textEditor.selectionStart, textEditor.selectionEnd, mark)) return false
        markRevision += 1
        contentModified()
        textEditor.forceActiveFocus()
        return true
    }

    function clearPendingMarks() {
        return textOperations.clearRichPendingMarks(textEditor.textDocument)
    }

    function setSpoilerVisibility(position, action) {
        var updated = textOperations.setRichSpoilerVisibility(textEditor.textDocument, position, action)
        spoilerRevealControl.refresh()
        return updated
    }

    function toggleBlock(blockType) {
        if (!editorRoot.active || editorRoot.hasInvalidContent) return false
        if (!textOperations.toggleRichBlock(
                textEditor.textDocument, textEditor.selectionStart, textEditor.selectionEnd, blockType)) return false
        calloutRevision += 1
        codeBlockRevision += 1
        contentModified()
        textEditor.forceActiveFocus()
        return true
    }

    function executeSlashCommand(start, end, commandId) {
        if (!editorRoot.active || editorRoot.hasInvalidContent) return false
        var position = textOperations.executeRichSlashCommand(textEditor.textDocument, start, end, commandId)
        if (position < 0) return false
        textEditor.cursorPosition = position
        calloutRevision += 1
        codeBlockRevision += 1
        if (commandId === "code") refreshCodeSyntaxHighlighting()
        contentModified()
        textEditor.forceActiveFocus()
        return true
    }

    function dropDividerAt(targetPosition, afterTarget) {
        if (!editorRoot.active || editorRoot.hasInvalidContent || !editorRoot.tableActions.isOnDivider) return false
        var movedPosition = textOperations.moveRichDividerTo(
                    textEditor.textDocument, textEditor.cursorPosition, targetPosition, afterTarget)
        if (movedPosition < 0) return false
        textEditor.cursorPosition = movedPosition
        contentModified()
        textEditor.forceActiveFocus()
        return true
    }

    function setCalloutColor(color) {
        if (!editorRoot.active || editorRoot.hasInvalidContent || !calloutAtCursor) return false
        if (!textOperations.setRichCalloutColor(
                textEditor.textDocument, textEditor.selectionStart, textEditor.selectionEnd, color)) return false
        calloutRevision += 1
        contentModified()
        textEditor.forceActiveFocus()
        return true
    }

    function setCodeBlockLanguage(language) {
        if (!editorRoot.active || editorRoot.hasInvalidContent || !codeBlockActive) return false
        var nextLanguage = language === "auto" ? "" : language
        if (!textOperations.setRichCodeBlockLanguage(
                    textEditor.textDocument, textEditor.cursorPosition, nextLanguage)) return false
        refreshCodeSyntaxHighlighting()
        codeBlockRevision += 1
        contentModified()
        textEditor.forceActiveFocus()
        return true
    }

    function moveCodeBlock(upward) {
        if (!editorRoot.active || editorRoot.hasInvalidContent || !codeBlockActive) return false
        var position = textOperations.moveRichCodeBlock(
                    textEditor.textDocument, textEditor.cursorPosition, upward)
        if (position < 0) return false
        textEditor.cursorPosition = position
        codeBlockRevision += 1
        contentModified()
        textEditor.forceActiveFocus()
        return true
    }

    function dropCodeBlockAt(targetPosition, afterTarget) {
        if (!editorRoot.active || editorRoot.hasInvalidContent || !codeBlockActive) return false
        var position = textOperations.moveRichCodeBlockTo(
                    textEditor.textDocument, textEditor.cursorPosition, targetPosition, afterTarget)
        if (position < 0) return false
        textEditor.cursorPosition = position
        codeBlockRevision += 1
        contentModified()
        textEditor.forceActiveFocus()
        return true
    }

    function copyCodeBlock() {
        codeBlockCopySucceeded = editorRoot.active && codeBlockActive &&
            textOperations.copyRichCodeBlock(textEditor.textDocument, textEditor.cursorPosition)
        codeBlockCopyRevision += 1
        textEditor.forceActiveFocus()
        return codeBlockCopySucceeded
    }

    function insertParagraphBelowCodeBlock() {
        if (!editorRoot.active || editorRoot.hasInvalidContent || !codeBlockActive) return false
        var paragraphPosition = textOperations.insertRichParagraphBelowCodeBlock(
                    textEditor.textDocument, textEditor.cursorPosition)
        if (paragraphPosition < 0) return false
        textEditor.cursorPosition = paragraphPosition
        codeBlockRevision += 1
        contentModified()
        textEditor.forceActiveFocus()
        return true
    }

    function deleteCodeBlock() {
        if (!editorRoot.active || editorRoot.hasInvalidContent || !codeBlockActive) return false
        var paragraphPosition = textOperations.deleteRichCodeBlock(
                    textEditor.textDocument, textEditor.cursorPosition)
        if (paragraphPosition < 0) return false
        textEditor.cursorPosition = paragraphPosition
        codeBlockRevision += 1
        contentModified()
        textEditor.forceActiveFocus()
        return true
    }

    function openLinkDialog() {
        if (!editorRoot.active || editorRoot.hasInvalidContent || textEditor.selectionStart === textEditor.selectionEnd)
            return false
        linkSelectionStart = textEditor.selectionStart
        linkSelectionEnd = textEditor.selectionEnd
        var selectedText = textEditor.selectedText
        var existingUrl = textOperations.richLinkUrl(
                    textEditor.textDocument, linkSelectionStart, linkSelectionEnd)
        linkDialog.openFor(selectedText, selectedText, existingUrl)
        return true
    }

    function setLink(url) {
        if (!editorRoot.active || editorRoot.hasInvalidContent) return false
        if (!textOperations.setRichLink(
                textEditor.textDocument, linkSelectionStart, linkSelectionEnd, url)) return false
        contentModified()
        textEditor.forceActiveFocus()
        return true
    }

    function attachCodeSyntaxHighlighter() {
        if (codeSyntaxHighlighter) textOperations.releaseRichCodeSyntaxHighlighter(codeSyntaxHighlighter)
        codeSyntaxHighlighter = textOperations.createRichCodeSyntaxHighlighter(textEditor.textDocument)
    }

    function refreshCodeSyntaxHighlighting() {
        textOperations.refreshRichCodeSyntaxHighlighting(codeSyntaxHighlighter)
    }

    Connections {
        target: commands.textEditor
        function onCursorPositionChanged() { commands.markRevision += 1 }
        function onSelectionStartChanged() { commands.markRevision += 1 }
        function onSelectionEndChanged() { commands.markRevision += 1 }
    }
}
