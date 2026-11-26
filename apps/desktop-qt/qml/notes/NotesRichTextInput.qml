import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesSlashCommandArguments.js" as SlashArgs
import "RichTextMarkdownRules.js" as MdRules
import "../ui"

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
    property string lastSlashQuery: ""
    property real slashAnchorX: 0
    property real slashAnchorY: 0
    property string detectedPasteUrl: ""
    readonly property alias pageReferenceMenu: pageReferenceFlow.menu
    readonly property alias editor: richEditor

    signal pagePreviewRequested(string pageId)
    signal externalLinkRequested(string link)
    signal widgetSlashCommandRequested(string commandId)
    signal askAiRequested(string selectedText)
    signal convertUrlToCardRequested(string url)
    signal navigatePrevRequested()
    signal navigateNextRequested()
    signal mergePrevRequested()

    Timer {
        id: urlDetectTimer
        interval: 8000
        onTriggered: inputRoot.detectedPasteUrl = ""
    }

    function detectPastedStandaloneUrl(prevText, nextText) {
        if (!nextText || nextText.length - prevText.length < 10) return
        var cursor = richEditor.cursorPosition
        var lineStart = nextText.lastIndexOf("\n", Math.max(0, cursor - 1)) + 1
        var lineEnd = nextText.indexOf("\n", cursor)
        if (lineEnd < 0) lineEnd = nextText.length
        var lineText = nextText.substring(lineStart, lineEnd).trim()
        if (/^https?:\/\/[^\s<>"']+$/.test(lineText)) {
            detectedPasteUrl = lineText
            urlDetectTimer.restart()
        }
    }

    function removeDetectedUrlLine(url) {
        if (!editorRoot || !editorRoot.textOperations || !richEditor.textDocument) return
        var plain = editorRoot.textOperations.richPlainText(richEditor.textDocument)
        var pos = plain.indexOf(url)
        if (pos >= 0) {
            editorRoot.textOperations.replace(richEditor.textDocument, pos, pos + url.length, "")
            editorRoot.commitEditorText()
        }
        detectedPasteUrl = ""
    }

    function pageReferenceAtAccessibleSelection() {
        if (!editorRoot || !editorRoot.textOperations ||
                typeof editorRoot.textOperations.richPageReferenceAt !== "function" ||
                !editor.textDocument) return null
        var start = Number(editor.selectionStart)
        var end = Number(editor.selectionEnd)
        var reference = editorRoot.textOperations.richPageReferenceAt(
                    editor.textDocument, start, end, false)
        if (reference && Number(reference.end) > Number(reference.start)) return reference
        if (start !== end) return null
        reference = editorRoot.textOperations.richPageReferenceAt(
                    editor.textDocument, start, end, true)
        return reference && Number(reference.end) > Number(reference.start) ? reference : null
    }

    readonly property string editorAccessibleDescription: {
        var spoilerDescription = inputRoot.spoilerRevealControl.spoilerPosition < 0
            ? qsTr("Move the caret into spoiler text and press Alt+R to reveal it.")
            : inputRoot.spoilerRevealControl.revealed
                ? qsTr("The caret is inside a revealed spoiler. Press Alt+R to hide it.")
                : qsTr("The caret is inside a hidden spoiler. Press Alt+R to reveal it.")
        var pageReference = pageReferenceAtAccessibleSelection()
        if (pageReference) {
            var title = String(pageReference.title || pageReference.pageId || qsTr("Página"))
            spoilerDescription += pageReference.deleted
                ? " " + qsTr("A referência selecionada aponta para uma página excluída ou ausente: %1.").arg(title)
                : " " + qsTr("A referência selecionada aponta para: %1.").arg(title)
        }
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
            .arg(current + 1).arg(matches.length).arg(matches[current].accessibleTitle || matches[current].title)
    }

    function syncLoadedPlainText() {
        if (editorRoot && editorRoot.textOperations && typeof editorRoot.textOperations.richPlainText === "function" && richEditor.textDocument) {
            previousPlainText = editorRoot.textOperations.richPlainText(richEditor.textDocument)
        } else {
            previousPlainText = ""
        }
    }

    Component.onCompleted: syncLoadedPlainText()

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
                ? SlashArgs.extractSlashCommandArgument(slashQuery, [
                    "criar pagina", "criar-pagina", "nova pagina", "nova-pagina", "subpagina",
                    "page create", "new page", "criar", "nova"
                ])
                : SlashArgs.extractSlashCommandArgument(slashQuery, [
                    "vincular pagina", "vincular-pagina", "link pagina", "page-link",
                    "vincular", "vinculo", "pagina", "page"
                ])
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
        var widgetCommands = [
            "toggle", "blockquoteToggle", "question", "foco", "alarme", "evento",
            "habito", "documento", "agrupar", "scrap", "group", "video", "livro", "ia", "mermaid",
            "cols2", "cols3"
        ]
        if (widgetCommands.indexOf(commandId) >= 0) {
            lastSlashQuery = slashQuery
            if (editorRoot && editorRoot.textOperations && typeof editorRoot.textOperations.replace === "function") {
                editorRoot.textOperations.replace(richEditor.textDocument, commandStart, commandEnd, "")
                richEditor.cursorPosition = commandStart
            }
            closeSlashMenu()
            widgetSlashCommandRequested(commandId)
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

    readonly property bool autoHeight: editorRoot ? Boolean(editorRoot.autoHeight) : false
    implicitHeight: richEditor.implicitHeight + 8

    TextArea {
        id: richEditor
        objectName: "notesRichTextEditor"
        property bool tableFilterProjection: false
        property bool suppressProjectionTextChange: false
        x: 0
        anchors.top: parent.top
        anchors.bottom: inputRoot.autoHeight ? undefined : parent.bottom
        width: Math.max(120, inputRoot.width)
        visible: inputRoot.editorRoot.active
        textFormat: TextEdit.RichText
        readOnly: tableFilterProjection
        Accessible.description: inputRoot.editorAccessibleDescription
        color: "#e6fffffe"
        selectionColor: "#4d8b5cf6"
        selectedTextColor: "#fffffe"
        font.pixelSize: 15
        font.family: "Inter, -apple-system, sans-serif"
        wrapMode: TextEdit.Wrap
        selectByMouse: true
        selectByKeyboard: true
        background: null
        function replaceTableProjection(html, isFiltered) {
            tableFilterProjection = isFiltered
            suppressProjectionTextChange = true
            text = html
            Qt.callLater(function() {
                suppressProjectionTextChange = false
                inputRoot.syncLoadedPlainText()
            })
        }
        Keys.priority: Keys.BeforeItem
        Keys.onPressed: function(event) {
            if (richEditor.tableFilterProjection) {
                event.accepted = true
                return
            }
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
            if (commandModifier && (event.modifiers & Qt.ShiftModifier) !== 0 && event.key === Qt.Key_V) {
                inputRoot.detectedPasteUrl = ""
                return
            }
            if (event.key === Qt.Key_Space && !inputRoot.slashMenuOpen && !inputRoot.pageReferenceMenuOpen &&
                    richEditor.selectionStart === richEditor.selectionEnd &&
                    inputRoot.editorRoot && inputRoot.editorRoot.textOperations) {
                var plainNow = inputRoot.editorRoot.textOperations.richPlainText(richEditor.textDocument)
                var lineInfo = MdRules.currentLineBeforeCursor(plainNow, richEditor.cursorPosition)
                var rule = MdRules.matchBlockInputRule(lineInfo.text)
                if (rule) {
                    inputRoot.editorRoot.textOperations.replace(richEditor.textDocument, lineInfo.start, richEditor.cursorPosition, "")
                    richEditor.cursorPosition = lineInfo.start
                    if (rule.type === "hr") {
                        inputRoot.richCommands.insertHorizontalRule()
                    } else if (rule.type === "blockquote") {
                        inputRoot.widgetSlashCommandRequested("blockquote")
                    } else if (rule.type === "codeBlock") {
                        inputRoot.widgetSlashCommandRequested("codeBlock")
                    } else if (rule.type === "taskList") {
                        inputRoot.richCommands.toggleTaskList()
                    } else if (rule.type === "orderedList") {
                        inputRoot.richCommands.toggleOrderedList()
                    }
                    event.accepted = true
                    return
                }
            }
            if (event.key === Qt.Key_Up && !inputRoot.slashMenuOpen && !inputRoot.pageReferenceMenuOpen &&
                    richEditor.cursorPosition === 0 && richEditor.selectionStart === richEditor.selectionEnd) {
                inputRoot.navigatePrevRequested()
                event.accepted = true
                return
            }
            if (event.key === Qt.Key_Down && !inputRoot.slashMenuOpen && !inputRoot.pageReferenceMenuOpen &&
                    richEditor.cursorPosition >= richEditor.length && richEditor.selectionStart === richEditor.selectionEnd) {
                inputRoot.navigateNextRequested()
                event.accepted = true
                return
            }
            if (event.key === Qt.Key_Backspace && !inputRoot.slashMenuOpen && !inputRoot.pageReferenceMenuOpen &&
                    richEditor.cursorPosition === 0 && richEditor.selectionStart === richEditor.selectionEnd) {
                inputRoot.mergePrevRequested()
                event.accepted = true
                return
            }
            if (commandModifier && (event.modifiers & Qt.ShiftModifier) !== 0 && event.key === Qt.Key_S) {
                inputRoot.richCommands.toggleMark("spoiler")
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
                if (referenceActions.activateAtPosition(position)) return
                inputRoot.taskListControls.toggleItem(position, false)
            }
            onDoubleTapped: function(point) {
                var position = richEditor.positionAt(point.position.x, point.position.y)
                inputRoot.editorRoot.setSpoilerVisibility(position, "hide")
            }
        }
        onLinkActivated: function(link) { referenceActions.activateLink(link) }
        onTextChanged: {
            if (!inputRoot.editorRoot || !inputRoot.editorRoot.textOperations ||
                typeof inputRoot.editorRoot.textOperations.richPlainText !== "function" ||
                !richEditor.textDocument) return
            var currentPlainText = inputRoot.editorRoot.textOperations.richPlainText(richEditor.textDocument)
            if (richEditor.suppressProjectionTextChange) {
                inputRoot.previousPlainText = currentPlainText
                inputRoot.closeSlashMenu()
                return
            }
            if (inputRoot.editorRoot.isLoading || !inputRoot.editorRoot.canEditSource) {
                inputRoot.previousPlainText = currentPlainText
                inputRoot.closeSlashMenu()
                return
            }
            var prev = inputRoot.previousPlainText
            inputRoot.previousPlainText = currentPlainText
            if (currentPlainText !== prev) {
                inputRoot.editorRoot.textOperations.applyRichPendingMarks(
                    richEditor.textDocument, prev, currentPlainText, richEditor.cursorPosition)
                inputRoot.detectPastedStandaloneUrl(prev, currentPlainText)
            } else if (!inputRoot.editorRoot.hasEditedSinceLoad &&
                       typeof inputRoot.editorRoot.textOperations.isRichDocumentModified === "function" &&
                       !inputRoot.editorRoot.textOperations.isRichDocumentModified(richEditor.textDocument)) {
                // Ignore deferred TextEdit componentComplete / syntax-highlighter layout textChanged signals when nothing changed.
                return
            }
            inputRoot.updateSlashMenu(currentPlainText)
            inputRoot.editorRoot.hasEditedSinceLoad = true
            inputRoot.editorRoot.hasPendingChanges = true
            inputRoot.commitTimer.restart()
            inputRoot.spoilerRevealControl.refresh()
        }
    }

    MouseArea {
        anchors.fill: richEditor
        visible: richEditor.tableFilterProjection
        z: 3
        acceptedButtons: Qt.AllButtons
        hoverEnabled: true
    }

    NotesRichImageDropArea {
        anchors.fill: richEditor
        editorRoot: inputRoot.editorRoot
        textEditor: richEditor
        active: inputRoot.editorRoot.active && !inputRoot.editorRoot.hasInvalidContent &&
                !inputRoot.editorRoot.hasVisualTableFilter
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
        onContentModified: inputRoot.previousPlainText =
            inputRoot.editorRoot.textOperations.richPlainText(richEditor.textDocument)
    }

    NotesRichPageReferenceFlow {
        id: pageReferenceFlow
        editorRoot: inputRoot.editorRoot
        textEditor: richEditor
        commitTimer: inputRoot.commitTimer
        onReferenceInserted: inputRoot.previousPlainText =
            inputRoot.editorRoot.textOperations.richPlainText(richEditor.textDocument)
    }

    NotesSelectionBubbleToolbar {
        richEditor: richEditor
        editorRoot: inputRoot.editorRoot
        richCommands: inputRoot.richCommands
        pageReferenceFlow: pageReferenceFlow
        slashMenuOpen: inputRoot.slashMenuOpen
        pageReferenceMenuOpen: inputRoot.pageReferenceMenuOpen
        detectedPasteUrl: inputRoot.detectedPasteUrl
        onAskAiRequested: function(txt) { inputRoot.askAiRequested(txt) }
        onExternalLinkRequested: function(lnk) { inputRoot.externalLinkRequested(lnk) }
        onDismissPasteUrlRequested: inputRoot.detectedPasteUrl = ""
        onConvertUrlToCardRequested: function(url) {
            inputRoot.removeDetectedUrlLine(url)
            inputRoot.convertUrlToCardRequested(url)
        }
    }

    Connections {
        target: richEditor
        function onActiveFocusChanged() {
            if (!richEditor.activeFocus) inputRoot.closeSlashMenu()
        }
    }
}
