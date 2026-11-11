import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Dialogs

Rectangle {
    id: trackPanel
    implicitHeight: trackContent.implicitHeight + 28
    radius: 12
    color: "#08ffffff"
    border.color: "#0cffffff"

    property var video: null
    property var controller: null
    property var mediaPlayer: null
    property string statusMessage: ""
    property string editingTrackId: ""
    property string editLabelValue: ""
    property var pendingRemoval: null
    property bool isProcessing: false

    signal videoUpdated(string videoId)

    function audioTracks() {
        if (!video || !video.audio_tracks_json) return []
        try {
            var parsed = JSON.parse(video.audio_tracks_json)
            return Array.isArray(parsed) ? parsed.filter(function(track) {
                return track !== null && typeof track === "object" && !Array.isArray(track)
            }) : []
        } catch (error) {
            console.warn("[VideoInfoTracksPanel] Invalid audio track metadata for video", video.id, error)
            return []
        }
    }

    function subtitleTracks() {
        if (!video) return []
        var tracks = []
        var serialized = video.subtitles_json || ""
        if (serialized.length > 0) {
            try {
                var parsed = JSON.parse(serialized)
                if (Array.isArray(parsed)) tracks = parsed
            } catch (error) {
                console.warn("[VideoInfoTracksPanel] Invalid subtitle metadata for video", video.id, error)
            }
        }
        if (video.local_subtitle_path) {
            var hasLegacyTrack = false
            for (var index = 0; index < tracks.length; ++index) {
                if (tracks[index].id === "legacy" || tracks[index].local_path === video.local_subtitle_path) {
                    hasLegacyTrack = true
                    break
                }
            }
            if (!hasLegacyTrack) {
                tracks = tracks.concat([{ id: "legacy", label: "Subtitle", local_path: video.local_subtitle_path }])
            }
        }
        return tracks
    }

    function fileName(path) {
        if (!path) return "—"
        var parts = String(path).split(/[\\/]/)
        return parts[parts.length - 1] || "—"
    }

    function saveRename(trackId) {
        var normalizedLabel = editLabelValue.trim()
        if (!normalizedLabel || !controller || !video || isProcessing) return
        isProcessing = true
        var succeeded = controller.renameVideoSubtitle(video.id, trackId, normalizedLabel)
        isProcessing = false
        editingTrackId = ""
        editLabelValue = ""
        if (!succeeded) {
            statusMessage = "Could not rename this subtitle."
            return
        }
        statusMessage = "Subtitle renamed."
        videoUpdated(video.id)
    }

    function confirmRemoval() {
        if (!pendingRemoval || !controller || !video || isProcessing) return
        isProcessing = true
        var succeeded = controller.removeVideoSubtitle(video.id, pendingRemoval.id)
        isProcessing = false
        if (!succeeded) {
            statusMessage = "Could not remove this subtitle."
            removeDialog.reject()
            return
        }
        var removedId = pendingRemoval.id
        pendingRemoval = null
        removeDialog.accept()
        statusMessage = "Subtitle removed."
        videoUpdated(video.id)
        if (editingTrackId === removedId) editingTrackId = ""
    }

    ColumnLayout {
        id: trackContent
        anchors.fill: parent
        anchors.margins: 14
        spacing: 10
        VideoInfoAudioTracksPanel {
            Layout.fillWidth: true
            tracks: trackPanel.audioTracks()
        }
        RowLayout {
            Layout.fillWidth: true
            Label { Layout.fillWidth: true; text: "Local subtitles"; color: "#f4f4f5"; font.pixelSize: 13; font.bold: true }
            Button {
                text: trackPanel.controller && trackPanel.controller.fileOperationRunning ? "Importing…" : "+ Add"
                enabled: !!trackPanel.controller && !!trackPanel.mediaPlayer && !trackPanel.controller.fileOperationRunning
                onClicked: subtitleDialog.open()
            }
        }
        Repeater {
            model: trackPanel.subtitleTracks()
            delegate: Rectangle {
                id: subtitleRow
                required property var modelData
                readonly property bool isEditing: trackPanel.editingTrackId === modelData.id
                Layout.fillWidth: true
                implicitHeight: isEditing ? 54 : 48
                radius: 8
                color: "#0d000000"
                border.color: "#0cffffff"

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 10
                    anchors.rightMargin: 6
                    spacing: 6
                    TextField {
                        visible: subtitleRow.isEditing
                        Layout.fillWidth: true
                        text: trackPanel.editLabelValue
                        onTextChanged: trackPanel.editLabelValue = text
                        onAccepted: trackPanel.saveRename(subtitleRow.modelData.id)
                        selectByMouse: true
                        color: "#f4f4f5"
                        background: Rectangle { color: "#181720"; radius: 6; border.color: "#408b5cf6" }
                    }
                    ColumnLayout {
                        visible: !subtitleRow.isEditing
                        Layout.fillWidth: true
                        spacing: 2
                        Label { Layout.fillWidth: true; text: subtitleRow.modelData.label || "Subtitle"; color: "#e4e4e7"; font.pixelSize: 12; elide: Text.ElideRight }
                        Label { text: trackPanel.fileName(subtitleRow.modelData.local_path); color: "#88899c"; font.pixelSize: 9; font.family: "monospace"; elide: Text.ElideMiddle }
                    }
                    Button {
                        visible: subtitleRow.isEditing
                        text: "Save"
                        enabled: !trackPanel.isProcessing && trackPanel.editLabelValue.trim().length > 0
                        onClicked: trackPanel.saveRename(subtitleRow.modelData.id)
                    }
                    ToolButton {
                        visible: !subtitleRow.isEditing
                        enabled: !trackPanel.isProcessing
                        text: "✎"
                        Accessible.name: "Rename subtitle"
                        onClicked: {
                            trackPanel.editingTrackId = subtitleRow.modelData.id
                            trackPanel.editLabelValue = subtitleRow.modelData.label || "Subtitle"
                        }
                    }
                    ToolButton {
                        visible: !subtitleRow.isEditing
                        enabled: !trackPanel.isProcessing
                        text: "×"
                        Accessible.name: "Remove subtitle"
                        onClicked: {
                            trackPanel.pendingRemoval = subtitleRow.modelData
                            removeDialog.open()
                        }
                    }
                    ToolButton {
                        visible: subtitleRow.isEditing
                        text: "Cancel"
                        onClicked: {
                            trackPanel.editingTrackId = ""
                            trackPanel.editLabelValue = ""
                        }
                    }
                }
            }
        }
        Label {
            visible: trackPanel.subtitleTracks().length === 0
            Layout.fillWidth: true
            text: "No external subtitles added. Embedded audio and subtitles appear in the player controls."
            color: "#9293a5"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }
        Label { visible: trackPanel.statusMessage.length > 0; text: trackPanel.statusMessage; color: "#c4b5fd"; font.pixelSize: 11; wrapMode: Text.Wrap }
    }

    FileDialog {
        id: subtitleDialog
        title: "Add subtitle"
        fileMode: FileDialog.OpenFile
        nameFilters: ["Subtitle files (*.srt *.vtt)"]
        onAccepted: {
            if (!trackPanel.controller || !trackPanel.mediaPlayer || !trackPanel.video) return
            trackPanel.statusMessage = "Importing and protecting subtitle…"
            trackPanel.controller.importVideoSubtitle(trackPanel.mediaPlayer, trackPanel.video.id, selectedFile)
        }
    }

    Dialog {
        id: removeDialog
        title: "Remove subtitle"
        modal: true
        anchors.centerIn: parent
        width: Math.min(parent.width - 32, 420)
        standardButtons: Dialog.NoButton
        background: Rectangle { color: "#181720"; radius: 12; border.color: "#18ffffff" }
        contentItem: Text {
            text: trackPanel.pendingRemoval
                ? "Remove ‘" + (trackPanel.pendingRemoval.label || "Subtitle") + "’ from this video?"
                : "Remove this subtitle?"
            color: "#d4d4dc"
            wrapMode: Text.Wrap
            padding: 18
        }
        footer: RowLayout {
            spacing: 8
            Item { Layout.fillWidth: true }
            Button { text: "Cancel"; onClicked: removeDialog.reject() }
            Button { text: "Remove"; enabled: !trackPanel.isProcessing; onClicked: trackPanel.confirmRemoval() }
            Item { Layout.preferredWidth: 8 }
        }
        onRejected: trackPanel.pendingRemoval = null
    }

    Connections {
        target: trackPanel.controller
        function onFileOperationFinished(result) {
            if (result.operation !== "video-subtitle-import" || !trackPanel.video || result.videoId !== trackPanel.video.id) return
            trackPanel.statusMessage = result.success
                ? (result.loaded ? "Subtitle added and selected." : "Subtitle protected and saved.")
                : (result.error || "Could not add subtitle.")
        }
    }
}
