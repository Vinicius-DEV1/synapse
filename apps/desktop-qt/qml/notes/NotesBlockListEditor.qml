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
    property int nestingDepth: 0
    property var blocks: []
    property bool isSyncingFromSource: false
    property var focusedRichSlice: null
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
        if (focusedRichSlice && typeof focusedRichSlice.toggleMark === "function") {
            return focusedRichSlice.toggleMark(mark)
        }
        return false
    }

    function flushActiveRichSlices() {
        if (focusedRichSlice && typeof focusedRichSlice.commitEditorText === "function") {
            return focusedRichSlice.commitEditorText()
        }
        return true
    }

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
        if (idx < 0 || idx >= blocks.length) return
        var next = blocks.slice()
        next[idx] = updater(Object.assign({}, next[idx]))
        commitBlocks(next)
    }

    function insertWidgetHtmlAfter(idx, widgetHtml) {
        if (!controller || typeof controller.parseNoteBlocks !== "function") return
        var parsed = widgetHtml && widgetHtml.trim().length > 0
            ? (controller.parseNoteBlocks(widgetHtml) || [])
            : []
        var next = blocks.slice()
        var insertPos = idx >= 0 && idx < next.length ? idx + 1 : next.length
        var args = [insertPos, 0].concat(parsed)
        args.push({ id: "blk_" + Date.now(), blockType: "richText", attrs: ({}), html: "<p><br/></p>", innerHtml: "<p><br/></p>" })
        Array.prototype.splice.apply(next, args)
        commitBlocks(next)
    }

    function appendTrailingParagraph() {
        var next = blocks.slice()
        next.push({ id: "blk_tail_" + Date.now(), blockType: "richText", attrs: ({}), html: "<p><br/></p>", innerHtml: "<p><br/></p>" })
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
            next.push({ id: "blk_0", blockType: "richText", attrs: ({}), html: "<p><br/></p>", innerHtml: "<p><br/></p>" })
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
        delegate: Item {
            id: blockRow
            required property var modelData
            required property int index
            Layout.fillWidth: true
            implicitHeight: Math.max(28, sliceLoader.item ? sliceLoader.item.implicitHeight : 36)

            HoverHandler { id: rowHover }

            NotesBlockHandle {
                visible: blockListRoot.nestingDepth === 0
                x: -30
                y: 4
                z: 5
                activeVisible: rowHover.hovered || handleHovered
                canMoveUp: blockRow.index > 0
                canMoveDown: blockRow.index < blockListRoot.blocks.length - 1
                onMoveUpRequested: blockListRoot.moveBlock(blockRow.index, -1)
                onMoveDownRequested: blockListRoot.moveBlock(blockRow.index, 1)
                onInsertBelowRequested: blockListRoot.insertWidgetHtmlAfter(blockRow.index, "")
                onDuplicateRequested: blockListRoot.duplicateBlock(blockRow.index)
                onDeleteRequested: blockListRoot.deleteBlock(blockRow.index)
            }

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
                    if (t === "encryptedImage") return encryptedImageComp
                    if (t === "mermaidBlock") return mermaidComp
                    if (t === "imageBlock") return extImageComp
                    return richSliceComp
                }
            }

            Component {
                id: richSliceComp
                NotesRichTextEditor {
                    id: sliceRich
                    width: parent ? parent.width : 600
                    implicitHeight: Math.max(40, editor.contentHeight + 16)
                    sourceHtml: blockRow.modelData.html || "<p></p>"
                    pageList: blockListRoot.pageList
                    controller: blockListRoot.controller
                    parentPageId: blockListRoot.pageId
                    textOperations: blockListRoot.textOperations
                    active: blockListRoot.active && blockRow.modelData.blockType === "richText"
                    Connections {
                        target: sliceRich.editor
                        function onActiveFocusChanged() {
                            if (sliceRich.editor.activeFocus) blockListRoot.focusedRichSlice = sliceRich
                        }
                    }
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
                    onConvertUrlToCardRequested: function(url) {
                        var safeUrl = String(url || "").replace(/"/g, "&quot;")
                        blockListRoot.insertWidgetHtmlAfter(blockRow.index, "<div class=\"link-preview-block\" data-type=\"link-preview\" url=\"" + safeUrl + "\"></div>")
                    }
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
                    blockData: blockRow.modelData
                    pageTitle: blockListRoot.pageTitle
                    onStatsRequested: function(hid) { blockListRoot.habitStatsRequested(hid) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: focusComp
                FocusWidget {
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
                    controller: blockListRoot.controller
                    textOperations: blockListRoot.textOperations
                    pageList: blockListRoot.pageList
                    pageId: blockListRoot.pageId
                    pageTitle: blockListRoot.pageTitle
                    nestingDepth: blockListRoot.nestingDepth
                    active: blockListRoot.active
                    onBlockChanged: function(ub) { blockListRoot.updateBlockAt(blockRow.index, function() { return ub }) }
                    onAskAiRequested: function(txt) { blockListRoot.askAiRequested(txt, blockRow.modelData.html || "") }
                    onConvertToSubPageRequested: function(t, h) { blockListRoot.createSubPageWithContent(t, h) }
                    onPagePreviewRequested: function(pid) { blockListRoot.pagePreviewRequested(pid) }
                    onPageOpenRequested: function(pid) { blockListRoot.pageOpenRequested(pid) }
                    onExternalLinkRequested: function(lnk) { blockListRoot.externalLinkRequested(lnk) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: columnsComp
                NotesColumnLayout {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    controller: blockListRoot.controller
                    textOperations: blockListRoot.textOperations
                    pageList: blockListRoot.pageList
                    pageId: blockListRoot.pageId
                    active: blockListRoot.active
                    onBlockChanged: function(ub) { blockListRoot.updateBlockAt(blockRow.index, function() { return ub }) }
                    onPagePreviewRequested: function(pid) { blockListRoot.pagePreviewRequested(pid) }
                    onExternalLinkRequested: function(lnk) { blockListRoot.externalLinkRequested(lnk) }
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
                    blockData: blockRow.modelData
                    onOpenMediaRequested: function(mt, mid, t) { blockListRoot.openMediaRequested(mt, mid, t) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: scrapComp
                ScrapWidget {
                    blockData: blockRow.modelData
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: collectionComp
                CollectionBlock {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    controller: blockListRoot.controller
                    textOperations: blockListRoot.textOperations
                    pageList: blockListRoot.pageList
                    pageId: blockListRoot.pageId
                    pageTitle: blockListRoot.pageTitle
                    nestingDepth: blockListRoot.nestingDepth
                    active: blockListRoot.active
                    onBlockChanged: function(ub) { blockListRoot.updateBlockAt(blockRow.index, function() { return ub }) }
                    onPagePreviewRequested: function(pid) { blockListRoot.pagePreviewRequested(pid) }
                    onPageOpenRequested: function(pid) { blockListRoot.pageOpenRequested(pid) }
                    onExternalLinkRequested: function(lnk) { blockListRoot.externalLinkRequested(lnk) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: encryptedImageComp
                NotesEncryptedImage {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    onAttrsUpdated: function(na) { blockListRoot.updateBlockAt(blockRow.index, function(b) { b.attrs = na; return b }) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: mermaidComp
                MermaidViewer {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    onCodeModified: function(nc) {
                        blockListRoot.updateBlockAt(blockRow.index, function(b) {
                            var na = Object.assign({}, b.attrs || ({}))
                            na["code"] = nc
                            b.attrs = na
                            return b
                        })
                    }
                    onFullscreenRequested: function(code) { blockListRoot.mermaidFullscreenRequested(code) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }

            Component {
                id: extImageComp
                NotesExternalImageBlock {
                    width: parent ? parent.width : 600
                    blockData: blockRow.modelData
                    onAttrsUpdated: function(na) { blockListRoot.updateBlockAt(blockRow.index, function(b) { b.attrs = na; return b }) }
                    onRemoveRequested: blockListRoot.deleteBlock(blockRow.index)
                }
            }
        }
    }

    // Click-below-widget zone so users can always click below the bottom widget to type
    Item {
        visible: blockListRoot.nestingDepth === 0 && blockListRoot.blocks.length > 0 &&
                 blockListRoot.blocks[blockListRoot.blocks.length - 1].blockType !== "richText"
        Layout.fillWidth: true
        Layout.preferredHeight: 44

        MouseArea {
            anchors.fill: parent
            cursorShape: Qt.IBeamCursor
            hoverEnabled: true
            onClicked: blockListRoot.appendTrailingParagraph()

            Text {
                anchors.verticalCenter: parent.verticalCenter
                anchors.left: parent.left
                anchors.leftMargin: 4
                opacity: parent.containsMouse ? 0.7 : 0
                Behavior on opacity { NumberAnimation { duration: 140 } }
                text: qsTr("Clique para escrever abaixo ou digite '/'...")
                color: "#6b7280"
                font.pixelSize: 13
            }
        }
    }
}
