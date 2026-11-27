import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: historyRoot
    objectName: "pageHistoryModal"
    anchors.fill: parent
    z: 110
    visible: false
    color: "#0f0f11"

    property var controller: null
    property Item focusReturnItem: null
    property var history: []
    property int selectedIndex: 0
    property bool showDiff: true

    signal closeRequested()
    signal restoreRevisionRequested(string content)

    function selectedEntry() {
        return selectedIndex >= 0 && selectedIndex < history.length ? history[selectedIndex] : null
    }

    function previousEntry() {
        return selectedIndex + 1 < history.length ? history[selectedIndex + 1] : null
    }

    function selectedEntryHasDecryptionError() {
        var entry = selectedEntry()
        return Boolean(entry && entry.decryption_error)
    }

    function canShowDiff() {
        var current = selectedEntry()
        var previous = previousEntry()
        return Boolean(current && previous && !current.decryption_error && !previous.decryption_error)
    }

    function canRestoreSelectedRevision() {
        var entry = selectedEntry()
        return Boolean(selectedIndex > 0 && entry && !entry.decryption_error
                       && typeof entry.content === "string")
    }

    function restoreSelectedRevision() {
        var entry = selectedEntry()
        if (!canRestoreSelectedRevision()) return
        restoreRevisionRequested(entry.content)
        closeRequested()
    }

    function isHtmlDocument(value) {
        return /<[a-z][^>]*>/i.test(value || "")
    }

    function openExternalLink(link) {
        if (/^(https?:\/\/|mailto:)/i.test(link || "")) Qt.openUrlExternally(link)
    }

    function formatTimestamp(value) {
        var source = String(value || "")
        var localDate = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z?)?$/.exec(source)
        var date = localDate
                ? new Date(Number(localDate[1]), Number(localDate[2]) - 1, Number(localDate[3]))
                : new Date(source)
        if (isNaN(date.getTime())) return source
        var locale = Qt.locale("pt_BR")
        function twoDigits(number) { return ("0" + number).slice(-2) }
        return twoDigits(date.getDate()) + " de " + locale.monthName(date.getMonth() + 1, Locale.ShortFormat)
                + " de " + date.getFullYear() + ", " + twoDigits(date.getHours()) + ":"
                + twoDigits(date.getMinutes()) + ":" + twoDigits(date.getSeconds())
    }

    function computeDiffHtml(oldText, newText) {
        if (!oldText || oldText.length === 0) return newText || ""
        if (!newText || newText.length === 0) {
            return "<span style=\"background-color:rgba(244,63,94,0.25);color:#fda4af;text-decoration:line-through;\">" + oldText + "</span>"
        }
        var c = historyRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
        if (c && typeof c.computeNoteWordDiffHtml === "function") {
            var oldValue = oldText
            var newValue = newText
            if (isHtmlDocument(oldText) || isHtmlDocument(newText)) {
                if (typeof c.noteHtmlToPlainText !== "function") return newText
                oldValue = c.noteHtmlToPlainText(oldText)
                newValue = c.noteHtmlToPlainText(newText)
            }
            return c.computeNoteWordDiffHtml(oldValue, newValue).replace(/\r?\n/g, "<br/>")
        }
        return newText
    }

    function selectedRevisionBody() {
        var current = selectedEntry()
        if (!current) return ""
        var previous = previousEntry()
        if (showDiff && canShowDiff()) return computeDiffHtml(previous.content || "", current.content || "")
        return current.content || ""
    }

    readonly property string displayedRevisionBody: selectedRevisionBody()

    onVisibleChanged: if (visible) selectedIndex = 0

    PageHistoryFocusManager {
        modalVisible: historyRoot.visible
        hasRevisions: historyRoot.history.length > 0
        revisionTarget: historyRevisionSidebar.currentRevisionItem
        returnTarget: historyRoot.focusReturnItem
    }

    Shortcut {
        sequence: "Escape"
        enabled: historyRoot.visible
        onActivated: historyRoot.closeRequested()
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        PageHistoryHeader {
            viewportWidth: historyRoot.width
            history: historyRoot.history
            selectedIndex: historyRoot.selectedIndex
            showDiff: historyRoot.showDiff
            diffEnabled: historyRoot.canShowDiff()
            restoreEnabled: historyRoot.canRestoreSelectedRevision()
            onDiffToggleRequested: historyRoot.showDiff = !historyRoot.showDiff
            onRestoreRequested: historyRoot.restoreSelectedRevision()
            onCloseRequested: historyRoot.closeRequested()
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 0

            PageHistoryRevisionSidebar {
                id: historyRevisionSidebar
                viewportWidth: historyRoot.width
                history: historyRoot.history
                selectedIndex: historyRoot.selectedIndex
                timestampFormatter: historyRoot.formatTimestamp
                onRevisionSelected: function(index) { historyRoot.selectedIndex = index }
            }

            PageHistoryRevisionCanvas {
                viewportWidth: historyRoot.width
                selectedEntry: historyRoot.selectedEntry()
                selectedIndex: historyRoot.selectedIndex
                heading: historyRoot.selectedIndex === 0
                         ? qsTr("Versão Atual")
                         : qsTr("Revisão ") + (historyRoot.history.length - historyRoot.selectedIndex)
                subtitle: historyRoot.selectedIndex === 0
                          ? qsTr("Visualizando versão atual")
                          : qsTr("Visualizando revisão salva em ")
                            + historyRoot.formatTimestamp(historyRoot.selectedEntry().created_at)
                bodyText: historyRoot.displayedRevisionBody
                bodyIsRichText: (historyRoot.showDiff && historyRoot.canShowDiff())
                                || historyRoot.isHtmlDocument(historyRoot.displayedRevisionBody)
                decryptionFailed: historyRoot.selectedEntryHasDecryptionError()
                decryptionErrorText: qsTr("Não foi possível descriptografar esta revisão. Desbloqueie o cofre ou verifique a chave antes de tentar novamente.")
                onExternalLinkActivated: function(link) { historyRoot.openExternalLink(link) }
            }
        }
    }
}
