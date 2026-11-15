import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Dialogs 6.3

Rectangle {
    id: lofiViewRoot
    anchors.fill: parent
    color: "#0f0e17" // bg-dark-bg

    property var lofis: []
    property var activeLofi: null
    property bool isPlaying: false
    property string searchQuery: ""

    signal backRequested()
    signal playTrackRequested(var track)
    signal deleteTrackRequested(string trackId)
    signal openMixerRequested()

    function formatDuration(sec) {
        if (!sec || isNaN(sec) || sec <= 0) return "--:--"
        var s = Math.floor(sec)
        var m = Math.floor(s / 60)
        s = s % 60
        return m + ":" + (s < 10 ? "0" + s : s)
    }

    readonly property var filteredLofis: {
        var query = searchQuery.trim().toLowerCase()
        if (!query) return lofis
        var res = []
        for (var i = 0; i < lofis.length; i++) {
            var item = lofis[i]
            if (item.title && item.title.toLowerCase().indexOf(query) !== -1) {
                res.push(item)
            }
        }
        return res
    }

    ScrollView {
        anchors.fill: parent
        contentWidth: parent.width
        clip: true

        ColumnLayout {
            width: Math.min(840, parent.width - 48)
            anchors.horizontalCenter: parent.horizontalCenter
            spacing: 20

            Item { height: 16 }

            // Header Row
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    width: 36
                    height: 36
                    flat: true
                    background: Rectangle {
                        color: "#161524"
                        radius: 18
                        border.color: "#1affffff"
                        border.width: 1
                    }
                    contentItem: Text {
                        text: "←"
                        color: "#fffffe"
                        font.pixelSize: 16
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: lofiViewRoot.backRequested()
                }

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: "🎵 Trilhas Ambientais & Lo-Fi"
                        color: "#fffffe"
                        font.pixelSize: 20
                        font.bold: true
                    }
                    Text {
                        text: lofiViewRoot.lofis.length + " faixas disponíveis para foco imersivo"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                }

                Item { Layout.fillWidth: true }

                Button {
                    height: 36
                    flat: true
                    background: Rectangle {
                        color: "#211f30"
                        radius: 8
                        border.color: "#33ffffff"
                        border.width: 1
                    }
                    contentItem: Text {
                        text: "🎛 Mixer"
                        color: "#a78bfa"
                        font.pixelSize: 12
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                        leftPadding: 12; rightPadding: 12
                    }
                    onClicked: lofiViewRoot.openMixerRequested()
                }

                Button {
                    height: 36
                    flat: true
                    background: Rectangle {
                        color: "#8b5cf6"
                        radius: 8
                    }
                    contentItem: Text {
                        text: "+ Adicionar Faixa"
                        color: "#ffffff"
                        font.pixelSize: 12
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                        leftPadding: 12; rightPadding: 12
                    }
                    onClicked: audioFileDialog.open()
                }
            }

            // Search Bar
            TextField {
                Layout.fillWidth: true
                height: 40
                placeholderText: "Buscar trilhas por título..."
                color: "#fffffe"
                onTextChanged: lofiViewRoot.searchQuery = text
                background: Rectangle {
                    color: "#161524"
                    radius: 10
                    border.color: "#1affffff"
                    border.width: 1
                }
            }

            // Track List
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8

                Repeater {
                    model: lofiViewRoot.filteredLofis
                    delegate: Rectangle {
                        Layout.fillWidth: true
                        height: 54
                        radius: 12
                        readonly property bool isCurrent: lofiViewRoot.activeLofi && lofiViewRoot.activeLofi.id === modelData.id
                        readonly property bool isLocal: modelData.is_local === 1 || (modelData.file_path && String(modelData.file_path).length > 0)
                        color: isCurrent ? "#268b5cf6" : "#161524"
                        border.color: isCurrent ? "#808b5cf6" : "#0fffffff"
                        border.width: 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 12

                            // Play / Pause Button
                            Button {
                                width: 32
                                height: 32
                                flat: true
                                background: Rectangle {
                                    color: parent.parent.isCurrent ? "#8b5cf6" : "#211f30"
                                    radius: 16
                                }
                                contentItem: Text {
                                    text: (parent.parent.isCurrent && lofiViewRoot.isPlaying) ? "❚❚" : "▶"
                                    color: "#ffffff"
                                    font.pixelSize: 11
                                    horizontalAlignment: Text.AlignHCenter
                                    verticalAlignment: Text.AlignVCenter
                                }
                                onClicked: lofiViewRoot.playTrackRequested(modelData)
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2

                                Text {
                                    text: modelData.title || "Trilha Sem Título"
                                    color: parent.parent.parent.isCurrent ? "#c4b5fd" : "#fffffe"
                                    font.pixelSize: 13
                                    font.bold: true
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }

                                RowLayout {
                                    spacing: 8
                                    Text {
                                        text: lofiViewRoot.formatDuration(modelData.duration)
                                        color: "#6b7280"
                                        font.pixelSize: 11
                                    }
                                    Rectangle {
                                        width: cloudText.width + 10
                                        height: 16
                                        radius: 8
                                        color: parent.parent.parent.parent.isLocal ? "#1010b981" : "#103b82f6"
                                        Text {
                                            id: cloudText
                                            anchors.centerIn: parent
                                            text: parent.parent.parent.parent.isLocal ? "Local" : "Google Drive"
                                            color: parent.parent.parent.parent.isLocal ? "#10b981" : "#60a5fa"
                                            font.pixelSize: 9
                                            font.bold: true
                                        }
                                    }
                                }
                            }

                            // Delete Track Button
                            Button {
                                width: 28
                                height: 28
                                flat: true
                                background: Rectangle {
                                    color: "transparent"
                                    radius: 6
                                }
                                contentItem: Text {
                                    text: "🗑"
                                    color: "#f87171"
                                    font.pixelSize: 13
                                    horizontalAlignment: Text.AlignHCenter
                                    verticalAlignment: Text.AlignVCenter
                                }
                                onClicked: lofiViewRoot.deleteTrackRequested(String(modelData.id))
                            }
                        }
                    }
                }
            }

            Item { height: 24 }
        }
    }

    FileDialog {
        id: audioFileDialog
        title: "Selecionar Áudio Lo-Fi"
        nameFilters: ["Arquivos de Áudio (*.mp3 *.wav *.ogg *.flac *.m4a)"]
        onAccepted: {
            var path = selectedFile.toString()
            if (path.indexOf("file://") === 0) path = path.substring(7)
            var parts = path.split("/")
            var fileName = parts[parts.length - 1]
            dataController.addLofiTrack(fileName, path, 180.0)
            dataController.refreshStats()
        }
    }
}
