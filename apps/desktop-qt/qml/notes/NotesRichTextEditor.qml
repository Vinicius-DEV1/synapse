import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: richRoot
    objectName: "notesRichTextEditorRoot"
    property string sourceHtml: ""
    property var textOperations: notesTextOperations
    property bool active: false
    property bool isLoading: false
    property bool hasPendingChanges: false
    property bool hasInvalidContent: false
    property string validationMessage: ""
    property int calloutRevision: 0
    property int linkSelectionStart: 0
    property int linkSelectionEnd: 0
    property bool canEditSource: sourceHtml.length === 0
    readonly property int commitDelayMs: 180
    readonly property alias editor: richEditor
    property alias tableActions: richTableActions
    readonly property bool calloutAtCursor: {
        var revision = calloutRevision
        return textOperations.isRichCalloutAt(richEditor.textDocument, richEditor.cursorPosition)
    }
    readonly property string calloutColorAtCursor: {
        var revision = calloutRevision
        return textOperations.richCalloutColorAt(richEditor.textDocument, richEditor.cursorPosition)
    }
    readonly property bool spoilerAtCursor: textOperations.isRichSpoilerAt(
                                                richEditor.textDocument, richEditor.cursorPosition)

    signal contentModified(string html)
    signal validationChanged(bool invalid, string message)

    function loadSource() {
        if (active && hasPendingChanges) return false
        canEditSource = textOperations.supportsRichSource(sourceHtml)
        if (!canEditSource) {
            hasInvalidContent = false
            validationMessage = qsTr("This note contains formatting that is not available in visual editing. Switch to source editing to preserve it.")
            return false
        }
        isLoading = true
        var editorSource = textOperations.richSourceForEditor(sourceHtml)
        if (sourceHtml.length > 0 && editorSource.length === 0) {
            canEditSource = false
            validationMessage = qsTr("This note contains task markup that cannot be preserved safely in visual editing.")
            return false
        }
        richEditor.text = editorSource.length > 0 ? editorSource : "<p></p>"
        var prepared = textOperations.prepareRichHeadings(richEditor.textDocument, sourceHtml)
        if (!prepared) {
            isLoading = false
            canEditSource = false
            validationMessage = qsTr("This note contains formatting that the native editor could not load safely. Switch to source editing to preserve it.")
            return false
        }
        if (!textOperations.prepareRichCallouts(richEditor.textDocument, sourceHtml)) {
            isLoading = false
            canEditSource = false
            validationMessage = qsTr("This note contains a callout that the native editor could not load safely. Switch to source editing to preserve it.")
            return false
        }
        calloutRevision += 1
        if (!textOperations.prepareRichSpoilers(richEditor.textDocument)) {
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
        var result = textOperations.serializeRich(richEditor.textDocument)
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

    function toggleMark(mark) {
        if (!active || hasInvalidContent || richEditor.selectionStart === richEditor.selectionEnd) return false
        if (!textOperations.toggleRich(
                richEditor.textDocument, richEditor.selectionStart, richEditor.selectionEnd, mark)) return false
        hasPendingChanges = true
        commitTimer.restart()
        richEditor.forceActiveFocus()
        return true
    }

    function setSpoilerVisibility(position, action) {
        var updated = textOperations.setRichSpoilerVisibility(richEditor.textDocument, position, action)
        spoilerRevealControl.refresh()
        return updated
    }

    function toggleBlock(blockType) {
        if (!active || hasInvalidContent) return false
        if (!textOperations.toggleRichBlock(
                richEditor.textDocument, richEditor.selectionStart, richEditor.selectionEnd, blockType)) return false
        calloutRevision += 1
        hasPendingChanges = true
        commitTimer.restart()
        richEditor.forceActiveFocus()
        return true
    }

    function setCalloutColor(color) {
        if (!active || hasInvalidContent || !calloutAtCursor) return false
        if (!textOperations.setRichCalloutColor(
                richEditor.textDocument, richEditor.selectionStart, richEditor.selectionEnd, color)) return false
        calloutRevision += 1
        hasPendingChanges = true
        commitTimer.restart()
        richEditor.forceActiveFocus()
        return true
    }

    function openLinkDialog() {
        if (!active || hasInvalidContent || richEditor.selectionStart === richEditor.selectionEnd) return false
        linkSelectionStart = richEditor.selectionStart
        linkSelectionEnd = richEditor.selectionEnd
        var selectedText = richEditor.selectedText
        var existingUrl = textOperations.richLinkUrl(
                    richEditor.textDocument, linkSelectionStart, linkSelectionEnd)
        richLinkDialog.openFor(selectedText, selectedText, existingUrl)
        return true
    }

    function setLink(url) {
        if (!active || hasInvalidContent) return false
        if (!textOperations.setRichLink(
                richEditor.textDocument, linkSelectionStart, linkSelectionEnd, url)) return false
        hasPendingChanges = true
        commitTimer.restart()
        richEditor.forceActiveFocus()
        return true
    }

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

    TextArea {
        id: richEditor
        objectName: "notesRichTextEditor"
        anchors.fill: parent
        visible: richRoot.active
        textFormat: TextEdit.RichText
        Accessible.description: spoilerRevealControl.spoilerPosition < 0
            ? qsTr("Move the caret into spoiler text and press Alt+R to reveal it.")
            : spoilerRevealControl.revealed
                ? qsTr("The caret is inside a revealed spoiler. Press Alt+R to hide it.")
                : qsTr("The caret is inside a hidden spoiler. Press Alt+R to reveal it.")
        color: "#fffffe"
        font.pixelSize: 15
        font.family: "Inter, -apple-system, sans-serif"
        wrapMode: TextEdit.Wrap
        selectByMouse: true
        selectByKeyboard: true
        background: null
        Keys.priority: Keys.BeforeItem
        Keys.onPressed: function(event) {
            if (event.key === Qt.Key_R && (event.modifiers & Qt.AltModifier) !== 0 &&
                    spoilerRevealControl.spoilerPosition >= 0) {
                spoilerRevealControl.setRevealed(!spoilerRevealControl.revealed)
                event.accepted = true
                return
            }
            if (taskListControls.handleKey(event)) {
                event.accepted = true
                return
            }
        }
        TapHandler {
            acceptedButtons: Qt.LeftButton
            acceptedModifiers: Qt.AltModifier
            onTapped: function(point) {
                var position = richEditor.positionAt(point.position.x, point.position.y)
                richRoot.setSpoilerVisibility(position, "toggle")
            }
        }
        TapHandler {
            acceptedButtons: Qt.LeftButton
            acceptedModifiers: Qt.NoModifier
            onTapped: function(point) {
                var position = richEditor.positionAt(point.position.x, point.position.y)
                if (richRoot.setSpoilerVisibility(position, "reveal")) return
                taskListControls.toggleItem(position, false)
            }
            onDoubleTapped: function(point) {
                var position = richEditor.positionAt(point.position.x, point.position.y)
                richRoot.setSpoilerVisibility(position, "hide")
            }
        }
        onTextChanged: {
            if (richRoot.isLoading) return
            richRoot.hasPendingChanges = true
            commitTimer.restart()
            spoilerRevealControl.refresh()
        }
    }

    NotesRichTableEditorActions {
        id: richTableActions
        textEditor: richEditor
        textOperations: richRoot.textOperations
        active: richRoot.active
        invalid: richRoot.hasInvalidContent
        onContentModified: {
            richRoot.hasPendingChanges = true
            commitTimer.restart()
        }
    }

    NotesRichTaskListControls {
        id: taskListControls
        textEditor: richEditor
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
        anchors.fill: richEditor
        textEditor: richEditor
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
