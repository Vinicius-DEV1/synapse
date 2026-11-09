import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import Synapse.Media 1.0

Item {
    id: globalLofiRoot
    z: 9999

    property var activeTrack: null
    property bool isPlaying: false
    property bool isExpanded: false
    property double currentTime: 0
    property double trackDuration: 0
    property double playerVolume: 0.75

    // Helper to format seconds into mm:ss or hh:mm:ss
    function formatTime(sec) {
        if (!sec || isNaN(sec) || sec < 0) return "0:00";
        var s = Math.floor(sec);
        var m = Math.floor(s / 60);
        var h = Math.floor(m / 60);
        s = s % 60;
        m = m % 60;
        var sStr = s < 10 ? "0" + s : "" + s;
        if (h > 0) {
            var mStr = m < 10 ? "0" + m : "" + m;
            return h + ":" + mStr + ":" + sStr;
        }
        return m + ":" + sStr;
    }

    function playTrack(track) {
        if (!track) return;
        activeTrack = track;
        isPlaying = true;
        isExpanded = true;
        if (track.file_path) {
            audioBackend.command(["loadfile", track.file_path]);
            audioBackend.volume = playerVolume * 100;
        }
    }

    function togglePlay() {
        if (!activeTrack) return;
        isPlaying = !isPlaying;
        audioBackend.togglePlay();
    }

    function stopTrack() {
        audioBackend.command(["stop"]);
        activeTrack = null;
        isPlaying = false;
        isExpanded = false;
        currentTime = 0;
        trackDuration = 0;
    }

    // Headless MPV engine instance dedicated to audio & ambient lofi playback
    MpvVideoPlayer {
        id: audioBackend
        visible: false
        width: 0
        height: 0

        onPositionChanged: {
            globalLofiRoot.currentTime = audioBackend.position;
        }

        onDurationChanged: {
            if (audioBackend.duration > 0) {
                globalLofiRoot.trackDuration = audioBackend.duration;
            } else if (globalLofiRoot.activeTrack && globalLofiRoot.activeTrack.duration > 0) {
                globalLofiRoot.trackDuration = globalLofiRoot.activeTrack.duration;
            }
        }

        onEndOfFile: {
            // Auto-loop ambient lofi track seamlessly
            if (globalLofiRoot.activeTrack && globalLofiRoot.activeTrack.file_path) {
                audioBackend.command(["loadfile", globalLofiRoot.activeTrack.file_path]);
            }
        }
    }

    // Only visible when an active track is loaded or playing
    visible: activeTrack !== null

    // Anchored at bottom-left corner
    anchors.left: parent.left
    anchors.bottom: parent.bottom
    anchors.margins: 20
    width: isExpanded ? 280 : 48
    height: isExpanded ? 116 : 48

    Behavior on width { NumberAnimation { duration: 250; easing.type: Easing.OutCubic } }
    Behavior on height { NumberAnimation { duration: 250; easing.type: Easing.OutCubic } }

    // Expanded Popup Card
    Rectangle {
        id: expandedCard
        anchors.fill: parent
        radius: isExpanded ? 16 : 24
        color: isExpanded ? "#181726" : (lofiBubbleMouse.containsMouse ? "#26223b" : "#1f1d2e")
        border.color: isExpanded ? "#ffffff14" : (globalLofiRoot.isPlaying ? "#8b5cf680" : "#ffffff1a")
        border.width: 1
        clip: true

        Behavior on radius { NumberAnimation { duration: 200 } }
        Behavior on color { ColorAnimation { duration: 150 } }

        // Subtle Drop Shadow Effect
        Rectangle {
            anchors.fill: parent
            anchors.margins: -1
            radius: parent.radius
            color: "transparent"
            border.color: globalLofiRoot.isPlaying ? "#8b5cf633" : "transparent"
            border.width: 2
            visible: globalLofiRoot.isPlaying
        }

        // ==========================================================
        // 1. Minimized View (Bubble Mode)
        // ==========================================================
        Item {
            anchors.fill: parent
            visible: !globalLofiRoot.isExpanded

            Row {
                anchors.centerIn: parent
                spacing: 3
                visible: globalLofiRoot.isPlaying

                // 3 Equalizer animated bars
                Rectangle {
                    width: 3; height: 10; radius: 1.5; color: "#c4b5fd"
                    SequentialAnimation on height {
                        loops: Animation.Infinite
                        running: globalLofiRoot.isPlaying
                        NumberAnimation { to: 16; duration: 400; easing.type: Easing.InOutQuad }
                        NumberAnimation { to: 6; duration: 400; easing.type: Easing.InOutQuad }
                    }
                }
                Rectangle {
                    width: 3; height: 14; radius: 1.5; color: "#a855f7"
                    SequentialAnimation on height {
                        loops: Animation.Infinite
                        running: globalLofiRoot.isPlaying
                        NumberAnimation { to: 8; duration: 350; easing.type: Easing.InOutQuad }
                        NumberAnimation { to: 18; duration: 350; easing.type: Easing.InOutQuad }
                    }
                }
                Rectangle {
                    width: 3; height: 8; radius: 1.5; color: "#c4b5fd"
                    SequentialAnimation on height {
                        loops: Animation.Infinite
                        running: globalLofiRoot.isPlaying
                        NumberAnimation { to: 14; duration: 450; easing.type: Easing.InOutQuad }
                        NumberAnimation { to: 4; duration: 450; easing.type: Easing.InOutQuad }
                    }
                }
            }

            Text {
                anchors.centerIn: parent
                visible: !globalLofiRoot.isPlaying
                text: "🎧"
                font.pixelSize: 18
            }

            MouseArea {
                id: lofiBubbleMouse
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                hoverEnabled: true
                onClicked: globalLofiRoot.isExpanded = true
            }
        }

        // ==========================================================
        // 2. Full Expanded Mini Player View
        // ==========================================================
        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 12
            spacing: 8
            visible: globalLofiRoot.isExpanded
            opacity: globalLofiRoot.isExpanded ? 1.0 : 0.0

            Behavior on opacity { NumberAnimation { duration: 200 } }

            // Top Header: Icon + Titles + Minimize + Close
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                // Equalizer Icon Badge
                Rectangle {
                    width: 32
                    height: 32
                    radius: 8
                    color: "#8b5cf626"
                    border.color: "#8b5cf640"
                    border.width: 1

                    Text {
                        anchors.centerIn: parent
                        text: globalLofiRoot.isPlaying ? "🔊" : "🎧"
                        font.pixelSize: 14
                    }
                }

                // Title & Subtitle Info
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2

                    Text {
                        Layout.fillWidth: true
                        text: globalLofiRoot.activeTrack ? (globalLofiRoot.activeTrack.title || globalLofiRoot.activeTrack.original_name || "Trilha Lofi") : ""
                        color: "#fffffe"
                        font.pixelSize: 12
                        font.bold: true
                        elide: Text.ElideRight
                    }

                    RowLayout {
                        spacing: 6
                        Text {
                            text: "LOFI STATION"
                            color: "#a855f7"
                            font.pixelSize: 9
                            font.bold: true
                            font.letterSpacing: 0.8
                        }
                        Text {
                            text: "•"
                            color: "#ffffff33"
                            font.pixelSize: 8
                        }
                        Text {
                            text: globalLofiRoot.formatTime(globalLofiRoot.currentTime) + " / " + globalLofiRoot.formatTime(globalLofiRoot.trackDuration || (globalLofiRoot.activeTrack ? globalLofiRoot.activeTrack.duration : 0))
                            color: "#94a3b8"
                            font.pixelSize: 10
                            font.family: "monospace"
                        }
                    }
                }

                // Minimize Button
                Rectangle {
                    width: 22
                    height: 22
                    radius: 11
                    color: minimizeMouse.containsMouse ? "#ffffff1f" : "transparent"

                    Text {
                        anchors.centerIn: parent
                        text: "⌄"
                        color: "#94a3b8"
                        font.pixelSize: 14
                        font.bold: true
                    }

                    MouseArea {
                        id: minimizeMouse
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        hoverEnabled: true
                        onClicked: globalLofiRoot.isExpanded = false
                    }
                }

                // Stop / Close Button
                Rectangle {
                    width: 22
                    height: 22
                    radius: 11
                    color: closeMouse.containsMouse ? "#f43f5e33" : "transparent"

                    Text {
                        anchors.centerIn: parent
                        text: "✕"
                        color: closeMouse.containsMouse ? "#f43f5e" : "#94a3b8"
                        font.pixelSize: 10
                        font.bold: true
                    }

                    MouseArea {
                        id: closeMouse
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        hoverEnabled: true
                        onClicked: globalLofiRoot.stopTrack()
                    }
                }
            }

            // Bottom Controls: Play/Pause + Volume Slider
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                // Play / Pause Circular Button
                Rectangle {
                    width: 30
                    height: 30
                    radius: 15
                    color: playBtnMouse.containsMouse ? "#f1f5f9" : "#ffffff"

                    Text {
                        anchors.centerIn: parent
                        text: globalLofiRoot.isPlaying ? "⏸" : "▶"
                        color: "#0f0e17"
                        font.pixelSize: 11
                        font.bold: true
                    }

                    MouseArea {
                        id: playBtnMouse
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        hoverEnabled: true
                        onClicked: globalLofiRoot.togglePlay()
                    }
                }

                // Volume Icon
                Text {
                    text: globalLofiRoot.playerVolume === 0 ? "🔇" : "🔉"
                    font.pixelSize: 12
                }

                // Custom Volume Slider
                Slider {
                    id: volumeSlider
                    Layout.fillWidth: true
                    from: 0.0
                    to: 1.0
                    value: globalLofiRoot.playerVolume
                    onMoved: {
                        globalLofiRoot.playerVolume = value;
                        audioBackend.volume = value * 100;
                    }

                    background: Rectangle {
                        x: volumeSlider.leftPadding
                        y: volumeSlider.topPadding + volumeSlider.availableHeight / 2 - height / 2
                        implicitWidth: 100
                        implicitHeight: 4
                        width: volumeSlider.availableWidth
                        height: 4
                        radius: 2
                        color: "#ffffff1a"

                        Rectangle {
                            width: volumeSlider.visualPosition * parent.width
                            height: parent.height
                            color: "#8b5cf6"
                            radius: 2
                        }
                    }

                    handle: Rectangle {
                        x: volumeSlider.leftPadding + volumeSlider.visualPosition * (volumeSlider.availableWidth - width)
                        y: volumeSlider.topPadding + volumeSlider.availableHeight / 2 - height / 2
                        implicitWidth: 10
                        implicitHeight: 10
                        radius: 5
                        color: volumeSlider.pressed ? "#c4b5fd" : "#fffffe"
                    }
                }

                // Volume Percent Text
                Text {
                    text: Math.round(globalLofiRoot.playerVolume * 100) + "%"
                    color: "#94a3b8"
                    font.pixelSize: 10
                    font.family: "monospace"
                    Layout.preferredWidth: 32
                    horizontalAlignment: Text.AlignRight
                }
            }
        }
    }
}
