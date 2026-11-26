import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: deleteDialogRoot
    parent: Overlay.overlay
    anchors.centerIn: parent
    width: Math.min(parent ? parent.width - 32 : 420, 420)
    modal: true
    focus: true
    padding: 20
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    standardButtons: Dialog.NoButton

    property bool isOpen: false
    property string fileName: ""
    property bool fileExists: true
    property bool hasDriveCopy: false
    property string errorMessage: ""

    signal unlinkConfirmed()
    signal deleteLocalConfirmed()
    signal dismissed()

    onIsOpenChanged: {
        if (isOpen) open()
        else close()
    }
    onClosed: dismissed()

    Overlay.modal: Rectangle { color: "#b0000000" }

    background: Rectangle {
        color: "#16151f"
        radius: 16
        border.color: "#2e2e38"
        border.width: 1
    }

    contentItem: ColumnLayout {
        spacing: 12

        Text {
            Layout.fillWidth: true
            text: qsTr("Excluir arquivo")
            color: "#fffffe"
            font.pixelSize: 16
            font.weight: Font.DemiBold
        }

        Text {
            Layout.fillWidth: true
            text: qsTr("Desvincule o arquivo desta nota ou mova o registro local para a Lixeira.")
            color: "#a7a9be"
            font.pixelSize: 12
            wrapMode: Text.Wrap
        }

        Text {
            Layout.fillWidth: true
            visible: deleteDialogRoot.fileName.length > 0
            text: !deleteDialogRoot.fileExists
                ? qsTr("Este arquivo não está disponível. Você pode remover somente o widget desta nota.")
                : deleteDialogRoot.hasDriveCopy
                    ? qsTr("O registro local de ‘%1’ irá para a Lixeira após salvar a nota. Se outro bloco desta nota ainda o usar, ele será mantido. A cópia no Google Drive permanecerá.")
                        .arg(deleteDialogRoot.fileName)
                    : qsTr("O registro local de ‘%1’ irá para a Lixeira após salvar a nota. Se outro bloco desta nota ainda o usar, ele será mantido.")
                        .arg(deleteDialogRoot.fileName)
            color: "#c4c5d4"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }

        Text {
            Layout.fillWidth: true
            visible: deleteDialogRoot.errorMessage.length > 0
            text: deleteDialogRoot.errorMessage
            color: "#fda4af"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Button {
                id: cancelButton
                Layout.fillWidth: true
                text: qsTr("Cancelar")
                Accessible.name: qsTr("Cancelar e fechar sem alterar o arquivo")
                onClicked: deleteDialogRoot.close()
                background: Rectangle {
                    radius: 8
                    color: cancelButton.hovered ? "#252435" : "#1d1c28"
                    border.color: "#22ffffff"
                }
                contentItem: Text {
                    text: cancelButton.text
                    color: "#c4c5d4"
                    font.pixelSize: 11
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

            Button {
                id: unlinkButton
                Layout.fillWidth: true
                text: qsTr("Desvincular")
                Accessible.name: qsTr("Desvincular o arquivo somente desta nota")
                onClicked: deleteDialogRoot.unlinkConfirmed()
                background: Rectangle {
                    radius: 8
                    color: unlinkButton.hovered ? "#343242" : "#272633"
                    border.color: "#33ffffff"
                }
                contentItem: Text {
                    text: unlinkButton.text
                    color: "#fffffe"
                    font.pixelSize: 11
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

            Button {
                id: trashButton
                Layout.fillWidth: true
                visible: deleteDialogRoot.fileExists
                text: qsTr("Mover para Lixeira")
                Accessible.name: qsTr("Mover o arquivo local para a Lixeira")
                onClicked: deleteDialogRoot.deleteLocalConfirmed()
                background: Rectangle {
                    radius: 8
                    color: trashButton.hovered ? "#dc2626" : "#ef4444"
                }
                contentItem: Text {
                    text: trashButton.text
                    color: "#ffffff"
                    font.pixelSize: 10
                    font.weight: Font.DemiBold
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                    elide: Text.ElideRight
                }
            }
        }
    }
}
