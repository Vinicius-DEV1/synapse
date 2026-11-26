pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: itemRemovalRoot
    parent: Overlay.overlay
    anchors.centerIn: parent
    width: Math.min(parent ? parent.width - 32 : 420, 420)
    modal: true
    focus: true
    padding: 18
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    standardButtons: Dialog.NoButton

    property bool isOpen: false
    property string itemName: ""
    property string errorMessage: ""
    signal unlinkRequested()
    signal moveToTrashRequested()
    signal dismissed()

    onIsOpenChanged: {
        if (isOpen) open()
        else close()
    }
    onClosed: dismissed()

    background: Rectangle {
        color: "#16151f"
        radius: 14
        border.color: "#22ffffff"
        border.width: 1
    }

    contentItem: ColumnLayout {
        spacing: 12

        Text {
            Layout.fillWidth: true
            text: qsTr("Remover documento")
            color: "#fffffe"
            font.pixelSize: 15
            font.bold: true
        }

        Text {
            Layout.fillWidth: true
            text: itemRemovalRoot.itemName
            color: "#c4c5d4"
            font.pixelSize: 12
            wrapMode: Text.Wrap
        }

        Text {
            Layout.fillWidth: true
            text: qsTr("Escolha se o arquivo deve continuar disponível no sistema.")
            color: "#a7a9be"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }

        Text {
            Layout.fillWidth: true
            visible: itemRemovalRoot.errorMessage.length > 0
            text: itemRemovalRoot.errorMessage
            color: "#fda4af"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }

        Button {
            id: unlinkButton
            Layout.fillWidth: true
            Layout.preferredHeight: 48
            Accessible.name: qsTr("Desvincular do grupo e manter o arquivo")
            onClicked: itemRemovalRoot.unlinkRequested()
            background: Rectangle {
                radius: 8
                color: unlinkButton.hovered ? "#252435" : "#1d1c28"
                border.color: "#22ffffff"
            }
            contentItem: ColumnLayout {
                spacing: 2
                Text { text: qsTr("Apenas desvincular do grupo"); color: "#fffffe"; font.pixelSize: 11; font.bold: true }
                Text { text: qsTr("Mantém o arquivo na biblioteca."); color: "#a7a9be"; font.pixelSize: 9 }
            }
        }

        Button {
            id: trashButton
            Layout.fillWidth: true
            Layout.preferredHeight: 58
            Accessible.name: qsTr("Mover o arquivo local para a Lixeira")
            onClicked: itemRemovalRoot.moveToTrashRequested()
            background: Rectangle {
                radius: 8
                color: trashButton.hovered ? "#3b1b22" : "#26191e"
                border.color: "#33ef4444"
            }
            contentItem: ColumnLayout {
                spacing: 2
                Text { text: qsTr("Mover para a Lixeira local"); color: "#fda4af"; font.pixelSize: 11; font.bold: true }
                Text {
                    text: qsTr("A cópia do Google Drive não será removida.")
                    color: "#a7a9be"
                    font.pixelSize: 9
                    wrapMode: Text.Wrap
                }
            }
        }

        Button {
            id: cancelButton
            Layout.alignment: Qt.AlignRight
            text: qsTr("Cancelar")
            Accessible.name: qsTr("Cancelar a remoção deste documento")
            onClicked: itemRemovalRoot.close()
            background: Rectangle { radius: 7; color: cancelButton.hovered ? "#252435" : "transparent" }
            contentItem: Text {
                text: cancelButton.text
                color: "#c4c5d4"
                font.pixelSize: 11
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }
    }
}
