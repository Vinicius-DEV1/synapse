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

    property string pageTitle: ""
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
        var date = new Date(value || "")
        return isNaN(date.getTime()) ? String(value || "") : Qt.formatDateTime(date, "yyyy-MM-dd HH:mm:ss")
    }

    function computeDiffHtml(oldText, newText) {
        if (!oldText || oldText.length === 0) return newText || ""
        if (!newText || newText.length === 0) {
            return "<span style=\"background-color:rgba(244,63,94,0.25);color:#fda4af;text-decoration:line-through;\">" + oldText + "</span>"
        }
        var oldWords = oldText.split(/\s+/)
        var newWords = newText.split(/\s+/)
        var oldSet = ({})
        for (var i = 0; i < oldWords.length; i++) oldSet[oldWords[i]] = true

        var newSet = ({})
        for (var j = 0; j < newWords.length; j++) newSet[newWords[j]] = true

        var diffResult = ""
        // Track deletions from old words
        for (var d = 0; d < oldWords.length; d++) {
            var ow = oldWords[d]
            if (!newSet[ow]) {
                diffResult += "<span style=\"background-color:rgba(244,63,94,0.25);color:#fda4af;text-decoration:line-through;padding:1px 3px;\">" + ow + "</span> "
            }
        }
        if (diffResult.length > 0) diffResult += "<br/><br/>"

        // Render new words with additions highlighted
        for (var n = 0; n < newWords.length; n++) {
            var nw = newWords[n]
            if (!oldSet[nw]) {
                diffResult += "<span style=\"background-color:rgba(16,185,129,0.25);color:#6ee7b7;padding:1px 3px;font-weight:bold;\">+" + nw + "</span> "
            } else {
                diffResult += nw + " "
            }
        }
        return diffResult
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
            height: 58
            color: "#0f0f11"
            border.color: "#0affffff"
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 22
                anchors.rightMargin: 18
                spacing: 10
                Rectangle {
                    width: 30
                    height: 30
                    radius: 8
                    color: "#08ffffff"
                    border.color: "#0affffff"
                    AppIcon { anchors.centerIn: parent; width: 15; height: 15; name: "clock"; color: theme.textSubtext }
                }
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text { text: "Histórico de edições"; color: theme.textDark; font.pixelSize: 12; font.bold: true }
                    Text { text: historyRoot.history.length + (historyRoot.history.length === 1 ? " revisão" : " revisões") + " · " + historyRoot.pageTitle; color: theme.textMuted; font.pixelSize: 9; elide: Text.ElideRight }
                }

                // Diff View Toggle
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

                // Restore Button
                Button {
                    text: qsTr("Restaurar Esta Versão")
                    flat: true
                    visible: historyRoot.selectedIndex > 0 && historyRoot.selectedEntry() !== null
                    onClicked: {
                        var entry = historyRoot.selectedEntry()
                        if (entry && entry.content) {
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
                Layout.preferredWidth: 286
                Layout.fillHeight: true
                color: "#121214"
                border.color: "#08ffffff"
                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 8
                    Label { text: "REVISÕES"; color: theme.textMuted; font.pixelSize: 9; font.bold: true; font.letterSpacing: 0.6; Layout.leftMargin: 6 }
                    ListView {
                        id: revisionList
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        clip: true
                        spacing: 4
                        model: historyRoot.history
                        delegate: Rectangle {
                            required property var modelData
                            required property int index
                            width: revisionList.width
                            height: 58
                            radius: 9
                            color: historyRoot.selectedIndex === index ? "#1affffff" : revisionMouse.containsMouse ? "#0affffff" : "transparent"
                            border.color: historyRoot.selectedIndex === index ? "#26ffffff" : "transparent"
                            ColumnLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 12
                                spacing: 4
                                Text { text: index === 0 ? "Versão atual" : "Revisão " + (historyRoot.history.length - index); color: historyRoot.selectedIndex === index ? theme.textDark : theme.textSubtext; font.pixelSize: 10; font.bold: true }
                                Text { text: historyRoot.formatTimestamp(modelData.created_at); color: theme.textMuted; font.pixelSize: 9; font.family: theme.fontMono }
                            }
                            MouseArea {
                                id: revisionMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                onClicked: historyRoot.selectedIndex = index
                            }
                        }
                        footer: ColumnLayout {
                            width: revisionList.width
                            visible: historyRoot.history.length === 0
                            spacing: 8
                            Item { Layout.fillWidth: true; height: 90 }
                            AppIcon { Layout.alignment: Qt.AlignHCenter; width: 26; height: 26; name: "clock"; color: theme.textMuted }
                            Text { Layout.fillWidth: true; text: "Nenhum histórico encontrado."; color: theme.textMuted; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; wrapMode: Text.Wrap }
                        }
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                color: "#0f0f11"
                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 30
                    spacing: 12
                    Text {
                        text: historyRoot.selectedEntry()
                              ? (historyRoot.selectedIndex === 0 ? "Versão atual" : "Revisão " + (historyRoot.history.length - historyRoot.selectedIndex))
                              : ""
                        color: theme.textDark
                        font.pixelSize: 21
                        font.bold: true
                    }
                    Text {
                        text: historyRoot.selectedEntry()
                              ? "Salva em " + historyRoot.formatTimestamp(historyRoot.selectedEntry().created_at) +
                                (historyRoot.showDiff && historyRoot.previousEntry() ? " (comparando com revisão anterior)" : "")
                              : "Selecione uma revisão à esquerda para visualizar o conteúdo."
                        color: theme.textMuted
                        font.pixelSize: 9
                        font.family: theme.fontMono
                    }
                    Rectangle { Layout.fillWidth: true; height: 1; color: "#0affffff" }
                    ScrollView {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        clip: true
                        Text {
                            width: parent.width
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
                            color: theme.textSubtext
                            font.pixelSize: 14
                            wrapMode: Text.Wrap
                            lineHeight: 1.45
                            onLinkActivated: function(link) { historyRoot.openExternalLink(link) }
                        }
                    }
                }
            }
        }
    }
}
