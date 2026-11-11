import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: dialogs
    anchors.fill: parent
    property string pendingFolderId: ""
    property string pendingFolderName: ""

    signal saveRequested(string folderId, string previousName, string newName)
    signal deleteRequested(string folderId, string folderName)

    function openCreate() {
        pendingFolderId = ""
        pendingFolderName = ""
        editorDialog.open()
    }

    function openRename(folderId, folderName) {
        pendingFolderId = folderId
        pendingFolderName = folderName
        editorDialog.open()
    }

    function openDelete(folderId, folderName) {
        pendingFolderId = folderId
        pendingFolderName = folderName
        deleteDialog.open()
    }

    Dialog {
        id: editorDialog
        title: dialogs.pendingFolderId.length > 0 ? "Renomear pasta" : "Criar pasta"
        modal: true
        anchors.centerIn: parent
        width: 380
        standardButtons: Dialog.NoButton
        background: Rectangle { color: "#1a1924"; border.color: "#2affffff"; radius: 14 }

        onOpened: {
            folderNameField.text = dialogs.pendingFolderName
            folderNameField.forceActiveFocus()
        }

        contentItem: ColumnLayout {
            spacing: 12
            Text {
                text: dialogs.pendingFolderId.length > 0 ? "Escolha o novo nome da pasta." : "Organize seus vídeos em uma pasta."
                color: "#c4c5d4"
                wrapMode: Text.Wrap
                Layout.fillWidth: true
            }
            TextField {
                id: folderNameField
                Layout.fillWidth: true
                placeholderText: "Nome da pasta"
                color: "#ffffff"
                selectByMouse: true
                onAccepted: saveButton.clicked()
            }
        }

        footer: RowLayout {
            spacing: 10
            Item { Layout.fillWidth: true }
            Button {
                text: "Cancelar"
                onClicked: editorDialog.reject()
            }
            Button {
                id: saveButton
                text: dialogs.pendingFolderId.length > 0 ? "Salvar" : "Criar"
                enabled: folderNameField.text.trim().length > 0
                onClicked: editorDialog.accept()
            }
        }

        onAccepted: dialogs.saveRequested(dialogs.pendingFolderId, dialogs.pendingFolderName, folderNameField.text.trim())
    }

    Dialog {
        id: deleteDialog
        title: "Excluir pasta"
        modal: true
        anchors.centerIn: parent
        width: 420
        standardButtons: Dialog.NoButton
        background: Rectangle { color: "#1a1924"; border.color: "#2affffff"; radius: 14 }
        contentItem: Text {
            text: "Excluir ‘" + dialogs.pendingFolderName + "’? Os vídeos serão mantidos na raiz da biblioteca."
            color: "#d4d4dc"
            wrapMode: Text.Wrap
            padding: 20
        }
        footer: RowLayout {
            spacing: 10
            Item { Layout.fillWidth: true }
            Button { text: "Cancelar"; onClicked: deleteDialog.reject() }
            Button {
                text: "Excluir"
                onClicked: deleteDialog.accept()
                background: Rectangle { color: "#9f2941"; radius: 8 }
                contentItem: Text { text: parent.text; color: "white"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
        onAccepted: dialogs.deleteRequested(dialogs.pendingFolderId, dialogs.pendingFolderName)
    }
}
