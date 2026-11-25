import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: linkCardRoot
    Layout.fillWidth: true
    implicitHeight: mainCol.implicitHeight
    radius: 8

    property var blockData: ({})
    property var controller: null
    property var attrs: blockData.attrs || ({})
    property string pageId: ""
    property string url: attrs["url"] || attrs["data-url"] || attrs["src"] || ""
    property string title: attrs["title"] || attrs["data-title"] || ""
    property string channel: attrs["channel"] || attrs["data-channel"] || ""
    property int durationSec: parseInt(attrs["duration"] || attrs["data-duration"] || "0", 10) || 0
    property bool isPlaylist: (attrs["isPlaylist"] || attrs["isplaylist"] || attrs["data-is-playlist"] || "false") === "true"
    property int playlistCount: parseInt(attrs["playlistCount"] || attrs["playlistcount"] || "0", 10) || 0
    property string uploadDate: attrs["data-upload-date"] || attrs["uploadDate"] || attrs["uploaddate"] || ""
    property string accentColor: attrs["data-color"] || attrs["color"] || "default"
    property bool isWatched: (attrs["watched"] || attrs["data-watched"]) === "true"
    property bool isWatching: (attrs["watching"] || attrs["data-watching"]) === "true"
    property string notesText: attrs["notes"] || attrs["data-notes"] || ""
    property bool notesExpanded: (attrs["showNotes"] || attrs["shownotes"] || attrs["show-notes"]) === "true"
    property bool showColorPicker: false
    property var duplicatePages: []
    property bool duplicatesOpen: false

    readonly property bool isYouTube: /(?:youtube\.com|youtu\.be)/i.test(url)
    readonly property bool hasCustomColor: accentColor.length > 0 && accentColor !== "default"
    readonly property string domain: {
        var m = String(url || "").match(/^https?:\/\/([^/?#:]+)/i)
        return m ? m[1].replace(/^www\./i, "") : ""
    }

    color: hasCustomColor
        ? (accentColor + "18")
        : (hoverHandler.hovered ? "#201f2d" : "#1a1924")
    border.color: hasCustomColor
        ? (hoverHandler.hovered ? accentColor : (accentColor + "60"))
        : (hoverHandler.hovered ? "#33ffffff" : "#1affffff")
    border.width: 1
    Behavior on color { ColorAnimation { duration: 150 } }
    Behavior on border.color { ColorAnimation { duration: 150 } }

    signal attrsUpdated(var newAttrs)
    signal youtubeWatchRequested(string videoUrl, string videoTitle)
    signal openDuplicatePageRequested(string pageId)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function formatDuration(sec) {
        if (!sec || sec <= 0) return ""
        var h = Math.floor(sec / 3600)
        var m = Math.floor((sec % 3600) / 60)
        var s = sec % 60
        var sStr = s < 10 ? ("0" + s) : String(s)
        return h > 0 ? (h + ":" + (m < 10 ? ("0" + m) : String(m)) + ":" + sStr) : (m + ":" + sStr)
    }

    function refreshMetadata() {
        var c = linkCardRoot.controller
        if (!url || !c) return
        if (typeof c.getLinkMetadata === "function") {
            var meta = c.getLinkMetadata(url) || ({})
            if (meta.title && title.length === 0) title = String(meta.title)
            if (meta.channel && channel.length === 0) channel = String(meta.channel)
            if (meta.duration && durationSec <= 0) durationSec = Number(meta.duration) || 0
            if (meta.isPlaylist !== undefined) isPlaylist = Boolean(meta.isPlaylist)
            if (meta.playlistCount && playlistCount <= 0) playlistCount = Number(meta.playlistCount) || 0
            if (meta.uploadDate && uploadDate.length === 0) uploadDate = String(meta.uploadDate)
        }
        if (typeof c.getLinkEntity === "function") {
            var ent = c.getLinkEntity(url) || ({})
            if (ent.watched !== undefined) isWatched = Boolean(ent.watched)
            if (ent.watching !== undefined) isWatching = Boolean(ent.watching)
            if (ent.notes !== undefined && notesText.length === 0) notesText = String(ent.notes)
            if (ent.color && ent.color !== "default" && !hasCustomColor) accentColor = String(ent.color)
        }
        if (typeof c.findDuplicateNoteLinks === "function") {
            duplicatePages = c.findDuplicateNoteLinks(url, pageId) || []
        }
    }

    function saveStatus(nextWatched, nextWatching) {
        isWatched = nextWatched
        isWatching = nextWatching
        if (linkCardRoot.controller && typeof linkCardRoot.controller.setLinkEntityStatus === "function") {
            linkCardRoot.controller.setLinkEntityStatus(url, nextWatched, nextWatching)
        }
        var next = Object.assign({}, attrs)
        next["watched"] = nextWatched ? "true" : "false"
        next["watching"] = nextWatching ? "true" : "false"
        attrsUpdated(next)
    }

    function saveColor(nextColor) {
        accentColor = nextColor
        if (linkCardRoot.controller && typeof linkCardRoot.controller.setLinkEntityColor === "function") {
            linkCardRoot.controller.setLinkEntityColor(url, nextColor)
        }
        var next = Object.assign({}, attrs)
        if (nextColor && nextColor !== "default") next["data-color"] = nextColor
        else delete next["data-color"]
        attrsUpdated(next)
    }

    Component.onCompleted: refreshMetadata()
    onControllerChanged: refreshMetadata()
    onUrlChanged: refreshMetadata()
    onBlockDataChanged: refreshMetadata()

    ColumnLayout {
        id: mainCol
        width: parent.width
        spacing: 0

        Item {
            Layout.fillWidth: true
            implicitHeight: headerRow.implicitHeight + 24

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: if (linkCardRoot.url) Qt.openUrlExternally(linkCardRoot.url)
            }

            RowLayout {
                id: headerRow
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.top: parent.top
                anchors.margins: 12
                spacing: 12

                Item {
                    Layout.preferredWidth: 32
                    Layout.preferredHeight: 32
                    Layout.alignment: Qt.AlignTop

                    Rectangle {
                        anchors.fill: parent
                        radius: 6
                        color: "#0f0e17"
                        border.color: "#0dffffff"

                        AppIcon {
                            anchors.centerIn: parent
                            name: linkCardRoot.isYouTube ? (linkCardRoot.isPlaylist ? "list-video" : "play") : "globe"
                            color: linkCardRoot.isYouTube ? "#8b5cf6" : "#a78bfa"
                            width: 16
                            height: 16
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: function(mouse) {
                                mouse.accepted = true
                                if (linkCardRoot.isYouTube) {
                                    linkCardRoot.youtubeWatchRequested(linkCardRoot.url, linkCardRoot.title || linkCardRoot.domain)
                                } else if (linkCardRoot.url) {
                                    Qt.openUrlExternally(linkCardRoot.url)
                                }
                            }
                        }
                    }

                    Rectangle {
                        visible: linkCardRoot.isWatched || linkCardRoot.isWatching
                        anchors.top: parent.top
                        anchors.right: parent.right
                        anchors.topMargin: -4
                        anchors.rightMargin: -4
                        width: 14
                        height: 14
                        radius: 7
                        color: linkCardRoot.isWatched ? "#10b981" : "#f59e0b"
                        border.color: "#0f0e17"
                        border.width: 1.5
                        AppIcon {
                            anchors.centerIn: parent
                            name: linkCardRoot.isWatched ? "check" : "hourglass"
                            color: "#000000"
                            strokeWidth: 2.6
                            width: 8
                            height: 8
                        }
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 5

                    Text {
                        Layout.fillWidth: true
                        text: linkCardRoot.title || linkCardRoot.domain || linkCardRoot.url || qsTr("Link externo")
                        color: "#f2ffffff"
                        font.pixelSize: 13
                        font.weight: Font.Medium
                        wrapMode: Text.Wrap
                    }

                    Flow {
                        Layout.fillWidth: true
                        spacing: 6

                        Text { visible: linkCardRoot.domain.length > 0; text: linkCardRoot.domain; color: "#c4b5fd"; font.pixelSize: 11; font.weight: Font.Medium }
                        Text { visible: linkCardRoot.channel.length > 0; text: "•  " + linkCardRoot.channel; color: "#d4d4d8"; font.pixelSize: 11 }
                        Text {
                            visible: !linkCardRoot.isPlaylist && linkCardRoot.durationSec > 0
                            text: "•  " + linkCardRoot.formatDuration(linkCardRoot.durationSec)
                            color: "#a1a1aa"
                            font.pixelSize: 11
                        }
                        Text {
                            visible: linkCardRoot.uploadDate.length > 0
                            text: "•  " + linkCardRoot.uploadDate.substring(0, 10)
                            color: "#a1a1aa"
                            font.pixelSize: 11
                        }

                        Rectangle {
                            visible: linkCardRoot.isWatching && !linkCardRoot.isWatched
                            height: 18
                            width: watchingRow.implicitWidth + 12
                            radius: 5
                            color: "#1af59e0b"
                            border.color: "#40f59e0b"
                            RowLayout {
                                id: watchingRow
                                anchors.centerIn: parent
                                spacing: 4
                                AppIcon { name: "hourglass"; color: "#fbbf24"; width: 10; height: 10 }
                                Text { text: qsTr("Assistindo"); color: "#fcd34d"; font.pixelSize: 10; font.weight: Font.Medium }
                            }
                        }

                        Rectangle {
                            visible: linkCardRoot.duplicatePages.length > 0
                            height: 18
                            width: dupRow.implicitWidth + 12
                            radius: 5
                            color: dupMouse.containsMouse ? "#33f59e0b" : "#1af59e0b"
                            border.color: "#40f59e0b"
                            RowLayout {
                                id: dupRow
                                anchors.centerIn: parent
                                spacing: 4
                                AppIcon { name: "layers"; color: "#fbbf24"; width: 10; height: 10 }
                                Text {
                                    text: linkCardRoot.duplicatePages.length === 1
                                        ? qsTr("Em 1 outra página")
                                        : qsTr("Em %1 outras páginas").arg(linkCardRoot.duplicatePages.length)
                                    color: "#fcd34d"
                                    font.pixelSize: 10
                                    font.weight: Font.Medium
                                }
                            }
                            MouseArea {
                                id: dupMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: linkCardRoot.duplicatesOpen = !linkCardRoot.duplicatesOpen
                            }
                        }
                    }
                }

                LinkPreviewCardToolbar {
                    opacity: hoverHandler.hovered || linkCardRoot.notesExpanded || linkCardRoot.showColorPicker ? 1 : 0.75
                    Behavior on opacity { NumberAnimation { duration: 150 } }
                    isYouTube: linkCardRoot.isYouTube
                    isWatching: linkCardRoot.isWatching
                    isWatched: linkCardRoot.isWatched
                    notesExpanded: linkCardRoot.notesExpanded
                    hasNotes: linkCardRoot.notesText.length > 0
                    showColorPicker: linkCardRoot.showColorPicker
                    onWatchYoutubeRequested: linkCardRoot.youtubeWatchRequested(linkCardRoot.url, linkCardRoot.title || linkCardRoot.domain)
                    onToggleWatchingRequested: linkCardRoot.saveStatus(false, !linkCardRoot.isWatching)
                    onToggleWatchedRequested: linkCardRoot.saveStatus(!linkCardRoot.isWatched, false)
                    onToggleNotesRequested: {
                        linkCardRoot.notesExpanded = !linkCardRoot.notesExpanded
                        var next = Object.assign({}, linkCardRoot.attrs)
                        next["showNotes"] = linkCardRoot.notesExpanded ? "true" : "false"
                        linkCardRoot.attrsUpdated(next)
                    }
                    onToggleColorPickerRequested: linkCardRoot.showColorPicker = !linkCardRoot.showColorPicker
                    onOpenExternalRequested: if (linkCardRoot.url) Qt.openUrlExternally(linkCardRoot.url)
                    onRemoveRequested: linkCardRoot.removeRequested()
                }
            }
        }

        LinkPreviewCardDrawers {
            showColorPicker: linkCardRoot.showColorPicker
            accentColor: linkCardRoot.accentColor
            duplicatesOpen: linkCardRoot.duplicatesOpen
            duplicatePages: linkCardRoot.duplicatePages
            notesExpanded: linkCardRoot.notesExpanded
            notesText: linkCardRoot.notesText
            onColorSelected: function(colorVal) {
                linkCardRoot.saveColor(colorVal)
                linkCardRoot.showColorPicker = false
            }
            onDuplicatePageClicked: function(pid) { linkCardRoot.openDuplicatePageRequested(pid) }
            onNotesSaved: function(text) {
                linkCardRoot.notesText = text
                if (linkCardRoot.controller && typeof linkCardRoot.controller.setLinkEntityNotes === "function") {
                    linkCardRoot.controller.setLinkEntityNotes(linkCardRoot.url, text)
                }
                var next = Object.assign({}, linkCardRoot.attrs)
                next["notes"] = text
                next["showNotes"] = "true"
                linkCardRoot.attrsUpdated(next)
            }
        }
    }
}
