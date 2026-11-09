import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: galleryRoot
    anchors.fill: parent

    property var videos: []
    property var collections: []
    property string selectedCollection: "Todos"

    signal refreshRequested()
    signal collectionSelected(string colName)
    signal videoSelected(var video)
    signal videoDeleted(string videoId)

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

    ScrollView {
        anchors.fill: parent
        clip: true
        contentWidth: width

        ColumnLayout {
            width: Math.min(parent.width - 64, 1100)
            anchors.horizontalCenter: parent.horizontalCenter
            spacing: 24

            Item { height: 16 } // Top margin

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 16

                ColumnLayout {
                    spacing: 4
                    RowLayout {
                        spacing: 10
                        Text { text: "🎬"; font.pixelSize: 28 }
                        Text {
                            text: "Media Center & Vídeos"
                            color: "#fffffe"
                            font.pixelSize: 26
                            font.bold: true
                        }
                    }
                    Text {
                        text: "Decodificação acelerada por GPU (libmpv) • " + galleryRoot.videos.length + " vídeo(s) catalogado(s)"
                        color: "#a7a9be"
                        font.pixelSize: 13
                    }
                }

                Item { Layout.fillWidth: true }

                Rectangle {
                    width: 140; height: 38; radius: 10
                    color: "#6366f1" // indigo-600

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 8
                        Text { text: "↻"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                        Text { text: "Atualizar"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: galleryRoot.refreshRequested()
                    }
                }
            }

            // Collections Filter Pills
            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                visible: galleryRoot.collections.length > 1

                Repeater {
                    model: galleryRoot.collections

                    delegate: Rectangle {
                        property bool isSelected: galleryRoot.selectedCollection === modelData
                        height: 32
                        width: colText.contentWidth + 24
                        radius: 16
                        color: isSelected ? "#6366f1" : (colMouse.containsMouse ? "#ffffff12" : "#1a1924")
                        border.color: isSelected ? "#818cf8" : "#ffffff0f"
                        border.width: 1

                        Text {
                            id: colText
                            anchors.centerIn: parent
                            text: modelData
                            color: isSelected ? "#ffffff" : "#a7a9be"
                            font.pixelSize: 12
                            font.bold: isSelected
                        }

                        MouseArea {
                            id: colMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: galleryRoot.collectionSelected(modelData)
                        }
                    }
                }
            }

            // Videos Grid
            GridView {
                id: videoGrid
                Layout.fillWidth: true
                Layout.preferredHeight: Math.max(300, Math.ceil(galleryRoot.videos.length / Math.max(1, Math.floor(width / 340))) * 250)
                clip: true
                cellWidth: 340
                cellHeight: 250
                model: galleryRoot.videos

                delegate: Rectangle {
                    width: 320
                    height: 230
                    radius: 12
                    color: "#1a1924" // bg-dark-card
                    border.color: cardMouse.containsMouse ? "#818cf866" : "#ffffff0f"
                    border.width: 1

                    ColumnLayout {
                        anchors.fill: parent
                        spacing: 0

                        // Thumbnail Area
                        Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 155
                            radius: 12
                            color: "#15141b"
                            clip: true

                            Rectangle {
                                anchors.fill: parent
                                color: "#211f30"
                            }

                            // Play Icon Overlay
                            Rectangle {
                                anchors.centerIn: parent
                                width: 48; height: 48; radius: 24
                                color: cardMouse.containsMouse ? "#6366f1" : "#00000080"

                                Text {
                                    anchors.centerIn: parent
                                    text: "▶"
                                    color: "#ffffff"
                                    font.pixelSize: 18
                                    anchors.horizontalCenterOffset: 2
                                }
                            }

                            // Collection tag on top-left
                            Rectangle {
                                anchors.top: parent.top
                                anchors.left: parent.left
                                anchors.margins: 8
                                width: colTagText.contentWidth + 12
                                height: 20
                                radius: 4
                                color: "#000000b3"
                                visible: modelData.collection_name && modelData.collection_name !== ""

                                Text {
                                    id: colTagText
                                    anchors.centerIn: parent
                                    text: modelData.collection_name || ""
                                    color: "#a78bfa"
                                    font.pixelSize: 10
                                    font.bold: true
                                }
                            }

                            // Duration Badge on bottom-right
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
                                    text: galleryRoot.formatTime(modelData.duration || 0)
                                    color: "#fffffe"
                                    font.pixelSize: 11
                                    font.bold: true
                                }
                            }

                            // Watched Progress Bar
                            Rectangle {
                                anchors.bottom: parent.bottom
                                width: parent.width * Math.min(1.0, (modelData.progress || 0) / (modelData.duration || 1))
                                height: 4
                                color: "#818cf8"
                                visible: (modelData.progress || 0) > 0
                            }
                        }

                        // Meta details
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
                                    text: modelData.title || "Vídeo sem título"
                                    color: cardMouse.containsMouse ? "#a78bfa" : "#fffffe"
                                    font.pixelSize: 13
                                    font.bold: true
                                    elide: Text.ElideRight
                                }

                                Text {
                                    text: (modelData.is_local ? "Arquivo Local" : "Criptografado") + " • " + (modelData.file_path ? modelData.file_path.split('/').pop() : "")
                                    color: "#a7a9be"
                                    font.pixelSize: 11
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }
                            }

                            // Delete video button
                            Rectangle {
                                width: 28; height: 28; radius: 6
                                color: delMouse.containsMouse ? "#f43f5e33" : "transparent"

                                Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 11 }

                                MouseArea {
                                    id: delMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: galleryRoot.videoDeleted(modelData.id)
                                }
                            }
                        }
                    }

                    MouseArea {
                        id: cardMouse
                        anchors.fill: parent
                        z: -1
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: galleryRoot.videoSelected(modelData)
                    }
                }
            }

            // Empty State
            Rectangle {
                visible: galleryRoot.videos.length === 0
                Layout.fillWidth: true
                height: 240
                radius: 16
                color: "#161524"
                border.color: "#ffffff0a"

                ColumnLayout {
                    anchors.centerIn: parent
                    spacing: 12
                    Text { Layout.alignment: Qt.AlignHCenter; text: "🎬"; font.pixelSize: 40; opacity: 0.5 }
                    Text { Layout.alignment: Qt.AlignHCenter; text: "Nenhum vídeo nesta pasta"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                    Text { Layout.alignment: Qt.AlignHCenter; text: "Importe vídeos locais para assistir com decodificação mpv acelerada."; color: "#a7a9be"; font.pixelSize: 13 }
                }
            }

            Item { height: 48 }
        }
    }
}
