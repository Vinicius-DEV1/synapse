import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: linkCardRoot
    Layout.fillWidth: true
    implicitHeight: mainCol.implicitHeight + 22
    radius: 12
    color: "#151422"
    border.color: hoverHandler.hovered ? accentColor : "#1fffffff"
    border.width: 1

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string pageId: ""
    property string url: attrs["data-url"] || attrs["url"] || attrs["src"] || ""
    property string title: attrs["data-title"] || attrs["title"] || ""
    property string description: attrs["data-description"] || attrs["description"] || ""
    property string accentColor: attrs["data-color"] || attrs["color"] || "#8b5cf6"
    property bool isWatched: (attrs["watched"] || attrs["data-watched"]) === "true"
    property bool isWatching: (attrs["watching"] || attrs["data-watching"]) === "true"
    property string notesText: attrs["notes"] || attrs["data-notes"] || ""
    property bool notesExpanded: (attrs["show-notes"] || attrs["shownotes"]) === "true"
    property var duplicatePages: []
    property bool duplicatesOpen: false

    readonly property bool isYouTube: /(?:youtube\.com|youtu\.be)/i.test(url)

    signal attrsUpdated(var newAttrs)
    signal youtubeWatchRequested(string videoUrl, string videoTitle)
    signal youtubeSummaryRequested(string videoUrl, string videoTitle)
    signal openDuplicatePageRequested(string pageId)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function refreshMetadata() {
        if (!url || typeof dataController === "undefined" || !dataController) return
        if (typeof dataController.getLinkMetadata === "function") {
            var meta = dataController.getLinkMetadata(url) || ({})
            if (meta.title && title.length === 0) title = meta.title
            if (meta.description && description.length === 0) description = meta.description
        }
        if (typeof dataController.getLinkEntity === "function") {
            var ent = dataController.getLinkEntity(url) || ({})
            if (ent.watched !== undefined) isWatched = Boolean(ent.watched)
            if (ent.watching !== undefined) isWatching = Boolean(ent.watching)
            if (ent.notes !== undefined && notesText.length === 0) notesText = String(ent.notes)
            if (ent.color) accentColor = String(ent.color)
        }
        if (typeof dataController.findDuplicateNoteLinks === "function") {
            duplicatePages = dataController.findDuplicateNoteLinks(url, pageId) || []
        }
    }

    function saveStatus(nextWatched, nextWatching) {
        isWatched = nextWatched
        isWatching = nextWatching
        if (typeof dataController !== "undefined" && dataController && typeof dataController.setLinkEntityStatus === "function") {
            dataController.setLinkEntityStatus(url, nextWatched, nextWatching)
        }
        var next = Object.assign({}, attrs)
        next["watched"] = nextWatched ? "true" : "false"
        next["watching"] = nextWatching ? "true" : "false"
        attrsUpdated(next)
    }

    Component.onCompleted: refreshMetadata()
    onBlockDataChanged: refreshMetadata()

    Rectangle {
        anchors.left: parent.left
        anchors.top: parent.top
        anchors.bottom: parent.bottom
        width: 4
        radius: 2
        color: linkCardRoot.accentColor
    }

    ColumnLayout {
        id: mainCol
        anchors.fill: parent
        anchors.leftMargin: 14
        anchors.rightMargin: 12
        anchors.topMargin: 10
        anchors.bottomMargin: 10
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            Rectangle {
                Layout.preferredWidth: 34
                Layout.preferredHeight: 34
                radius: 8
                color: linkCardRoot.isYouTube ? "#26ef4444" : (linkCardRoot.accentColor + "22")
                AppIcon {
                    anchors.centerIn: parent
                    name: linkCardRoot.isYouTube ? "play" : "external-link"
                    color: linkCardRoot.isYouTube ? "#f87171" : linkCardRoot.accentColor
                    width: 16
                    height: 16
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2
                Text {
                    text: linkCardRoot.title || linkCardRoot.url || qsTr("Link externo")
                    color: "#fffffe"
                    font.pixelSize: 13
                    font.weight: Font.DemiBold
                    elide: Text.ElideRight
                    Layout.fillWidth: true
                }
                Text {
                    text: linkCardRoot.url
                    color: "#71717a"
                    font.pixelSize: 11
                    elide: Text.ElideRight
                    Layout.fillWidth: true
                }
            }

            // Duplicate indicator badge
            Button {
                visible: linkCardRoot.duplicatePages.length > 0
                Layout.preferredHeight: 22
                padding: 6
                onClicked: linkCardRoot.duplicatesOpen = !linkCardRoot.duplicatesOpen
                background: Rectangle { radius: 11; color: "#26f59e0b"; border.color: "#55f59e0b" }
                contentItem: Text {
                    text: "⚠ " + linkCardRoot.duplicatePages.length + "x"
                    color: "#fbbf24"
                    font.pixelSize: 10
                    font.bold: true
                }
            }

            // Watch status pills
            Button {
                Layout.preferredHeight: 24
                padding: 6
                onClicked: linkCardRoot.saveStatus(linkCardRoot.isWatched, !linkCardRoot.isWatching)
                background: Rectangle {
                    radius: 6
                    color: linkCardRoot.isWatching ? "#263b82f6" : "#1f1e2e"
                    border.color: linkCardRoot.isWatching ? "#3b82f6" : "#2e2e38"
                }
                contentItem: Text {
                    text: qsTr("Assistindo")
                    color: linkCardRoot.isWatching ? "#93c5fd" : "#94a1b2"
                    font.pixelSize: 10
                }
            }

            Button {
                Layout.preferredHeight: 24
                padding: 6
                onClicked: linkCardRoot.saveStatus(!linkCardRoot.isWatched, false)
                background: Rectangle {
                    radius: 6
                    color: linkCardRoot.isWatched ? "#2610b981" : "#1f1e2e"
                    border.color: linkCardRoot.isWatched ? "#10b981" : "#2e2e38"
                }
                contentItem: Text {
                    text: linkCardRoot.isWatched ? qsTr("Assistido ✓") : qsTr("Assistir")
                    color: linkCardRoot.isWatched ? "#6ee7b7" : "#94a1b2"
                    font.pixelSize: 10
                }
            }

            Button {
                visible: linkCardRoot.isYouTube
                Layout.preferredHeight: 24
                padding: 6
                onClicked: linkCardRoot.youtubeWatchRequested(linkCardRoot.url, linkCardRoot.title)
                background: Rectangle { radius: 6; color: "#dc2626" }
                contentItem: Text { text: qsTr("Assistir aqui"); color: "#ffffff"; font.pixelSize: 10; font.bold: true }
            }

            ToolButton {
                Layout.preferredWidth: 26
                Layout.preferredHeight: 26
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Anotações do link")
                onClicked: linkCardRoot.notesExpanded = !linkCardRoot.notesExpanded
                background: Rectangle { radius: 6; color: parent.hovered ? "#1affffff" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "notes"; color: "#a7a9be"; width: 13; height: 13 }
            }

            ToolButton {
                Layout.preferredWidth: 26
                Layout.preferredHeight: 26
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Abrir no navegador")
                onClicked: if (linkCardRoot.url) Qt.openUrlExternally(linkCardRoot.url)
                background: Rectangle { radius: 6; color: parent.hovered ? "#1affffff" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "external-link"; color: "#a7a9be"; width: 13; height: 13 }
            }

            ToolButton {
                visible: hoverHandler.hovered
                Layout.preferredWidth: 26
                Layout.preferredHeight: 26
                onClicked: linkCardRoot.removeRequested()
                background: Rectangle { radius: 6; color: parent.hovered ? "#22ef4444" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fda4af"; width: 12; height: 12 }
            }
        }

        // Duplicate occurrences drawer
        ColumnLayout {
            visible: linkCardRoot.duplicatesOpen && linkCardRoot.duplicatePages.length > 0
            Layout.fillWidth: true
            spacing: 4
            Text { text: qsTr("Este link também aparece em:"); color: "#fbbf24"; font.pixelSize: 10; font.bold: true }
            Repeater {
                model: linkCardRoot.duplicatePages
                delegate: Button {
                    required property var modelData
                    Layout.fillWidth: true
                    Layout.preferredHeight: 26
                    onClicked: linkCardRoot.openDuplicatePageRequested(modelData.pageId)
                    background: Rectangle { radius: 6; color: parent.hovered ? "#22f59e0b" : "#12121a" }
                    contentItem: Text {
                        text: (modelData.pageIcon || "📄") + " " + (modelData.pageTitle || qsTr("Página"))
                        color: "#fde68a"
                        font.pixelSize: 11
                    }
                }
            }
        }

        // Notes drawer
        Rectangle {
            visible: linkCardRoot.notesExpanded
            Layout.fillWidth: true
            implicitHeight: Math.max(52, linkNotesArea.contentHeight + 14)
            radius: 8
            color: "#0e0d15"
            border.color: "#1e1e2e"
            TextArea {
                id: linkNotesArea
                anchors.fill: parent
                anchors.margins: 6
                text: linkCardRoot.notesText
                placeholderText: qsTr("Anotações pessoais sobre este link...")
                placeholderTextColor: "#52525b"
                color: "#e2e8f0"
                font.pixelSize: 12
                wrapMode: TextEdit.Wrap
                background: null
                onEditingFinished: {
                    linkCardRoot.notesText = text
                    if (typeof dataController !== "undefined" && dataController && typeof dataController.setLinkEntityNotes === "function") {
                        dataController.setLinkEntityNotes(linkCardRoot.url, text)
                    }
                    var next = Object.assign({}, linkCardRoot.attrs)
                    next["notes"] = text
                    next["show-notes"] = "true"
                    linkCardRoot.attrsUpdated(next)
                }
            }
        }
    }
}
