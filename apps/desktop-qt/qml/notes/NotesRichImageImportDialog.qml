import QtQuick 2.15
import QtQuick.Dialogs

Item {
    id: imageImportDialog
    property var controller

    signal imageSelected(url fileUrl)
    signal controllerUnavailable()

    function open() {
        picker.open()
    }

    FileDialog {
        id: picker
        title: qsTr("Choose an image for the note")
        fileMode: FileDialog.OpenFile
        nameFilters: [qsTr("Images (*.png *.jpg *.jpeg *.gif *.webp *.bmp)")]
        onAccepted: {
            if (!imageImportDialog.controller) {
                imageImportDialog.controllerUnavailable()
                return
            }
            imageImportDialog.imageSelected(selectedFile)
        }
    }
}
