import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Dialogs
import ".."

Item {
    id: dialogs

    property var folderChoices: []
    property var deleteItems: []
    property var moveItems: []
    property string createParentId: ""
    property string renameId: ""
    property bool renameIsFolder: false
    property string exportFileId: ""
    readonly property bool anyDialogOpen: importDialog.visible || exportDialog.visible || createFolderDialog.visible ||
                                          renameDialog.visible || deleteDialog.visible || moveDialog.visible ||
                                          folderUploadModal.visible || audioPlayerModal.visible || fileInfoModal.visible || documentAiModal.visible

    signal importsRequested(var urls)
    signal exportRequested(string fileId, string destinationPath)
    signal folderCreateRequested(string name, string parentId)
    signal folderUploadRequested(string folderPath, string parentId)
    signal renameRequested(string id, bool isFolder, string name)
    signal deleteRequested(var items)
    signal moveRequested(var items, string folderId)

    function openImport() { importDialog.open() }

    function openFolderUpload(parentId) {
        folderUploadModal.openModal(parentId)
    }

    function openAudioPlayer(item) {
        audioPlayerModal.openForFile(item)
    }

    function openFileInfo(item) {
        fileInfoModal.openForItem(item)
    }

    function openDocumentAi(item) {
        documentAiModal.openForFile(item)
    }

    function openExport(fileId) {
        exportFileId = fileId
        exportDialog.open()
    }

    function openCreateFolder(parentId) {
        createParentId = parentId || ""
        newFolderName.clear()
        createFolderDialog.open()
    }

    function openRename(id, name, isFolder) {
        renameId = id
        renameName = name
        renameIsFolder = isFolder
        renameText.text = name
        renameDialog.open()
    }

    function openDelete(items) {
        deleteItems = items.slice()
        deleteDialog.open()
    }

    function openMove(items, availableFolders, preferredFolderId) {
        moveItems = items.slice()
        folderChoices = availableFolders.slice()
        moveFolderChoice.currentIndex = 0
        for (var i = 0; i < folderChoices.length; i++) {
            if (folderChoices[i].id === (preferredFolderId || "")) {
                moveFolderChoice.currentIndex = i
                break
            }
        }
        moveDialog.open()
    }

    FileDialog {
        id: importDialog
        title: "Import files"
        fileMode: FileDialog.OpenFiles
        nameFilters: ["All files (*)"]
        onAccepted: dialogs.importsRequested(selectedFiles)
    }

    FileDialog {
        id: exportDialog
        title: "Export decrypted file"
        fileMode: FileDialog.SaveFile
        onAccepted: dialogs.exportRequested(dialogs.exportFileId, selectedFile.toLocalFile())
    }

    Dialog {
        id: createFolderDialog
        title: "New folder"
        modal: true
        standardButtons: Dialog.NoButton
        anchors.centerIn: parent
        width: 360
        background: Rectangle { color: theme.bgDarkCard; border.color: theme.borderCard; radius: 14 }
        contentItem: TextField {
            id: newFolderName
            placeholderText: "Folder name"
            selectByMouse: true
            color: theme.textDark
            placeholderTextColor: theme.textMuted
            background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 8 }
        }
        footer: RowLayout {
            spacing: 8
            Item { Layout.fillWidth: true }
            Button {
                text: "Cancel"
                onClicked: createFolderDialog.reject()
                background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 8 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                text: "Create"
                onClicked: createFolderDialog.accept()
                background: Rectangle { color: theme.brand600; radius: 8 }
                contentItem: Text { text: parent.text; color: "white"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
        onAccepted: {
            dialogs.folderCreateRequested(newFolderName.text, dialogs.createParentId)
            newFolderName.clear()
            dialogs.createParentId = ""
        }
    }

    Dialog {
        id: renameDialog
        title: dialogs.renameIsFolder ? "Rename folder" : "Rename file"
        modal: true
        standardButtons: Dialog.NoButton
        anchors.centerIn: parent
        width: 360
        background: Rectangle { color: theme.bgDarkCard; border.color: theme.borderCard; radius: 14 }
        contentItem: TextField {
            id: renameText
            selectByMouse: true
            color: theme.textDark
            background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 8 }
        }
        footer: RowLayout {
            spacing: 8
            Item { Layout.fillWidth: true }
            Button {
                text: "Cancel"
                onClicked: renameDialog.reject()
                background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 8 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                text: "Save"
                onClicked: renameDialog.accept()
                background: Rectangle { color: theme.brand600; radius: 8 }
                contentItem: Text { text: parent.text; color: "white"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
        onAccepted: dialogs.renameRequested(dialogs.renameId, dialogs.renameIsFolder, renameText.text)
    }

    Dialog {
        id: deleteDialog
        title: dialogs.deleteItems.length > 1 ? "Move selected items to trash?" : "Move to trash?"
        modal: true
        standardButtons: Dialog.NoButton
        anchors.centerIn: parent
        width: 380
        background: Rectangle { color: theme.bgDarkCard; border.color: theme.borderCard; radius: 14 }
        contentItem: Label {
            text: dialogs.deleteItems.length > 1
                  ? dialogs.deleteItems.length + " selected items will be moved to the system trash. Folder contents will be moved to the root."
                  : dialogs.deleteItems.length === 1 && dialogs.deleteItems[0].isFolder
                    ? "The folder will be removed and its contents moved to the root."
                    : "The file will be moved to the system trash."
            wrapMode: Text.Wrap
            color: theme.textSubtext
            padding: 16
        }
        footer: RowLayout {
            spacing: 8
            Item { Layout.fillWidth: true }
            Button {
                text: "Cancel"
                onClicked: deleteDialog.reject()
                background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 8 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                text: "Move to trash"
                onClicked: deleteDialog.accept()
                background: Rectangle { color: theme.errorBg; border.color: theme.errorBorder; radius: 8 }
                contentItem: Text { text: parent.text; color: theme.error; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
        onAccepted: dialogs.deleteRequested(dialogs.deleteItems)
    }

    Dialog {
        id: moveDialog
        title: dialogs.moveItems.length > 1 ? "Move selected items" : "Move item"
        modal: true
        standardButtons: Dialog.NoButton
        anchors.centerIn: parent
        width: 390
        background: Rectangle { color: theme.bgDarkCard; border.color: theme.borderCard; radius: 14 }
        contentItem: ColumnLayout {
            spacing: 10
            Label {
                text: dialogs.moveItems.length > 1
                      ? dialogs.moveItems.length + " items will be moved to the selected folder."
                      : "Choose a destination folder."
                color: theme.textSubtext
                font.pixelSize: 11
                wrapMode: Text.Wrap
                Layout.fillWidth: true
            }
            ComboBox {
                id: moveFolderChoice
                Layout.fillWidth: true
                model: dialogs.folderChoices
                textRole: "name"
                background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 8 }
                contentItem: Text { text: moveFolderChoice.currentText; color: theme.textDark; leftPadding: 10; verticalAlignment: Text.AlignVCenter; elide: Text.ElideRight }
            }
        }
        footer: RowLayout {
            spacing: 8
            Item { Layout.fillWidth: true }
            Button {
                text: "Cancel"
                onClicked: moveDialog.reject()
                background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 8 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                text: "Move"
                enabled: moveFolderChoice.currentIndex >= 0
                onClicked: moveDialog.accept()
                background: Rectangle { color: parent.enabled ? theme.brand600 : theme.bgDarkSurface; radius: 8 }
                contentItem: Text { text: parent.text; color: "white"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
        onAccepted: {
            var destination = dialogs.folderChoices[moveFolderChoice.currentIndex]
            if (destination) dialogs.moveRequested(dialogs.moveItems, destination.id)
        }
    }

    FilesFolderUploadModal {
        id: folderUploadModal
        onFolderUploadCompleted: function(path, parentId) {
            dialogs.folderUploadRequested(path, parentId)
        }
    }

    FilesAudioPlayerModal {
        id: audioPlayerModal
    }

    FilesInfoModal {
        id: fileInfoModal
    }

    FilesDocumentAiModal {
        id: documentAiModal
    }
}
