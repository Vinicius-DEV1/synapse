import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import Synapse.Media 1.0

Rectangle {
    id: videoRoot
    color: "#0f0e17"

    property var videos: []
    property var collections: []
    property string selectedCollection: "Todos"
    property var activeVideo: null
    property bool isPlaying: false
    property double currentPos: 0
    property double videoDuration: 0
    property double currentSpeed: 1.0
    property int currentVolume: 100
    property var videoBookmarks: []
    property bool isVocabDrawerOpen: false
    property bool isAddingBookmark: false
    property string newBookmarkWord: ""
    property string newBookmarkNote: ""

    function loadVideos() {
        videos = dataController.getVideos(selectedCollection === "Todos" ? "" : selectedCollection)
        var cols = dataController.getVideoCollections()
        var colList = ["Todos"]
        for (var i = 0; i < cols.length; ++i) {
            colList.push(cols[i].collection_name)
        }
        collections = colList
    }

    function selectCollection(colName) {
        selectedCollection = colName
        loadVideos()
    }

    function playVideo(vid) {
        activeVideo = vid
        loadVideoBookmarks(vid.id)
        if (mpvPlayer) {
            mpvPlayer.command(["loadfile", vid.file_path])
            if (vid.progress && vid.progress > 0) {
                mpvPlayer.command(["seek", vid.progress.toString(), "absolute"])
            }
            isPlaying = true
        }
    }

    function loadVideoBookmarks(videoId) {
        if (!videoId) {
            videoBookmarks = []
            return
        }
        videoBookmarks = dataController.getVideoWords(videoId)
    }

    function jumpToTimestamp(seconds) {
        if (mpvPlayer) {
            mpvPlayer.command(["seek", seconds.toString(), "absolute"])
        }
    }

    function saveBookmark() {
        if (!activeVideo || newBookmarkWord.trim().length === 0) return
        dataController.addVideoWord(activeVideo.id, newBookmarkWord.trim(), newBookmarkNote.trim(), currentPos)
        loadVideoBookmarks(activeVideo.id)
        newBookmarkWord = ""
        newBookmarkNote = ""
        isAddingBookmark = false
    }

    function deleteBookmark(wordId) {
        dataController.deleteVideoWord(wordId)
        if (activeVideo) {
            loadVideoBookmarks(activeVideo.id)
        }
    }

    function exitPlayer() {
        if (mpvPlayer) {
            mpvPlayer.command(["stop"])
        }
        isPlaying = false
        activeVideo = null
        loadVideos()
    }

    function setSpeed(spd) {
        currentSpeed = spd
        if (mpvPlayer) {
            mpvPlayer.command(["set", "speed", spd.toString()])
        }
    }

    function seekRelative(seconds) {
        if (mpvPlayer) {
            mpvPlayer.command(["seek", seconds.toString()])
        }
    }

    function togglePlayPause() {
        if (mpvPlayer) {
            mpvPlayer.command(["cycle", "pause"])
            isPlaying = !isPlaying
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return "00:00"
        var mins = Math.floor(seconds / 60)
        var secs = Math.floor(seconds % 60)
        var hrs = Math.floor(mins / 60)
        mins = mins % 60
        if (hrs > 0) {
            return hrs + ":" + (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs
        }
        return (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs
    }

    Component.onCompleted: {
        loadVideos()
    }

    // Keyboard navigation during playback
    Shortcut {
        sequence: "Space"
        enabled: videoRoot.activeVideo !== null
        onActivated: videoRoot.togglePlayPause()
    }
    Shortcut {
        sequence: "Left"
        enabled: videoRoot.activeVideo !== null
        onActivated: videoRoot.seekRelative(-5)
    }
    Shortcut {
        sequence: "Right"
        enabled: videoRoot.activeVideo !== null
        onActivated: videoRoot.seekRelative(5)
    }
    Shortcut {
        sequence: "Esc"
        enabled: videoRoot.activeVideo !== null
        onActivated: videoRoot.exitPlayer()
    }
    Shortcut {
        sequence: "B"
        enabled: videoRoot.activeVideo !== null
        onActivated: videoRoot.isVocabDrawerOpen = !videoRoot.isVocabDrawerOpen
    }

    // ===================================================================
    // 1. Gallery Mode (When No Video is Actively Playing)
    // ===================================================================
    Item {
        anchors.fill: parent
        visible: !videoRoot.activeVideo

        ScrollView {
            anchors.fill: parent
            clip: true
            contentWidth: width

            ColumnLayout {
                width: Math.min(parent.width - 64, 1100)
                anchors.horizontalCenter: parent.horizontalCenter
                spacing: 24

                Item { height: 16 } // Top margin

                // Header
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 16

                    ColumnLayout {
                        spacing: 4
                        RowLayout {
                            spacing: 10
                            Text { text: "🎬"; font.pixelSize: 28 }
                            Text {
                                text: "Media Center & Vídeos"
                                color: "#fffffe"
                                font.pixelSize: 26
                                font.bold: true
                            }
                        }
                        Text {
                            text: "Decodificação acelerada por GPU (libmpv) • " + videoRoot.videos.length + " vídeo(s) catalogado(s)"
                            color: "#a7a9be"
                            font.pixelSize: 13
                        }
                    }

                    Item { Layout.fillWidth: true }

                    Rectangle {
                        width: 140; height: 38; radius: 10
                        color: "#6366f1" // indigo-600

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 8
                            Text { text: "↻"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                            Text { text: "Atualizar"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: videoRoot.loadVideos()
                        }
                    }
                }

                // Collections Filter Pills
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    visible: videoRoot.collections.length > 1

                    Repeater {
                        model: videoRoot.collections

                        delegate: Rectangle {
                            property bool isSelected: videoRoot.selectedCollection === modelData
                            height: 32
                            width: colText.contentWidth + 24
                            radius: 16
                            color: isSelected ? "#6366f1" : (colMouse.containsMouse ? "#ffffff12" : "#1a1924")
                            border.color: isSelected ? "#818cf8" : "#ffffff0f"
                            border.width: 1

                            Text {
                                id: colText
                                anchors.centerIn: parent
                                text: modelData
                                color: isSelected ? "#ffffff" : "#a7a9be"
                                font.pixelSize: 12
                                font.bold: isSelected
                            }

                            MouseArea {
                                id: colMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: videoRoot.selectCollection(modelData)
                            }
                        }
                    }
                }

                // Videos Grid
                GridView {
                    id: videoGrid
                    Layout.fillWidth: true
                    Layout.preferredHeight: Math.max(300, Math.ceil(videoRoot.videos.length / Math.max(1, Math.floor(width / 340))) * 250)
                    clip: true
                    cellWidth: 340
                    cellHeight: 250
                    model: videoRoot.videos

                    delegate: Rectangle {
                        width: 320
                        height: 230
                        radius: 12
                        color: "#1a1924" // bg-dark-card
                        border.color: cardMouse.containsMouse ? "#818cf866" : "#ffffff0f"
                        border.width: 1

                        ColumnLayout {
                            anchors.fill: parent
                            spacing: 0

                            // Thumbnail Area
                            Rectangle {
                                Layout.fillWidth: true
                                Layout.preferredHeight: 155
                                radius: 12
                                color: "#15141b"
                                clip: true

                                Rectangle {
                                    anchors.fill: parent
                                    color: "#211f30"
                                }

                                // Play Icon Overlay
                                Rectangle {
                                    anchors.centerIn: parent
                                    width: 48; height: 48; radius: 24
                                    color: cardMouse.containsMouse ? "#6366f1" : "#00000080"

                                    Text {
                                        anchors.centerIn: parent
                                        text: "▶"
                                        color: "#ffffff"
                                        font.pixelSize: 18
                                        anchors.horizontalCenterOffset: 2
                                    }
                                }

                                // Collection tag on top-left
                                Rectangle {
                                    anchors.top: parent.top
                                    anchors.left: parent.left
                                    anchors.margins: 8
                                    width: colTagText.contentWidth + 12
                                    height: 20
                                    radius: 4
                                    color: "#000000b3"
                                    visible: modelData.collection_name && modelData.collection_name !== ""

                                    Text {
                                        id: colTagText
                                        anchors.centerIn: parent
                                        text: modelData.collection_name || ""
                                        color: "#a78bfa"
                                        font.pixelSize: 10
                                        font.bold: true
                                    }
                                }

                                // Duration Badge on bottom-right
                                Rectangle {
                                    anchors.bottom: parent.bottom
                                    anchors.right: parent.right
                                    anchors.margins: 8
                                    width: durationText.contentWidth + 12
                                    height: 20
                                    radius: 4
                                    color: "#000000b3"

                                    Text {
                                        id: durationText
                                        anchors.centerIn: parent
                                        text: videoRoot.formatTime(modelData.duration || 0)
                                        color: "#fffffe"
                                        font.pixelSize: 11
                                        font.bold: true
                                    }
                                }

                                // Watched Progress Bar
                                Rectangle {
                                    anchors.bottom: parent.bottom
                                    width: parent.width * Math.min(1.0, (modelData.progress || 0) / (modelData.duration || 1))
                                    height: 4
                                    color: "#818cf8"
                                    visible: (modelData.progress || 0) > 0
                                }
                            }

                            // Meta details
                            RowLayout {
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                Layout.margins: 12
                                spacing: 8

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 3

                                    Text {
                                        Layout.fillWidth: true
                                        text: modelData.title || "Vídeo sem título"
                                        color: cardMouse.containsMouse ? "#a78bfa" : "#fffffe"
                                        font.pixelSize: 13
                                        font.bold: true
                                        elide: Text.ElideRight
                                    }

                                    Text {
                                        text: (modelData.is_local ? "Arquivo Local" : "Criptografado") + " • " + (modelData.file_path ? modelData.file_path.split('/').pop() : "")
                                        color: "#a7a9be"
                                        font.pixelSize: 11
                                        elide: Text.ElideRight
                                        Layout.fillWidth: true
                                    }
                                }

                                // Delete video button
                                Rectangle {
                                    width: 28; height: 28; radius: 6
                                    color: delMouse.containsMouse ? "#f43f5e33" : "transparent"

                                    Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 11 }

                                    MouseArea {
                                        id: delMouse
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            dataController.deleteVideo(modelData.id)
                                            videoRoot.loadVideos()
                                        }
                                    }
                                }
                            }
                        }

                        MouseArea {
                            id: cardMouse
                            anchors.fill: parent
                            z: -1
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: videoRoot.playVideo(modelData)
                        }
                    }
                }

                // Empty State
                Rectangle {
                    visible: videoRoot.videos.length === 0
                    Layout.fillWidth: true
                    height: 240
                    radius: 16
                    color: "#161524"
                    border.color: "#ffffff0a"

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
    }

    // ===================================================================
    // 2. Active Video Player Mode (libmpv Hardware GPU Canvas)
    // ===================================================================
    Item {
        anchors.fill: parent
        visible: videoRoot.activeVideo !== null

        // Hardware accelerated mpv frame
        MpvVideoPlayer {
            id: mpvPlayer
            anchors.fill: parent

            onPositionChanged: function(pos) {
                videoRoot.currentPos = pos
                if (videoRoot.activeVideo && Math.floor(pos) % 5 === 0) {
                    dataController.updateVideoProgress(videoRoot.activeVideo.id, pos)
                }
            }

            onDurationChanged: function(dur) {
                videoRoot.videoDuration = dur
            }
        }

        // Top Navigation Bar
        Rectangle {
            anchors.top: parent.top
            anchors.left: parent.left
            anchors.right: parent.right
            height: 60
            color: "#cc0f0e17"

            RowLayout {
                anchors.fill: parent
                anchors.margins: 16
                spacing: 16

                Rectangle {
                    width: 36; height: 36; radius: 8
                    color: "#ffffff15"

                    Text { anchors.centerIn: parent; text: "←"; color: "#ffffff"; font.pixelSize: 18; font.bold: true }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: videoRoot.exitPlayer()
                    }
                }

                Text {
                    Layout.fillWidth: true
                    text: videoRoot.activeVideo ? videoRoot.activeVideo.title : ""
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                    elide: Text.ElideRight
                }

                // Speed buttons
                RowLayout {
                    spacing: 4
                    Repeater {
                        model: [0.75, 1.0, 1.25, 1.5, 2.0]
                        delegate: Rectangle {
                            width: 36; height: 26; radius: 6
                            color: videoRoot.currentSpeed === modelData ? "#6366f1" : "#ffffff10"
                            Text {
                                anchors.centerIn: parent
                                text: modelData + "x"
                                color: "#ffffff"
                                font.pixelSize: 10
                                font.bold: true
                            }
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: videoRoot.setSpeed(modelData)
                            }
                        }
                    }
                }

                // Bookmarks / Vocabulary drawer toggle
                Rectangle {
                    height: 30
                    width: vocabBtnText.contentWidth + 24
                    radius: 8
                    color: videoRoot.isVocabDrawerOpen ? "#6366f1" : "#ffffff15"

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 6
                        Text { text: "🔖"; font.pixelSize: 12 }
                        Text {
                            id: vocabBtnText
                            text: "Momentos (" + videoRoot.videoBookmarks.length + ")"
                            color: "#ffffff"
                            font.pixelSize: 12
                            font.bold: true
                        }
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: videoRoot.isVocabDrawerOpen = !videoRoot.isVocabDrawerOpen
                    }
                }
            }
        }

        // Bottom Controls Bar
        Rectangle {
            anchors.bottom: parent.bottom
            anchors.left: parent.left
            anchors.right: parent.right
            height: 80
            color: "#cc0f0e17"

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 12
                spacing: 8

                // Seek Slider
                Slider {
                    id: positionSlider
                    Layout.fillWidth: true
                    from: 0
                    to: videoRoot.videoDuration > 0 ? videoRoot.videoDuration : 100
                    value: videoRoot.currentPos

                    onMoved: {
                        if (mpvPlayer) {
                            mpvPlayer.command(["seek", value.toString(), "absolute"])
                        }
                    }
                }

                // Controls Row
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 16

                    // Play/Pause button
                    Rectangle {
                        width: 36; height: 36; radius: 18
                        color: "#6366f1"

                        Text {
                            anchors.centerIn: parent
                            text: videoRoot.isPlaying ? "❚❚" : "▶"
                            color: "#ffffff"
                            font.pixelSize: 14
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: videoRoot.togglePlayPause()
                        }
                    }

                    // Seek -5s
                    Text {
                        text: "⏪ 5s"
                        color: "#a7a9be"
                        font.pixelSize: 12
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: videoRoot.seekRelative(-5)
                        }
                    }

                    // Seek +5s
                    Text {
                        text: "5s ⏩"
                        color: "#a7a9be"
                        font.pixelSize: 12
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: videoRoot.seekRelative(5)
                        }
                    }

                    // Time display
                    Text {
                        text: videoRoot.formatTime(videoRoot.currentPos) + " / " + videoRoot.formatTime(videoRoot.videoDuration)
                        color: "#fffffe"
                        font.pixelSize: 12
                    }

                    Item { Layout.fillWidth: true }

                    // Keyboard shortcuts tip
                    Text {
                        text: "[Espaço] Pausar • [←/→] ±5s • [B] Momentos • [Esc] Sair"
                        color: "#64748b"
                        font.pixelSize: 11
                    }
                }
            }
        }

        // ===================================================================
        // 3. Right Vocabulary & Moments Drawer
        // ===================================================================
        Rectangle {
            anchors.top: parent.top
            anchors.bottom: parent.bottom
            anchors.right: parent.right
            width: 340
            color: "#161524"
            border.color: "#ffffff10"
            border.width: 1
            visible: videoRoot.isVocabDrawerOpen
            z: 50

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 16
                spacing: 16

                // Drawer Header
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Text { text: "🔖"; font.pixelSize: 18 }
                    Text {
                        text: "Momentos & Vocabulário"
                        color: "#fffffe"
                        font.pixelSize: 15
                        font.bold: true
                    }

                    Item { Layout.fillWidth: true }

                    Rectangle {
                        width: 28; height: 28; radius: 6
                        color: "#ffffff10"
                        Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 12 }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: videoRoot.isVocabDrawerOpen = false
                        }
                    }
                }

                // Add Moment Quick Bar
                Rectangle {
                    Layout.fillWidth: true
                    height: videoRoot.isAddingBookmark ? 140 : 40
                    radius: 10
                    color: "#1a1924"
                    border.color: "#ffffff12"
                    border.width: 1
                    clip: true

                    // Collapsed state button
                    Item {
                        anchors.fill: parent
                        visible: !videoRoot.isAddingBookmark

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 8
                            Text { text: "+"; color: "#818cf8"; font.pixelSize: 16; font.bold: true }
                            Text {
                                text: "Marcar momento em " + videoRoot.formatTime(videoRoot.currentPos)
                                color: "#818cf8"
                                font.pixelSize: 13
                                font.bold: true
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: videoRoot.isAddingBookmark = true
                        }
                    }

                    // Expanded creation form
                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 8
                        visible: videoRoot.isAddingBookmark

                        Rectangle {
                            Layout.fillWidth: true
                            height: 32
                            radius: 6
                            color: "#0f0e17"
                            border.color: "#ffffff18"

                            TextInput {
                                id: bmWordInput
                                anchors.fill: parent
                                anchors.leftMargin: 8
                                anchors.rightMargin: 8
                                verticalAlignment: TextInput.AlignVCenter
                                color: "#fffffe"
                                font.pixelSize: 12
                                text: videoRoot.newBookmarkWord
                                onTextChanged: videoRoot.newBookmarkWord = text
                                onAccepted: videoRoot.saveBookmark()

                                Text {
                                    visible: !bmWordInput.text && !bmWordInput.activeFocus
                                    anchors.fill: parent
                                    verticalAlignment: Text.AlignVCenter
                                    text: "Palavra / Título do momento..."
                                    color: "#64748b"
                                    font.pixelSize: 12
                                }
                            }
                        }

                        Rectangle {
                            Layout.fillWidth: true
                            height: 32
                            radius: 6
                            color: "#0f0e17"
                            border.color: "#ffffff18"

                            TextInput {
                                id: bmNoteInput
                                anchors.fill: parent
                                anchors.leftMargin: 8
                                anchors.rightMargin: 8
                                verticalAlignment: TextInput.AlignVCenter
                                color: "#fffffe"
                                font.pixelSize: 12
                                text: videoRoot.newBookmarkNote
                                onTextChanged: videoRoot.newBookmarkNote = text
                                onAccepted: videoRoot.saveBookmark()

                                Text {
                                    visible: !bmNoteInput.text && !bmNoteInput.activeFocus
                                    anchors.fill: parent
                                    verticalAlignment: Text.AlignVCenter
                                    text: "Contexto / Nota opcional..."
                                    color: "#64748b"
                                    font.pixelSize: 12
                                }
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8

                            Rectangle {
                                Layout.fillWidth: true
                                height: 28
                                radius: 6
                                color: "#6366f1"
                                Text { anchors.centerIn: parent; text: "Salvar"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: videoRoot.saveBookmark()
                                }
                            }

                            Rectangle {
                                width: 60
                                height: 28
                                radius: 6
                                color: "#ffffff10"
                                Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: videoRoot.isAddingBookmark = false
                                }
                            }
                        }
                    }
                }

                // Bookmarks List
                ListView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true
                    spacing: 8
                    model: videoRoot.videoBookmarks

                    delegate: Rectangle {
                        width: parent.width
                        height: bmCol.height + 16
                        radius: 8
                        color: "#1a1924"
                        border.color: "#ffffff0a"
                        border.width: 1

                        ColumnLayout {
                            id: bmCol
                            anchors.left: parent.left
                            anchors.right: parent.right
                            anchors.top: parent.top
                            anchors.margins: 8
                            spacing: 4

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                // Jump button
                                Rectangle {
                                    height: 22
                                    width: tsText.contentWidth + 12
                                    radius: 4
                                    color: "#6366f125"
                                    border.color: "#818cf855"

                                    Text {
                                        id: tsText
                                        anchors.centerIn: parent
                                        text: videoRoot.formatTime(modelData.timestamp)
                                        color: "#818cf8"
                                        font.pixelSize: 11
                                        font.bold: true
                                    }

                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: videoRoot.jumpToTimestamp(modelData.timestamp)
                                    }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    text: modelData.word
                                    color: "#fffffe"
                                    font.pixelSize: 13
                                    font.bold: true
                                    elide: Text.ElideRight
                                }

                                Text {
                                    text: "🗑️"
                                    font.pixelSize: 11
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: videoRoot.deleteBookmark(modelData.id)
                                    }
                                }
                            }

                            Text {
                                visible: modelData.context && modelData.context.length > 0
                                Layout.fillWidth: true
                                text: modelData.context ? modelData.context : ""
                                color: "#94a3b8"
                                font.pixelSize: 11
                                wrapMode: Text.Wrap
                            }
                        }
                    }
                }

                // Empty state
                Text {
                    visible: videoRoot.videoBookmarks.length === 0
                    Layout.fillWidth: true
                    text: "Nenhum momento salvo neste vídeo.\nClique acima para marcar o segundo atual."
                    color: "#64748b"
                    font.pixelSize: 12
                    horizontalAlignment: Text.AlignHCenter
                }
            }
        }
    }
}
