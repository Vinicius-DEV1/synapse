import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: inputRoot
    property var editorRoot
    property var taskListControls
    property var spoilerRevealControl
    property var richCommands
    property var commitTimer
    property string previousPlainText: ""
    property bool slashMenuOpen: false
    property alias pageReferenceMenuOpen: pageReferenceFlow.open
    property int slashStart: -1
    property int pendingSlashStart: -1
    property string slashQuery: ""
    property real slashAnchorX: 0
    property real slashAnchorY: 0
    readonly property alias pageReferenceMenu: pageReferenceFlow.menu
    readonly property alias editor: richEditor
    signal pagePreviewRequested(string pageId)
    signal externalLinkRequested(string link)
    readonly property string editorAccessibleDescription: {
        var spoilerDescription = inputRoot.spoilerRevealControl.spoilerPosition < 0
            ? qsTr("Move the caret into spoiler text and press Alt+R to reveal it.")
            : inputRoot.spoilerRevealControl.revealed
                ? qsTr("The caret is inside a revealed spoiler. Press Alt+R to hide it.")
                : qsTr("The caret is inside a hidden spoiler. Press Alt+R to reveal it.")
        if (pageReferenceMenuOpen) {
            var options = pageReferenceFlow.menu.options
            if (options.length === 0)
                return spoilerDescription + " " + qsTr("Page search is open with no matches. Press Escape to close it.")
            var pageIndex = Math.max(0, Math.min(pageReferenceFlow.menu.selectedIndex, options.length - 1))
            return spoilerDescription + " " + qsTr("Page search, selected %1 of %2: %3. Use Up or Down to choose, Enter to continue, or Escape to close.")
                .arg(pageIndex + 1).arg(options.length).arg(options[pageIndex].title)
        }
        if (!slashMenuOpen) return spoilerDescription
        var matches = slashCommandMenu.filteredCommands
        if (matches.length === 0)
            return spoilerDescription + " " + qsTr("The block menu is open with no matches. Press Escape to close it.")
        var current = Math.max(0, Math.min(slashCommandMenu.selectedIndex, matches.length - 1))
        return spoilerDescription + " " + qsTr("Block menu, selected %1 of %2: %3. Use Up or Down to choose, Enter to apply, or Escape to close.")
            .arg(current + 1).arg(matches.length).arg(matches[current].title)
    }

    Component.onCompleted: previousPlainText = editorRoot.textOperations.richPlainText(richEditor.textDocument)
    function closeSlashMenu() {
        slashMenuOpen = false
        slashStart = -1
        slashQuery = ""
        slashCommandMenu.selectedIndex = 0
        slashCommandMenu.errorMessage = ""
        pendingSlashStart = -1
    }
    function updateSlashMenu(currentPlainText) {
        if (pendingSlashStart >= 0) {
            var typedSlashStart = pendingSlashStart
            pendingSlashStart = -1
            if (typedSlashStart < currentPlainText.length &&
                    currentPlainText.charAt(typedSlashStart) === "/" &&
                    richEditor.cursorPosition === typedSlashStart + 1) {
                slashStart = typedSlashStart
                slashQuery = ""
                slashCommandMenu.selectedIndex = 0
                slashAnchorX = richEditor.cursorRectangle.x
                slashAnchorY = richEditor.cursorRectangle.y + richEditor.cursorRectangle.height + 6
                slashMenuOpen = true
                return
            }
        }
        if (!slashMenuOpen) return
        var cursor = richEditor.cursorPosition
        if (cursor <= slashStart || cursor > currentPlainText.length ||
                currentPlainText.charAt(slashStart) !== "/" ||
                currentPlainText.substring(slashStart + 1, cursor).indexOf("\n") >= 0) {
            closeSlashMenu()
            return
        }
        var nextQuery = currentPlainText.substring(slashStart + 1, cursor)
        if (nextQuery !== slashQuery) {
            slashQuery = nextQuery
            slashCommandMenu.selectedIndex = 0
        }
    }
    function executeSlashCommand(commandId) {
        if (!slashMenuOpen) return false
        var commandStart = slashStart
        var commandEnd = richEditor.cursorPosition
        if (commandId === "page" || commandId === "page-create") {
            var createMode = commandId === "page-create"
            var initialQuery = createMode
                ? slashQuery.replace(/^\s*(?:page-create|page create|create page|new page|subpage|criar pagina|nova pagina|create|new|criar|nova)\b/i, "").trim()
                : slashQuery.replace(/^\s*page(?:-link)?/i, "").trim()
            var pageCommandApplied = richCommands.executeSlashCommand(commandStart, commandEnd, "page")
            if (!pageCommandApplied) {
                slashCommandMenu.errorMessage = qsTr("This page reference could not be started safely.")
                richEditor.forceActiveFocus()
                return false
            }
            closeSlashMenu()
            pageReferenceFlow.openForPosition(
                        commandStart, initialQuery, createMode, richEditor.cursorRectangle.x,
                        richEditor.cursorRectangle.y + richEditor.cursorRectangle.height + 6)
            return true
        }
        var executed = richCommands.executeSlashCommand(commandStart, commandEnd, commandId)
        if (executed) {
            closeSlashMenu()
            richEditor.forceActiveFocus()
        } else {
            slashCommandMenu.errorMessage = qsTr("This block action could not be applied safely.")
            richEditor.forceActiveFocus()
        }
        return executed
    }
    function closePageReferenceMenu() { pageReferenceFlow.close() }
    TextArea {
        id: richEditor
        objectName: "notesRichTextEditor"
        anchors.fill: parent
        visible: inputRoot.editorRoot.active
        textFormat: TextEdit.RichText
        Accessible.description: inputRoot.editorAccessibleDescription
        color: "#fffffe"
        font.pixelSize: 15
        font.family: "Inter, -apple-system, sans-serif"
        wrapMode: TextEdit.Wrap
        selectByMouse: true
        selectByKeyboard: true
        background: null
        Keys.priority: Keys.BeforeItem
        Keys.onPressed: function(event) {
            var commandModifier = (event.modifiers & (Qt.ControlModifier | Qt.MetaModifier)) !== 0
            if (inputRoot.slashMenuOpen) {
                if (event.key === Qt.Key_Down || event.key === Qt.Key_Up) {
                    slashCommandMenu.moveSelection(event.key === Qt.Key_Down ? 1 : -1)
                    event.accepted = true
                    return
                }
                if (event.key === Qt.Key_Enter || event.key === Qt.Key_Return) {
                    var filteredCommands = slashCommandMenu.filteredCommands
                    if (filteredCommands.length > 0 && slashCommandMenu.selectedIndex < filteredCommands.length)
                        inputRoot.executeSlashCommand(filteredCommands[slashCommandMenu.selectedIndex].id)
                    event.accepted = true
                    return
                }
                if (event.key === Qt.Key_Escape) {
                    inputRoot.closeSlashMenu()
                    event.accepted = true
                    return
                }
                if (event.key === Qt.Key_Left || event.key === Qt.Key_Right || event.key === Qt.Key_Space ||
                        (event.key === Qt.Key_Backspace && inputRoot.slashQuery.length === 0))
                    inputRoot.closeSlashMenu()
            }
            if (inputRoot.editorRoot.handleRichImageDeleteKey(event.key)) {
                event.accepted = true
                return
            }
            if (referenceActions.handleKey(event)) return
            if (commandModifier && event.key === Qt.Key_V &&
                    (event.modifiers & Qt.ShiftModifier) === 0 &&
                    !inputRoot.editorRoot.codeBlockActive && inputRoot.editorRoot.pasteImageFromClipboard()) {
                event.accepted = true
                return
            }
            if (event.text === "/" && !commandModifier && (event.modifiers & Qt.AltModifier) === 0) {
                if (inputRoot.slashMenuOpen) inputRoot.closeSlashMenu()
                inputRoot.pendingSlashStart = richEditor.cursorPosition
            }
            if (event.key === Qt.Key_Left || event.key === Qt.Key_Right || event.key === Qt.Key_Up ||
                    event.key === Qt.Key_Down || event.key === Qt.Key_Home || event.key === Qt.Key_End ||
                    event.key === Qt.Key_PageUp || event.key === Qt.Key_PageDown || event.key === Qt.Key_Tab ||
                    event.key === Qt.Key_Backtab || (commandModifier && event.key === Qt.Key_A)) {
                inputRoot.richCommands.clearPendingMarks()
            }
            if (commandModifier && event.key === Qt.Key_Z) {
                if ((event.modifiers & Qt.ShiftModifier) !== 0) richEditor.redo()
                else richEditor.undo()
                inputRoot.editorRoot.refreshCodeSyntaxHighlighting()
                event.accepted = true
                return
            }
            if (commandModifier && event.key === Qt.Key_Y) {
                richEditor.redo()
                inputRoot.editorRoot.refreshCodeSyntaxHighlighting()
                event.accepted = true
                return
            }
            if (event.key === Qt.Key_R && (event.modifiers & Qt.AltModifier) !== 0 &&
                    inputRoot.spoilerRevealControl.spoilerPosition >= 0) {
                inputRoot.spoilerRevealControl.setRevealed(!inputRoot.spoilerRevealControl.revealed)
                event.accepted = true
                return
            }
            if (inputRoot.taskListControls.handleKey(event)) {
                event.accepted = true
                return
            }
        }
        TapHandler {
            acceptedButtons: Qt.LeftButton
            acceptedModifiers: Qt.AltModifier
            onPressedChanged: if (pressed) {
                inputRoot.closeSlashMenu()
                if (inputRoot.pageReferenceMenuOpen) inputRoot.closePageReferenceMenu()
                inputRoot.richCommands.clearPendingMarks()
            }
            onTapped: function(point) {
                var position = richEditor.positionAt(point.position.x, point.position.y)
                inputRoot.editorRoot.setSpoilerVisibility(position, "toggle")
            }
        }
        TapHandler {
            acceptedButtons: Qt.LeftButton
            acceptedModifiers: Qt.NoModifier
            onPressedChanged: if (pressed) {
                inputRoot.closeSlashMenu()
                if (inputRoot.pageReferenceMenuOpen) inputRoot.closePageReferenceMenu()
                inputRoot.richCommands.clearPendingMarks()
            }
            onTapped: function(point) {
                var position = richEditor.positionAt(point.position.x, point.position.y)
                if (inputRoot.editorRoot.setSpoilerVisibility(position, "reveal")) return
                inputRoot.taskListControls.toggleItem(position, false)
            }
            onDoubleTapped: function(point) {
                var position = richEditor.positionAt(point.position.x, point.position.y)
                inputRoot.editorRoot.setSpoilerVisibility(position, "hide")
            }
        }
        onLinkActivated: function(link) {
            referenceActions.activateLink(link)
        }
        onTextChanged: {
            var currentPlainText = inputRoot.editorRoot.textOperations.richPlainText(richEditor.textDocument)
            if (inputRoot.editorRoot.isLoading) {
                inputRoot.previousPlainText = currentPlainText
                inputRoot.closeSlashMenu()
                return
            }
            var previousPlainText = inputRoot.previousPlainText
            inputRoot.previousPlainText = currentPlainText
            if (currentPlainText !== previousPlainText) {
                inputRoot.editorRoot.textOperations.applyRichPendingMarks(
                            richEditor.textDocument, previousPlainText, currentPlainText, richEditor.cursorPosition)
            }
            inputRoot.updateSlashMenu(currentPlainText)
            inputRoot.editorRoot.hasPendingChanges = true
            inputRoot.commitTimer.restart()
            inputRoot.spoilerRevealControl.refresh()
        }
    }

    NotesRichImageDropArea {
        anchors.fill: richEditor
        editorRoot: inputRoot.editorRoot
        textEditor: richEditor
        active: inputRoot.editorRoot.active && !inputRoot.editorRoot.hasInvalidContent
    }

    NotesRichSlashCommandMenu {
        id: slashCommandMenu
        open: inputRoot.slashMenuOpen
        query: inputRoot.slashQuery
        anchorX: inputRoot.slashAnchorX
        anchorY: inputRoot.slashAnchorY
        onCommandSelected: function(commandId) { inputRoot.executeSlashCommand(commandId) }
    }

    NotesRichPageReferenceActions {
        id: referenceActions
        anchors.fill: parent
        editorRoot: inputRoot.editorRoot
        textEditor: richEditor
        textOperations: inputRoot.editorRoot.textOperations
        commitTimer: inputRoot.commitTimer
        pageList: inputRoot.editorRoot.pageList
        onPagePreviewRequested: function(pageId) { inputRoot.pagePreviewRequested(pageId) }
        onExternalLinkRequested: function(link) { inputRoot.externalLinkRequested(link) }
    }

    NotesRichPageReferenceFlow {
        id: pageReferenceFlow
        editorRoot: inputRoot.editorRoot
        textEditor: richEditor
        commitTimer: inputRoot.commitTimer
        onReferenceInserted: inputRoot.previousPlainText =
            inputRoot.editorRoot.textOperations.richPlainText(richEditor.textDocument)
    }

    Connections {
        target: richEditor
        function onActiveFocusChanged() {
            if (!richEditor.activeFocus) inputRoot.closeSlashMenu()
        }
    }
}
