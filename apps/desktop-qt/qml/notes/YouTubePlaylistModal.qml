import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: ytPlaylistRoot
    anchors.fill: parent
    z: 115
    visible: false
    color: "#0a0a0c"

    property var controller: null
    property string playlistUrl: ""
    property string playlistTitle: "Playlist do YouTube"
    property var videos: []
    property var watchedMap: ({})
    property bool isLoading: false
    readonly property int watchedCount: {
        var count = 0
        for (var i = 0; i < videos.length; ++i) {
            if (videos[i] && watchedMap[videos[i].id]) count += 1
        }
        return count
    }

    signal closeRequested()
    signal refreshRequested(string playlistUrl)
    signal videoWatchRequested(string videoUrl, string title, string channel)
    signal videoSummaryRequested(string videoUrl, string title, string channel)
    signal toggleWatchedRequested(string videoId)

    Shortcut {
        sequence: "Escape"
        enabled: ytPlaylistRoot.visible
        onActivated: ytPlaylistRoot.closeRequested()
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
                    color: "#dc2626"
                    Text {
                        anchors.centerIn: parent
                        text: "▶"
                        color: "#ffffff"
                        font.pixelSize: 13
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text {
                        text: ytPlaylistRoot.playlistTitle
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }
                    Text {
                        text: ytPlaylistRoot.watchedCount + "/" + ytPlaylistRoot.videos.length + " " + qsTr("assistidos na playlist")
                        color: "#71717a"
                        font.pixelSize: 11
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }
                }

                ToolButton {
                    text: "↻"
                    implicitWidth: 32; implicitHeight: 32
                    ToolTip.visible: hovered; ToolTip.text: qsTr("Atualizar playlist")
                    onClicked: ytPlaylistRoot.refreshRequested(ytPlaylistRoot.playlistUrl)
                    contentItem: Text { text: parent.text; color: "#a1a1aa"; font.pixelSize: 15; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    background: Rectangle { color: parent.hovered ? "#22ffffff" : "transparent"; radius: 6 }
                }

                ToolButton {
                    text: "✕"
                    implicitWidth: 32
                    implicitHeight: 32
                    onClicked: ytPlaylistRoot.closeRequested()
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

        // List of videos
        ListView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            spacing: 8
            model: ytPlaylistRoot.videos

            delegate: Rectangle {
                required property var modelData
                required property int index
                width: ListView.view.width - 32
                anchors.horizontalCenter: parent.horizontalCenter
                height: 64
                radius: 8
                color: itemMouseArea.containsMouse ? "#18181f" : "#121216"
                border.color: isWatched ? "#10b981" : "#27272a"
                readonly property bool isWatched: ytPlaylistRoot.watchedMap[modelData.id || modelData.url] === true

                MouseArea {
                    id: itemMouseArea
                    anchors.fill: parent
                    hoverEnabled: true
                }

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 12

                    // Watched Checkbox
                    CheckBox {
                        checked: isWatched
                        onToggled: ytPlaylistRoot.toggleWatchedRequested(modelData.id || modelData.url)
                    }

                    // Index badge
                    Text {
                        text: String(index + 1)
                        color: "#71717a"
                        font.pixelSize: 11
                        font.bold: true
                        Layout.preferredWidth: 20
                    }

                    // Title & Channel
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        Text {
                            text: modelData.title || qsTr("Vídeo")
                            color: isWatched ? "#9ca3af" : "#ffffff"
                            font.pixelSize: 12
                            font.bold: !isWatched
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                        }
                        Text {
                            text: (modelData.channel || "") + (modelData.duration ? " · " + modelData.duration : "")
                            color: "#71717a"
                            font.pixelSize: 10
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                        }
                    }

                    // Action: Watch
                    Button {
                        text: qsTr("Assistir")
                        flat: true
                        onClicked: ytPlaylistRoot.videoWatchRequested(modelData.url, modelData.title || "", modelData.channel || "")
                        contentItem: Text {
                            text: parent.text
                            color: "#3b82f6"
                            font.pixelSize: 11
                            font.bold: true
                        }
                    }

                    // Action: Summary
                    Button {
                        text: qsTr("Resumo")
                        flat: true
                        onClicked: ytPlaylistRoot.videoSummaryRequested(modelData.url, modelData.title || "", modelData.channel || "")
                        contentItem: Text {
                            text: parent.text
                            color: "#a855f7"
                            font.pixelSize: 11
                            font.bold: true
                        }
                    }
                }
            }
        }
    }
}
