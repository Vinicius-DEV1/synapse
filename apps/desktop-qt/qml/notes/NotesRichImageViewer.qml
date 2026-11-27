pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Popup {
    id: viewer
    objectName: "notesRichImageViewer"

    property string imageSource: ""
    property string mode: "view"
    property real zoom: 1
    property string errorMessage: ""
    property bool saving: false
    property int requestSequence: 0

    signal cropRequested(int x, int y, int width, int height, string requestId)

    modal: true
    focus: true
    closePolicy: Popup.CloseOnEscape
    parent: Overlay.overlay
    x: 0
    y: 0
    width: parent ? parent.width : 1024
    height: parent ? parent.height : 768
    padding: 0

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value))
    }

    function openForImage(source) {
        imageSource = String(source || "")
        mode = "view"
        zoom = 1
        errorMessage = ""
        saving = false
        cropCanvas.reset()
        open()
    }

    function beginCrop() {
        if (!cropCanvas.imageReady) {
            showError(qsTr("Aguarde a imagem terminar de carregar antes de recortá-la."))
            return
        }
        mode = "crop"
        errorMessage = ""
        cropCanvas.beginCrop()
    }

    function requestCrop() {
        const area = cropCanvas.cropPixels
        if (mode !== "crop" || saving || area.width < 1 || area.height < 1) {
            showError(qsTr("Escolha uma área da imagem para recortar."))
            return false
        }
        requestSequence += 1
        errorMessage = ""
        saving = true
        cropRequested(area.x, area.y, area.width, area.height, String(requestSequence))
        return true
    }

    function showError(message) {
        saving = false
        errorMessage = String(message || qsTr("Não foi possível salvar o recorte."))
    }

    function finishCrop() {
        saving = false
        close()
    }

    function cancelCrop() {
        if (saving) return
        mode = "view"
        errorMessage = ""
        cropCanvas.reset()
    }

    onClosed: saving = false

    background: Rectangle { color: "#f20a0910" }

    contentItem: Item {
        Rectangle {
            id: viewerHeader
            anchors.top: parent.top
            width: parent.width
            height: 72
            gradient: Gradient {
                GradientStop { position: 0; color: "#cc000000" }
                GradientStop { position: 1; color: "#00000000" }
            }
            z: 2
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 32
                anchors.rightMargin: 16
                spacing: 12
                Label {
                    objectName: "notesRichImageViewerTitle"
                    Layout.fillWidth: true
                    text: viewer.mode === "view" ? qsTr("Visualizador de imagem") : qsTr("Recortar imagem")
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.weight: Font.Medium
                }
                Button {
                    id: startCropButton
                    objectName: "notesRichImageStartCrop"
                    visible: viewer.mode === "view"
                    enabled: cropCanvas.imageReady && !viewer.saving
                    text: qsTr("Recortar")
                    leftPadding: 16
                    rightPadding: 16
                    implicitHeight: 40
                    contentItem: Label {
                        text: startCropButton.text
                        color: "#fffffe"
                        font.pixelSize: 14
                        font.weight: Font.Medium
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle {
                        color: startCropButton.hovered || startCropButton.down ? "#33ffffff" : "#1affffff"
                        radius: 8
                    }
                    onClicked: viewer.beginCrop()
                }
                Button {
                    id: cancelCropButton
                    objectName: "notesRichImageCancelCrop"
                    visible: viewer.mode === "crop"
                    enabled: !viewer.saving
                    text: qsTr("Cancelar")
                    leftPadding: 16
                    rightPadding: 16
                    implicitHeight: 40
                    contentItem: Label {
                        text: cancelCropButton.text
                        color: "#fffffe"
                        font.pixelSize: 14
                        font.weight: Font.Medium
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle {
                        color: cancelCropButton.hovered || cancelCropButton.down ? "#33ffffff" : "#1affffff"
                        radius: 8
                    }
                    onClicked: viewer.cancelCrop()
                }
                Button {
                    id: saveCropButton
                    objectName: "notesRichImageSaveCrop"
                    visible: viewer.mode === "crop"
                    enabled: !viewer.saving
                    text: viewer.saving ? qsTr("Salvando…") : qsTr("Salvar recorte")
                    leftPadding: 16
                    rightPadding: 16
                    implicitHeight: 40
                    contentItem: Label {
                        text: saveCropButton.text
                        color: "#fffffe"
                        font.pixelSize: 14
                        font.weight: Font.Medium
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle {
                        color: saveCropButton.down ? "#7c3aed"
                            : saveCropButton.hovered ? "#8b5cf6" : "#7c3aed"
                        radius: 8
                    }
                    onClicked: viewer.requestCrop()
                }
                ToolButton {
                    id: closeViewerButton
                    objectName: "notesRichImageCloseViewer"
                    text: "×"
                    Accessible.name: qsTr("Fechar visualizador de imagem")
                    implicitWidth: 40
                    implicitHeight: 40
                    contentItem: Label {
                        text: "×"
                        color: "#fffffe"
                        font.pixelSize: 24
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle {
                        color: closeViewerButton.hovered || closeViewerButton.down ? "#33ffffff" : "#1affffff"
                        radius: width / 2
                    }
                    onClicked: viewer.close()
                }
            }
        }

        NotesRichImageViewerCanvas {
            id: cropCanvas
            anchors.fill: parent
            imageSource: viewer.imageSource
            mode: viewer.mode
            zoom: viewer.zoom
            z: 0
            onZoomStepRequested: function(amount) {
                viewer.zoom = viewer.clamp(viewer.zoom + amount, 0.5, 5)
            }
        }

        NotesRichImageViewerZoomControls {
            id: zoomControls
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.bottom: parent.bottom
            anchors.bottomMargin: 24
            width: Math.max(0, Math.min(parent.width - 32, 384))
            zoom: viewer.zoom
            mode: viewer.mode
            message: viewer.errorMessage
            z: 2
            onZoomRequested: function(value) { viewer.zoom = value }
        }
    }
}
