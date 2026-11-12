import QtQuick 2.15
import QtQuick.Dialogs

Item {
    id: saveDialogRoot
    objectName: "notesRichImageSaveDialog"

    property var controller
    property string imageDataUrl: ""
    readonly property url suggestedFileUrl: picker.currentFile

    function closeDialog() { picker.close() }

    signal saveRequested(string imageDataUrl, url destinationUrl)
    signal unavailable()

    function openForImage(dataUrl, caption) {
        if (!controller || !dataUrl) {
            unavailable()
            return false
        }
        var suggestedUrl = controller.suggestedNotesRichImageSaveUrl(dataUrl, String(caption || ""))
        if (!suggestedUrl || String(suggestedUrl).length === 0) {
            unavailable()
            return false
        }
        imageDataUrl = String(dataUrl)
        picker.currentFile = suggestedUrl
        picker.open()
        return true
    }

    FileDialog {
        id: picker
        objectName: "notesRichImageSavePicker"
        title: qsTr("Save image")
        fileMode: FileDialog.SaveFile
        nameFilters: [qsTr("Raster images (*.png *.jpg *.jpeg *.gif *.webp *.bmp)")]

        onAccepted: {
            saveDialogRoot.saveRequested(saveDialogRoot.imageDataUrl, selectedFile)
            saveDialogRoot.imageDataUrl = ""
        }
        onRejected: saveDialogRoot.imageDataUrl = ""
    }
}
