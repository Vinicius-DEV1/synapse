import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: episodesModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: isOpen
    z: 115

    property bool isOpen: false
    property var item: null
    property var episodes: []
    property var collapsedSeasons: ({})

    readonly property var seasonGroups: {
        var list = episodes || []
        var groupsMap = ({})
        var order = []
        for (var i = 0; i < list.length; i++) {
            var ep = list[i]
            var sNum = Number(ep.season || 0)
            if (sNum <= 0) {
                var eNum = Number(ep.episode_number || (i + 1))
                sNum = Math.floor((Math.max(1, eNum) - 1) / 12) + 1
            }
            var key = String(sNum)
            if (!groupsMap[key]) {
                groupsMap[key] = { season: sNum, episodes: [], watchedCount: 0 }
                order.push(key)
            }
            groupsMap[key].episodes.push(ep)
            if (ep.is_watched) groupsMap[key].watchedCount += 1
        }
        return order.map(function(k) { return groupsMap[k] })
    }

    function toggleSeason(seasonNum) {
        var next = Object.assign({}, collapsedSeasons)
        var k = String(seasonNum)
        next[k] = !next[k]
        collapsedSeasons = next
    }

    signal closed()
    signal episodeWatchedToggled(string episodeId, string itemId)
    signal episodeDeleted(string episodeId)
    signal bulkEpisodesRequested(string itemId, int count)
    signal episodeAdded(string itemId, int episodeNumber, string title)

    MouseArea { anchors.fill: parent }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 800)
        height: Math.min(parent.height - 48, 580)
        radius: 16
        color: "#161524"
        border.color: "#18ffffff"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 20
            spacing: 14

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: episodesModalRoot.item ? ("📺 Episódios: " + episodesModalRoot.item.title) : "Episódios da Obra"
                        color: "#fffffe"
                        font.pixelSize: 18
                        font.bold: true
                        elide: Text.ElideRight
                        Layout.maximumWidth: 460
                    }
                    Text {
                        text: (episodesModalRoot.episodes ? episodesModalRoot.episodes.length : 0) + " episódio(s) registrado(s)"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                }

                Item { Layout.fillWidth: true }

                // Quick Bulk Generate Button (if empty or less than total)
                Rectangle {
                    visible: episodesModalRoot.item && (!episodesModalRoot.episodes || episodesModalRoot.episodes.length === 0)
                    Layout.preferredWidth: 160
                    height: 34
                    radius: 8
                    color: "#268b5cf6"
                    border.color: "#668b5cf6"

                    Text {
                        anchors.centerIn: parent
                        text: "Gerar Episódios"
                        color: "#c4b5fd"
                        font.pixelSize: 12
                        font.bold: true
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (episodesModalRoot.item) {
                                var count = episodesModalRoot.item.total_episodes || 12
                                episodesModalRoot.bulkEpisodesRequested(episodesModalRoot.item.id, count)
                            }
                        }
                    }
                }

                // Close Button
                Rectangle {
                    width: 30; height: 30; radius: 6
                    color: "#18ffffff"
                    Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 13 }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: episodesModalRoot.closed()
                    }
                }
            }

            // Quick Add Episode Bar
            Rectangle {
                Layout.fillWidth: true
                height: 40
                radius: 8
                color: "#15141b"
                border.color: "#12ffffff"

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 4
                    spacing: 8

                    TextInput {
                        id: epNumInput
                        Layout.preferredWidth: 60
                        color: "#fffffe"
                        font.pixelSize: 12
                        verticalAlignment: TextInput.AlignVCenter
                        text: String((episodesModalRoot.episodes ? episodesModalRoot.episodes.length : 0) + 1)
                        selectByMouse: true
                    }

                    Rectangle { width: 1; height: 20; color: "#18ffffff" }

                    TextInput {
                        id: epTitleInput
                        Layout.fillWidth: true
                        color: "#fffffe"
                        font.pixelSize: 12
                        verticalAlignment: TextInput.AlignVCenter
                        selectByMouse: true

                        Text {
                            visible: !epTitleInput.text && !epTitleInput.activeFocus
                            text: "Título do episódio (opcional)..."
                            color: "#64748b"
                            font.pixelSize: 12
                        }
                    }

                    Rectangle {
                        Layout.preferredWidth: 100
                        Layout.fillHeight: true
                        radius: 6
                        color: "#8b5cf6"

                        Text {
                            anchors.centerIn: parent
                            text: "+ Adicionar"
                            color: "#ffffff"
                            font.pixelSize: 11
                            font.bold: true
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                if (episodesModalRoot.item) {
                                    var num = parseInt(epNumInput.text) || 1
                                    episodesModalRoot.episodeAdded(episodesModalRoot.item.id, num, epTitleInput.text.trim())
                                    epTitleInput.text = ""
                                    epNumInput.text = String(num + 1)
                                }
                            }
                        }
                    }
                }
            }

            // Episode List Grouped by Season Accordion
            ListView {
                id: epListView
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                spacing: 8
                model: episodesModalRoot.seasonGroups

                delegate: ColumnLayout {
                    id: seasonBlock
                    required property var modelData
                    readonly property bool isCollapsed: Boolean(episodesModalRoot.collapsedSeasons[String(modelData.season)])
                    width: epListView.width
                    spacing: 6

                    Rectangle {
                        Layout.fillWidth: true
                        height: 36
                        radius: 8
                        color: "#1e1c2e"
                        border.color: "#228b5cf6"

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 12
                            anchors.rightMargin: 12
                            spacing: 8
                            Text {
                                text: seasonBlock.isCollapsed ? "▸" : "▾"
                                color: "#c4b5fd"
                                font.pixelSize: 12
                            }
                            Text {
                                text: "Temporada " + seasonBlock.modelData.season
                                color: "#fffffe"
                                font.pixelSize: 13
                                font.bold: true
                            }
                            Item { Layout.fillWidth: true }
                            Text {
                                text: seasonBlock.modelData.watchedCount + " / " + seasonBlock.modelData.episodes.length + " assistidos"
                                color: seasonBlock.modelData.watchedCount === seasonBlock.modelData.episodes.length ? "#34d399" : "#94a1b2"
                                font.pixelSize: 11
                                font.bold: true
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: episodesModalRoot.toggleSeason(seasonBlock.modelData.season)
                        }
                    }

                    Repeater {
                        model: seasonBlock.isCollapsed ? [] : seasonBlock.modelData.episodes
                        delegate: Rectangle {
                            id: epRow
                            required property var modelData
                            property var epData: modelData
                            Layout.fillWidth: true
                            height: 46
                            radius: 8
                            color: epRowMouse.containsMouse ? "#211f30" : "#1a1924"
                            border.color: epData.is_watched ? "#2610b981" : "#0fffffff"

                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 12
                                anchors.rightMargin: 12
                                spacing: 12

                                Rectangle {
                                    width: 28; height: 28; radius: 6
                                    color: epRow.epData.is_watched ? "#2010b981" : "#12ffffff"
                                    border.color: epRow.epData.is_watched ? "#10b981" : "#25ffffff"

                                    Text {
                                        anchors.centerIn: parent
                                        text: epRow.epData.is_watched ? "✓" : ""
                                        color: "#34d399"
                                        font.pixelSize: 13
                                        font.bold: true
                                    }

                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: episodesModalRoot.episodeWatchedToggled(epRow.epData.id, episodesModalRoot.item.id)
                                    }
                                }

                                Rectangle {
                                    width: 32; height: 24; radius: 4
                                    color: "#18ffffff"
                                    Text {
                                        anchors.centerIn: parent
                                        text: "#" + epRow.epData.episode_number
                                        color: "#a7a9be"
                                        font.pixelSize: 11
                                        font.bold: true
                                    }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    text: epRow.epData.title || ("Episódio " + epRow.epData.episode_number)
                                    color: epRow.epData.is_watched ? "#64748b" : "#fffffe"
                                    font.pixelSize: 13
                                    font.strikeout: epRow.epData.is_watched
                                    elide: Text.ElideRight
                                }

                                Rectangle {
                                    width: 28; height: 28; radius: 6
                                    color: delEpMouse.containsMouse ? "#26f43f5e" : "transparent"
                                    Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 11 }
                                    MouseArea {
                                        id: delEpMouse
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: episodesModalRoot.episodeDeleted(epRow.epData.id)
                                    }
                                }
                            }

                            MouseArea {
                                id: epRowMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                z: -1
                            }
                        }
                    }
                }

                Text {
                    anchors.centerIn: parent
                    visible: !episodesModalRoot.episodes || episodesModalRoot.episodes.length === 0
                    text: "Nenhum episódio registrado para esta obra."
                    color: "#64748b"
                    font.pixelSize: 13
                }
            }
        }
    }
}

