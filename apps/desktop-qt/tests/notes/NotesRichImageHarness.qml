import QtQuick 2.15
import "../../qml/notes"

Item {
    width: 800
    height: 420

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
