import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Dialogs

Rectangle {
    id: root
    anchors.fill: parent
    color: "#80000000"
    visible: false
    z: 100

    property var collections: []
    property string targetCollectionId: "__all__"
    property string targetCollectionName: "Todos"
    property string videoPath: ""
    property string videoFileName: ""
    property string subtitlePath: ""
    property string subtitleFileName: ""
    property string selectedQuality: "720p"
    property bool isUploading: false
    property double uploadProgress: 0.0
    property string uploadPhase: ""
    property bool isSuccess: false
    property var uploadResult: null

    signal closeRequested()
    signal uploadCompleted(string path, string collectionId)

    function openModal(defaultCollectionId, defaultCollectionName) {
        targetCollectionId = defaultCollectionId || "__all__"
        targetCollectionName = defaultCollectionName || "Todos"
        videoPath = ""
        videoFileName = ""
        subtitlePath = ""
        subtitleFileName = ""
        selectedQuality = "720p"
        isUploading = false
        uploadProgress = 0.0
        uploadPhase = ""
        isSuccess = false
        uploadResult = null
        visible = true
    }

    function closeModal() {
        if (isUploading) return
        visible = false
        closeRequested()
    }

    FileDialog {
        id: videoPicker
        title: "Selecionar Arquivo de Vídeo"
        fileMode: FileDialog.OpenFile
        nameFilters: ["Arquivos de Vídeo (*.mp4 *.mkv *.mov *.webm *.avi *.m4v *.ts)", "Todos os arquivos (*)"]
        onAccepted: {
            var path = selectedFile.toLocalFile()
            if (path) {
                root.videoPath = path
                var parts = path.split(/[\/\\]/)
                root.videoFileName = parts[parts.length - 1]
            }
        }
    }

    FileDialog {
        id: subtitlePicker
        title: "Selecionar Arquivo de Legenda (Opcional)"
        fileMode: FileDialog.OpenFile
        nameFilters: ["Arquivos de Legenda (*.srt *.vtt *.ass)", "Todos os arquivos (*)"]
        onAccepted: {
            var path = selectedFile.toLocalFile()
            if (path) {
                root.subtitlePath = path
                var parts = path.split(/[\/\\]/)
                root.subtitleFileName = parts[parts.length - 1]
            }
        }
    }

    Timer {
        id: uploadSimTimer
        interval: 120
        repeat: true
        onTriggered: {
            root.uploadProgress += 0.08
            if (root.uploadProgress >= 1.0) {
                uploadSimTimer.stop()
                root.uploadProgress = 1.0
                root.uploadPhase = "Criptografia e indexação finalizadas!"
                root.isUploading = false
                root.isSuccess = true
                root.uploadResult = {
                    title: root.videoFileName,
                    duration: 120,
                    size: 45 * 1024 * 1024,
                    quality: root.selectedQuality
                }
                root.uploadCompleted(root.videoPath, root.targetCollectionId)
            } else if (root.uploadProgress > 0.6) {
                root.uploadPhase = "Criptografando com chave Culture (AES-256-GCM)…"
            } else if (root.uploadProgress > 0.3) {
                root.uploadPhase = "Extraindo faixas de áudio e metadados…"
            }
        }
    }

    function startUpload() {
        if (!videoPath || videoPath.length === 0) return
        isUploading = true
        uploadProgress = 0.05
        uploadPhase = "Lendo cabeçalhos de contêiner…"
        uploadSimTimer.start()
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

                Text { text: "🎬"; font.pixelSize: 22 }
                Text {
                    text: root.isSuccess ? "Upload Concluído" : "Importar Novo Vídeo"
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
                        enabled: !root.isUploading
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.closeModal()
                    }
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: "#10ffffff" }

            // Success View
            VideoUploadSuccess {
                visible: root.isSuccess && root.uploadResult !== null
                Layout.fillWidth: true
                videoTitle: root.uploadResult ? root.uploadResult.title : ""
                durationSeconds: root.uploadResult ? root.uploadResult.duration : 0
                originalSizeBytes: root.uploadResult ? root.uploadResult.size : 0
                qualityLabel: root.uploadResult ? root.uploadResult.quality : ""
                onDoneRequested: root.closeModal()
            }

            // Upload Form
            ColumnLayout {
                visible: !root.isSuccess
                Layout.fillWidth: true
                spacing: 14

                // Video File Picker
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Text { text: "Arquivo de Vídeo (MP4, MKV, MOV, WebM)"; color: "#d4d4dc"; font.pixelSize: 13; font.bold: true }

                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 70
                        radius: 10
                        color: videoPickerArea.hovered ? "#222133" : "#1a1928"
                        border.color: root.videoPath.length > 0 ? "#6366f1" : "#25ffffff"
                        border.width: root.videoPath.length > 0 ? 1.5 : 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 12

                            Text { text: "📹"; font.pixelSize: 24 }
                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2
                                Text {
                                    text: root.videoFileName.length > 0 ? root.videoFileName : "Clique para selecionar o arquivo de vídeo"
                                    color: root.videoFileName.length > 0 ? "#fffffe" : "#a7a9be"
                                    font.pixelSize: 13
                                    font.bold: root.videoFileName.length > 0
                                    elide: Text.ElideMiddle
                                }
                                Text {
                                    text: root.videoPath.length > 0 ? root.videoPath : "Suporte a múltiplos áudios e legendas embutidas"
                                    color: "#64748b"
                                    font.pixelSize: 11
                                    elide: Text.ElideMiddle
                                }
                            }
                        }

                        MouseArea {
                            id: videoPickerArea
                            anchors.fill: parent
                            hoverEnabled: true
                            enabled: !root.isUploading
                            cursorShape: Qt.PointingHandCursor
                            onClicked: videoPicker.open()
                        }
                    }
                }

                // Subtitle File Picker (Optional)
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Text { text: "Legenda Externa (Opcional - SRT / VTT)"; color: "#a7a9be"; font.pixelSize: 12 }

                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 42
                        radius: 8
                        color: subPickerArea.hovered ? "#222133" : "#1a1928"
                        border.color: root.subtitlePath.length > 0 ? "#818cf8" : "#18ffffff"

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 8
                            Text { text: "💬"; font.pixelSize: 14 }
                            Text {
                                Layout.fillWidth: true
                                text: root.subtitleFileName.length > 0 ? root.subtitleFileName : "Adicionar legenda externa (.srt, .vtt)"
                                color: root.subtitleFileName.length > 0 ? "#fffffe" : "#64748b"
                                font.pixelSize: 12
                                elide: Text.ElideMiddle
                            }
                            Text {
                                visible: root.subtitlePath.length > 0
                                text: "✕"
                                color: "#f87171"
                                font.pixelSize: 12
                                MouseArea {
                                    anchors.fill: parent
                                    onClicked: { root.subtitlePath = ""; root.subtitleFileName = "" }
                                }
                            }
                        }

                        MouseArea {
                            id: subPickerArea
                            anchors.fill: parent
                            hoverEnabled: true
                            enabled: !root.isUploading
                            cursorShape: Qt.PointingHandCursor
                            onClicked: subtitlePicker.open()
                        }
                    }
                }

                // Quality Selector
                VideoQualitySelector {
                    selectedQuality: root.selectedQuality
                    enabledState: !root.isUploading
                    onQualityChanged: function(q) { root.selectedQuality = q }
                }

                // Progress Bar (when uploading)
                ColumnLayout {
                    visible: root.isUploading
                    Layout.fillWidth: true
                    spacing: 6

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: root.uploadPhase; color: "#a78bfa"; font.pixelSize: 12; elide: Text.ElideRight; Layout.fillWidth: true }
                        Text { text: Math.round(root.uploadProgress * 100) + "%"; color: "#818cf8"; font.pixelSize: 12; font.bold: true }
                    }

                    ProgressBar {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 8
                        value: root.uploadProgress

                        background: Rectangle {
                            color: "#252436"
                            radius: 4
                        }
                        contentItem: Item {
                            Rectangle {
                                width: parent.width * root.uploadProgress
                                height: parent.height
                                radius: 4
                                color: "#6366f1"
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
                        text: "Cancelar"
                        enabled: !root.isUploading
                        onClicked: root.closeModal()

                        background: Rectangle {
                            color: parent.hovered ? "#252438" : "transparent"
                            border.color: "#20ffffff"
                            radius: 8
                        }
                        contentItem: Text {
                            text: parent.text
                            color: "#c4c5d4"
                            font.pixelSize: 13
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }

                    Item { Layout.fillWidth: true }

                    Button {
                        Layout.preferredWidth: 160
                        Layout.preferredHeight: 40
                        text: root.isUploading ? "Processando…" : "Importar Vídeo"
                        enabled: root.videoPath.length > 0 && !root.isUploading
                        onClicked: root.startUpload()

                        background: Rectangle {
                            color: parent.enabled ? (parent.hovered ? "#4f46e5" : "#6366f1") : "#2b293d"
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
        enabled: root.visible && !root.isUploading
        onActivated: root.closeModal()
    }
}
