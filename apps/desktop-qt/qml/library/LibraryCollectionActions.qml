import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: actions
    property var controller: null
    property string selectedCollectionId: ""
    property var pendingDeleteCollection: null

    signal dataChanged()
    signal statusRequested(string message)
    signal collectionDeleted(string collectionId)

    function openEditor(collection) {
        collectionDialog.openFor(collection)
    }

    function requestDelete(collection) {
        pendingDeleteCollection = collection
        deleteDialog.open()
    }

    LibraryCollectionDialog {
        id: collectionDialog
        anchors.centerIn: parent
        controller: actions.controller
        onSaved: {
            actions.dataChanged()
            actions.statusRequested("Collection saved.")
        }
    }

    Dialog {
        id: deleteDialog
        title: "Delete collection"
        modal: true
        anchors.centerIn: parent
        width: 420
        standardButtons: Dialog.NoButton
        background: Rectangle { color: "#181720"; border.color: "#18ffffff"; radius: 14 }
        contentItem: Text {
            text: actions.pendingDeleteCollection
                ? "Delete ‘" + actions.pendingDeleteCollection.name + "’? Books in this collection will remain in your library."
                : "Delete this collection?"
            color: "#d4d4dc"
            wrapMode: Text.Wrap
            padding: 20
        }
        footer: RowLayout {
            spacing: 10
            Item { Layout.fillWidth: true }
            Button { text: "Cancel"; onClicked: deleteDialog.reject() }
            Button {
                text: "Delete"
                onClicked: {
                    if (!actions.pendingDeleteCollection ||
                        !actions.controller.deleteLibraryCollection(actions.pendingDeleteCollection.id)) {
                        actions.statusRequested("Could not delete the collection.")
                        deleteDialog.reject()
                        return
                    }
                    const deletedId = actions.pendingDeleteCollection.id
                    actions.pendingDeleteCollection = null
                    deleteDialog.accept()
                    actions.collectionDeleted(deletedId)
                    actions.statusRequested("Collection deleted.")
                    actions.dataChanged()
                }
                background: Rectangle { color: parent.down ? "#881e33" : "#9f2941"; radius: 8 }
                contentItem: Text { text: parent.text; color: "white"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Item { Layout.preferredWidth: 10 }
        }
        onRejected: actions.pendingDeleteCollection = null
    }
}
