import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: deleteDialog
    modal: true
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 430)
    standardButtons: Dialog.NoButton
    closePolicy: Popup.CloseOnEscape

    property int selectedCount: 0
    signal confirmed()

    function openFor(count) {
        selectedCount = count
        open()
    }

    background: Rectangle { color: "#181720"; radius: 14; border.color: "#18ffffff" }
    contentItem: Text {
        text: "Remove " + deleteDialog.selectedCount +
              (deleteDialog.selectedCount === 1 ? " book from the library?" : " books from the library?") +
              " Local files will be kept."
        color: "#d4d4dc"
        wrapMode: Text.Wrap
        padding: 20
    }
    footer: RowLayout {
        spacing: 10
        Item { Layout.fillWidth: true }
        Button { text: "Cancel"; onClicked: deleteDialog.reject() }
        Button {
            text: "Remove"
            onClicked: {
                deleteDialog.confirmed()
                deleteDialog.accept()
            }
            background: Rectangle { color: parent.down ? "#881e33" : "#9f2941"; radius: 8 }
            contentItem: Text { text: parent.text; color: "white"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }
        Item { Layout.preferredWidth: 10 }
    }
}
