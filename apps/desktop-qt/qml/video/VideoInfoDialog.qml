import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Dialogs
import ".."

Dialog {
    id: infoDialog
    modal: true
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 660)
    height: Math.min(parent.height - 32, 620)
    padding: 0
    closePolicy: Popup.CloseOnEscape
    standardButtons: Dialog.NoButton

    property var video: null
    property var controller: null
    property var mediaPlayer: null
    property string activeTab: "overview"

    signal playRequested(var video)
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

    function fileName(path) {
        if (!path) return "—"
        var parts = String(path).split(/[\\/]/)
        return parts[parts.length - 1] || "—"
    }

    function fileExtension(path) {
        var name = fileName(path)
        var dot = name.lastIndexOf(".")
        return dot > 0 ? name.substring(dot + 1).toUpperCase() : "—"
    }

    onOpened: {
        activeTab = "overview"
        infoTabs.activeTab = "overview"
        infoTabs.statusMessage = ""
    }

    background: Rectangle {
        color: "#181720"
        radius: 16
        border.color: "#10ffffff"
    }

    header: Rectangle {
        color: "#08ffffff"
        implicitHeight: 82
        radius: 16
        Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: "#0cffffff" }
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 20
            anchors.rightMargin: 12
            spacing: 12
            Rectangle {
                Layout.preferredWidth: 42
                Layout.preferredHeight: 42
                radius: 12
                color: "#1a8b5cf6"
                border.color: "#338b5cf6"
                AppIcon { anchors.centerIn: parent; width: 20; height: 20; name: "video"; color: "#c4b5fd" }
            }
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4
                RowLayout {
                    spacing: 8
                    Label {
                        text: infoDialog.fileExtension(infoDialog.video ? (infoDialog.video.file_path || infoDialog.video.original_name) : "")
                        color: "#c4b5fd"
                        font.pixelSize: 10
                        font.bold: true
                        font.family: "monospace"
                    }
                    Label {
                        visible: !!(infoDialog.video && infoDialog.video.collection_name)
                        text: infoDialog.video ? "📁 " + (infoDialog.video.collection_name || "") : ""
                        color: "#b8b7c7"
                        font.pixelSize: 11
                        elide: Text.ElideRight
                    }
                    Label {
                        text: infoDialog.formatDuration(infoDialog.video ? infoDialog.video.duration : 0)
                        color: "#a7a9be"
                        font.pixelSize: 11
                        font.family: "monospace"
                    }
                }
                Label {
                    Layout.fillWidth: true
                    text: infoDialog.video ? (infoDialog.video.title || "Vídeo sem título") : "Informações do vídeo"
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                    elide: Text.ElideRight
                }
            }
            ToolButton {
                text: "×"
                Accessible.name: "Fechar informações"
                onClicked: infoDialog.close()
                contentItem: Label { text: parent.text; color: parent.hovered ? "white" : "#a7a9be"; font.pixelSize: 24; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                background: Rectangle { color: parent.hovered ? "#1affffff" : "transparent"; radius: 8 }
            }
        }
    }

    contentItem: VideoInfoDialogTabs {
        id: infoTabs
        video: infoDialog.video
        controller: infoDialog.controller
        mediaPlayer: infoDialog.mediaPlayer
        activeTab: infoDialog.activeTab
        onActiveTabChanged: infoDialog.activeTab = activeTab
        onVideoUpdated: function(videoId) { infoDialog.videoUpdated(videoId) }
    }

    footer: RowLayout {
        implicitHeight: 62
        spacing: 10
        Item { Layout.fillWidth: true }
        Button { text: "Fechar"; onClicked: infoDialog.close() }
        Button {
            text: "Assistir"
            onClicked: {
                var selectedVideo = infoDialog.video
                infoDialog.close()
                infoDialog.playRequested(selectedVideo)
            }
            background: Rectangle { color: parent.down ? "#6d28d9" : "#7c3aed"; radius: 9 }
            contentItem: Label { text: parent.text; color: "white"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter; leftPadding: 8; rightPadding: 8 }
        }
        Item { Layout.preferredWidth: 10 }
    }

}
