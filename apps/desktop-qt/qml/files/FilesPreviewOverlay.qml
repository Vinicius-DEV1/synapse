import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import Synapse.Media 1.0
import ".."

Rectangle {
    id: previewOverlay
    anchors.fill: parent
    z: 100
    visible: false
    color: theme.bgDarkBg

    property string previewPath: ""
    property string previewUrl: ""
    property string previewName: ""
    property string previewFileId: ""
    property string previewType: ""
    property string previewText: ""
    property string previewError: ""
    property bool loading: false

    signal closeRequested()
    signal exportRequested(string fileId)

    function stopVideo() {
        previewVideoPlayer.command(["stop"])
        previewVideoPlayer.source = ""
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 24
        spacing: 14

        RowLayout {
            Layout.fillWidth: true
            AppIcon { width: 18; height: 18; name: "files"; color: theme.brand400 }
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2
                Text { Layout.fillWidth: true; text: previewOverlay.previewName || "Abrindo arquivo…"; color: theme.textDark; font.pixelSize: 15; font.bold: true; elide: Text.ElideRight }
                Text { text: previewOverlay.previewType ? String(previewOverlay.previewType).toUpperCase() : "Pré-visualização local"; color: theme.textMuted; font.pixelSize: 9; font.family: theme.fontMono }
            }
            Button {
                text: "Exportar"
                visible: !previewOverlay.loading && previewOverlay.previewPath.length > 0
                onClicked: previewOverlay.exportRequested(previewOverlay.previewFileId)
                background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 8 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            ToolButton {
                text: "×"
                implicitWidth: 34
                implicitHeight: 34
                onClicked: {
                    previewOverlay.stopVideo()
                    previewOverlay.closeRequested()
                }
                ToolTip.visible: hovered
                ToolTip.text: "Fechar (Esc)"
                background: Rectangle { color: parent.hovered ? theme.bgHover : theme.bgDarkSurface; radius: 8 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 20; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.fillHeight: true
            radius: 12
            color: "#990c0b12"
            border.color: theme.borderSubtle

            BusyIndicator {
                anchors.centerIn: parent
                running: previewOverlay.loading
                visible: running
            }

            Image {
                anchors.fill: parent
                anchors.margins: 12
                visible: !previewOverlay.loading && previewOverlay.previewType === "image"
                source: previewOverlay.previewUrl
                asynchronous: true
                cache: false
                autoTransform: true
                fillMode: Image.PreserveAspectFit
                onStatusChanged: {
                    if (status === Image.Error) previewOverlay.previewError = "Qt could not decode this image format."
                }
            }

            MpvVideoPlayer {
                id: previewVideoPlayer
                anchors.fill: parent
                visible: !previewOverlay.loading && previewOverlay.previewType === "video"
                source: visible ? previewOverlay.previewPath : ""
            }

            ScrollView {
                anchors.fill: parent
                anchors.margins: 14
                visible: !previewOverlay.loading && previewOverlay.previewType === "text" && previewOverlay.previewError.length === 0
                clip: true
                TextArea {
                    text: previewOverlay.previewText
                    readOnly: true
                    selectByMouse: true
                    wrapMode: TextEdit.NoWrap
                    color: theme.textSubtext
                    font.family: theme.fontMono
                    font.pixelSize: 11
                    background: Rectangle { color: "transparent" }
                }
            }

            ColumnLayout {
                anchors.centerIn: parent
                width: Math.min(parent.width - 48, 520)
                spacing: 10
                visible: !previewOverlay.loading && (previewOverlay.previewError.length > 0 || ["image", "video", "text"].indexOf(previewOverlay.previewType) === -1)
                AppIcon { Layout.alignment: Qt.AlignHCenter; width: 30; height: 30; name: "files"; color: theme.textMuted }
                Text {
                    Layout.fillWidth: true
                    text: previewOverlay.previewError || "A pré-visualização nativa ainda não está disponível para este formato. Exporte o arquivo para abri-lo em um leitor do sistema."
                    color: theme.textSubtext
                    font.pixelSize: 11
                    wrapMode: Text.Wrap
                    horizontalAlignment: Text.AlignHCenter
                }
                Text {
                    Layout.fillWidth: true
                    text: previewOverlay.previewType === "pdf" || previewOverlay.previewType === "epub"
                          ? "PDF e EPUB precisam do leitor nativo dedicado." : ""
                    visible: text.length > 0
                    color: theme.textMuted
                    font.pixelSize: 10
                    horizontalAlignment: Text.AlignHCenter
                }
            }
        }
    }
}
