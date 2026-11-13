import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: audioPanel
    spacing: 8

    property var tracks: []

    function trackDetails(track) {
        var details = []
        if (track.id !== undefined && track.id !== null && String(track.id).length > 0) {
            details.push("ID " + track.id)
        }
        if (track.lang) details.push(String(track.lang).toUpperCase())
        if (track.codec) details.push(track.codec)
        if (track.channels) {
            details.push(track.channels)
        } else if (track.channel_layout) {
            details.push(track.channel_layout)
        } else if (track.channel_count && Number(track.channel_count) > 0) {
            details.push(track.channel_count + " ch")
        }
        if (track.samplerate && Number(track.samplerate) > 0) {
            details.push(Math.round(Number(track.samplerate) / 1000) + " kHz")
        } else if (track.sample_rate && Number(track.sample_rate) > 0) {
            details.push(Math.round(Number(track.sample_rate) / 1000) + " kHz")
        }
        if (track.bitrate && Number(track.bitrate) > 0) {
            details.push(Math.round(Number(track.bitrate) / 1000) + " kbps")
        }
        if (track.local_path) details.push(String(track.local_path).split(/[\\/]/).pop())
        return details.join(" · ")
    }

    Label {
        visible: audioPanel.tracks.length > 0
        text: "Faixas de áudio (" + audioPanel.tracks.length + ")"
        color: "#f4f4f5"
        font.pixelSize: 12
        font.bold: true
    }

    Repeater {
        model: audioPanel.tracks
        delegate: Rectangle {
            required property var modelData
            Layout.fillWidth: true
            implicitHeight: 48
            radius: 8
            color: "#0d000000"
            border.color: "#0cffffff"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 10
                anchors.rightMargin: 10
                spacing: 10
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 3
                    Label {
                        Layout.fillWidth: true
                        text: modelData.label || modelData.title || modelData.lang || "Áudio sem descrição"
                        color: "#e4e4e7"
                        font.pixelSize: 11
                        elide: Text.ElideRight
                    }
                    Label {
                        Layout.fillWidth: true
                        visible: audioPanel.trackDetails(modelData).length > 0
                        text: audioPanel.trackDetails(modelData)
                        color: "#88899c"
                        font.pixelSize: 9
                        font.family: "monospace"
                        elide: Text.ElideMiddle
                    }
                }
                Label {
                    visible: Boolean(modelData.selected || modelData.default)
                    text: modelData.selected ? "Selecionada" : "Padrão"
                    color: "#a78bfa"
                    font.pixelSize: 9
                }
            }
        }
    }
}
