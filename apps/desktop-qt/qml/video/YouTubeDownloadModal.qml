import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root
    anchors.fill: parent
    color: "#80000000"
    visible: false
    z: 100

    property var collections: []
    property string targetCollectionId: "__all__"
    property string url: ""
    property bool isFetching: false
    property var videoInfo: null
    property string selectedQuality: "720p"
    property var selectedSubs: []
    property string customTitle: ""
    property bool isDownloading: false
    property double downloadProgress: 0.0
    property string downloadStatus: ""
    property string errorMessage: ""

    signal closeRequested()
    signal downloadCompleted(var videoData)

    function openModal(defaultCollectionId) {
        targetCollectionId = defaultCollectionId || "__all__"
        url = ""
        isFetching = false
        videoInfo = null
        selectedQuality = "720p"
        selectedSubs = []
        customTitle = ""
        isDownloading = false
        downloadProgress = 0.0
        downloadStatus = ""
        errorMessage = ""
        visible = true
    }

    function closeModal() {
        if (isDownloading) {
            if (typeof dataController !== "undefined" && dataController.cancelYouTubeDownload) {
                dataController.cancelYouTubeDownload()
            }
        }
        visible = false
        closeRequested()
    }

    Connections {
        target: typeof dataController !== "undefined" ? dataController : null
        function onYoutubeDownloadProgress(progress, status) {
            root.downloadProgress = progress
            root.downloadStatus = status
        }
        function onYoutubeDownloadFinished(success, error, videoPath) {
            root.isDownloading = false
            if (success) {
                root.downloadProgress = 1.0
                root.downloadStatus = "Download e criptografia concluídos!"
                root.downloadCompleted({
                    title: root.customTitle,
                    url: root.url,
                    quality: root.selectedQuality,
                    collectionId: root.targetCollectionId
                })
                root.closeModal()
            } else {
                root.errorMessage = error || "Falha no download do vídeo do YouTube."
                root.downloadStatus = "Erro no processamento."
            }
        }
    }

    function fetchInfo() {
        if (url.trim().length === 0) return
        errorMessage = ""
        isFetching = true

        if (typeof dataController !== "undefined" && dataController.fetchYouTubeInfo) {
            var res = dataController.fetchYouTubeInfo(url.trim())
            isFetching = false
            if (res && res.success && res.videoInfo) {
                root.videoInfo = res.videoInfo
                root.customTitle = res.videoInfo.title
                root.selectedSubs = (res.videoInfo.subtitles && res.videoInfo.subtitles.length > 0) ? [res.videoInfo.subtitles[0].lang] : []
                return
            } else if (res && res.error) {
                errorMessage = res.error
                return
            }
        }

        isFetching = false
        errorMessage = "Serviço de download do YouTube indisponível."
    }

    function startDownload() {
        if (!videoInfo) return
        isDownloading = true
        downloadProgress = 0.05
        downloadStatus = "Conectando ao stream do YouTube…"

        if (typeof dataController !== "undefined" && dataController.downloadYouTubeVideo) {
            dataController.downloadYouTubeVideo(url.trim(), targetCollectionId, selectedQuality, selectedSubs)
        } else {
            errorMessage = "Controlador de vídeo indisponível."
            isDownloading = false
        }
    }

    MouseArea {
        anchors.fill: parent
        onClicked: root.closeModal()
    }

    Rectangle {
        id: card
        width: Math.min(parent.width - 32, 540)
        implicitHeight: contentCol.implicitHeight + 36
        anchors.centerIn: parent
        radius: 16
        color: "#161524"
        border.color: "#25ffffff"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: contentCol
            anchors.fill: parent
            anchors.margins: 20
            spacing: 16

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Text { text: "▶"; color: "#ef4444"; font.pixelSize: 22 }
                Text {
                    text: "Baixar do YouTube"
                    color: "#fffffe"
                    font.pixelSize: 17
                    font.bold: true
                }

                Item { Layout.fillWidth: true }

                Rectangle {
                    width: 28; height: 28; radius: 6
                    color: "#15ffffff"
                    Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea {
                        anchors.fill: parent
                        enabled: !root.isDownloading
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.closeModal()
                    }
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: "#10ffffff" }

            // URL input step
            ColumnLayout {
                visible: !root.videoInfo
                Layout.fillWidth: true
                spacing: 12

                Text { text: "URL do Vídeo ou Playlist"; color: "#d4d4dc"; font.pixelSize: 13; font.bold: true }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    TextField {
                        id: urlField
                        Layout.fillWidth: true
                        Layout.preferredHeight: 40
                        placeholderText: "https://www.youtube.com/watch?v=..."
                        color: "#fffffe"
                        font.pixelSize: 13
                        placeholderTextColor: "#64748b"
                        text: root.url
                        onTextChanged: root.url = text

                        background: Rectangle {
                            color: "#1a1928"
                            radius: 8
                            border.color: urlField.activeFocus ? "#ef4444" : "#20ffffff"
                        }
                    }

                    Button {
                        Layout.preferredWidth: 100
                        Layout.preferredHeight: 40
                        text: root.isFetching ? "Buscando…" : "Buscar"
                        enabled: root.url.trim().length > 0 && !root.isFetching
                        onClicked: root.fetchInfo()

                        background: Rectangle {
                            color: parent.enabled ? (parent.hovered ? "#dc2626" : "#ef4444") : "#2a2128"
                            radius: 8
                        }
                        contentItem: Text {
                            text: parent.text
                            color: parent.enabled ? "#ffffff" : "#64748b"
                            font.pixelSize: 13
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }

                Text {
                    text: "Cole um link do YouTube para baixar com legendas e alta definição."
                    color: "#64748b"
                    font.pixelSize: 11
                }
            }

            // Video Info & Download Form
            ColumnLayout {
                visible: root.videoInfo !== null
                Layout.fillWidth: true
                spacing: 14

                // Video info preview card
                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 64
                    radius: 10
                    color: "#1a1928"
                    border.color: "#15ffffff"

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 12

                        Text { text: "🎬"; font.pixelSize: 24 }
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2
                            Text {
                                text: root.videoInfo ? root.videoInfo.title : ""
                                color: "#fffffe"
                                font.pixelSize: 13
                                font.bold: true
                                elide: Text.ElideRight
                            }
                            Text {
                                text: (root.videoInfo ? root.videoInfo.channel : "") + " • " + (root.videoInfo ? Math.round(root.videoInfo.duration / 60) + " min" : "")
                                color: "#94a3b8"
                                font.pixelSize: 11
                            }
                        }
                    }
                }

                // Title override
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Text { text: "Título no Cofre"; color: "#a7a9be"; font.pixelSize: 12 }
                    TextField {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 36
                        text: root.customTitle
                        onTextChanged: root.customTitle = text
                        color: "#fffffe"
                        font.pixelSize: 13
                        background: Rectangle { color: "#1a1928"; radius: 6; border.color: "#18ffffff" }
                    }
                }

                // Quality Selector
                VideoQualitySelector {
                    selectedQuality: root.selectedQuality
                    enabledState: !root.isDownloading
                    onQualityChanged: function(q) { root.selectedQuality = q }
                }

                // Subtitle Selector
                YouTubeSubtitleSelector {
                    availableSubs: root.videoInfo ? root.videoInfo.subtitles : []
                    selectedSubs: root.selectedSubs
                    onSubToggled: function(lang) {
                        var copy = root.selectedSubs.slice()
                        var idx = copy.indexOf(lang)
                        if (idx !== -1) copy.splice(idx, 1)
                        else copy.push(lang)
                        root.selectedSubs = copy
                    }
                }

                // Progress Bar
                ColumnLayout {
                    visible: root.isDownloading
                    Layout.fillWidth: true
                    spacing: 6

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: root.downloadStatus; color: "#f87171"; font.pixelSize: 12; elide: Text.ElideRight; Layout.fillWidth: true }
                        Text { text: Math.round(root.downloadProgress * 100) + "%"; color: "#ef4444"; font.pixelSize: 12; font.bold: true }
                    }

                    ProgressBar {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 8
                        value: root.downloadProgress

                        background: Rectangle { color: "#252436"; radius: 4 }
                        contentItem: Item {
                            Rectangle {
                                width: parent.width * root.downloadProgress
                                height: parent.height
                                radius: 4
                                color: "#ef4444"
                            }
                        }
                    }
                }

                // Actions Footer
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    Button {
                        Layout.preferredWidth: 100
                        Layout.preferredHeight: 40
                        text: "Voltar"
                        enabled: !root.isDownloading
                        onClicked: root.videoInfo = null

                        background: Rectangle { color: parent.hovered ? "#252438" : "transparent"; border.color: "#20ffffff"; radius: 8 }
                        contentItem: Text { text: parent.text; color: "#c4c5d4"; font.pixelSize: 13; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    }

                    Item { Layout.fillWidth: true }

                    Button {
                        Layout.preferredWidth: 160
                        Layout.preferredHeight: 40
                        text: root.isDownloading ? "Baixando…" : "Iniciar Download"
                        enabled: !root.isDownloading
                        onClicked: root.startDownload()

                        background: Rectangle {
                            color: parent.enabled ? (parent.hovered ? "#dc2626" : "#ef4444") : "#2a2128"
                            radius: 8
                        }
                        contentItem: Text {
                            text: parent.text
                            color: parent.enabled ? "#ffffff" : "#64748b"
                            font.pixelSize: 13
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }
            }
        }
    }

    Shortcut {
        sequence: "Escape"
        enabled: root.visible && !root.isDownloading
        onActivated: root.closeModal()
    }
}
