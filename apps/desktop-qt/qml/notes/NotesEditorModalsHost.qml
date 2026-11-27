import QtQuick 2.15
import "NotesQuestionSession.js" as QuestionSession

Item {
    id: modalsHost
    anchors.fill: parent

    NotesOpenAnswerEvaluator {
        id: notesOpenAnswerEvaluator
        controller: modalsHost.controller
    }

    NotesQuizDiscussionEvaluator {
        id: notesQuizDiscussionEvaluator
        controller: modalsHost.controller
    }

    NotesQuizDiscussionDialog {
        id: notesQuizDiscussionDialog
        anchors.fill: parent
        evaluator: notesQuizDiscussionEvaluator
    }

    property var controller: null
    property string selectedPageId: ""
    property string activeTitle: ""
    property string activeContent: ""
    property var pageHistoryEntries: []
    property bool isHistoryOpen: false
    property bool isHelpOpen: false
    property bool isPageEncrypted: false
    property bool isPageUnlocked: true
    property string deleteTargetTitle: ""
    readonly property bool anyBlockingOverlayVisible: isHistoryOpen || isHelpOpen || deleteNoteDialog.visible

    signal pageUnlocked()
    signal historyClosed()
    signal helpClosed()
    signal restoreRevisionRequested(string content)
    signal selectPageRequested(string pageId)
    signal pageSavedExternally(string savedPageId, string newTitle)
    signal applyAiHtmlRequested(string html)
    signal insertAiTextRequested(string text)
    signal insertWidgetRequested(string widgetHtml)
    signal linkedTargetOpenRequested(string moduleKey, string entityId, string title, bool newTab, bool quickPreview)
    signal deleteNoteConfirmed()
    signal deleteCancelled()

    property var pendingYtWatch: null
    property var pendingYtPlaylist: null
    property var pendingYtSummary: null
    property string pendingMermaidCode: ""
    property var pendingQuizSession: null
    property var pendingHabitTarget: null

    function openYoutubeModal(url, title) {
        if (/[?&]list=/i.test(url || "")) {
            pendingYtPlaylist = { url: url, title: title || qsTr("Playlist do YouTube") }
            ytPlaylistLoader.active = true
            if (ytPlaylistLoader.item) {
                ytPlaylistLoader.item.controller = modalsHost.controller
                ytPlaylistLoader.item.playlistUrl = pendingYtPlaylist.url
                ytPlaylistLoader.item.playlistTitle = pendingYtPlaylist.title
                ytPlaylistLoader.item.visible = true
                pendingYtPlaylist = null
            }
            return
        }
        pendingYtWatch = { url: url, title: title || "" }
        ytWatchLoader.active = true
        if (ytWatchLoader.item) {
            ytWatchLoader.item.url = pendingYtWatch.url
            ytWatchLoader.item.videoTitle = pendingYtWatch.title
            ytWatchLoader.item.visible = true
            pendingYtWatch = null
        }
    }

    function openYoutubeSummary(url, title) {
        pendingYtSummary = { url: url, title: title || qsTr("Resumo do Vídeo") }
        ytSummaryLoader.active = true
        if (ytSummaryLoader.item) {
            ytSummaryLoader.item.controller = modalsHost.controller
            ytSummaryLoader.item.url = pendingYtSummary.url
            ytSummaryLoader.item.videoTitle = pendingYtSummary.title
            ytSummaryLoader.item.visible = true
            pendingYtSummary = null
        }
    }

    function openMermaidModal(code) {
        pendingMermaidCode = String(code || "")
        mermaidLoader.active = true
        if (mermaidLoader.item) {
            mermaidLoader.item.controller = modalsHost.controller
            mermaidLoader.item.chart = pendingMermaidCode
            mermaidLoader.item.visible = true
            pendingMermaidCode = ""
        }
    }

    function openReferencePreview(pageId) {
        referencePreview.openForPage(pageId)
    }

    function openAiPrompt(selectionText, contextHtml) {
        notesAiModal.openModal(selectionText, contextHtml)
    }

    function openSetupWidget(mode, prefill) {
        setupWidgetsModal.openMode(mode, prefill)
    }

    function openMediaWidgetPicker(mode, prefillUrl, autoCaptureScrap) {
        mediaPickerModal.openMode(mode, prefillUrl, autoCaptureScrap)
    }

    function openLinkedItemActions(kind, itemId, title) {
        linkedItemActionDialog.openFor(kind, itemId, title)
    }

    function openAudioPreview(fileId, fileName) {
        notesAudioPreview.openForFile(fileId, fileName)
    }

    function openFilePreview(fileId) {
        notesFilePreview.openForFile(fileId)
    }

    function openLinkedItemTarget(kind, itemId, title, newTab, quickPreview) {
        var moduleKey = kind === "video" ? "video"
                      : kind === "file" ? "library" : "library"
        linkedTargetOpenRequested(moduleKey, String(itemId || ""), String(title || ""),
                                  Boolean(newTab), Boolean(quickPreview))
    }

    function openDeleteDialog(errMessage) {
        deleteNoteDialog.errorMessage = errMessage || ""
        deleteNoteDialog.open()
    }

    function openQuestionSession(batteryId, questionId, title) {
        var qs = QuestionSession.loadQuestions(controller, batteryId, questionId)
        pendingQuizSession = {
            batteryId: batteryId,
            title: title || qsTr("Prática Rápida"),
            questions: qs
        }
        quizModalLoader.active = true
        if (quizModalLoader.item) {
            applyPendingQuizSession(quizModalLoader.item)
        }
    }

    function applyPendingQuizSession(item) {
        if (!item || !pendingQuizSession) return
        item.notesController = modalsHost.controller
        item.enableNotesOpenAnswerEvaluation = true
        item.openAnswerEvaluator = notesOpenAnswerEvaluator
        item.requireFinishConfirmation = true
        item.startQuiz(
            pendingQuizSession.batteryId,
            pendingQuizSession.title,
            pendingQuizSession.questions
        )
        pendingQuizSession = null
    }

    function openHabitHeatmap(habitId) {
        if (!controller || typeof controller.getHabits !== "function") return
        var list = controller.getHabits() || []
        var target = null
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === habitId) { target = list[i]; break }
        }
        if (!target) return
        pendingHabitTarget = target
        habitHeatmapLoader.active = true
        if (habitHeatmapLoader.item) {
            habitHeatmapLoader.item.habit = pendingHabitTarget
            habitHeatmapLoader.item.reloadData()
            habitHeatmapLoader.item.visible = true
            pendingHabitTarget = null
        }
    }

    Loader {
        id: ytWatchLoader
        active: false
        anchors.fill: parent
        z: 120
        source: "YouTubeWatchModal.qml"
        onLoaded: {
            if (!item) return
            if (modalsHost.pendingYtWatch) {
                item.url = modalsHost.pendingYtWatch.url
                item.videoTitle = modalsHost.pendingYtWatch.title
                modalsHost.pendingYtWatch = null
            }
            item.visible = true
        }
    }

    Connections {
        target: ytWatchLoader.item
        ignoreUnknownSignals: true
        function onSummaryRequested(u, t) { ytWatchLoader.active = false; modalsHost.openYoutubeSummary(u, t) }
        function onCloseRequested() { ytWatchLoader.active = false }
    }

    Loader {
        id: ytPlaylistLoader
        active: false; anchors.fill: parent; z: 122
        source: "YouTubePlaylistModal.qml"
        onLoaded: {
            if (!item) return
            if (modalsHost.pendingYtPlaylist) {
                item.controller = modalsHost.controller
                item.playlistUrl = modalsHost.pendingYtPlaylist.url
                item.playlistTitle = modalsHost.pendingYtPlaylist.title
                modalsHost.pendingYtPlaylist = null
            }
            item.visible = true
        }
    }

    Connections {
        target: ytPlaylistLoader.item
        ignoreUnknownSignals: true
        function onVideoWatchRequested(u, t) { ytPlaylistLoader.active = false; modalsHost.openYoutubeModal(u, t) }
        function onVideoSummaryRequested(u, t) { ytPlaylistLoader.active = false; modalsHost.openYoutubeSummary(u, t) }
        function onCloseRequested() { ytPlaylistLoader.active = false }
    }

    Loader {
        id: ytSummaryLoader
        active: false; anchors.fill: parent; z: 124
        source: "YouTubeSummaryModal.qml"
        onLoaded: {
            if (!item) return
            if (modalsHost.pendingYtSummary) {
                item.controller = modalsHost.controller
                item.url = modalsHost.pendingYtSummary.url
                item.videoTitle = modalsHost.pendingYtSummary.title
                modalsHost.pendingYtSummary = null
            }
            item.visible = true
        }
    }

    Connections {
        target: ytSummaryLoader.item
        ignoreUnknownSignals: true
        function onCloseRequested() { ytSummaryLoader.active = false }
    }

    Loader {
        id: mermaidLoader
        active: false
        anchors.fill: parent
        z: 130
        source: "MermaidFullscreenModal.qml"
        onLoaded: {
            if (!item) return
            if (modalsHost.pendingMermaidCode.length > 0) {
                item.controller = modalsHost.controller
                item.chart = modalsHost.pendingMermaidCode
                modalsHost.pendingMermaidCode = ""
            }
            item.visible = true
        }
    }

    Connections {
        target: mermaidLoader.item
        ignoreUnknownSignals: true
        function onCloseRequested() { mermaidLoader.active = false }
    }

    PageHistoryModal {
        controller: modalsHost.controller
        visible: modalsHost.isHistoryOpen
        history: modalsHost.pageHistoryEntries
        onCloseRequested: modalsHost.historyClosed()
        onRestoreRevisionRequested: function(content) { modalsHost.restoreRevisionRequested(content) }
    }

    NotesPageReferencePreview {
        id: referencePreview
        controller: modalsHost.controller
        onExpandRequested: function(pageId) {
            modalsHost.selectPageRequested(pageId)
            referencePreview.close()
        }
        onPageSaved: function(savedPageId, newTitle) {
            modalsHost.pageSavedExternally(savedPageId, newTitle)
        }
    }

    NotesHelpDialog {
        isOpen: modalsHost.isHelpOpen
        onClosed: modalsHost.helpClosed()
    }

    NotesAiPromptModal {
        id: notesAiModal
        controller: modalsHost.controller
        onApplyHtmlRequested: function(html) { modalsHost.applyAiHtmlRequested(html) }
        onInsertTextRequested: function(txt) { modalsHost.insertAiTextRequested(txt) }
        onClosed: notesAiModal.isOpen = false
    }

    NotesSetupWidgetsModal {
        id: setupWidgetsModal
        controller: modalsHost.controller
        pageId: modalsHost.selectedPageId
        pageTitle: modalsHost.activeTitle
        onInsertWidgetRequested: function(html) { modalsHost.insertWidgetRequested(html) }
    }

    NotesMediaWidgetPickerModal {
        id: mediaPickerModal
        controller: modalsHost.controller
        onInsertWidgetRequested: function(html) { modalsHost.insertWidgetRequested(html) }
    }

    NotesLinkedItemActionDialog {
        id: linkedItemActionDialog
        onPreviewRequested: function(itemId, itemTitle) {
            modalsHost.openFilePreview(itemId)
        }
        onOpenCurrentTabRequested: function(kind, itemId, itemTitle) {
            modalsHost.openLinkedItemTarget(kind, itemId, itemTitle, false, false)
        }
        onOpenNewTabRequested: function(kind, itemId, itemTitle) {
            modalsHost.openLinkedItemTarget(kind, itemId, itemTitle, true, false)
        }
    }

    NotesAudioPreviewModal {
        id: notesAudioPreview
        controller: modalsHost.controller
    }

    NotesFilePreviewModal {
        id: notesFilePreview
        controller: modalsHost.controller
    }

    Loader {
        id: quizModalLoader
        active: false
        anchors.fill: parent
        z: 145
        source: "../questions/QuizSequentialFocusModal.qml"
        onLoaded: if (item) modalsHost.applyPendingQuizSession(item)
    }

    Connections {
        target: quizModalLoader.item
        ignoreUnknownSignals: true
        function onClosed() {
            notesQuizDiscussionDialog.closeSession()
            quizModalLoader.active = false
        }
        function onDiscussionRequested(title, batteryId, question, questionIndex, questions) {
            notesQuizDiscussionDialog.openForQuestion(title, batteryId, question, questionIndex, questions)
        }
        function onRecordAttemptRequested(bId, qId, selIndex, correct) {
            if (modalsHost.controller && typeof modalsHost.controller.recordQuizAttempt === "function") {
                modalsHost.controller.recordQuizAttempt(bId, qId, selIndex, correct)
            }
        }
    }

    Connections {
        target: notesQuizDiscussionDialog
        ignoreUnknownSignals: true
        function onQuestionsUpdated(questions) {
            if (quizModalLoader.item && typeof quizModalLoader.item.replaceQuestionsFromAssistant === "function")
                quizModalLoader.item.replaceQuestionsFromAssistant(questions)
        }
        function onCloseRequested() {
            if (quizModalLoader.item) quizModalLoader.item.discussionDialogOpen = false
        }
    }

    Loader {
        id: habitHeatmapLoader
        active: false
        anchors.fill: parent
        z: 145
        source: "../habits/HabitsHeatmapModal.qml"
        onLoaded: {
            if (!item || !modalsHost.pendingHabitTarget) return
            item.habit = modalsHost.pendingHabitTarget
            item.reloadData()
            item.visible = true
            modalsHost.pendingHabitTarget = null
        }
    }

    Connections {
        target: habitHeatmapLoader.item
        ignoreUnknownSignals: true
        function onVisibleChanged() {
            if (habitHeatmapLoader.item && !habitHeatmapLoader.item.visible) {
                habitHeatmapLoader.active = false
            }
        }
    }

    NotesDeleteDialog {
        id: deleteNoteDialog
        anchors.centerIn: parent
        noteTitle: modalsHost.deleteTargetTitle || modalsHost.activeTitle
        onConfirmed: modalsHost.deleteNoteConfirmed()
        onRejected: modalsHost.deleteCancelled()
    }
}
