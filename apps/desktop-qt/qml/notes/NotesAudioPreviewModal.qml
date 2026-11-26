import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import Synapse.Media 1.0

Rectangle {
    id: modalRoot
    anchors.fill: parent
    z: 150
    visible: false
    color: "#99000000"
    focus: visible

    property var controller: null
    property string requestId: ""
    property string fileName: ""
    property string previewPath: ""
    property int fileSize: 0
    property bool loading: false
    property bool isPlaying: false
    property string errorMessage: ""
    property double currentVolume: 1
    property bool muted: false

    function openForFile(fileId, name) {
        if (!controller || !fileId || visible) return
        var metadata = typeof controller.getFileWidgetMetadata === "function"
            ? controller.getFileWidgetMetadata(String(fileId)) : ({})
        if (!metadata || !metadata.id) {
            errorMessage = qsTr("O arquivo de áudio não está mais disponível.")
            fileName = String(name || qsTr("Áudio"))
            visible = true
            loading = false
            Qt.callLater(closeButton.forceActiveFocus)
            return
        }
        fileName = String(name || metadata.name || qsTr("Áudio"))
        fileSize = Math.max(0, Number(metadata.file_size) || 0)
        errorMessage = ""
        previewPath = ""
        loading = true
        isPlaying = false
        requestId = "notes-audio-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2)
        visible = true
        controller.previewLocalFile(String(fileId), requestId)
        Qt.callLater(closeButton.forceActiveFocus)
    }

    function closeModal() {
        if (!visible) return
        var activeRequestId = requestId
        if (loading && activeRequestId.length > 0 && controller &&
                typeof controller.cancelFilePreview === "function") {
            controller.cancelFilePreview(activeRequestId)
        }
        audioPlayer.pause()
        audioPlayer.source = ""
        isPlaying = false
        if (previewPath.length > 0 && controller &&
                typeof controller.closeFilePreview === "function") {
            controller.closeFilePreview(previewPath)
        }
        previewPath = ""
        requestId = ""
        loading = false
        visible = false
    }

    function formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) return "0:00"
        var wholeSeconds = Math.floor(seconds)
        var minutes = Math.floor(wholeSeconds / 60)
        var remainder = wholeSeconds % 60
        return String(minutes) + ":" + (remainder < 10 ? "0" : "") + String(remainder)
    }

    Connections {
        target: modalRoot.controller
        ignoreUnknownSignals: true
        function onFilePreviewReady(result) {
            if (!modalRoot.visible || String(result.request_id || "") !== modalRoot.requestId) return
            modalRoot.loading = false
            if (!result.success || !result.path) {
                modalRoot.errorMessage = String(result.error || qsTr("Não foi possível preparar o áudio para reprodução."))
                return
            }
            modalRoot.previewPath = String(result.path)
            audioPlayer.source = modalRoot.previewPath
            audioPlayer.play()
        }
        function onFilePreviewsInvalidated() { modalRoot.closeModal() }
    }

    Shortcut {
        sequence: "Escape"
        enabled: modalRoot.visible
        onActivated: modalRoot.closeModal()
    }

    MpvPlayerItem {
        id: audioPlayer
        objectName: "notesAudioPlayer"
        visible: false
        width: 1
        height: 1
        volume: modalRoot.currentVolume * 100
        muted: modalRoot.muted
        onPausedChanged: modalRoot.isPlaying = !paused
        onEndOfFile: {
            modalRoot.isPlaying = false
            setPosition(0)
        }
        onPlaybackError: function(message) {
            modalRoot.errorMessage = String(message || qsTr("Não foi possível reproduzir este áudio."))
            modalRoot.isPlaying = false
        }
    }

    MouseArea {
        anchors.fill: parent
        onClicked: modalRoot.closeModal()
    }

    Rectangle {
        id: playerCard
        width: Math.min(parent.width - 32, 384)
        height: contentColumn.implicitHeight + 48
        anchors.centerIn: parent
        radius: 24
        color: "#e61c1c1f"
        border.color: "#1affffff"
        border.width: 1
        Accessible.role: Accessible.Dialog
        Accessible.name: qsTr("Reprodutor de áudio")

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: contentColumn
            anchors.fill: parent
            anchors.margins: 24
            spacing: 22

            RowLayout {
                Layout.fillWidth: true
                spacing: 12
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 3
                    Label {
                        Layout.fillWidth: true
                        text: modalRoot.fileName
                        color: "#fffffe"
                        font.pixelSize: 18
                        font.weight: Font.DemiBold
                        elide: Text.ElideRight
                        Accessible.name: modalRoot.fileName
                    }
                    Label {
                        text: (modalRoot.fileSize / 1024 / 1024).toFixed(2) + " MB"
                        color: "#66ffffff"
                        font.pixelSize: 12
                    }
                }
                ToolButton {
                    id: closeButton
                    objectName: "notesAudioPreviewCloseButton"
                    text: "×"
                    Accessible.name: qsTr("Fechar reprodutor de áudio")
                    onClicked: modalRoot.closeModal()
                    contentItem: Label {
                        text: closeButton.text
                        color: closeButton.hovered || closeButton.activeFocus ? "#fffffe" : "#66ffffff"
                        font.pixelSize: 22
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle {
                        radius: 10
                        color: closeButton.hovered || closeButton.activeFocus ? "#1affffff" : "transparent"
                    }
                }
            }

            BusyIndicator {
                Layout.alignment: Qt.AlignHCenter
                running: modalRoot.loading
                visible: modalRoot.loading
            }

            Label {
                Layout.fillWidth: true
                visible: modalRoot.errorMessage.length > 0
                text: modalRoot.errorMessage
                color: "#fda4af"
                font.pixelSize: 13
                wrapMode: Text.Wrap
                horizontalAlignment: Text.AlignHCenter
                Accessible.role: Accessible.AlertMessage
            }

            ColumnLayout {
                Layout.fillWidth: true
                visible: !modalRoot.loading && modalRoot.errorMessage.length === 0 && modalRoot.previewPath.length > 0
                spacing: 9
                Slider {
                    id: progressSlider
                    Layout.fillWidth: true
                    from: 0
                    to: Math.max(1, audioPlayer.duration)
                    value: audioPlayer.position
                    onMoved: audioPlayer.setPosition(value)
                }
                RowLayout {
                    Layout.fillWidth: true
                    Label { text: modalRoot.formatTime(audioPlayer.position); color: "#66ffffff"; font.pixelSize: 10; font.family: "monospace" }
                    Item { Layout.fillWidth: true }
                    Label { text: modalRoot.formatTime(audioPlayer.duration); color: "#66ffffff"; font.pixelSize: 10; font.family: "monospace" }
                }
                RowLayout {
                    Layout.alignment: Qt.AlignHCenter
                    spacing: 28
                    ToolButton {
                        text: "↶ 10"
                        Accessible.name: qsTr("Voltar dez segundos")
                        onClicked: audioPlayer.seekRelative(-10)
                    }
                    Button {
                        id: playButton
                        implicitWidth: 56
                        implicitHeight: 56
                        text: modalRoot.isPlaying ? "Ⅱ" : "▶"
                        Accessible.name: modalRoot.isPlaying ? qsTr("Pausar áudio") : qsTr("Reproduzir áudio")
                        onClicked: audioPlayer.togglePlay()
                        background: Rectangle { radius: width / 2; color: playButton.hovered ? "#fca5a5" : "#f87171" }
                        contentItem: Label { text: playButton.text; color: "white"; font.pixelSize: 23; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    }
                    ToolButton {
                        text: "10 ↷"
                        Accessible.name: qsTr("Avançar dez segundos")
                        onClicked: audioPlayer.seekRelative(10)
                    }
                }
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 10
                    ToolButton {
                        text: modalRoot.muted || modalRoot.currentVolume === 0 ? "◖×" : "◖))"
                        Accessible.name: modalRoot.muted ? qsTr("Ativar som") : qsTr("Silenciar")
                        onClicked: modalRoot.muted = !modalRoot.muted
                    }
                    Slider {
                        Layout.fillWidth: true
                        from: 0
                        to: 1
                        value: modalRoot.currentVolume
                        onMoved: {
                            modalRoot.currentVolume = value
                            if (value > 0) modalRoot.muted = false
                        }
                    }
                }
            }
        }
    }
}
