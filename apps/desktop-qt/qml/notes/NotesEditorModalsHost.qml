import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: modalsHost
    anchors.fill: parent

    property var controller: null
    property string selectedPageId: ""
    property string activeTitle: ""
    property string activeContent: ""
    property var pageHistoryEntries: []
    property bool isHistoryOpen: false
    property bool isHelpOpen: false
    property bool isPageEncrypted: false
    property bool isPageUnlocked: true
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
    signal deleteNoteConfirmed()

    function openYoutubeModal(url, title) {
        ytWatchLoader.active = true
        if (ytWatchLoader.item) {
            ytWatchLoader.item.url = url
            ytWatchLoader.item.videoTitle = title
            ytWatchLoader.item.visible = true
        }
    }

    function openMermaidModal(code) {
        mermaidLoader.active = true
        if (mermaidLoader.item) {
            mermaidLoader.item.chart = code
            mermaidLoader.item.visible = true
        }
    }

    function openReferencePreview(pageId) {
        referencePreview.openForPage(pageId)
    }

    function openAiPrompt(selectionText, contextHtml) {
        notesAiModal.openModal(selectionText, contextHtml)
    }

    function openSetupWidget(mode) {
        setupWidgetsModal.openMode(mode)
    }

    function openMediaWidgetPicker(mode) {
        mediaPickerModal.openMode(mode)
    }

    function openDeleteDialog(errMessage) {
        deleteNoteDialog.errorMessage = errMessage || ""
        deleteNoteDialog.open()
    }

    function openQuestionSession(batteryId, questionId, title) {
        var qs = []
        if (controller && typeof controller.getAllQuizQuestions === "function") {
            var all = controller.getAllQuizQuestions() || []
            qs = all.filter(function(q) {
                return (batteryId && q.battery_id === batteryId) || (questionId && q.id === questionId)
            })
        }
        quizModalLoader.active = true
        if (quizModalLoader.item) {
            quizModalLoader.item.batteryId = batteryId
            quizModalLoader.item.batteryTitle = title || qsTr("Prática Rápida")
            quizModalLoader.item.questions = qs
            quizModalLoader.item.currentIndex = 0
            quizModalLoader.item.selectedOption = -1
            quizModalLoader.item.isConfirmed = false
            quizModalLoader.item.isCompleted = false
            quizModalLoader.item.score = 0
            quizModalLoader.item.elapsedSeconds = 0
            quizModalLoader.item.visible = true
        }
    }

    function openHabitHeatmap(habitId) {
        if (!controller || typeof controller.getHabits !== "function") return
        var list = controller.getHabits() || []
        var target = null
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === habitId) { target = list[i]; break }
        }
        if (!target) return
        habitHeatmapLoader.active = true
        if (habitHeatmapLoader.item) {
            habitHeatmapLoader.item.habit = target
            habitHeatmapLoader.item.reloadData()
            habitHeatmapLoader.item.visible = true
        }
    }

    NotesPageUnlockForm {
        anchors.fill: parent
        z: 95
        visible: modalsHost.selectedPageId !== "" && modalsHost.isPageEncrypted && !modalsHost.isPageUnlocked
        onUnlocked: modalsHost.pageUnlocked()
    }

    Loader {
        id: ytWatchLoader
        active: false
        anchors.fill: parent
        z: 120
        source: "YouTubeWatchModal.qml"
        onLoaded: if (item) item.visible = true
    }

    Connections {
        target: ytWatchLoader.item
        ignoreUnknownSignals: true
        function onCloseRequested() { ytWatchLoader.active = false }
    }

    Loader {
        id: mermaidLoader
        active: false
        anchors.fill: parent
        z: 130
        source: "MermaidFullscreenModal.qml"
        onLoaded: if (item) item.visible = true
    }

    Connections {
        target: mermaidLoader.item
        ignoreUnknownSignals: true
        function onCloseRequested() { mermaidLoader.active = false }
    }

    PageHistoryModal {
        visible: modalsHost.isHistoryOpen
        pageTitle: modalsHost.activeTitle
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
        onApplyHtmlRequested: function(html) { modalsHost.applyAiHtmlRequested(html) }
        onInsertTextRequested: function(txt) { modalsHost.insertAiTextRequested(txt) }
        onClosed: notesAiModal.isOpen = false
    }

    NotesSetupWidgetsModal {
        id: setupWidgetsModal
        onInsertWidgetRequested: function(html) { modalsHost.insertWidgetRequested(html) }
    }

    NotesMediaWidgetPickerModal {
        id: mediaPickerModal
        onInsertWidgetRequested: function(html) { modalsHost.insertWidgetRequested(html) }
    }

    Loader {
        id: quizModalLoader
        active: false
        anchors.fill: parent
        z: 145
        source: "../questions/QuizSequentialFocusModal.qml"
    }

    Connections {
        target: quizModalLoader.item
        ignoreUnknownSignals: true
        function onClosed() { quizModalLoader.active = false }
        function onRecordAttemptRequested(bId, qId, selIndex, correct) {
            if (modalsHost.controller && typeof modalsHost.controller.recordQuizAttempt === "function") {
                modalsHost.controller.recordQuizAttempt(bId, qId, selIndex, correct)
            }
        }
    }

    Loader {
        id: habitHeatmapLoader
        active: false
        anchors.fill: parent
        z: 145
        source: "../habits/HabitsHeatmapModal.qml"
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
        noteTitle: modalsHost.activeTitle
        onConfirmed: modalsHost.deleteNoteConfirmed()
    }
}
