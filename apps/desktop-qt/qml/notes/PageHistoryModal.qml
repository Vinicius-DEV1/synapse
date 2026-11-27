import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: historyRoot
    anchors.fill: parent
    z: 110
    visible: false
    color: "#0f0f11"

    property var controller: null
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

    onVisibleChanged: if (visible) selectedIndex = 0

    Shortcut {
        sequence: "Escape"
        enabled: historyRoot.visible
        onActivated: historyRoot.closeRequested()
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        Rectangle {
            Layout.fillWidth: true
            height: 56
            color: "#0f0f11"
            border.color: "#0affffff"
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: historyRoot.width >= 640 ? 32 : 20
                anchors.rightMargin: historyRoot.width >= 640 ? 32 : 20
                spacing: 10
                Rectangle {
                    width: 32
                    height: 32
                    radius: 8
                    color: "#08ffffff"
                    border.color: "#0affffff"
                    AppIcon { anchors.centerIn: parent; width: 15; height: 15; name: "clock"; color: theme.textSubtext }
                }
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    Text { text: "Histórico de Edições"; color: theme.textDark; font.pixelSize: 14; font.bold: true }
                    Text {
                        text: "• " + historyRoot.history.length + (historyRoot.history.length === 1 ? " revisão" : " revisões")
                        color: theme.textMuted
                        font.pixelSize: 12
                        font.family: theme.fontMono
                        visible: historyRoot.width >= 640
                    }
                }

                Button {
                    text: historyRoot.showDiff ? qsTr("Modo Diff Ativo ✓") : qsTr("Ver Diff")
                    flat: true
                    visible: historyRoot.previousEntry() !== null
                    onClicked: historyRoot.showDiff = !historyRoot.showDiff
                    contentItem: Text {
                        text: parent.text
                        color: historyRoot.showDiff ? "#34d399" : "#a1a1aa"
                        font.pixelSize: 11
                    }
                }

                Button {
                    text: qsTr("Restaurar Esta Versão")
                    flat: true
                    visible: historyRoot.selectedIndex > 0 && historyRoot.selectedEntry() !== null
                    onClicked: {
                        var entry = historyRoot.selectedEntry()
                        if (entry && typeof entry.content === "string") {
                            historyRoot.restoreRevisionRequested(entry.content)
                            historyRoot.closeRequested()
                        }
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#a78bfa"
                        font.pixelSize: 11
                        font.bold: true
                    }
                }

                ToolButton {
                    text: "×"
                    implicitWidth: 32
                    implicitHeight: 32
                    onClicked: historyRoot.closeRequested()
                    ToolTip.visible: hovered
                    ToolTip.text: "Fechar (Esc)"
                    background: Rectangle { color: parent.hovered ? "#14ffffff" : "transparent"; radius: 7 }
                    contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 20; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }
            }
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 0

            Rectangle {
                Layout.preferredWidth: historyRoot.width >= 640 ? 320 : 288
                Layout.fillHeight: true
                color: "#121214"
                border.color: "#08ffffff"
                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 6
                    Item {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        objectName: "historyRevisionListArea"
                        ListView {
                            id: revisionList
                            anchors.fill: parent
                            visible: historyRoot.history.length > 0
                            clip: true
                            spacing: 6
                            model: historyRoot.history
                            delegate: PageHistoryRevisionButton {
                                width: revisionList.width
                                selectedIndex: historyRoot.selectedIndex
                                historyCount: historyRoot.history.length
                                timestampText: historyRoot.formatTimestamp(modelData.created_at)
                                onRevisionSelected: function(index) { historyRoot.selectedIndex = index }
                            }
                        }
                        ColumnLayout {
                            id: historyEmptyState
                            objectName: "historyEmptyState"
                            anchors.centerIn: parent
                            visible: historyRoot.history.length === 0
                            spacing: 8
                            AppIcon { objectName: "historyEmptyIcon"; Layout.alignment: Qt.AlignHCenter; width: 28; height: 28; name: "alert-circle"; color: theme.textMuted; opacity: 0.6 }
                            Text { Layout.maximumWidth: revisionList.width - 24; Layout.alignment: Qt.AlignHCenter; text: "Nenhum histórico encontrado."; color: theme.textMuted; font.pixelSize: 12; horizontalAlignment: Text.AlignHCenter; wrapMode: Text.Wrap; opacity: 0.6 }
                        }
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                color: "#0f0f11"
                ScrollView {
                    id: historyContentScroll
                    anchors.fill: parent
                    contentWidth: availableWidth
                    clip: true
                    visible: historyRoot.selectedEntry() !== null

                    ColumnLayout {
                        objectName: "historyCanvasColumn"
                        width: Math.max(0, Math.min(historyContentScroll.availableWidth, 768)
                                        - (historyRoot.width >= 640 ? 96 : 48))
                        x: Math.max(0, (historyContentScroll.availableWidth - width) / 2)
                        spacing: 0

                        Item { Layout.fillWidth: true; height: historyRoot.width >= 640 ? 64 : 40 }
                        Text {
                            Layout.fillWidth: true
                            text: historyRoot.selectedIndex === 0 ? "Versão Atual" : "Revisão " + (historyRoot.history.length - historyRoot.selectedIndex)
                            color: theme.textDark
                            font.pixelSize: 24
                            font.bold: true
                        }
                        Text {
                            Layout.fillWidth: true
                            Layout.topMargin: 4
                            text: historyRoot.selectedIndex === 0
                                  ? "Visualizando versão atual"
                                  : "Visualizando revisão salva em " + historyRoot.formatTimestamp(historyRoot.selectedEntry().created_at)
                            color: theme.textMuted
                            font.pixelSize: 12
                            font.family: theme.fontMono
                            wrapMode: Text.Wrap
                        }
                        Rectangle {
                            Layout.fillWidth: true
                            Layout.topMargin: 16
                            Layout.bottomMargin: 32
                            height: 1
                            color: "#0affffff"
                        }
                        Text {
                            objectName: "historyRevisionContent"
                            Layout.fillWidth: true
                            text: {
                                var current = historyRoot.selectedEntry()
                                if (!current) return ""
                                var prev = historyRoot.previousEntry()
                                if (historyRoot.showDiff && prev) {
                                    return historyRoot.computeDiffHtml(prev.content || "", current.content || "")
                                }
                                return current.content || ""
                            }
                            textFormat: (historyRoot.showDiff && historyRoot.previousEntry()) || historyRoot.isHtmlDocument(text) ? Text.RichText : Text.MarkdownText
                            color: "#e4e4e7"
                            font.pixelSize: 16
                            wrapMode: Text.Wrap
                            lineHeight: 1.8
                            lineHeightMode: Text.ProportionalHeight
                            onLinkActivated: function(link) { historyRoot.openExternalLink(link) }
                        }
                        Item { Layout.fillWidth: true; height: historyRoot.width >= 640 ? 64 : 40 }
                    }
                }
                Text {
                    anchors.centerIn: parent
                    visible: historyRoot.selectedEntry() === null
                    text: "Selecione uma revisão à esquerda"
                    color: theme.textMuted
                    font.pixelSize: 12
                    font.family: theme.fontMono
                }
            }
        }
    }
}
