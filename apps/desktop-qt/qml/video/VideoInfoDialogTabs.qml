import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: details
    spacing: 0

    property var video: null
    property var controller: null
    property var mediaPlayer: null
    property string activeTab: "overview"
    property alias statusMessage: tracksPanel.statusMessage

    signal videoUpdated(string videoId)

    function formatDuration(value) {
        var seconds = Number(value || 0)
        if (!isFinite(seconds) || seconds < 0) return "00:00"
        var hours = Math.floor(seconds / 3600)
        var minutes = Math.floor((seconds % 3600) / 60)
        var remainder = Math.floor(seconds % 60)
        if (hours > 0) return hours + ":" + (minutes < 10 ? "0" : "") + minutes + ":" + (remainder < 10 ? "0" : "") + remainder
        return (minutes < 10 ? "0" : "") + minutes + ":" + (remainder < 10 ? "0" : "") + remainder
    }

    function progressPercent() {
        var duration = Number(video ? video.duration : 0)
        var progress = Number(video ? video.progress : 0)
        if (!isFinite(duration) || duration <= 0 || !isFinite(progress) || progress <= 0) return 0
        return Math.min(100, Math.round(progress / duration * 100))
    }

    RowLayout {
        Layout.fillWidth: true
        Layout.leftMargin: 20
        Layout.rightMargin: 20
        spacing: 18
        Repeater {
            model: [
                { id: "overview", label: "Visão geral" },
                { id: "tracks", label: "Áudios e legendas" },
                { id: "storage", label: "Armazenamento" }
            ]
            delegate: Item {
                required property var modelData
                Layout.preferredWidth: tabLabel.implicitWidth + 2
                Layout.preferredHeight: 44
                Label {
                    id: tabLabel
                    anchors.centerIn: parent
                    text: modelData.label
                    color: details.activeTab === modelData.id ? "#a78bfa" : "#a7a9be"
                    font.pixelSize: 12
                    font.weight: details.activeTab === modelData.id ? Font.DemiBold : Font.Normal
                }
                Rectangle {
                    anchors.bottom: parent.bottom
                    width: parent.width
                    height: 2
                    radius: 1
                    color: "#a78bfa"
                    visible: details.activeTab === modelData.id
                }
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: details.activeTab = modelData.id
                }
            }
        }
    }

    ScrollView {
        Layout.fillWidth: true
        Layout.fillHeight: true
        clip: true
        contentWidth: availableWidth

        ColumnLayout {
            width: parent.width
            spacing: 12

            Rectangle {
                visible: details.activeTab === "overview"
                Layout.fillWidth: true
                implicitHeight: overviewContent.implicitHeight + 28
                radius: 12
                color: "#08ffffff"
                border.color: "#0cffffff"
                ColumnLayout {
                    id: overviewContent
                    anchors.fill: parent
                    anchors.margins: 14
                    spacing: 10
                    Label { text: "Progresso de estudo"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true }
                    Label {
                        text: details.formatDuration(details.video ? details.video.progress : 0) + " de " +
                              details.formatDuration(details.video ? details.video.duration : 0) +
                              "  ·  " + details.progressPercent() + "%"
                        color: "#f4f4f5"
                        font.pixelSize: 13
                    }
                    Rectangle {
                        Layout.fillWidth: true
                        height: 4
                        radius: 2
                        color: "#1affffff"
                        Rectangle { width: parent.width * details.progressPercent() / 100; height: parent.height; radius: 2; color: "#8b5cf6" }
                    }
                    Label {
                        visible: !!(details.video && details.video.youtube_description)
                        Layout.fillWidth: true
                        text: details.video ? (details.video.youtube_description || "") : ""
                        color: "#d4d4dc"
                        font.pixelSize: 12
                        wrapMode: Text.Wrap
                    }
                }
            }

            VideoInfoTracksPanel {
                id: tracksPanel
                visible: details.activeTab === "tracks"
                Layout.fillWidth: true
                video: details.video
                controller: details.controller
                mediaPlayer: details.mediaPlayer
                onVideoUpdated: function(videoId) { details.videoUpdated(videoId) }
            }

            VideoInfoStoragePanel {
                visible: details.activeTab === "storage"
                Layout.fillWidth: true
                video: details.video
                controller: details.controller
            }
        }
    }

}
