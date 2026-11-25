pragma ComponentBehavior: Bound
import QtQuick 2.15
import "NotesHtmlEscaping.js" as HtmlEscaping

// Routes a canonical core AST block to its matching native QML component and forwards all nested events upward.
Loader {
    id: routerLoader

    required property var blockData
    required property int blockIndex
    property string pageId: ""
    property string pageTitle: ""
    property var pageList: []
    property var controller: null
    property var textOperations: typeof notesTextOperations !== "undefined" ? notesTextOperations : null
    property bool active: false
    property int nestingDepth: 0

    signal blockChanged(int idx, var updatedBlock)
    signal deleteRequested(int idx)
    signal unwrapColumnGroupRequested(int idx, var columnsList)
    signal insertAfterRequested(int idx, string widgetHtml)
    signal focusRichRequested(int idx, bool atEnd)
    signal focusRichSliceChanged(var sliceItem)
    signal lastSlashQueryChanged(string query)
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
    signal navigatePrevRequested(int idx)
    signal navigateNextRequested(int idx)
    signal mergePrevRequested(int idx)

    sourceComponent: {
        var t = routerLoader.blockData ? routerLoader.blockData.blockType : "richText"
        if (t === "codeBlock") return codeBlockComp
        if (t === "blockquote") return blockquoteComp
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

    function updateAttrs(nextAttrs) {
        var copy = Object.assign({}, routerLoader.blockData)
        copy.attrs = nextAttrs
        routerLoader.blockChanged(routerLoader.blockIndex, copy)
    }

    function flushPendingEdits() {
        if (!item) return true
        if (typeof item.commitEditorText === "function") return item.commitEditorText()
        if (typeof item.flushPendingEdits === "function") return item.flushPendingEdits()
        return true
    }

    function hasPendingEdits() {
        if (!item) return false
        if (typeof item.hasPendingEdits === "function") return item.hasPendingEdits()
        if (item.hasPendingChanges === true) return true
        return false
    }

    Component {
        id: richSliceComp
        NotesRichTextEditor {
            id: sliceRich
            width: routerLoader.width
            autoHeight: true
            implicitHeight: Math.max(40, richTextInputImplicitHeight)
            readonly property real richTextInputImplicitHeight: editor ? (editor.implicitHeight + 12) : 32
            sourceHtml: routerLoader.blockData.html || "<p></p>"
            pageList: routerLoader.pageList
            controller: routerLoader.controller
            parentPageId: routerLoader.pageId
            textOperations: routerLoader.textOperations
            active: routerLoader.active && routerLoader.blockData.blockType === "richText"
            Connections {
                target: sliceRich.editor
                function onActiveFocusChanged() {
                    if (sliceRich.editor.activeFocus) routerLoader.focusRichSliceChanged(sliceRich)
                }
            }
            onContentModified: function(html) {
                var copy = Object.assign({}, routerLoader.blockData)
                copy.html = html
                copy.innerHtml = html
                routerLoader.blockChanged(routerLoader.blockIndex, copy)
            }
            onPagePreviewRequested: function(pid) { routerLoader.pagePreviewRequested(pid) }
            onExternalLinkRequested: function(lnk) { routerLoader.externalLinkRequested(lnk) }
            onWidgetSlashCommandRequested: function(cmd) {
                routerLoader.lastSlashQueryChanged(sliceRich.lastSlashQuery || "")
                routerLoader.slashWidgetRequested(cmd, routerLoader.blockIndex)
            }
            onAskAiRequested: function(sel) { routerLoader.askAiRequested(sel, routerLoader.blockData.html || "") }
            onNavigatePrevRequested: routerLoader.navigatePrevRequested(routerLoader.blockIndex)
            onNavigateNextRequested: routerLoader.navigateNextRequested(routerLoader.blockIndex)
            onMergePrevRequested: routerLoader.mergePrevRequested(routerLoader.blockIndex)
            onConvertUrlToCardRequested: function(url) {
                var safeUrl = HtmlEscaping.escapeHtmlAttribute(url)
                routerLoader.insertAfterRequested(routerLoader.blockIndex,
                    "<div class=\"link-preview-block\" data-type=\"link-preview\" url=\"" + safeUrl + "\"></div>")
            }
        }
    }

    Component {
        id: codeBlockComp
        CodeBlock {
            width: routerLoader.width
            code: (routerLoader.blockData.attrs && routerLoader.blockData.attrs.code) || routerLoader.blockData.innerHtml || ""
            language: (routerLoader.blockData.attrs && routerLoader.blockData.attrs.language) || ""
            controller: routerLoader.controller
            onCodeUpdated: function(newCode) {
                var na = Object.assign({}, routerLoader.blockData.attrs || ({}))
                na["code"] = newCode
                routerLoader.updateAttrs(na)
            }
            onLanguageChangedByUser: function(newLang) {
                var na = Object.assign({}, routerLoader.blockData.attrs || ({}))
                na["language"] = newLang
                routerLoader.updateAttrs(na)
            }
            onAskAiRequested: function(sel) { routerLoader.askAiRequested(sel, routerLoader.blockData.html || "") }
            onDeleteRequested: routerLoader.deleteRequested(routerLoader.blockIndex)
        }
    }

    Component {
        id: blockquoteComp
        ColorBlockquote {
            width: routerLoader.width
            contentHtml: routerLoader.blockData.innerHtml || routerLoader.blockData.html || ""
            quoteColor: (routerLoader.blockData.attrs && routerLoader.blockData.attrs.color) || "default"
            onContentChanged: function(newHtml) {
                var copy = Object.assign({}, routerLoader.blockData)
                copy.innerHtml = newHtml
                copy.html = newHtml
                routerLoader.blockChanged(routerLoader.blockIndex, copy)
            }
            onColorChangedByUser: function(newColor) {
                var na = Object.assign({}, routerLoader.blockData.attrs || ({}))
                na["color"] = newColor
                routerLoader.updateAttrs(na)
            }
            onAskAiRequested: function(sel) { routerLoader.askAiRequested(sel, routerLoader.blockData.innerHtml || "") }
            onDeleteRequested: routerLoader.deleteRequested(routerLoader.blockIndex)
        }
    }

    Component { id: questionComp; QuestionBlock { width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller; pageId: routerLoader.pageId; onPlayRequested: function(bid, qid, title) { routerLoader.playQuestionRequested(bid, qid, title) }; onOpenInQuestionsRequested: function(bid) { routerLoader.openInQuestionsRequested(bid) }; onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex) } }
    Component { id: habitComp; HabitWidget { width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller; pageTitle: routerLoader.pageTitle; onStatsRequested: function(hid) { routerLoader.habitStatsRequested(hid) }; onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex) } }
    Component { id: focusComp; FocusWidget { width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller; onAttrsUpdated: function(na) { routerLoader.updateAttrs(na) }; onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex) } }
    Component { id: alarmComp; AlarmWidget { width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller; onAttrsUpdated: function(na) { routerLoader.updateAttrs(na) }; onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex) } }
    Component { id: eventComp; CalendarEventWidget { width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller; onAttrsUpdated: function(na) { routerLoader.updateAttrs(na) }; onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex) } }
    Component { id: fileComp; FileAttachmentWidget { width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller; onAttrsUpdated: function(na) { routerLoader.updateAttrs(na) }; onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex) } }
    Component { id: bundleComp; DocumentBundleWidget { width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller; pageId: routerLoader.pageId; onAttrsUpdated: function(na) { routerLoader.updateAttrs(na) }; onPageOpenRequested: function(pid) { routerLoader.pageOpenRequested(pid) }; onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex) } }
    Component { id: mediaComp; MediaWidget { width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller; onOpenMediaRequested: function(mt, mid, t) { routerLoader.openMediaRequested(mt, mid, t) }; onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex) } }
    Component { id: scrapComp; ScrapWidget { width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller; onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex) } }

    Component {
        id: toggleComp
        NotesToggleBlock {
            width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller
            textOperations: routerLoader.textOperations; pageList: routerLoader.pageList
            pageId: routerLoader.pageId; pageTitle: routerLoader.pageTitle
            nestingDepth: routerLoader.nestingDepth; active: routerLoader.active
            onBlockChanged: function(ub) { routerLoader.blockChanged(routerLoader.blockIndex, ub) }
            onAskAiRequested: function(txt) { routerLoader.askAiRequested(txt, routerLoader.blockData.html || "") }
            onConvertToSubPageRequested: function(t, h) { routerLoader.createSubPageWithContent(t, h) }
            onPagePreviewRequested: function(pid) { routerLoader.pagePreviewRequested(pid) }
            onPageOpenRequested: function(pid) { routerLoader.pageOpenRequested(pid) }
            onExternalLinkRequested: function(lnk) { routerLoader.externalLinkRequested(lnk) }
            onPlayQuestionRequested: function(bid, qid, t) { routerLoader.playQuestionRequested(bid, qid, t) }
            onOpenInQuestionsRequested: function(bid) { routerLoader.openInQuestionsRequested(bid) }
            onYoutubeWatchRequested: function(u, t) { routerLoader.youtubeWatchRequested(u, t) }
            onMermaidFullscreenRequested: function(c) { routerLoader.mermaidFullscreenRequested(c) }
            onHabitStatsRequested: function(hid) { routerLoader.habitStatsRequested(hid) }
            onOpenMediaRequested: function(mt, mid, t) { routerLoader.openMediaRequested(mt, mid, t) }
            onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex)
        }
    }

    Component {
        id: columnsComp
        NotesColumnLayout {
            width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller
            textOperations: routerLoader.textOperations; pageList: routerLoader.pageList
            pageId: routerLoader.pageId; active: routerLoader.active
            onBlockChanged: function(ub) { routerLoader.blockChanged(routerLoader.blockIndex, ub) }
            onPagePreviewRequested: function(pid) { routerLoader.pagePreviewRequested(pid) }
            onPageOpenRequested: function(pid) { routerLoader.pageOpenRequested(pid) }
            onExternalLinkRequested: function(lnk) { routerLoader.externalLinkRequested(lnk) }
            onAskAiRequested: function(sel, bHtml) { routerLoader.askAiRequested(sel, bHtml) }
            onPlayQuestionRequested: function(bid, qid, t) { routerLoader.playQuestionRequested(bid, qid, t) }
            onOpenInQuestionsRequested: function(bid) { routerLoader.openInQuestionsRequested(bid) }
            onYoutubeWatchRequested: function(u, t) { routerLoader.youtubeWatchRequested(u, t) }
            onMermaidFullscreenRequested: function(c) { routerLoader.mermaidFullscreenRequested(c) }
            onHabitStatsRequested: function(hid) { routerLoader.habitStatsRequested(hid) }
            onOpenMediaRequested: function(mt, mid, t) { routerLoader.openMediaRequested(mt, mid, t) }
            onUnwrapRequested: function(cols) { routerLoader.unwrapColumnGroupRequested(routerLoader.blockIndex, cols) }
            onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex)
        }
    }

    Component {
        id: collectionComp
        CollectionBlock {
            width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller
            textOperations: routerLoader.textOperations; pageList: routerLoader.pageList
            pageId: routerLoader.pageId; pageTitle: routerLoader.pageTitle
            nestingDepth: routerLoader.nestingDepth; active: routerLoader.active
            onBlockChanged: function(ub) { routerLoader.blockChanged(routerLoader.blockIndex, ub) }
            onPagePreviewRequested: function(pid) { routerLoader.pagePreviewRequested(pid) }
            onPageOpenRequested: function(pid) { routerLoader.pageOpenRequested(pid) }
            onExternalLinkRequested: function(lnk) { routerLoader.externalLinkRequested(lnk) }
            onAskAiRequested: function(sel, bHtml) { routerLoader.askAiRequested(sel, bHtml) }
            onPlayQuestionRequested: function(bid, qid, t) { routerLoader.playQuestionRequested(bid, qid, t) }
            onOpenInQuestionsRequested: function(bid) { routerLoader.openInQuestionsRequested(bid) }
            onYoutubeWatchRequested: function(u, t) { routerLoader.youtubeWatchRequested(u, t) }
            onMermaidFullscreenRequested: function(c) { routerLoader.mermaidFullscreenRequested(c) }
            onHabitStatsRequested: function(hid) { routerLoader.habitStatsRequested(hid) }
            onOpenMediaRequested: function(mt, mid, t) { routerLoader.openMediaRequested(mt, mid, t) }
            onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex)
        }
    }

    Component {
        id: linkPreviewComp
        LinkPreviewCard {
            width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller; pageId: routerLoader.pageId
            onAttrsUpdated: function(na) { routerLoader.updateAttrs(na) }
            onYoutubeWatchRequested: function(u, t) { routerLoader.youtubeWatchRequested(u, t) }
            onOpenDuplicatePageRequested: function(pid) { routerLoader.pageOpenRequested(pid) }
            onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex)
        }
    }
    Component { id: linkGroupComp; LinkGroupBlock { width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller; onAttrsUpdated: function(na) { routerLoader.updateAttrs(na) }; onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex) } }
    Component { id: encryptedImageComp; NotesEncryptedImage { width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller; onAttrsUpdated: function(na) { routerLoader.updateAttrs(na) }; onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex) } }
    Component { id: extImageComp; NotesExternalImageBlock { width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller; onAttrsUpdated: function(na) { routerLoader.updateAttrs(na) }; onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex) } }
    Component {
        id: mermaidComp
        MermaidViewer {
            width: routerLoader.width; blockData: routerLoader.blockData; controller: routerLoader.controller
            onCodeModified: function(nc) {
                var na = Object.assign({}, routerLoader.blockData.attrs || ({}))
                na["code"] = nc
                routerLoader.updateAttrs(na)
            }
            onFullscreenRequested: function(code) { routerLoader.mermaidFullscreenRequested(code) }
            onRemoveRequested: routerLoader.deleteRequested(routerLoader.blockIndex)
        }
    }
}
