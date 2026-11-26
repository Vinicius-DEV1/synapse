import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: missingDialogRoot
    parent: Overlay.overlay
    anchors.centerIn: parent
    width: Math.min(parent ? parent.width - 32 : 360, 360)
    modal: true
    focus: true
    padding: 18
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    standardButtons: Dialog.NoButton

    property bool isOpen: false
    property string fileName: ""
    property string errorMessage: ""

    signal removeWidgetRequested()
    signal dismissed()

    onIsOpenChanged: {
        if (isOpen) open()
        else close()
    }
    onClosed: dismissed()

    background: Rectangle {
        color: "#16151f"
        radius: 14
        border.color: "#33ef4444"
        border.width: 1
    }

    contentItem: ColumnLayout {
        spacing: 12

        Text {
            Layout.fillWidth: true
            text: qsTr("Arquivo excluído")
            color: "#fffffe"
            font.pixelSize: 15
            font.bold: true
        }

        Text {
            Layout.fillWidth: true
            text: qsTr("O anexo ‘%1’ não foi encontrado ou está na Lixeira. Deseja manter este widget na nota?")
                .arg(missingDialogRoot.fileName || qsTr("Arquivo"))
            color: "#c4c5d4"
            font.pixelSize: 12
            wrapMode: Text.Wrap
        }

        Text {
            Layout.fillWidth: true
            visible: missingDialogRoot.errorMessage.length > 0
            text: missingDialogRoot.errorMessage
            color: "#fda4af"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Button {
                id: keepButton
                Layout.fillWidth: true
                text: qsTr("Manter")
                onClicked: missingDialogRoot.close()
                background: Rectangle {
                    radius: 8
                    color: keepButton.hovered ? "#252435" : "#1d1c28"
                    border.color: "#22ffffff"
                }
                contentItem: Text {
                    text: keepButton.text
                    color: "#c4c5d4"
                    font.pixelSize: 11
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

            Button {
                id: removeButton
                Layout.fillWidth: true
                text: qsTr("Remover widget")
                Accessible.name: qsTr("Remover o widget de arquivo excluído desta nota")
                onClicked: missingDialogRoot.removeWidgetRequested()
                background: Rectangle {
                    radius: 8
                    color: removeButton.hovered ? "#dc2626" : "#ef4444"
                }
                contentItem: Text {
                    text: removeButton.text
                    color: "#ffffff"
                    font.pixelSize: 11
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }
    }
}
