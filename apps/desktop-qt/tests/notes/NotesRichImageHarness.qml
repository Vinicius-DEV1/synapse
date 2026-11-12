import QtQuick 2.15
import "../../qml/notes"

Item {
    width: 800
    height: 420
    property int afterPosition: 0
    readonly property rect afterTextRect: imageEditor.positionToRectangle(afterPosition)

    TextEdit {
        id: imageEditor
        objectName: "notesRichImageEditor"
        anchors.fill: parent
        textFormat: TextEdit.RichText
        text: "<p>BeforeAfter</p>"
    }

    Timer {
        id: commitTimer
        interval: 180
        repeat: false
    }

    NotesFormattingToolbar {
        id: imageToolbar
        objectName: "notesRichImageToolbar"
        width: parent.width
        height: 38
        richMode: true
        richImageSelected: imageActions.imageState.valid
        richImageAlignment: imageActions.imageState.alignment || "center"
        richImageCanMoveUp: imageActions.canMoveUp
        richImageCanMoveDown: imageActions.canMoveDown
        richImageActionsEnabled: imageActions.exportActionsEnabled
        richImageCopyState: imageActions.copyState
        onRichImageAlignmentRequested: function(alignment) { imageActions.setAlignment(alignment) }
        onRichImageMoveRequested: function(upward) { imageActions.moveImage(upward) }
        onRichImageFitRequested: imageActions.fitToWidth()
        onRichImageResetRequested: imageActions.resetImageSize()
        onRichImageParagraphBelowRequested: imageActions.insertParagraphBelowImage()
        onRichImageCopyRequested: imageActions.copySelectedImage()
        onRichImageDownloadRequested: imageActions.downloadSelectedImage()
        onRichImageDeleteRequested: imageActions.requestDelete()
    }

    NotesRichImageActions {
        id: imageActions
        anchors.fill: parent
        textEditor: imageEditor
        textOperations: notesTextOperations
        controller: null
        commitTimer: commitTimer
        active: true
    }
}
