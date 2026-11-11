import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Dialogs
import QtQuick.Layouts 1.15

Item {
    id: selectorRoot

    property var player: null
    property var controller: null
    property var activeVideo: null
    property bool popupOpen: audioMenu.opened || subtitleMenu.opened || subtitleFileDialog.visible
    property string statusMessage: ""
    implicitWidth: trackRow.implicitWidth
    implicitHeight: trackRow.implicitHeight

    function trackLabel(track, fallback) {
        if (track.title && track.title.length > 0) return track.title
        if (track.lang && track.lang.length > 0) return track.lang
        return fallback + " " + track.id
    }

    function selectedLabel(tracks, fallback) {
        for (var i = 0; i < tracks.length; i++) {
            if (tracks[i].selected) return trackLabel(tracks[i], fallback)
        }
        return fallback === "Subtitle" ? "Off" : "Auto"
    }

    function menuItems(tracks, fallback) {
        var items = []
        for (var i = 0; i < tracks.length; i++) {
            items.push({
                id: tracks[i].id,
                label: trackLabel(tracks[i], fallback),
                selected: tracks[i].selected,
                player: selectorRoot.player
            })
        }
        return items
    }

    Connections {
        target: selectorRoot.controller
        function onFileOperationFinished(result) {
            if (result.operation !== "video-subtitle-import" || !selectorRoot.activeVideo ||
                result.videoId !== selectorRoot.activeVideo.id) return
            selectorRoot.statusMessage = result.success
                ? (result.loaded ? "Subtitle added and selected." : "Subtitle saved for this video.")
                : (result.error || "Subtitle import failed.")
        }
    }

    Timer {
        id: statusMessageTimer
        interval: 4500
        onTriggered: selectorRoot.statusMessage = ""
    }
    onStatusMessageChanged: if (statusMessage.length > 0) statusMessageTimer.restart()

    RowLayout {
        id: trackRow
        anchors.fill: parent
        spacing: 6

        Button {
            id: audioButton
            visible: selectorRoot.player && selectorRoot.player.audioTracks.length > 1
            Layout.preferredWidth: 142
            text: "Audio · " + selectorRoot.selectedLabel(
                      selectorRoot.player ? selectorRoot.player.audioTracks : [], "Audio")
            font.pixelSize: 11
            onClicked: audioMenu.open()
            contentItem: Text {
                text: audioButton.text
                color: "#e4e4e7"
                font: audioButton.font
                elide: Text.ElideRight
                verticalAlignment: Text.AlignVCenter
                horizontalAlignment: Text.AlignHCenter
            }
            background: Rectangle {
                radius: 6
                color: audioButton.down ? "#30303b" : "#171720"
                border.color: "#242430"
            }
            ToolTip.visible: hovered
            ToolTip.text: audioButton.text

            Menu {
                id: audioMenu
                title: "Audio tracks"
                MenuItem {
                    text: "Automatic"
                    checkable: true
                    checked: selectorRoot.player && selectorRoot.player.audioTrackSelectionId < 0
                    onTriggered: selectorRoot.player.selectAudioTrack(-1)
                }
                Repeater {
                    model: selectorRoot.player
                        ? selectorRoot.menuItems(selectorRoot.player.audioTracks, "Audio") : []
                    delegate: MenuItem {
                        required property var modelData
                        text: modelData.label
                        checkable: true
                        checked: modelData.selected
                        onTriggered: modelData.player.selectAudioTrack(modelData.id)
                    }
                }
            }
        }

        Button {
            id: subtitleButton
            visible: selectorRoot.player && (selectorRoot.player.subtitleTracks.length > 0 ||
                     selectorRoot.controller !== null)
            Layout.preferredWidth: 142
            text: "Subtitle · " + selectorRoot.selectedLabel(
                      selectorRoot.player ? selectorRoot.player.subtitleTracks : [], "Subtitle")
            font.pixelSize: 11
            onClicked: subtitleMenu.open()
            contentItem: Text {
                text: subtitleButton.text
                color: "#e4e4e7"
                font: subtitleButton.font
                elide: Text.ElideRight
                verticalAlignment: Text.AlignVCenter
                horizontalAlignment: Text.AlignHCenter
            }
            background: Rectangle {
                radius: 6
                color: subtitleButton.down ? "#30303b" : "#171720"
                border.color: "#242430"
            }
            ToolTip.visible: hovered || selectorRoot.statusMessage.length > 0
            ToolTip.text: selectorRoot.statusMessage || subtitleButton.text

            Menu {
                id: subtitleMenu
                title: "Subtitle tracks"
                MenuItem {
                    text: "No subtitles"
                    checkable: true
                    checked: selectorRoot.selectedLabel(
                                 selectorRoot.player ? selectorRoot.player.subtitleTracks : [], "Subtitle") === "Off"
                    onTriggered: selectorRoot.player.selectSubtitleTrack(-1)
                }
                Repeater {
                    model: selectorRoot.player
                        ? selectorRoot.menuItems(selectorRoot.player.subtitleTracks, "Subtitle") : []
                    delegate: MenuItem {
                        required property var modelData
                        text: modelData.label
                        checkable: true
                        checked: modelData.selected
                        onTriggered: modelData.player.selectSubtitleTrack(modelData.id)
                    }
                }
                MenuSeparator { }
                MenuItem {
                    text: "Load external subtitle…"
                    enabled: selectorRoot.controller && selectorRoot.activeVideo &&
                             !selectorRoot.controller.fileOperationRunning
                    onTriggered: subtitleFileDialog.open()
                }
            }
        }
    }

    FileDialog {
        id: subtitleFileDialog
        title: "Load external subtitle"
        fileMode: FileDialog.OpenFile
        nameFilters: ["Subtitle files (*.srt *.vtt)"]
        onAccepted: {
            if (selectedFile && selectorRoot.controller && selectorRoot.activeVideo) {
                selectorRoot.statusMessage = "Importing subtitle…"
                selectorRoot.controller.importVideoSubtitle(
                    selectorRoot.player, selectorRoot.activeVideo.id, selectedFile)
            }
        }
    }
}
