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
            showError(qsTr("Wait for the image to finish loading before cropping."))
            return
        }
        mode = "crop"
        errorMessage = ""
        cropCanvas.beginCrop()
    }

    function requestCrop() {
        const area = cropCanvas.cropPixels
        if (mode !== "crop" || saving || area.width < 1 || area.height < 1) {
            showError(qsTr("Choose a crop area inside the image."))
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
        errorMessage = String(message || qsTr("The crop could not be saved."))
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

    contentItem: ColumnLayout {
        spacing: 0

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 68
            color: "#dd0a0910"
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 24
                anchors.rightMargin: 18
                spacing: 16
                Label {
                    Layout.fillWidth: true
                    text: viewer.mode === "view" ? qsTr("Image viewer") : qsTr("Crop image")
                    color: "#fffffe"
                    font.pixelSize: 19
                    font.weight: Font.Medium
                }
                Button {
                    objectName: "notesRichImageStartCrop"
                    visible: viewer.mode === "view"
                    enabled: cropCanvas.imageReady && !viewer.saving
                    text: qsTr("Crop")
                    onClicked: viewer.beginCrop()
                }
                Button {
                    objectName: "notesRichImageCancelCrop"
                    visible: viewer.mode === "crop"
                    enabled: !viewer.saving
                    text: qsTr("Cancel")
                    onClicked: viewer.cancelCrop()
                }
                Button {
                    objectName: "notesRichImageSaveCrop"
                    visible: viewer.mode === "crop"
                    enabled: !viewer.saving
                    text: viewer.saving ? qsTr("Saving…") : qsTr("Save crop")
                    onClicked: viewer.requestCrop()
                }
                ToolButton {
                    objectName: "notesRichImageCloseViewer"
                    text: "×"
                    Accessible.name: qsTr("Close image viewer")
                    onClicked: viewer.close()
                }
            }
        }

        NotesRichImageViewerCanvas {
            id: cropCanvas
            Layout.fillWidth: true
            Layout.fillHeight: true
            imageSource: viewer.imageSource
            mode: viewer.mode
            zoom: viewer.zoom
            onZoomStepRequested: function(amount) {
                viewer.zoom = viewer.clamp(viewer.zoom + amount, 0.5, 5)
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: viewer.errorMessage.length > 0 ? 82 : 66
            color: "#cc0a0910"
            ColumnLayout {
                anchors.fill: parent
                anchors.leftMargin: 24
                anchors.rightMargin: 24
                anchors.topMargin: 8
                anchors.bottomMargin: 8
                spacing: 2
                RowLayout {
                    Layout.fillWidth: true
                    Layout.maximumWidth: 520
                    Layout.alignment: Qt.AlignHCenter
                    Label { text: "−"; color: "#a7a9be"; Accessible.name: qsTr("Zoom out") }
                    Slider {
                        id: zoomSlider
                        objectName: "notesRichImageZoomSlider"
                        Layout.fillWidth: true
                        from: 0.5
                        to: 5
                        stepSize: 0.1
                        value: viewer.zoom
                        onMoved: viewer.zoom = value
                        Accessible.name: qsTr("Image zoom")
                    }
                    Label { text: "+"; color: "#a7a9be"; Accessible.name: qsTr("Zoom in") }
                    Label {
                        Layout.preferredWidth: 48
                        text: Math.round(viewer.zoom * 100) + "%"
                        color: "#a7a9be"
                        font.family: "monospace"
                    }
                }
                Label {
                    Layout.alignment: Qt.AlignHCenter
                    visible: viewer.mode === "crop" || viewer.errorMessage.length > 0
                    text: viewer.errorMessage.length > 0 ? viewer.errorMessage
                        : qsTr("Drag to select a crop · Shift-drag or right-drag to move the image")
                    color: viewer.errorMessage.length > 0 ? "#fda4af" : "#a7a9be"
                    font.pixelSize: 12
                    wrapMode: Text.Wrap
                }
            }
        }
    }
}
