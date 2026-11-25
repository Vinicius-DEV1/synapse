import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: ytSummaryRoot
    anchors.fill: parent
    z: 120
    visible: false
    color: lightReaderTheme ? "#f8fafc" : "#0a0a0c"

    property var controller: null
    property string url: ""
    property string videoTitle: "Vídeo do YouTube"
    property string channelName: ""
    property string summaryText: ""
    property string transcriptText: ""
    property bool isLoading: false
    property bool showTranscript: false
    property bool copiedNotice: false
    property bool lightReaderTheme: false
    readonly property int estimatedReadMinutes: Math.max(1, Math.round(String(summaryText || "").split(/\s+/).length / 200))

    signal closeRequested()
    signal regenerateRequested(string videoUrl)

    Shortcut {
        sequence: "Escape"
        enabled: ytSummaryRoot.visible
        onActivated: ytSummaryRoot.closeRequested()
    }

    Timer {
        id: copyTimer
        interval: 2000
        onTriggered: ytSummaryRoot.copiedNotice = false
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // Header
        Rectangle {
            Layout.fillWidth: true
            height: 58
            color: "#121216"
            border.color: "#1affffff"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 20
                anchors.rightMargin: 16
                spacing: 12

                Rectangle {
                    width: 32
                    height: 32
                    radius: 8
                    color: "#8b5cf6"
                    AppIcon {
                        anchors.centerIn: parent
                        width: 18
                        height: 18
                        name: "sparkles"
                        color: "#ffffff"
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text {
                        text: qsTr("Resumo do Vídeo") + " · " + ytSummaryRoot.videoTitle
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }
                    Text {
                        text: (ytSummaryRoot.channelName.length > 0 ? ytSummaryRoot.channelName : ytSummaryRoot.url) + " · ~" + ytSummaryRoot.estimatedReadMinutes + " min"
                        color: "#71717a"
                        font.pixelSize: 11
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }
                }

                // Theme Toggle
                ToolButton {
                    text: ytSummaryRoot.lightReaderTheme ? "🌙" : "☀"
                    implicitWidth: 32; implicitHeight: 32
                    onClicked: ytSummaryRoot.lightReaderTheme = !ytSummaryRoot.lightReaderTheme
                    background: Rectangle { color: parent.hovered ? "#22ffffff" : "transparent"; radius: 6 }
                }

                // Copy Button
                Button {
                    text: ytSummaryRoot.copiedNotice ? qsTr("Copiado! ✓") : qsTr("Copiar Resumo")
                    flat: true
                    onClicked: {
                        var c = ytSummaryRoot.controller || dataController
                        if (c && typeof c.copyToClipboard === "function") c.copyToClipboard(ytSummaryRoot.summaryText)
                        ytSummaryRoot.copiedNotice = true
                        copyTimer.restart()
                    }
                    contentItem: Text {
                        text: parent.text
                        color: ytSummaryRoot.copiedNotice ? "#34d399" : "#c4b5fd"
                        font.pixelSize: 11
                        font.bold: true
                    }
                }

                // Regenerate Button
                ToolButton {
                    text: "↻"
                    implicitWidth: 32
                    implicitHeight: 32
                    onClicked: ytSummaryRoot.regenerateRequested(ytSummaryRoot.url)
                    contentItem: Text {
                        text: parent.text
                        color: "#a1a1aa"
                        font.pixelSize: 16
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle {
                        color: parent.hovered ? "#22ffffff" : "transparent"
                        radius: 6
                    }
                }

                // Close Button
                ToolButton {
                    text: "✕"
                    implicitWidth: 32
                    implicitHeight: 32
                    onClicked: ytSummaryRoot.closeRequested()
                    contentItem: Text {
                        text: parent.text
                        color: "#a1a1aa"
                        font.pixelSize: 16
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle {
                        color: parent.hovered ? "#22ffffff" : "transparent"
                        radius: 6
                    }
                }
            }
        }

        // Content Canvas
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true

            ColumnLayout {
                width: Math.min(parent.width - 64, 800)
                anchors.horizontalCenter: parent.horizontalCenter
                spacing: 20

                Item { height: 12 }

                // Loading Indicator
                Rectangle {
                    Layout.fillWidth: true
                    height: 80
                    radius: 12
                    color: "#18181f"
                    border.color: "#8b5cf6"
                    visible: ytSummaryRoot.isLoading

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 12
                        BusyIndicator {
                            running: ytSummaryRoot.isLoading
                        }
                        Text {
                            text: qsTr("Processando legendas e gerando resumo cognitivo...")
                            color: "#c4b5fd"
                            font.pixelSize: 13
                        }
                    }
                }

                // Summary Content Display
                Text {
                    Layout.fillWidth: true
                    text: ytSummaryRoot.summaryText.length > 0
                          ? ytSummaryRoot.summaryText
                          : (ytSummaryRoot.isLoading ? "" : qsTr("Nenhum resumo gerado ainda. Clique no botão de atualizar acima para solicitar um novo resumo."))
                    color: "#e4e4e7"
                    font.pixelSize: 14
                    textFormat: Text.MarkdownText
                    wrapMode: Text.Wrap
                    lineHeight: 1.5
                }

                // Collapsible Original Transcript Section
                Rectangle {
                    Layout.fillWidth: true
                    height: transcriptHeader.height + (ytSummaryRoot.showTranscript ? transcriptBody.height + 24 : 0)
                    radius: 10
                    color: "#131318"
                    border.color: "#27272a"
                    visible: ytSummaryRoot.transcriptText.length > 0
                    clip: true

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 8

                        Item {
                            id: transcriptHeader
                            Layout.fillWidth: true
                            height: 28

                            RowLayout {
                                anchors.fill: parent
                                spacing: 8

                                Text {
                                    text: ytSummaryRoot.showTranscript ? "▼" : "▶"
                                    color: "#a1a1aa"
                                    font.pixelSize: 11
                                }

                                Text {
                                    text: qsTr("Transcrição Original do Vídeo")
                                    color: "#a1a1aa"
                                    font.pixelSize: 12
                                    font.bold: true
                                }

                                Item { Layout.fillWidth: true }
                            }

                            MouseArea {
                                anchors.fill: parent
                                onClicked: ytSummaryRoot.showTranscript = !ytSummaryRoot.showTranscript
                            }
                        }

                        Item {
                            id: transcriptBody
                            Layout.fillWidth: true
                            height: ytSummaryRoot.showTranscript ? Math.min(260, transcriptContent.implicitHeight) : 0
                            visible: ytSummaryRoot.showTranscript

                            ScrollView {
                                anchors.fill: parent
                                clip: true

                                Text {
                                    id: transcriptContent
                                    width: parent.width
                                    text: ytSummaryRoot.transcriptText
                                    color: "#71717a"
                                    font.pixelSize: 12
                                    font.family: "Monospace"
                                    wrapMode: Text.Wrap
                                    lineHeight: 1.4
                                }
                            }
                        }
                    }
                }

                Item { height: 24 }
            }
        }
    }
}
