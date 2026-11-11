import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: galleryRoot
    anchors.fill: parent

    property var videos: []
    property var videoFolders: []
    property var collections: []
    property var folderItems: []
    property var visibleVideos: []
    property string selectedCollection: "__all__"
    property string activeFolderName: ""
    property string statusMessage: ""
    property string viewMode: "grid"
    property bool importRunning: false
    property bool isHelpOpen: false
    property int viewportWidth: 1366
    readonly property int gridColumns: viewportWidth >= 1536 ? 6
                                   : viewportWidth >= 1280 ? 5
                                   : viewportWidth >= 1024 ? 4
                                   : viewportWidth >= 768 ? 3 : 2

    signal refreshRequested()
    signal folderSelected(string folderId, string folderName)
    signal backRequested()
    signal folderSaveRequested(string folderId, string previousName, string newName)
    signal folderDeleteRequested(string folderId, string folderName)
    signal viewModeRequested(string mode)
    signal videoSelected(var video)
    signal videoDeleted(var video)
    signal videoMoveRequested(var video, string folderId)
    signal videoInfoRequested(var video)
    signal importRequested()

    function refreshItems() {
        var rootView = selectedCollection === "__all__"
        visibleVideos = rootView
            ? videos.filter(function(video) { return !video.collection_id && !video.collection_name })
            : videos
        var nextFolders = []
        if (rootView) {
            nextFolders.push({ isCreateCard: true, folder: ({}), videoCount: 0 })
            for (var i = 0; i < collections.length; ++i) {
                var collection = collections[i]
                if (collection.id === "__all__") continue
                var count = 0
                for (var j = 0; j < videos.length; ++j) {
                    var isLegacy = collection.id.indexOf("legacy:") === 0
                    if (isLegacy
                        ? (!videos[j].collection_id && videos[j].collection_name === collection.name)
                        : (videos[j].collection_id === collection.id)) count++
                }
                nextFolders.push({ isCreateCard: false, folder: collection, videoCount: count })
            }
        }
        folderItems = nextFolders
    }

    onVideosChanged: refreshItems()
    onVideoFoldersChanged: refreshItems()
    onCollectionsChanged: refreshItems()
    onSelectedCollectionChanged: refreshItems()
    Component.onCompleted: refreshItems()

    VideoFolderDialogs {
        id: folderDialogs
        onSaveRequested: function(folderId, previousName, newName) {
            galleryRoot.folderSaveRequested(folderId, previousName, newName)
        }
        onDeleteRequested: function(folderId, folderName) {
            galleryRoot.folderDeleteRequested(folderId, folderName)
        }
    }

    ScrollView {
        anchors.fill: parent
        clip: true
        contentWidth: width

        ColumnLayout {
            width: Math.max(0, parent.width - 32)
            anchors.horizontalCenter: parent.horizontalCenter
            spacing: 24

            Item { height: 16 }

            VideoGalleryHeader {
                videoCount: galleryRoot.videos.length
                activeFolderName: galleryRoot.activeFolderName
                viewMode: galleryRoot.viewMode
                importRunning: galleryRoot.importRunning
                onBackRequested: galleryRoot.backRequested()
                onRefreshRequested: galleryRoot.refreshRequested()
                onViewModeRequested: function(mode) { galleryRoot.viewModeRequested(mode) }
                onImportRequested: galleryRoot.importRequested()
                onHelpRequested: galleryRoot.isHelpOpen = true
            }

            Rectangle {
                visible: galleryRoot.statusMessage.length > 0
                Layout.fillWidth: true
                Layout.preferredHeight: visible ? 38 : 0
                radius: 8
                color: "#1d1b2a"
                border.color: "#1f818cf8"
                Text {
                    anchors.fill: parent
                    anchors.leftMargin: 12
                    anchors.rightMargin: 12
                    text: galleryRoot.statusMessage
                    color: "#c4c5d4"
                    font.pixelSize: 12
                    verticalAlignment: Text.AlignVCenter
                    elide: Text.ElideRight
                }
            }

            GridView {
                id: folderGrid
                visible: galleryRoot.selectedCollection === "__all__"
                Layout.fillWidth: false
                Layout.preferredWidth: galleryRoot.viewMode === "grid" ? parent.width + 16 : parent.width
                Layout.alignment: Qt.AlignLeft
                Layout.preferredHeight: visible
                    ? Math.ceil(count / (galleryRoot.viewMode === "grid" ? galleryRoot.gridColumns : 1)) * cellHeight : 0
                clip: true
                cellWidth: galleryRoot.viewMode === "grid" ? Math.max(1, width / galleryRoot.gridColumns) : Math.max(1, width)
                cellHeight: galleryRoot.viewMode === "grid"
                    ? Math.round((cellWidth - 16) * 0.5625) + 76
                    : galleryRoot.viewMode === "list" ? 120 : 60
                model: galleryRoot.folderItems

                delegate: VideoGalleryFolderCard {
                    width: galleryRoot.viewMode === "grid" ? Math.max(1, folderGrid.cellWidth - 16) : Math.max(1, folderGrid.cellWidth)
                    height: galleryRoot.viewMode === "grid" ? folderGrid.cellHeight - 16 : galleryRoot.viewMode === "list" ? 112 : 52
                    isCreateCard: modelData.isCreateCard
                    folder: modelData.folder
                    videoCount: modelData.videoCount
                    viewMode: galleryRoot.viewMode
                    onSelected: function(folderId, folderName) { galleryRoot.folderSelected(folderId, folderName) }
                    onCreateRequested: folderDialogs.openCreate()
                    onRenameRequested: function(folderId, folderName) { folderDialogs.openRename(folderId, folderName) }
                    onDeleteRequested: function(folderId, folderName) { folderDialogs.openDelete(folderId, folderName) }
                }
            }

            GridView {
                id: videoGrid
                Layout.fillWidth: false
                Layout.preferredWidth: galleryRoot.viewMode === "grid" ? parent.width + 16 : parent.width
                Layout.alignment: Qt.AlignLeft
                Layout.preferredHeight: galleryRoot.visibleVideos.length === 0 ? 0 : Math.ceil(count /
                    (galleryRoot.viewMode === "grid" ? Math.max(1, galleryRoot.gridColumns) : 1)) * cellHeight
                clip: true
                cellWidth: galleryRoot.viewMode === "grid" ? Math.max(1, width / galleryRoot.gridColumns) : Math.max(1, width)
                cellHeight: galleryRoot.viewMode === "grid"
                    ? Math.round((cellWidth - 16) * 0.5625) + 76
                    : galleryRoot.viewMode === "list" ? 120 : 60
                model: galleryRoot.visibleVideos

                delegate: VideoGalleryItem {
                    width: galleryRoot.viewMode === "grid" ? Math.max(1, videoGrid.cellWidth - 16) : Math.max(1, videoGrid.cellWidth)
                    height: galleryRoot.viewMode === "grid" ? videoGrid.cellHeight - 16 : galleryRoot.viewMode === "list" ? 112 : 52
                    video: modelData
                    viewMode: galleryRoot.viewMode
                    folders: galleryRoot.videoFolders
                    onSelected: function(selectedVideo) { galleryRoot.videoSelected(selectedVideo) }
                    onDeleteRequested: function(selectedVideo) { galleryRoot.videoDeleted(selectedVideo) }
                    onMoveRequested: function(selectedVideo, folderId) { galleryRoot.videoMoveRequested(selectedVideo, folderId) }
                    onInfoRequested: function(selectedVideo) { galleryRoot.videoInfoRequested(selectedVideo) }
                }
            }

            Rectangle {
                visible: galleryRoot.visibleVideos.length === 0 &&
                         (galleryRoot.selectedCollection !== "__all__" || galleryRoot.folderItems.length <= 1)
                Layout.fillWidth: true
                height: 240
                radius: 16
                color: "#161524"
                border.color: "#0affffff"
                ColumnLayout {
                    anchors.centerIn: parent
                    spacing: 12
                    Text { Layout.alignment: Qt.AlignHCenter; text: "🎬"; font.pixelSize: 40; opacity: 0.5 }
                    Text { Layout.alignment: Qt.AlignHCenter; text: "Nenhum vídeo nesta pasta"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                    Text { Layout.alignment: Qt.AlignHCenter; text: "Importe vídeos locais para assistir com decodificação mpv acelerada."; color: "#a7a9be"; font.pixelSize: 13 }
                }
            }

            Item { height: 48 }
        }
    }

    VideoHelpDialog {
        anchors.centerIn: parent
        isOpen: galleryRoot.isHelpOpen
        onDismissRequested: galleryRoot.isHelpOpen = false
    }
}
