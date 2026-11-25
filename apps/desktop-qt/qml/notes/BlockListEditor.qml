pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"
import "BlockDragDrop.js" as Helpers

// Block-by-block WYSIWYG canvas backed by core synapse-core HTML <-> Block AST parser/serializer.
ColumnLayout {
    id: blockListRoot
    Layout.fillWidth: true
    spacing: 10

    property string sourceHtml: ""
    property string pageId: ""
    property string pageTitle: ""
    property var pageList: []
    property var controller: null
    property var textOperations: notesTextOperations
    property bool active: false
    property int nestingDepth: 0
    property var blocks: []
    property bool isSyncingFromSource: false
    property string lastEmittedHtml: ""
    property string lastLoadedPageId: ""
    property var focusedRichSlice: null
    property string lastSlashQuery: ""
    property string focusedRichSliceBlockId: ""
    property int draggingBlockIndex: -1
    property int dropTargetIndex: -1
    property string dropSide: "bottom"
    readonly property bool hasActiveRichFocus: focusedRichSlice !== null && focusedRichSlice.editor && focusedRichSlice.editor.activeFocus

    signal htmlChanged(string serializedHtml)
    signal pagePreviewRequested(string pageId)
    signal pageOpenRequested(string pageId)
    signal externalLinkRequested(string link)
    signal askAiRequested(string selection, string blockHtml)
    signal slashWidgetRequested(string commandId, int blockIndex)
    signal playQuestionRequested(string batteryId, string questionId, string title)
    signal openInQuestionsRequested(string batteryId)
    signal youtubeWatchRequested(string videoUrl, string videoTitle)
    signal mermaidFullscreenRequested(string code)
    signal createSubPageWithContent(string title, string html)
    signal habitStatsRequested(string habitId)
    signal openMediaRequested(string mediaType, string mediaId, string title)

    function toggleActiveMark(mark) {
        return (focusedRichSlice && typeof focusedRichSlice.toggleMark === "function") ? focusedRichSlice.toggleMark(mark) : false
    }

    function hasPendingEdits() {
        if (focusedRichSlice && typeof focusedRichSlice.hasPendingEdits === "function" && focusedRichSlice.hasPendingEdits()) {
            return true
        }
        for (var i = 0; i < blockRepeater.count; ++i) {
            var row = blockRepeater.itemAt(i)
            if (row && row.router && typeof row.router.hasPendingEdits === "function" && row.router.hasPendingEdits()) {
                return true
            }
        }
        return false
    }

    function flushActiveRichSlices() {
        var ok = true
        if (focusedRichSlice && typeof focusedRichSlice.commitEditorText === "function") {
            ok = focusedRichSlice.commitEditorText() && ok
        }
        for (var i = 0; i < blockRepeater.count; ++i) {
            var row = blockRepeater.itemAt(i)
            if (row && row.router && typeof row.router.flushPendingEdits === "function") {
                ok = row.router.flushPendingEdits() && ok
            }
        }
        return ok
    }

    function reloadBlocks() {
        if (!controller || typeof controller.parseNoteBlocks !== "function") return
        isSyncingFromSource = true
        focusedRichSlice = null
        focusedRichSliceBlockId = ""
        lastLoadedPageId = pageId
        blocks = controller.parseNoteBlocks(sourceHtml || "") || []
        lastEmittedHtml = sourceHtml || ""
        isSyncingFromSource = false
    }

    function commitBlocks(nextBlocks) {
        if (!nextBlocks) return
        blocks = nextBlocks
        if (!controller || typeof controller.serializeNoteBlocks !== "function") return
        var serialized = controller.serializeNoteBlocks(nextBlocks)
        lastEmittedHtml = serialized
        htmlChanged(serialized)
    }

    function updateBlockAt(idx, updater) {
        if (idx < 0 || idx >= blocks.length) return
        // Update block payload in place so Repeater delegates preserve focus and cursor position while typing.
        var updated = updater(Object.assign({}, blocks[idx]))
        blocks[idx] = updated
        var row = blockRepeater.itemAt(idx)
        if (row) row.liveBlockData = updated
        if (!controller || typeof controller.serializeNoteBlocks !== "function") return
        var serialized = controller.serializeNoteBlocks(blocks)
        if (serialized === lastEmittedHtml) return
        lastEmittedHtml = serialized
        htmlChanged(serialized)
    }

    function hasMeaningfulSliceHtml(sliceHtml) {
        if (!sliceHtml) return false
        var plain = String(sliceHtml).replace(/<[^>]+>/g, "").trim()
        return plain.length > 0 || /<(?:img|hr|span\b[^>]*data-page-id)/i.test(String(sliceHtml))
    }

    function insertWidgetHtmlAfter(idx, widgetHtml, cursorPosition) {
        if (!controller || typeof controller.parseNoteBlocks !== "function") return
        var parsed = widgetHtml && widgetHtml.trim().length > 0 ? (controller.parseNoteBlocks(widgetHtml) || []) : []
        var next = blocks.slice()
        var splitPosition = typeof cursorPosition === "number" ? cursorPosition
            : (focusedRichSlice && focusedRichSliceBlockId === (next[idx] ? next[idx].id : "") &&
               focusedRichSlice.editor ? focusedRichSlice.editor.cursorPosition : -1)
        if (idx >= 0 && idx < next.length && next[idx].blockType === "richText" && splitPosition >= 0 &&
                typeof controller.splitRichHtml === "function") {
            var row = blockRepeater.itemAt(idx)
            if (row && row.router && typeof row.router.flushPendingEdits === "function" &&
                    !row.router.flushPendingEdits()) return
            next = blocks.slice()
            if (idx >= next.length || next[idx].blockType !== "richText") return
            var split = controller.splitRichHtml(next[idx].html || "", splitPosition)
            var replacement = []
            if (hasMeaningfulSliceHtml(split.before)) {
                replacement.push({ id: next[idx].id, blockType: "richText", attrs: ({}), html: split.before, innerHtml: split.before })
            }
            for (var p = 0; p < parsed.length; ++p) replacement.push(parsed[p])
            var afterHtml = hasMeaningfulSliceHtml(split.after) ? split.after : "<p><br/></p>"
            replacement.push({ id: "blk_after_" + Date.now(), blockType: "richText", attrs: ({}), html: afterHtml, innerHtml: afterHtml })
            Array.prototype.splice.apply(next, [idx, 1].concat(replacement))
            commitBlocks(next)
            return
        }
        var insertPos = idx >= 0 && idx < next.length ? idx + 1 : next.length
        var args = [insertPos, 0].concat(parsed)
        args.push({ id: "blk_" + Date.now(), blockType: "richText", attrs: ({}), html: "<p><br/></p>", innerHtml: "<p><br/></p>" })
        Array.prototype.splice.apply(next, args)
        commitBlocks(next)
    }

    function focusDropTargetAt(x, y) {
        for (var i = 0; i < blockRepeater.count; ++i) {
            var row = blockRepeater.itemAt(i)
            if (!row) continue
            var point = row.mapToItem(blockListRoot, 0, 0)
            if (y > point.y + row.height) continue
            var block = blocks[i]
            var textEditor = row.router && row.router.item ? row.router.item.editor : null
            if (block && block.blockType === "richText" && textEditor) {
                var localPoint = textEditor.mapFromItem(blockListRoot, x, y)
                var cursorPosition = textEditor.positionAt(localPoint.x, localPoint.y)
                textEditor.forceActiveFocus()
                textEditor.cursorPosition = cursorPosition
                focusedRichSlice = row.router.item
                focusedRichSliceBlockId = block.id
                return { blockId: block.id, cursorPosition: cursorPosition }
            }
            return { blockId: block ? block.id : "", cursorPosition: -1 }
        }
        var lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null
        return { blockId: lastBlock ? lastBlock.id : "", cursorPosition: -1 }
    }

    function insertWidgetHtmlAtBlock(blockId, cursorPosition, widgetHtml) {
        var targetIndex = -1
        for (var i = 0; i < blocks.length; ++i) {
            if (String(blocks[i].id || "") === blockId) {
                targetIndex = i
                break
            }
        }
        if (targetIndex < 0) {
            if (blocks.length === 0) {
                insertWidgetHtmlAfter(-1, widgetHtml)
                return true
            }
            return false
        }
        insertWidgetHtmlAfter(targetIndex, widgetHtml, cursorPosition)
        return true
    }

    function appendTrailingParagraph() {
        var next = blocks.slice()
        next.push({ id: "blk_tail_" + Date.now(), blockType: "richText", attrs: ({}), html: "<p><br/></p>", innerHtml: "<p><br/></p>" })
        commitBlocks(next)
        Qt.callLater(function() { focusRichBlockAt(blocks.length - 1, true) })
    }

    function focusRichBlockAt(idx, atEnd) {
        if (idx < 0 || idx >= blockRepeater.count) return
        var row = blockRepeater.itemAt(idx)
        if (!row) return
        for (var i = 0; i < row.children.length; ++i) {
            var ch = row.children[i]
            if (ch && ch.item && ch.item.editor) {
                ch.item.editor.forceActiveFocus()
                ch.item.editor.cursorPosition = atEnd ? ch.item.editor.length : 0
                return
            }
        }
    }

    function mergeRichWithPrev(idx) {
        if (idx <= 0 || idx >= blocks.length) return
        var prev = blocks[idx - 1]; var curr = blocks[idx]
        if (curr.blockType !== "richText") return
        if (prev.blockType === "richText") {
            var next = blocks.slice()
            var mergedHtml = (prev.html || "<p></p>") + (curr.html || "")
            next[idx - 1] = { id: prev.id, blockType: "richText", attrs: ({}), html: mergedHtml, innerHtml: mergedHtml }
            next.splice(idx, 1)
            commitBlocks(next)
            Qt.callLater(function() { focusRichBlockAt(idx - 1, true) })
        } else {
            focusRichBlockAt(idx - 1, true)
        }
    }

    function unwrapColumnGroup(idx, columnsList) {
        if (idx < 0 || idx >= blocks.length) return
        var next = blocks.slice(); var replacements = []
        for (var c = 0; c < columnsList.length; ++c) {
            var parsed = controller && typeof controller.parseNoteBlocks === "function"
                ? (controller.parseNoteBlocks(columnsList[c] || "<p></p>") || []) : []
            for (var j = 0; j < parsed.length; ++j) replacements.push(parsed[j])
        }
        if (replacements.length === 0) replacements.push({ id: "blk_uw_" + Date.now(), blockType: "richText", attrs: ({}), html: "<p><br/></p>", innerHtml: "<p><br/></p>" })
        Array.prototype.splice.apply(next, [idx, 1].concat(replacements))
        commitBlocks(next)
    }

    function handleBlockDrop() {
        var next = Helpers.applyBlockDrop(blocks, draggingBlockIndex, dropTargetIndex, dropSide, controller)
        draggingBlockIndex = -1; dropTargetIndex = -1
        if (next) commitBlocks(next)
    }

    onActiveChanged: {
        if (active && (pageId !== lastLoadedPageId || sourceHtml !== lastEmittedHtml || blocks.length === 0)) {
            reloadBlocks()
        }
    }
    onPageIdChanged: if (active && !isSyncingFromSource && pageId !== lastLoadedPageId) reloadBlocks()
    onSourceHtmlChanged: {
        if (!active || isSyncingFromSource || !controller || typeof controller.serializeNoteBlocks !== "function") return
        if (sourceHtml === lastEmittedHtml && pageId === lastLoadedPageId) return
        if (pageId !== lastLoadedPageId || sourceHtml !== controller.serializeNoteBlocks(blocks)) reloadBlocks()
    }

    Repeater {
        id: blockRepeater
        model: blockListRoot.blocks
        delegate: Item {
            id: blockRow
            required property var modelData
            required property int index
            property var liveBlockData: modelData
            readonly property alias router: sliceRouter
            Layout.fillWidth: true
            implicitHeight: Math.max(28, sliceRouter.item ? sliceRouter.item.implicitHeight : 36)

            HoverHandler { id: rowHover }

            Rectangle {
                visible: blockListRoot.draggingBlockIndex >= 0 && blockListRoot.dropTargetIndex === blockRow.index &&
                         (blockListRoot.dropSide === "top" || blockListRoot.dropSide === "bottom")
                anchors.left: parent.left; anchors.right: parent.right
                y: blockListRoot.dropSide === "top" ? -3 : parent.height + 1
                height: 3; radius: 1.5; color: "#f59e0b"; z: 20
            }
            Rectangle {
                visible: blockListRoot.draggingBlockIndex >= 0 && blockListRoot.dropTargetIndex === blockRow.index &&
                         (blockListRoot.dropSide === "left" || blockListRoot.dropSide === "right")
                anchors.top: parent.top; anchors.bottom: parent.bottom
                x: blockListRoot.dropSide === "left" ? -4 : parent.width + 1
                width: 3; radius: 1.5; color: "#8b5cf6"; z: 20
            }

            NotesBlockHandle {
                visible: blockListRoot.nestingDepth < 2
                x: blockListRoot.nestingDepth === 0 ? -30 : -22; y: 4; z: 5
                activeVisible: rowHover.hovered || handleHovered
                canMoveUp: blockRow.index > 0; canMoveDown: blockRow.index < blockListRoot.blocks.length - 1
                onMoveUpRequested: blockListRoot.commitBlocks(Helpers.moveBlockInArray(blockListRoot.blocks, blockRow.index, -1))
                onMoveDownRequested: blockListRoot.commitBlocks(Helpers.moveBlockInArray(blockListRoot.blocks, blockRow.index, 1))
                onInsertBelowRequested: blockListRoot.insertWidgetHtmlAfter(blockRow.index, "")
                onDuplicateRequested: blockListRoot.commitBlocks(Helpers.duplicateBlockInArray(blockListRoot.blocks, blockRow.index))
                onColorChangeRequested: function(c, isBg) {
                    var currentBlock = blockRow.liveBlockData || blockRow.modelData
                    var richEditor = blockRow.router && blockRow.router.item ? blockRow.router.item : null
                    if (!currentBlock || currentBlock.blockType !== "richText" || !richEditor ||
                            typeof richEditor.setBlockColor !== "function") return
                    richEditor.setBlockColor(c, isBg)
                }
                onDeleteRequested: blockListRoot.commitBlocks(Helpers.deleteBlockInArray(blockListRoot.blocks, blockRow.index))
                onDragStarted: blockListRoot.draggingBlockIndex = blockRow.index
                onDragMoved: function(gx, gy) {
                    var pt = blockListRoot.mapFromGlobal(gx, gy)
                    for (var i = 0; i < blockRepeater.count; ++i) {
                        var item = blockRepeater.itemAt(i)
                        if (!item || pt.y < item.y || pt.y > item.y + item.height) continue
                        blockListRoot.dropTargetIndex = i
                        if (pt.x < item.width * 0.18) blockListRoot.dropSide = "left"
                        else if (pt.x > item.width * 0.82) blockListRoot.dropSide = "right"
                        else blockListRoot.dropSide = (pt.y - item.y < item.height * 0.5) ? "top" : "bottom"
                        return
                    }
                }
                onDragEnded: blockListRoot.handleBlockDrop()
            }

            BlockDelegateRouter {
                id: sliceRouter
                width: parent.width; blockData: blockRow.liveBlockData; blockIndex: blockRow.index
                pageId: blockListRoot.pageId; pageTitle: blockListRoot.pageTitle; pageList: blockListRoot.pageList
                controller: blockListRoot.controller; textOperations: blockListRoot.textOperations
                active: blockListRoot.active; nestingDepth: blockListRoot.nestingDepth
                onBlockChanged: function(idx, updated) { blockListRoot.updateBlockAt(idx, function() { return updated }) }
                onDeleteRequested: function(idx) { blockListRoot.commitBlocks(Helpers.deleteBlockInArray(blockListRoot.blocks, idx)) }
                onUnwrapColumnGroupRequested: function(idx, cols) { blockListRoot.unwrapColumnGroup(idx, cols) }
                onInsertAfterRequested: function(idx, html) { blockListRoot.insertWidgetHtmlAfter(idx, html) }
                onFocusRichSliceChanged: function(slice) {
                    blockListRoot.focusedRichSlice = slice
                    blockListRoot.focusedRichSliceBlockId = String(blockRow.liveBlockData.id || blockRow.modelData.id || "")
                }
                onLastSlashQueryChanged: function(q) { blockListRoot.lastSlashQuery = q }
                onNavigatePrevRequested: function(idx) { blockListRoot.focusRichBlockAt(idx - 1, true) }
                onNavigateNextRequested: function(idx) { blockListRoot.focusRichBlockAt(idx + 1, false) }
                onMergePrevRequested: function(idx) { blockListRoot.mergeRichWithPrev(idx) }
                onPagePreviewRequested: function(pid) { blockListRoot.pagePreviewRequested(pid) }
                onPageOpenRequested: function(pid) { blockListRoot.pageOpenRequested(pid) }
                onExternalLinkRequested: function(lnk) { blockListRoot.externalLinkRequested(lnk) }
                onAskAiRequested: function(sel, bHtml) { blockListRoot.askAiRequested(sel, bHtml) }
                onSlashWidgetRequested: function(cmd, idx) { blockListRoot.slashWidgetRequested(cmd, idx) }
                onPlayQuestionRequested: function(bid, qid, t) { blockListRoot.playQuestionRequested(bid, qid, t) }
                onOpenInQuestionsRequested: function(bid) { blockListRoot.openInQuestionsRequested(bid) }
                onYoutubeWatchRequested: function(u, t) { blockListRoot.youtubeWatchRequested(u, t) }
                onMermaidFullscreenRequested: function(c) { blockListRoot.mermaidFullscreenRequested(c) }
                onCreateSubPageWithContent: function(t, h) { blockListRoot.createSubPageWithContent(t, h) }
                onHabitStatsRequested: function(hid) { blockListRoot.habitStatsRequested(hid) }
                onOpenMediaRequested: function(mt, mid, t) { blockListRoot.openMediaRequested(mt, mid, t) }
            }
        }
    }

    Item {
        visible: blockListRoot.nestingDepth === 0 && blockListRoot.blocks.length > 0 &&
                 blockListRoot.blocks[blockListRoot.blocks.length - 1].blockType !== "richText"
        Layout.fillWidth: true; Layout.preferredHeight: 56
        MouseArea {
            anchors.fill: parent; cursorShape: Qt.IBeamCursor; hoverEnabled: true
            onClicked: blockListRoot.appendTrailingParagraph()
            Text {
                anchors.verticalCenter: parent.verticalCenter; anchors.left: parent.left; anchors.leftMargin: 4
                opacity: parent.containsMouse ? 0.7 : 0
                Behavior on opacity { NumberAnimation { duration: 140 } }
                text: qsTr("Clique para escrever abaixo ou digite '/'..."); color: "#6b7280"; font.pixelSize: 13
            }
        }
    }
}
