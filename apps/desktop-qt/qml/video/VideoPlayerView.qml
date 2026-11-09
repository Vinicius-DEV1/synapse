import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import Synapse.Media 1.0

Rectangle {
    id: videoRoot
    color: "#0f0e17"

    property var videos: []
    property var activeVideo: null
    property bool isPlaying: false
    property double currentPos: 0
    property double videoDuration: 0

    function loadVideos() {
        videos = dataController.getVideos()
    }

    function playVideo(vid) {
        activeVideo = vid
        if (mpvPlayer) {
            mpvPlayer.command(["loadfile", vid.file_path])
            isPlaying = true
        }
    }

    function exitPlayer() {
        if (mpvPlayer) {
            mpvPlayer.command(["stop"])
        }
        isPlaying = false
        activeVideo = null
        loadVideos()
    }

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return "00:00"
        var mins = Math.floor(seconds / 60)
        var secs = Math.floor(seconds % 60)
        var hrs = Math.floor(mins / 60)
        mins = mins % 60
        if (hrs > 0) {
            return hrs + ":" + (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs
        }
        return (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs
    }

    Component.onCompleted: {
        loadVideos()
    }

    // ===================================================================
    // 1. Gallery Mode (When No Video is Actively Playing)
    // ===================================================================
    Item {
        anchors.fill: parent
        visible: !videoRoot.activeVideo

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 32
            spacing: 24

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 16

                ColumnLayout {
                    spacing: 4
                    Text {
                        text: "🎬 Media Center & Vídeos"
                        color: "#fffffe"
                        font.pixelSize: 24
                        font.bold: true
                    }
                    Text {
                        text: "Decodificação de vídeo nativa acelerada por GPU (libmpv) • " + videoRoot.videos.length + " vídeo(s)"
                        color: "#a7a9be"
                        font.pixelSize: 13
                    }
                }

                Item { Layout.fillWidth: true }

                Rectangle {
                    width: 140; height: 38; radius: 10
                    color: "#7c3aed" // brand-600

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 8
                        Text { text: "+"; color: "#ffffff"; font.pixelSize: 18; font.bold: true }
                        Text { text: "Novo Vídeo"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            // Quick refresh
                            videoRoot.loadVideos()
                        }
                    }
                }
            }

            // Videos Grid
            GridView {
                id: videoGrid
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                cellWidth: 320
                cellHeight: 240
                model: videoRoot.videos

                delegate: Rectangle {
                    width: 300
                    height: 220
                    radius: 12
                    color: "#1a1924" // bg-dark-card
                    border.color: cardMouse.containsMouse ? "#8b5cf64d" : "#ffffff0f"
                    border.width: 1

                    ColumnLayout {
                        anchors.fill: parent
                        spacing: 0

                        // Thumbnail Area
                        Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 150
                            radius: 12
                            color: "#15141b"
                            clip: true

                            // Gradient simulation
                            Rectangle {
                                anchors.fill: parent
                                color: "#222133"
                            }

                            // Play icon overlay
                            Rectangle {
                                anchors.centerIn: parent
                                width: 48; height: 48; radius: 24
                                color: cardMouse.containsMouse ? "#7c3aed" : "#00000080"

                                Text {
                                    anchors.centerIn: parent
                                    text: "▶"
                                    color: "#ffffff"
                                    font.pixelSize: 18
                                    anchors.horizontalCenterOffset: 2
                                }
                            }

                            // Duration badge
                            Rectangle {
                                anchors.bottom: parent.bottom
                                anchors.right: parent.right
                                anchors.margins: 8
                                width: durationText.contentWidth + 12
                                height: 20
                                radius: 4
                                color: "#000000b3"

                                Text {
                                    id: durationText
                                    anchors.centerIn: parent
                                    text: videoRoot.formatTime(modelData.duration || 0)
                                    color: "#fffffe"
                                    font.pixelSize: 11
                                    font.bold: true
                                }
                            }

                            // Progress Bar
                            Rectangle {
                                anchors.bottom: parent.bottom
                                width: parent.width * Math.min(1.0, (modelData.progress || 0) / (modelData.duration || 1))
                                height: 4
                                color: "#8b5cf6"
                                visible: (modelData.progress || 0) > 0
                            }
                        }

                        // Meta details
                        ColumnLayout {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            Layout.margins: 12
                            spacing: 4

                            Text {
                                Layout.fillWidth: true
                                text: modelData.title || "Vídeo sem título"
                                color: cardMouse.containsMouse ? "#a78bfa" : "#fffffe"
                                font.pixelSize: 14
                                font.bold: true
                                elide: Text.ElideRight
                            }

                            Text {
                                text: (modelData.is_local ? "Arquivo Local" : "Criptografado ENC1") + " • " + (modelData.file_path ? modelData.file_path.split('/').pop() : "")
                                color: "#a7a9be"
                                font.pixelSize: 11
                                elide: Text.ElideRight
                                Layout.fillWidth: true
                            }
                        }
                    }

                    MouseArea {
                        id: cardMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: videoRoot.playVideo(modelData)
                    }
                }

                Text {
                    anchors.centerIn: parent
                    visible: videoRoot.videos.length === 0
                    text: "Nenhum vídeo catalogado no banco de dados."
                    color: "#64748b"
                    font.pixelSize: 15
                }
            }
        }
    }

    // ===================================================================
    // 2. Active Video Player Mode (libmpv Hardware GPU Canvas)
    // ===================================================================
    Item {
        anchors.fill: parent
        visible: videoRoot.activeVideo !== null

        // Hardware accelerated mpv frame
        MpvVideoPlayer {
            id: mpvPlayer
            anchors.fill: parent

            onPositionChanged: function(pos) {
                videoRoot.currentPos = pos
                if (videoRoot.activeVideo && Math.floor(pos) % 5 === 0) {
                    dataController.updateVideoProgress(videoRoot.activeVideo.id, pos)
                }
            }

            onDurationChanged: function(dur) {
                videoRoot.videoDuration = dur
            }
        }

        // Top Navigation Bar (Hover Overlay)
        Rectangle {
            anchors.top: parent.top
            anchors.left: parent.left
            anchors.right: parent.right
            height: 64
            color: "#0f0e17e6"

            RowLayout {
                anchors.fill: parent
                anchors.margins: 16
                spacing: 16

                Rectangle {
                    width: 32; height: 32; radius: 8
                    color: "#ffffff1a"

                    Text {
                        anchors.centerIn: parent
                        text: "←"
                        color: "#ffffff"
                        font.pixelSize: 18
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: videoRoot.exitPlayer()
                    }
                }

                Text {
                    Layout.fillWidth: true
                    text: videoRoot.activeVideo ? videoRoot.activeVideo.title : ""
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                    elide: Text.ElideRight
                }

                Rectangle {
                    width: 60; height: 26; radius: 6
                    color: "#10b98126"
                    border.color: "#10b9814d"
                    Text {
                        anchors.centerIn: parent
                        text: "HW GPU"
                        color: "#10b981"
                        font.pixelSize: 11
                        font.bold: true
                    }
                }
            }
        }

        // Bottom Controls Overlay
        Rectangle {
            anchors.bottom: parent.bottom
            anchors.left: parent.left
            anchors.right: parent.right
            height: 80
            color: "#0f0e17e6"

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 16
                spacing: 6

                // Scrubber Slider
                Slider {
                    id: timeSlider
                    Layout.fillWidth: true
                    from: 0
                    to: Math.max(1, videoRoot.videoDuration)
                    value: videoRoot.currentPos

                    onMoved: {
                        if (mpvPlayer) {
                            mpvPlayer.command(["seek", value.toString(), "absolute"])
                        }
                    }
                }

                // Controls Row
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 16

                    // Play / Pause
                    Rectangle {
                        width: 36; height: 36; radius: 8
                        color: "#7c3aed"

                        Text {
                            anchors.centerIn: parent
                            text: videoRoot.isPlaying ? "❚❚" : "▶"
                            color: "#ffffff"
                            font.pixelSize: 14
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                if (mpvPlayer) {
                                    mpvPlayer.command(["cycle", "pause"])
                                    videoRoot.isPlaying = !videoRoot.isPlaying
                                }
                            }
                        }
                    }

                    // Time display
                    Text {
                        text: videoRoot.formatTime(videoRoot.currentPos) + " / " + videoRoot.formatTime(videoRoot.videoDuration)
                        color: "#a7a9be"
                        font.pixelSize: 13
                        font.family: "Monospace"
                    }

                    Item { Layout.fillWidth: true }

                    Button {
                        text: "Voltar para Lista (Esc)"
                        onClicked: videoRoot.exitPlayer()
                    }
                }
            }
        }
    }
}
