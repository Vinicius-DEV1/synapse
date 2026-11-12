import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: notesDialog
    objectName: "notesLinkNotesDialog"
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 560)
    height: Math.min(parent.height - 32, 420)
    modal: true
    title: qsTr("Link notes")
    standardButtons: Dialog.NoButton

    property string linkUrl: ""
    property int blockStart: -1
    property bool isSaving: false

    signal saveRequested(string url, int start, string notes)

    function openForLink(url, start, notes) {
        linkUrl = url
        blockStart = start
        isSaving = false
        notesEditor.text = notes || ""
        open()
    }

    function finishSave(succeeded) {
        isSaving = false
        if (succeeded) close()
    }

    onOpened: notesEditor.forceActiveFocus()

    background: Rectangle {
        color: "#181720"
        radius: 14
        border.color: "#10ffffff"
    }

    contentItem: ColumnLayout {
        spacing: 12
        Label {
            Layout.fillWidth: true
            text: notesDialog.linkUrl
            color: "#a7a9be"
            elide: Text.ElideMiddle
        }
        TextArea {
            id: notesEditor
            objectName: "notesLinkNotesEditor"
            Layout.fillWidth: true
            Layout.fillHeight: true
            Accessible.name: qsTr("Notes for this link")
            placeholderText: qsTr("Write notes, highlights, or a summary for this link.")
            color: "#fffffe"
            selectByMouse: true
            wrapMode: TextEdit.Wrap
            background: Rectangle {
                color: "#12111a"
                radius: 8
                border.color: notesEditor.activeFocus ? "#66818cf8" : "#18ffffff"
            }
        }
        RowLayout {
            Layout.fillWidth: true
            Button {
                objectName: "notesLinkNotesClearButton"
                text: qsTr("Clear")
                Accessible.name: qsTr("Clear link notes")
                enabled: !notesDialog.isSaving && notesEditor.text.length > 0
                onClicked: notesEditor.clear()
            }
            Item { Layout.fillWidth: true }
            Button {
                text: qsTr("Cancel")
                Accessible.name: qsTr("Cancel link note editing")
                enabled: !notesDialog.isSaving
                onClicked: notesDialog.reject()
            }
            Button {
                objectName: "notesLinkNotesSaveButton"
                text: notesDialog.isSaving ? qsTr("Saving…") : qsTr("Save")
                Accessible.name: text
                highlighted: true
                enabled: !notesDialog.isSaving
                onClicked: {
                    notesDialog.isSaving = true
                    notesDialog.saveRequested(notesDialog.linkUrl, notesDialog.blockStart, notesEditor.text)
                }
            }
        }
    }
}
