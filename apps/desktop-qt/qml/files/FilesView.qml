import QtQuick 2.15
import QtQuick.Controls 2.15
import ".."

Rectangle {
    id: filesRoot
    color: theme.bgDarkBg

    function openFolderById(folderId) {
        fileCollection.openFolder(String(folderId || ""))
    }

    FilesCollection {
        id: fileCollection
    }

    FilesDialogs {
        id: fileDialogs
        anchors.fill: parent
        onFolderUploadRequested: function(path, parentId) {
            fileActions.feedbackText = "Importando pasta e criptografando conteúdo…"
            dataController.importLocalFile(path, parentId)
            fileCollection.reload()
        }
    }

    FilesLinkDialogs {
        id: fileLinkDialogs
        anchors.fill: parent
    }

    FilesPreviewOverlay {
        id: filePreviewOverlay
        visible: fileActions.previewOpen
        onCloseRequested: fileActions.closePreview(false)
        onExportRequested: function(fileId) { fileDialogs.openExport(fileId) }
    }

    FilesActions {
        id: fileActions
        collection: fileCollection
        dialogs: fileDialogs
        linkDialogs: fileLinkDialogs
        previewOverlay: filePreviewOverlay
    }

    FilesWorkspace {
        id: filesWorkspace
        anchors.fill: parent
        collection: fileCollection
        actions: fileActions
        dialogs: fileDialogs
        onHelpRequested: fileHelpDialog.isOpen = true
    }

    FilesHelpDialog {
        id: fileHelpDialog
        onClosed: isOpen = false
    }

    Shortcut { sequence: "Escape"; context: Qt.WindowShortcut; enabled: fileActions.previewOpen; onActivated: fileActions.closePreview(false) }
    Shortcut { sequence: "Alt+Left"; context: Qt.WindowShortcut; enabled: !fileActions.previewOpen && !fileDialogs.anyDialogOpen && !fileLinkDialogs.anyDialogOpen; onActivated: fileCollection.navigateHistory(fileCollection.navigationIndex - 1) }
    Shortcut { sequence: "Alt+Right"; context: Qt.WindowShortcut; enabled: !fileActions.previewOpen && !fileDialogs.anyDialogOpen && !fileLinkDialogs.anyDialogOpen; onActivated: fileCollection.navigateHistory(fileCollection.navigationIndex + 1) }
    Shortcut { sequence: "Alt+Up"; context: Qt.WindowShortcut; enabled: !fileActions.previewOpen && fileCollection.activeSection === "folders" && fileCollection.folderStack.length > 0 && !fileDialogs.anyDialogOpen && !fileLinkDialogs.anyDialogOpen; onActivated: fileCollection.goUpOneLevel() }
    Shortcut { sequence: "Ctrl+A"; context: Qt.WindowShortcut; enabled: !fileActions.previewOpen && !filesWorkspace.searchActive && !fileDialogs.anyDialogOpen && !fileLinkDialogs.anyDialogOpen; onActivated: fileCollection.selectAllItems() }
    Shortcut { sequence: "Ctrl+C"; context: Qt.WindowShortcut; enabled: !fileActions.previewOpen && !filesWorkspace.searchActive && !fileDialogs.anyDialogOpen && !fileLinkDialogs.anyDialogOpen; onActivated: fileActions.setClipboard("copy", null) }
    Shortcut { sequence: "Ctrl+X"; context: Qt.WindowShortcut; enabled: !fileActions.previewOpen && !filesWorkspace.searchActive && !fileDialogs.anyDialogOpen && !fileLinkDialogs.anyDialogOpen; onActivated: fileActions.setClipboard("cut", null) }
    Shortcut { sequence: "Ctrl+V"; context: Qt.WindowShortcut; enabled: !fileActions.previewOpen && !filesWorkspace.searchActive && !fileDialogs.anyDialogOpen && !fileLinkDialogs.anyDialogOpen; onActivated: fileActions.pasteClipboard() }
    Shortcut { sequence: "Delete"; context: Qt.WindowShortcut; enabled: !fileActions.previewOpen && !filesWorkspace.searchActive && !fileDialogs.anyDialogOpen && !fileLinkDialogs.anyDialogOpen; onActivated: fileActions.requestDelete(null) }
    Shortcut { sequence: "Escape"; context: Qt.WindowShortcut; enabled: !fileActions.previewOpen && !filesWorkspace.searchActive && !fileDialogs.anyDialogOpen && !fileLinkDialogs.anyDialogOpen; onActivated: fileCollection.clearSelection() }
    Shortcut { sequence: "Ctrl+Shift+I"; context: Qt.WindowShortcut; enabled: !fileActions.previewOpen && !filesWorkspace.searchActive && !fileDialogs.anyDialogOpen && !fileLinkDialogs.anyDialogOpen; onActivated: fileActions.inspectorOpen = !fileActions.inspectorOpen }
}
