import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: readingRoot
    objectName: "notesFileReadingProgress"
    anchors.fill: parent
    visible: false

    property var controller: null
    property var readerSurface: null
    property string fileId: ""
    property var bookmarks: []
    property var savedProgress: null
    property bool showResumePrompt: false
    property string bookmarkDraft: ""
    property string editingBookmarkId: ""
    property string editingBookmarkLabel: ""
    property int currentPercentage: 0

    function progressKey(id) {
        return "notes_file_reading_progress_v1_" + String(id || "")
    }

    function resetForFile(id) {
        saveTimer.stop()
        fileId = String(id || "")
        bookmarks = []
        savedProgress = null
        showResumePrompt = false
        currentPercentage = 0
        bookmarkDraft = ""
        editingBookmarkId = ""
        editingBookmarkLabel = ""
        bookmarkControl.closePopup()
    }

    function loadForFile(id) {
        resetForFile(id)
        if (!controller || typeof controller.getConfig !== "function" || fileId.length === 0) return
        var raw = controller.getConfig(progressKey(fileId), "")
        if (!raw) return
        try {
            var parsed = JSON.parse(String(raw))
            if (!parsed || typeof parsed !== "object") return
            var safeBookmarks = Array.isArray(parsed.bookmarks) ? parsed.bookmarks.filter(function(bookmark) {
                return bookmark && typeof bookmark.id === "string" && typeof bookmark.label === "string" &&
                       Number.isFinite(Number(bookmark.scrollTop))
            }) : []
            bookmarks = safeBookmarks
            var percentage = Math.max(0, Math.min(100, Math.round(Number(parsed.percentage) || 0)))
            savedProgress = {
                scrollTop: Math.max(0, Number(parsed.scrollTop) || 0),
                percentage: percentage,
                scrollHeight: Math.max(0, Number(parsed.scrollHeight) || 0)
            }
            showResumePrompt = percentage > 5 && percentage < 98
        } catch (error) {
            console.warn("Could not restore Notes text reading progress.", error)
        }
    }

    function updateProgress() {
        if (!visible || !readerSurface || fileId.length === 0) return
        var scrollTop = Math.max(0, Number(readerSurface.textScrollTop()) || 0)
        var maximum = Math.max(0, Number(readerSurface.textScrollMaximum()) || 0)
        if (maximum <= 0) return
        currentPercentage = Math.max(0, Math.min(100, Math.round((scrollTop / maximum) * 100)))
        savedProgress = {
            scrollTop: scrollTop,
            percentage: currentPercentage,
            scrollHeight: maximum + Number(readerSurface.textScrollViewportHeight())
        }
        saveTimer.restart()
    }

    function saveNow() {
        saveTimer.stop()
        if (!controller || typeof controller.setConfig !== "function" || fileId.length === 0 || !savedProgress) return
        var record = {
            scrollTop: Math.max(0, Number(savedProgress.scrollTop) || 0),
            percentage: Math.max(0, Math.min(100, Math.round(Number(savedProgress.percentage) || 0))),
            scrollHeight: Math.max(0, Number(savedProgress.scrollHeight) || 0),
            updatedAt: new Date().toISOString(),
            bookmarks: bookmarks.slice(0)
        }
        if (!controller.setConfig(progressKey(fileId), JSON.stringify(record)))
            console.warn("Could not save Notes text reading progress.")
    }

    function addBookmark() {
        if (!readerSurface || fileId.length === 0) return
        var label = bookmarkDraft.trim()
        if (label.length === 0) label = qsTr("Marcador %1 (%2%)").arg(bookmarks.length + 1).arg(currentPercentage)
        var next = bookmarks.slice(0)
        next.push({
            id: "bm_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2),
            label: label,
            scrollTop: Math.max(0, Number(readerSurface.textScrollTop()) || 0),
            createdAt: new Date().toISOString()
        })
        bookmarks = next
        bookmarkDraft = ""
        updateProgress()
        saveNow()
    }

    function jumpToBookmark(bookmark) {
        if (!readerSurface || !bookmark) return
        readerSurface.jumpToTextScroll(Number(bookmark.scrollTop) || 0)
        bookmarkControl.closePopup()
        showResumePrompt = false
    }

    function saveBookmarkLabel(id) {
        var label = editingBookmarkLabel.trim()
        if (label.length === 0) return
        var next = bookmarks.slice(0)
        for (var i = 0; i < next.length; i++) {
            if (next[i].id === id) next[i] = Object.assign({}, next[i], { label: label })
        }
        bookmarks = next
        editingBookmarkId = ""
        editingBookmarkLabel = ""
        saveNow()
    }

    function removeBookmark(id) {
        bookmarks = bookmarks.filter(function(bookmark) { return bookmark.id !== id })
        saveNow()
    }

    function resumeReading() {
        if (savedProgress && readerSurface) readerSurface.jumpToTextScroll(savedProgress.scrollTop)
        showResumePrompt = false
    }

    Timer {
        id: saveTimer
        interval: 500
        repeat: false
        onTriggered: readingRoot.saveNow()
    }

    Connections {
        target: readingRoot.readerSurface
        ignoreUnknownSignals: true
        function onTextScrollChanged() { readingRoot.updateProgress() }
    }

    Rectangle {
        id: resumeCard
        objectName: "notesFileReadingResumeCard"
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        anchors.rightMargin: 24
        anchors.bottomMargin: 22
        width: Math.min(370, readingRoot.width - 48)
        height: resumeLayout.implicitHeight + 24
        visible: readingRoot.visible && readingRoot.showResumePrompt && readingRoot.savedProgress !== null
        radius: 12
        color: "#f21a1924"
        border.color: "#668b5cf6"

        ColumnLayout {
            id: resumeLayout
            anchors.fill: parent
            anchors.margins: 12
            spacing: 8
            Label { text: qsTr("Continuar leitura?"); color: "#fffffe"; font.pixelSize: 13; font.weight: Font.DemiBold }
            Label {
                Layout.fillWidth: true
                text: qsTr("Você parou em %1% deste documento.").arg(readingRoot.savedProgress ? readingRoot.savedProgress.percentage : 0)
                color: "#d4d4d8"
                font.pixelSize: 11
                wrapMode: Text.Wrap
            }
            RowLayout {
                Layout.fillWidth: true
                Item { Layout.fillWidth: true }
                Button { text: qsTr("Começar do início"); onClicked: readingRoot.showResumePrompt = false }
                Button { text: qsTr("Continuar leitura"); highlighted: true; onClicked: readingRoot.resumeReading() }
            }
        }
    }

    NotesFileBookmarksControl {
        id: bookmarkControl
        anchors.fill: parent
        visible: readingRoot.visible
        bookmarks: readingRoot.bookmarks
        bookmarkDraft: readingRoot.bookmarkDraft
        editingBookmarkId: readingRoot.editingBookmarkId
        editingBookmarkLabel: readingRoot.editingBookmarkLabel
        onBookmarkDraftChangedByUser: function(value) { readingRoot.bookmarkDraft = value }
        onAddRequested: readingRoot.addBookmark()
        onJumpRequested: function(bookmark) { readingRoot.jumpToBookmark(bookmark) }
        onEditRequested: function(id, label) {
            readingRoot.editingBookmarkId = id
            readingRoot.editingBookmarkLabel = label
        }
        onSaveRequested: function(id, label) {
            readingRoot.editingBookmarkLabel = label
            readingRoot.saveBookmarkLabel(id)
        }
        onRemoveRequested: function(id) { readingRoot.removeBookmark(id) }
    }
}
