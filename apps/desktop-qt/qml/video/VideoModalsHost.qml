import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: hostRoot
    anchors.fill: parent
    z: 90

    property var collections: []

    signal videoImportRequested(string sourcePath, string collectionId)
    signal videoYouTubeDownloaded(var videoData)
    signal videoDeleteConfirmed(var video)

    function openUpload(collectionId, collectionName) {
        uploadModal.openModal(collectionId, collectionName)
    }

    function openYouTubeDownload(collectionId) {
        ytDownloadModal.openModal(collectionId)
    }

    function openHelp() {
        helpDialog.open()
    }

    VideoUploadModal {
        id: uploadModal
        anchors.fill: parent
        collections: hostRoot.collections
        onUploadCompleted: function(path, collectionId) {
            hostRoot.videoImportRequested(path, collectionId)
        }
    }

    YouTubeDownloadModal {
        id: ytDownloadModal
        anchors.fill: parent
        collections: hostRoot.collections
        onDownloadCompleted: function(videoData) {
            hostRoot.videoYouTubeDownloaded(videoData)
        }
    }

    VideoHelpDialog {
        id: helpDialog
    }
}
