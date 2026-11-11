import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: videoCard
    radius: 12
    color: cardMouse.containsMouse ? "#1affffff" : "#0dffffff"
    border.color: "#0fffffff"
    border.width: 1
    clip: true
    transform: Translate {
        y: cardMouse.containsMouse && videoCard.viewMode === "grid" ? -4 : 0
        Behavior on y { NumberAnimation { duration: 150; easing.type: Easing.OutQuad } }
    }

    property var video: ({})
    property var folders: []
    property string viewMode: "grid"
    readonly property bool compact: viewMode === "compact"
    readonly property bool isList: viewMode !== "grid"

    signal selected(var video)
    signal deleteRequested(var video)
    signal moveRequested(var video, string folderId)
    signal infoRequested(var video)

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return "00:00"
        var mins = Math.floor(seconds / 60)
        var secs = Math.floor(seconds % 60)
        var hrs = Math.floor(mins / 60)
        mins = mins % 60
        if (hrs > 0) return hrs + ":" + (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs
        return (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs
    }

    function formatDate(timestamp) {
        if (!timestamp) return "--"
        var date = new Date(timestamp)
        return isNaN(date.getTime()) ? "--" : date.toLocaleDateString()
    }

    MouseArea {
        id: cardMouse
        anchors.fill: parent
        z: -1
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onClicked: videoCard.selected(videoCard.video)
    }

    ColumnLayout {
        anchors.fill: parent
        visible: videoCard.viewMode === "grid"
        spacing: 0

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: Math.round(videoCard.width * 0.5625)
            color: "#66000000"

            Rectangle {
                anchors.centerIn: parent
                visible: cardMouse.containsMouse
                width: 40
                height: 40
                radius: 20
                color: "#cc8b5cf6"
                Text { anchors.centerIn: parent; anchors.horizontalCenterOffset: 2; text: "▶"; color: "white"; font.pixelSize: 17 }
            }

            RowLayout {
                anchors.top: parent.top
                anchors.right: parent.right
                anchors.margins: 8
                spacing: 4

                Rectangle {
                    visible: !!(videoCard.video.drive_file_id || videoCard.video.drive_web_file_id)
                    width: 24
                    height: 24
                    radius: 6
                    color: "#cc3b82f6"
                    border.color: "#8060a5fa"
                    AppIcon { anchors.centerIn: parent; width: 14; height: 14; name: "cloud"; color: "white" }
                }

                Rectangle {
                    visible: !!videoCard.video.is_local
                    width: 24
                    height: 24
                    radius: 6
                    color: "#cc059669"
                    border.color: "#804ade80"
                    AppIcon { anchors.centerIn: parent; width: 14; height: 14; name: "hard-drive"; color: "white" }
                }
            }

            Rectangle {
                visible: (videoCard.video.duration || 0) > 0
                anchors.bottom: parent.bottom
                anchors.right: parent.right
                anchors.margins: 8
                width: durationText.contentWidth + 12
                height: 20
                radius: 4
                color: "#b3000000"
                Text { id: durationText; anchors.centerIn: parent; text: videoCard.formatTime(videoCard.video.duration || 0); color: "#fffffe"; font.pixelSize: 10; font.bold: true }
            }
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.margins: 12
            spacing: 8
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 3
                Text {
                    Layout.fillWidth: true
                    text: videoCard.video.title || "Vídeo sem título"
                    color: "#fffffe"
                    font.pixelSize: 12
                    font.weight: Font.Medium
                    elide: Text.ElideRight
                }
                Rectangle {
                    Layout.fillWidth: true
                    height: 4
                    radius: 2
                    color: "#19ffffff"
                    visible: (videoCard.video.progress || 0) > 0 && (videoCard.video.duration || 0) > 0
                    Rectangle {
                        width: parent.width * Math.min(1.0, videoCard.video.progress / videoCard.video.duration)
                        height: parent.height
                        radius: 2
                        color: "#8b5cf6"
                    }
                }
            }
            VideoMoveMenu {
                video: videoCard.video
                folders: videoCard.folders
                onMoveRequested: function(selectedVideo, folderId) { videoCard.moveRequested(selectedVideo, folderId) }
                onDeleteRequested: function(selectedVideo) { videoCard.deleteRequested(selectedVideo) }
                onInfoRequested: function(selectedVideo) { videoCard.infoRequested(selectedVideo) }
            }
        }
    }

    RowLayout {
        anchors.fill: parent
        anchors.margins: 8
        visible: videoCard.isList
        spacing: 16

        Rectangle {
            visible: !videoCard.compact
            Layout.preferredWidth: 160
            Layout.fillHeight: true
            radius: 8
            color: "#66000000"
            Rectangle {
                anchors.centerIn: parent
                visible: cardMouse.containsMouse
                width: 40
                height: 40
                radius: 20
                color: "#80000000"
                Text { anchors.centerIn: parent; anchors.horizontalCenterOffset: 2; text: "▶"; color: "white"; font.pixelSize: 16 }
            }
            RowLayout {
                anchors.top: parent.top
                anchors.right: parent.right
                anchors.margins: 6
                spacing: 4
                Rectangle {
                    visible: !!(videoCard.video.drive_file_id || videoCard.video.drive_web_file_id)
                    width: 22
                    height: 22
                    radius: 6
                    color: "#cc3b82f6"
                    AppIcon { anchors.centerIn: parent; width: 13; height: 13; name: "cloud"; color: "white" }
                }
                Rectangle {
                    visible: !!videoCard.video.is_local
                    width: 22
                    height: 22
                    radius: 6
                    color: "#cc059669"
                    AppIcon { anchors.centerIn: parent; width: 13; height: 13; name: "hard-drive"; color: "white" }
                }
            }
        }
        Text {
            visible: videoCard.compact
            text: "▶"
            color: cardMouse.containsMouse ? "#a78bfa" : "#818cf8"
            font.pixelSize: 16
        }
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4
            Text {
                Layout.fillWidth: true
                text: videoCard.video.title || "Vídeo sem título"
                color: "#fffffe"
                font.pixelSize: videoCard.compact ? 12 : 14
                font.weight: Font.Medium
                elide: Text.ElideRight
            }
            Text {
                visible: videoCard.viewMode === "list"
                text: "Adicionado em: " + videoCard.formatDate(videoCard.video.created_at)
                color: "#a7a9be"
                font.pixelSize: 12
                elide: Text.ElideRight
            }
            Rectangle {
                Layout.fillWidth: true
                height: 3
                radius: 2
                color: "#30ffffff"
                visible: (videoCard.video.progress || 0) > 0 && (videoCard.video.duration || 0) > 0
                Rectangle {
                    width: parent.width * Math.min(1.0, videoCard.video.progress / videoCard.video.duration)
                    height: parent.height
                    radius: 2
                    color: "#818cf8"
                }
            }
        }
        Rectangle {
            visible: videoCard.compact && (videoCard.video.duration || 0) > 0
            Layout.preferredWidth: compactDurationText.implicitWidth + 16
            Layout.preferredHeight: 24
            radius: 6
            color: "#0dffffff"
            Text {
                id: compactDurationText
                anchors.centerIn: parent
                text: videoCard.formatTime(videoCard.video.duration || 0)
                color: "#a7a9be"
                font.pixelSize: 12
                font.weight: Font.Medium
            }
        }
        RowLayout {
            visible: videoCard.compact
            spacing: 4
            AppIcon {
                visible: !!(videoCard.video.drive_file_id || videoCard.video.drive_web_file_id)
                width: 14
                height: 14
                name: "cloud"
                color: "#60a5fa"
            }
            AppIcon {
                visible: !!videoCard.video.is_local
                width: 14
                height: 14
                name: "hard-drive"
                color: "#34d399"
            }
        }
        VideoMoveMenu {
            video: videoCard.video
            folders: videoCard.folders
            onMoveRequested: function(selectedVideo, folderId) { videoCard.moveRequested(selectedVideo, folderId) }
            onDeleteRequested: function(selectedVideo) { videoCard.deleteRequested(selectedVideo) }
            onInfoRequested: function(selectedVideo) { videoCard.infoRequested(selectedVideo) }
        }
    }
}
