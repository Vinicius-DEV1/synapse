import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: storagePanel
    spacing: 12

    property var video: null
    property var controller: null
    property var storageStats: ({})
    property string statusMessage: ""

    function refreshStats() {
        if (!controller || !video || !video.id) {
            storageStats = ({})
            return
        }
        storageStats = controller.getVideoStorageStats(video.id)
    }

    function formatBytes(value) {
        const size = Number(value || 0)
        if (!isFinite(size) || size <= 0) return "0 B"
        if (size < 1024) return size + " B"
        if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KB"
        if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + " MB"
        return (size / (1024 * 1024 * 1024)).toFixed(2) + " GB"
    }

    function copyValue(value, label) {
        if (!controller || !value) return
        controller.copyToClipboard(String(value))
        statusMessage = qsTr("Copied %1 to the clipboard.").arg(label)
        statusTimer.restart()
    }

    function openFolder() {
        if (!controller || !video || !video.id) return
        const opened = controller.openVideoInFolder(video.id)
        statusMessage = opened ? qsTr("Opened the file location.") : qsTr("Could not open the file location.")
        statusTimer.restart()
    }

    function trackEntries(source) {
        const entries = []
        const sizes = source || ({})
        const names = Object.keys(sizes).sort()
        for (let index = 0; index < names.length; ++index) {
            entries.push({ name: names[index], size: sizes[names[index]] })
        }
        return entries
    }

    onVideoChanged: refreshStats()
    Component.onCompleted: refreshStats()

    Timer { id: statusTimer; interval: 2200; onTriggered: storagePanel.statusMessage = "" }

    Rectangle {
        Layout.fillWidth: true
        implicitHeight: fileContent.implicitHeight + 28
        radius: 12
        color: "#08ffffff"
        border.color: "#0cffffff"
        ColumnLayout {
            id: fileContent
            anchors.fill: parent
            anchors.margins: 14
            spacing: 9

            Label { text: qsTr("Original file name"); color: "#88899c"; font.pixelSize: 10; font.bold: true }
            RowLayout {
                Layout.fillWidth: true
                Label { Layout.fillWidth: true; text: storagePanel.video ? (storagePanel.video.original_name || "—") : "—"; color: "#e4e4e7"; font.pixelSize: 12; font.family: "monospace"; wrapMode: Text.WrapAnywhere }
                ToolButton { text: "⧉"; Accessible.name: qsTr("Copy original file name"); onClicked: storagePanel.copyValue(storagePanel.video ? storagePanel.video.original_name : "", qsTr("file name")) }
            }

            Label { visible: !!(storagePanel.video && storagePanel.video.is_local); text: qsTr("Managed local storage"); color: "#88899c"; font.pixelSize: 10; font.bold: true; topPadding: 6 }
            RowLayout {
                visible: !!(storagePanel.video && storagePanel.video.is_local)
                Layout.fillWidth: true
                Label { Layout.fillWidth: true; text: storagePanel.storageStats.original_path || (storagePanel.video ? storagePanel.video.file_path : "") || "—"; color: "#c4b5fd"; font.pixelSize: 11; font.family: "monospace"; wrapMode: Text.WrapAnywhere }
                ToolButton { text: "⧉"; Accessible.name: qsTr("Copy file path"); onClicked: storagePanel.copyValue(storagePanel.storageStats.original_path || (storagePanel.video ? storagePanel.video.file_path : ""), qsTr("file path")) }
            }
            RowLayout {
                visible: !!(storagePanel.video && storagePanel.video.is_local)
                Layout.fillWidth: true
                Label { Layout.fillWidth: true; text: qsTr("Stored video size: %1").arg(storagePanel.formatBytes(storagePanel.storageStats.original_size)); color: "#9293a5"; font.pixelSize: 11 }
                Button {
                    text: qsTr("Open folder")
                    onClicked: storagePanel.openFolder()
                    background: Rectangle { radius: 7; color: parent.hovered ? "#20ffffff" : "#10ffffff"; border.color: "#12ffffff" }
                    contentItem: Label { text: parent.text; color: "#dedee5"; font.pixelSize: 11; leftPadding: 8; rightPadding: 8; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }
            }

            Label { visible: storagePanel.trackEntries(storagePanel.storageStats.audio_sizes).length > 0; text: qsTr("External audio files"); color: "#88899c"; font.pixelSize: 10; font.bold: true; topPadding: 6 }
            Repeater {
                model: storagePanel.trackEntries(storagePanel.storageStats.audio_sizes)
                delegate: RowLayout {
                    required property var modelData
                    Layout.fillWidth: true
                    Label { Layout.fillWidth: true; text: modelData.name; color: "#d4d4dc"; font.pixelSize: 11; elide: Text.ElideMiddle }
                    Label { text: storagePanel.formatBytes(modelData.size); color: "#9293a5"; font.pixelSize: 11; font.family: "monospace" }
                }
            }

            Label { visible: storagePanel.trackEntries(storagePanel.storageStats.subtitle_sizes).length > 0; text: qsTr("Subtitle files"); color: "#88899c"; font.pixelSize: 10; font.bold: true; topPadding: 6 }
            Repeater {
                model: storagePanel.trackEntries(storagePanel.storageStats.subtitle_sizes)
                delegate: RowLayout {
                    required property var modelData
                    Layout.fillWidth: true
                    Label { Layout.fillWidth: true; text: modelData.name; color: "#d4d4dc"; font.pixelSize: 11; elide: Text.ElideMiddle }
                    Label { text: storagePanel.formatBytes(modelData.size); color: "#9293a5"; font.pixelSize: 11; font.family: "monospace" }
                }
            }

            Label { visible: storagePanel.video && storagePanel.video.youtube_url; text: qsTr("YouTube URL"); color: "#88899c"; font.pixelSize: 10; font.bold: true; topPadding: 6 }
            RowLayout {
                visible: storagePanel.video && storagePanel.video.youtube_url
                Layout.fillWidth: true
                Label { Layout.fillWidth: true; text: storagePanel.video ? storagePanel.video.youtube_url || "" : ""; color: "#fca5a5"; font.pixelSize: 11; font.family: "monospace"; wrapMode: Text.WrapAnywhere }
                ToolButton { text: "↗"; Accessible.name: qsTr("Open YouTube in browser"); onClicked: if (storagePanel.video && /^https?:\/\//i.test(storagePanel.video.youtube_url || "")) Qt.openUrlExternally(storagePanel.video.youtube_url) }
                ToolButton { text: "⧉"; Accessible.name: qsTr("Copy YouTube URL"); onClicked: storagePanel.copyValue(storagePanel.video ? storagePanel.video.youtube_url : "", qsTr("YouTube URL")) }
            }

            Label { visible: storagePanel.video && (storagePanel.video.drive_file_id || storagePanel.video.drive_web_file_id); text: qsTr("Cloud identifiers"); color: "#88899c"; font.pixelSize: 10; font.bold: true; topPadding: 6 }
            RowLayout {
                visible: storagePanel.video && storagePanel.video.drive_file_id
                Layout.fillWidth: true
                Label { Layout.fillWidth: true; text: qsTr("Original backup: %1").arg(storagePanel.video ? storagePanel.video.drive_file_id : ""); color: "#7dd3fc"; font.pixelSize: 11; font.family: "monospace"; wrapMode: Text.WrapAnywhere }
                ToolButton { text: "⧉"; Accessible.name: qsTr("Copy original Drive ID"); onClicked: storagePanel.copyValue(storagePanel.video ? storagePanel.video.drive_file_id : "", qsTr("Drive ID")) }
            }
            RowLayout {
                visible: storagePanel.video && storagePanel.video.drive_web_file_id
                Layout.fillWidth: true
                Label { Layout.fillWidth: true; text: qsTr("Web remux: %1").arg(storagePanel.video ? storagePanel.video.drive_web_file_id : ""); color: "#c4b5fd"; font.pixelSize: 11; font.family: "monospace"; wrapMode: Text.WrapAnywhere }
                ToolButton { text: "⧉"; Accessible.name: qsTr("Copy web remux Drive ID"); onClicked: storagePanel.copyValue(storagePanel.video ? storagePanel.video.drive_web_file_id : "", qsTr("Drive ID")) }
            }

            Label {
                visible: storagePanel.statusMessage.length > 0
                Layout.fillWidth: true
                text: storagePanel.statusMessage
                color: storagePanel.statusMessage.indexOf("Could not") === 0 ? "#fda4af" : "#6ee7b7"
                font.pixelSize: 11
            }
        }
    }

    Label {
        visible: !!(storagePanel.storageStats && storagePanel.storageStats.total_local_size > 0)
        text: qsTr("Total local media: %1").arg(storagePanel.formatBytes(storagePanel.storageStats.total_local_size))
        color: "#9293a5"
        font.pixelSize: 11
        Layout.alignment: Qt.AlignRight
    }
}
