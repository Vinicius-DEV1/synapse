import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: deleteDialog

    property string noteTitle: ""
    property string errorMessage: ""

    signal confirmed()

    title: qsTr("Move note to Trash?")
    modal: true
    anchors.centerIn: parent
    width: 420
    standardButtons: Dialog.NoButton
    background: Rectangle {
        color: "#1a1924"
        border.color: "#2affffff"
        radius: 14
    }

    contentItem: ColumnLayout {
        spacing: 12

        Text {
            Layout.fillWidth: true
            text: qsTr("‘%1’ will be moved to Trash. You can restore it later.").arg(deleteDialog.noteTitle)
            color: "#d4d4dc"
            wrapMode: Text.Wrap
        }

        Text {
            Layout.fillWidth: true
            visible: deleteDialog.errorMessage.length > 0
            text: deleteDialog.errorMessage
            color: "#fda4af"
            wrapMode: Text.Wrap
        }
    }

    footer: RowLayout {
        spacing: 10
        Item { Layout.fillWidth: true }

        Button {
            text: qsTr("Cancel")
            onClicked: deleteDialog.reject()
            background: Rectangle {
                color: "#252435"
                radius: 8
                border.color: "#20ffffff"
            }
            contentItem: Text {
                text: parent.text
                color: "#c4c5d4"
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }

        Button {
            text: qsTr("Move to Trash")
            onClicked: deleteDialog.accept()
            background: Rectangle {
                color: "#9f2941"
                radius: 8
            }
            contentItem: Text {
                text: parent.text
                color: "white"
                font.bold: true
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }
    }

    onAccepted: deleteDialog.confirmed()
    onRejected: deleteDialog.errorMessage = ""
}
