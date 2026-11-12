import QtQuick 2.15

Item {
    id: exportActions
    objectName: "notesRichImageExportActions"

    property var controller
    property var textEditor
    property var textOperations
    property var imageState: ({ valid: false })
    property var statusTarget
    property bool active: false
    property string copyState: "idle"
    readonly property bool actionsEnabled: active && imageState.valid && controller &&
        !controller.fileOperationRunning

    function selectedImageData() {
        if (!actionsEnabled || !textEditor || !textOperations) return ""
        return String(textOperations.richImageData(textEditor.textDocument, imageState.position) || "")
    }

    function copySelectedImage() {
        var dataUrl = selectedImageData()
        if (!dataUrl) return false
        copyState = "copying"
        controller.copyNotesRichImage(dataUrl)
        return true
    }

    function downloadSelectedImage() {
        var dataUrl = selectedImageData()
        if (!dataUrl) return false
        return saveDialog.openForImage(dataUrl, String(imageState.caption || ""))
    }

    Connections {
        target: exportActions.controller
        ignoreUnknownSignals: true

        function onFileOperationFinished(result) {
            var operation = String(result.operation || "")
            if (operation !== "notes-rich-image-copy" && operation !== "notes-rich-image-download") return
            if (operation === "notes-rich-image-copy") {
                exportActions.copyState = result.success ? "copied" : "failed"
                copyStateTimer.restart()
            }
            if (exportActions.statusTarget) {
                if (result.success) exportActions.statusTarget.showSuccess(
                            operation === "notes-rich-image-copy"
                                ? qsTr("Image copied to the clipboard.") : qsTr("Image saved."))
                else exportActions.statusTarget.showError(
                            String(result.error || qsTr("The image operation failed.")))
            }
        }
    }

    Timer {
        id: copyStateTimer
        interval: 1600
        repeat: false
        onTriggered: exportActions.copyState = "idle"
    }

    NotesRichImageSaveDialog {
        id: saveDialog
        controller: exportActions.controller
        onSaveRequested: function(dataUrl, destinationUrl) {
            if (!exportActions.controller) {
                if (exportActions.statusTarget)
                    exportActions.statusTarget.showError(qsTr("Image saving is unavailable."))
                return
            }
            exportActions.controller.saveNotesRichImage(dataUrl, destinationUrl)
        }
        onUnavailable: {
            if (exportActions.statusTarget)
                exportActions.statusTarget.showError(qsTr("Image saving is unavailable."))
        }
    }
}
