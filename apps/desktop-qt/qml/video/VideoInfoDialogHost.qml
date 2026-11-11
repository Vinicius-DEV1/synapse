import QtQuick 2.15

Item {
    id: host
    property var video: null
    property var controller: null
    property var mediaPlayer: null

    signal playRequested(var video)
    signal videoUpdated(string videoId)

    function openFor(selectedVideo) {
        video = selectedVideo
        infoDialog.open()
    }

    function refreshVideo(videoId) {
        if (!controller || !video || video.id !== videoId) return
        var videos = controller.getVideos()
        for (var index = 0; index < videos.length; ++index) {
            if (videos[index].id !== videoId) continue
            video = videos[index]
            videoUpdated(videoId)
            return
        }
    }

    VideoInfoDialog {
        id: infoDialog
        anchors.centerIn: parent
        video: host.video
        controller: host.controller
        mediaPlayer: host.mediaPlayer
        onPlayRequested: function(selectedVideo) { host.playRequested(selectedVideo) }
        onVideoUpdated: function(videoId) { host.refreshVideo(videoId) }
        onClosed: host.video = null
    }
}
