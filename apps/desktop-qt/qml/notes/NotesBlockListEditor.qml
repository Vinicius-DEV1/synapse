pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

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
    property var blocks: []
    property bool isSyncingFromSource: false

    signal htmlChanged(string serializedHtml)
    signal pagePreviewRequested(string pageId)
    signal pageOpenRequested(string pageId)
    signal externalLinkRequested(string link)
    signal askAiRequested(string selection, string blockHtml)
    signal slashWidgetRequested(string commandId, int blockIndex)
    signal playQuestionRequested(string batteryId, string questionId, string title)
    signal openInQuestionsRequested(string batteryId)
    signal youtubeWatchRequested(string videoUrl, string videoTitle)
    signal createSubPageWithContent(string title, string html)
    signal habitStatsRequested(string habitId)
    signal openMediaRequested(string mediaType, string mediaId, string title)

    function reloadBlocks() {
        if (!controller || typeof controller.parseNoteBlocks !== "function") return
        isSyncingFromSource = true
        blocks = controller.parseNoteBlocks(sourceHtml || "") || []
        isSyncingFromSource = false
    }

    function commitBlocks(nextBlocks) {
        blocks = nextBlocks
        if (!controller || typeof controller.serializeNoteBlocks !== "function") return
        htmlChanged(controller.serializeNoteBlocks(nextBlocks))
    }

    function updateBlockAt(idx, updater) {
        var next = blocks.slice()
        next[idx] = updater(Object.assign({}, next[idx]))
        commitBlocks(next)
    }

    function insertWidgetHtmlAfter(idx, widgetHtml) {
        if (!controller || typeof controller.parseNoteBlocks !== "function") return
        var parsed = controller.parseNoteBlocks(widgetHtml) || []
        var next = blocks.slice()
        var args = [idx + 1, 0].concat(parsed)
        args.push({ id: "blk_" + Date.now(), blockType: "richText", attrs: ({}), html: "<p></p>", innerHtml: "" })
        Array.prototype.splice.apply(next, args)
        commitBlocks(next)
    }

    function moveBlock(idx, delta) {
        var target = idx + delta
        if (target < 0 || target >= blocks.length) return
        var next = blocks.slice()
        var moved = next.splice(idx, 1)[0]
        next.splice(target, 0, moved)
        commitBlocks(next)
    }

    function duplicateBlock(idx) {
        var next = blocks.slice()
        var copy = JSON.parse(JSON.stringify(next[idx]))
        copy.id = "blk_dup_" + Date.now()
        next.splice(idx + 1, 0, copy)
        commitBlocks(next)
    }

    function deleteBlock(idx) {
        var next = blocks.slice()
        next.splice(idx, 1)
        if (next.length === 0) {
            next.push({ id: "blk_0", blockType: "richText", attrs: ({}), html: "<p></p>", innerHtml: "" })
        }
        commitBlocks(next)
    }

    onActiveChanged: if (active) reloadBlocks()
    onSourceHtmlChanged: {
        if (!active || isSyncingFromSource) return
        if (!controller || typeof controller.serializeNoteBlocks !== "function") return
        if (sourceHtml !== controller.serializeNoteBlocks(blocks)) reloadBlocks()
    }

    Repeater {
        model: blockListRoot.blocks
        delegate: RowLayout {
            id: blockRow
            required property var modelData
            required property int index
            Layout.fillWidth: true
            spacing: 6

            HoverHandler { id: rowHover }

            NotesBlockHandle {
                Layout.alignment: Qt.AlignTop
                Layout.topMargin: 4
                activeVisible: rowHover.hovered
                canMoveUp: blockRow.index > 0
                canMoveDown: blockRow.index < blockListRoot.blocks.length - 1
                onMoveUpRequested: blockListRoot.moveBlock(blockRow.index, -1)
                onMoveDownRequested: blockListRoot.moveBlock(blockRow.index, 1)
                onInsertBelowRequested: blockListRoot.insertWidgetHtmlAfter(blockRow.index, "")
                onDuplicateRequested: blockListRoot.duplicateBlock(blockRow.index)
                onDeleteRequested: blockListRoot.deleteBlock(blockRow.index)
            }

            Item {
                Layout.fillWidth: true
                implicitHeight: sliceLoader.item ? sliceLoader.item.implicitHeight : 44

                Loader {
                    id: sliceLoader
                    width: parent.width
                    sourceComponent: {
                        var t = blockRow.modelData.blockType
                        if (t === "questionBlock") return questionComp
                        if (t === "habitWidget") return habitComp
                        if (t === "focusWidget") return focusComp
                        if (t === "alarmWidget") return alarmComp
                        if (t === "calendarEventWidget") return eventComp
                        if (t === "fileWidget") return fileComp
                        if (t === "documentBundle") return bundleComp
                        if (t === "toggleBlock" || t === "blockquoteToggle") return toggleComp
                        if (t === "columnGroup") return columnsComp
                        if (t === "linkPreview") return linkPreviewComp
                        if (t === "linkGroup") return linkGroupComp
                        if (t === "mediaWidget") return mediaComp
                        if (t === "scrapWidget") return scrapComp
                        if (t === "collectionBlock") return collectionComp
                        return richSliceComp
                    }
                }
            }

            Component {
                id: richSliceComp
                NotesRichTextEditor {
                    width: parent ? parent.width : 600
                    implicitHeight: Math.max(40, editor.contentHeight + 16)
                    sourceHtml: blockRow.modelData.html || "<p></p>"
                    pageList: blockListRoot.pageList
                    controller: blockListRoot.controller
                    parentPageId: blockListRoot.pageId
                    textOperations: blockListRoot.textOperations
                    active: blockListRoot.active && blockRow.modelData.blockType === "richText"
                    onContentModified: function(html) {
                        blockListRoot.updateBlockAt(blockRow.index, function(b) {
                            b.html = html
                            b.innerHtml = html
                            return b
                        })
                    }
                    onPagePreviewRequested: function(pid) { blockListRoot.pagePreviewRequested(pid) }
                    onExternalLinkRequested: function(lnk) { blockListRoot.externalLinkRequested(lnk) }
                    onWidgetSlashCommandRequested: function(cmd) { blockListRoot.slashWidgetRequested(cmd, blockRow.index) }
                    onAskAiRequested: function(sel) { blockListRoot.askAiRequested(sel, blockRow.modelData.html || "") }
                }
            }

            Component {
                id: questionComp
                QuestionBlock {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    pageId: blockListRoot.pageId
                    onPlayRequested: function(bid, qid, title) { blockListRoot.playQuestionRequested(bid, qid, title) }
                    onOpenInQuestionsRequested: function(bid) { blockListRoot.openInQuestionsRequested(bid) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: habitComp
                HabitWidget {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    pageTitle: blockListRoot.pageTitle
                    onStatsRequested: function(hid) { blockListRoot.habitStatsRequested(hid) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: focusComp
                FocusWidget {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    onAttrsUpdated: function(na) { blockListRoot.updateBlockAt(blockRow.index, function(b) { b.attrs = na; return b }) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: alarmComp
                AlarmWidget {
                    blockData: blockRow.modelData
                    onAttrsUpdated: function(na) { blockListRoot.updateBlockAt(blockRow.index, function(b) { b.attrs = na; return b }) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: eventComp
                CalendarEventWidget {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    onAttrsUpdated: function(na) { blockListRoot.updateBlockAt(blockRow.index, function(b) { b.attrs = na; return b }) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: fileComp
                FileAttachmentWidget {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    onAttrsUpdated: function(na) { blockListRoot.updateBlockAt(blockRow.index, function(b) { b.attrs = na; return b }) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: bundleComp
                DocumentBundleWidget {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    onAttrsUpdated: function(na) { blockListRoot.updateBlockAt(blockRow.index, function(b) { b.attrs = na; return b }) }
                    onPageOpenRequested: function(pid) { blockListRoot.pageOpenRequested(pid) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: toggleComp
                NotesToggleBlock {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    onBlockChanged: function(ub) { blockListRoot.updateBlockAt(blockRow.index, function() { return ub }) }
                    onAskAiRequested: function(txt) { blockListRoot.askAiRequested(txt, blockRow.modelData.html || "") }
                    onConvertToSubPageRequested: function(t, h) { blockListRoot.createSubPageWithContent(t, h) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: columnsComp
                NotesColumnLayout {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    onBlockChanged: function(ub) { blockListRoot.updateBlockAt(blockRow.index, function() { return ub }) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: linkPreviewComp
                LinkPreviewCard {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    pageId: blockListRoot.pageId
                    onAttrsUpdated: function(na) { blockListRoot.updateBlockAt(blockRow.index, function(b) { b.attrs = na; return b }) }
                    onYoutubeWatchRequested: function(u, t) { blockListRoot.youtubeWatchRequested(u, t) }
                    onOpenDuplicatePageRequested: function(pid) { blockListRoot.pageOpenRequested(pid) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: linkGroupComp
                LinkGroupBlock {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    onAttrsUpdated: function(na) { blockListRoot.updateBlockAt(blockRow.index, function(b) { b.attrs = na; return b }) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: mediaComp
                MediaWidget {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    onOpenMediaRequested: function(mt, mid, t) { blockListRoot.openMediaRequested(mt, mid, t) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: scrapComp
                ScrapWidget {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: collectionComp
                CollectionBlock {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    onBlockChanged: function(ub) { blockListRoot.updateBlockAt(blockRow.index, function() { return ub }) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }
        }
    }
}
