import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Dialogs
import ".."

Item {
    id: coverSection
    implicitHeight: coverRow.implicitHeight

    property var controller: null
    property string coverImage: ""
    property bool isProcessing: false

    signal imageProcessed(string dataUrl)
    signal statusRequested(string message)

    RowLayout {
        id: coverRow
        anchors.fill: parent
        spacing: 12
        Rectangle {
            Layout.preferredWidth: 62
            Layout.preferredHeight: 82
            radius: 8
            color: "#272536"
            border.color: "#18ffffff"
            clip: true
            Image {
                id: coverPreview
                anchors.fill: parent
                source: coverSection.coverImage
                fillMode: Image.PreserveAspectCrop
                asynchronous: true
                visible: status === Image.Ready
            }
            AppIcon { anchors.centerIn: parent; width: 24; height: 24; name: "library"; color: "#c4b5fd"; visible: coverPreview.status !== Image.Ready }
        }
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 5
            Label { text: "Cover image"; color: "#dedee5"; font.pixelSize: 11; font.weight: Font.Medium }
            Label {
                text: coverSection.isProcessing ? "Preparing optimized cover…" : "Choose a JPG, PNG, WebP, or BMP image."
                color: "#9293a5"
                font.pixelSize: 10
                wrapMode: Text.Wrap
                Layout.fillWidth: true
            }
            Button {
                text: coverSection.isProcessing ? "Processing…" : "Change cover"
                enabled: !!coverSection.controller && !coverSection.controller.fileOperationRunning
                onClicked: coverFileDialog.open()
            }
        }
    }

    FileDialog {
        id: coverFileDialog
        title: "Choose a book cover image"
        fileMode: FileDialog.OpenFile
        nameFilters: ["Images (*.jpg *.jpeg *.png *.webp *.bmp)"]
        onAccepted: {
            if (!coverSection.controller) return
            coverSection.isProcessing = true
            coverSection.controller.processLibraryBookCover(selectedFile)
        }
    }

    Connections {
        target: coverSection.controller
        function onFileOperationFinished(result) {
            if (result.operation !== "library-cover-process") return
            coverSection.isProcessing = false
            if (result.success) coverSection.imageProcessed(result.coverImage)
            else coverSection.statusRequested(result.error || "Could not process the cover image.")
        }
    }
}
