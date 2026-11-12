import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: confirmationRoot
    objectName: "notesCodeDeleteConfirmation"

    signal confirmed()

    title: qsTr("Delete code block?")
    modal: true
    anchors.centerIn: parent
    width: 340
    standardButtons: Dialog.NoButton
    background: Rectangle {
        color: "#1a1924"
        border.color: "#2affffff"
        radius: 12
    }

    contentItem: Text {
        text: qsTr("The code block and all of its lines will be removed. You can undo this edit.")
        color: "#d4d4dc"
        wrapMode: Text.Wrap
        padding: 16
    }

    footer: RowLayout {
        spacing: 8
        Item { Layout.fillWidth: true }
        Button {
            text: qsTr("Cancel")
            onClicked: confirmationRoot.reject()
        }
        Button {
            text: qsTr("Delete")
            onClicked: confirmationRoot.accept()
        }
    }

    onAccepted: confirmationRoot.confirmed()
}
