import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: searchModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 130

    property bool isSearching: false
    property var searchResults: []
    property string statusMessage: "Digite o nome de uma obra e pressione Pesquisar."

    signal closeRequested()
    signal mediaSelected(var mediaData)

    Shortcut {
        sequence: "Escape"
        enabled: searchModalRoot.visible
        onActivated: searchModalRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: searchModalRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 700)
        height: Math.min(parent.height - 48, 540)
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 14

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Text { text: "🔍"; font.pixelSize: 20 }
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text { text: "Buscar Obras em Bases Externas"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                    Text { text: "Pesquise por animes, filmes e séries para importar metadados completos"; color: "#94a1b2"; font.pixelSize: 11 }
                }

                Button {
                    text: "✕"
                    flat: true
                    onClicked: searchModalRoot.closeRequested()
                }
            }

            // Search Bar
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                TextField {
                    id: qInput
                    Layout.fillWidth: true
                    placeholderText: "Digite o título (ex: Interstellar, Frieren, Breaking Bad)..."
                    color: "#fffffe"
                    background: Rectangle {
                        color: "#1f1d2e"
                        radius: 8
                        border.color: qInput.activeFocus ? "#8b5cf6" : "#2e2b44"
                    }
                    onAccepted: performSearch()
                }

                Button {
                    text: searchModalRoot.isSearching ? "Buscando…" : "Pesquisar"
                    enabled: !searchModalRoot.isSearching
                    background: Rectangle { color: "#8b5cf6"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#ffffff"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: performSearch()
                }
            }

            // Results List
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                radius: 10
                color: "#11101a"
                border.color: "#2e2b44"

                ListView {
                    id: resList
                    anchors.fill: parent
                    anchors.margins: 8
                    clip: true
                    model: searchModalRoot.searchResults
                    spacing: 8

                    delegate: Rectangle {
                        width: resList.width
                        height: 76
                        radius: 8
                        color: "#1a1829"
                        border.color: "#2e2b44"

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 12

                            Rectangle {
                                width: 36
                                height: 54
                                radius: 4
                                color: "#232135"
                                clip: true

                                Image {
                                    anchors.fill: parent
                                    source: modelData.cover || ""
                                    fillMode: Image.PreserveAspectCrop
                                    visible: (modelData.cover || "").length > 0
                                }
                                Text {
                                    anchors.centerIn: parent
                                    text: "🎬"
                                    font.pixelSize: 16
                                    visible: !(modelData.cover && modelData.cover.length > 0)
                                }
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2

                                Text {
                                    text: modelData.title || ""
                                    color: "#fffffe"
                                    font.pixelSize: 13
                                    font.bold: true
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }

                                Text {
                                    text: (modelData.type || "Obra") + " • " + (modelData.year || "—") + (modelData.episodes ? " • " + modelData.episodes + " eps" : "")
                                    color: "#94a1b2"
                                    font.pixelSize: 11
                                }

                                Text {
                                    text: modelData.synopsis || ""
                                    color: "#6b7280"
                                    font.pixelSize: 10
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }
                            }

                            Button {
                                text: "Adicionar"
                                background: Rectangle { color: "#10b981"; radius: 6 }
                                contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                                onClicked: {
                                    searchModalRoot.mediaSelected(modelData)
                                    searchModalRoot.closeRequested()
                                }
                            }
                        }
                    }

                    Text {
                        anchors.centerIn: parent
                        text: searchModalRoot.statusMessage
                        color: "#5c587a"
                        font.pixelSize: 12
                        visible: searchModalRoot.searchResults.length === 0
                    }
                }
            }
        }
    }

    function performSearch() {
        var query = qInput.text.trim()
        if (query.length === 0) return
        isSearching = true
        searchResults = []
        statusMessage = "Buscando metadados na base aberta TVMaze/Jikan..."

        var xhr = new XMLHttpRequest()
        xhr.open("GET", "https://api.tvmaze.com/search/shows?q=" + encodeURIComponent(query))
        xhr.onreadystatechange = function() {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                isSearching = false
                if (xhr.status === 200) {
                    try {
                        var list = JSON.parse(xhr.responseText)
                        if (list && list.length > 0) {
                            var parsed = []
                            for (var i = 0; i < list.length && i < 10; i++) {
                                var show = list[i].show
                                var cleanSummary = show.summary ? show.summary.replace(/<[^>]*>/g, "") : ""
                                parsed.push({
                                    title: show.name || query,
                                    type: show.type && show.type.toLowerCase() === "animation" ? "anime" : "série",
                                    year: show.premiered ? show.premiered.substring(0, 4) : "—",
                                    episodes: show.weight ? Math.min(100, Math.max(1, show.weight)) : 1,
                                    synopsis: cleanSummary,
                                    cover: show.image && show.image.medium ? show.image.medium : ""
                                })
                            }
                            searchResults = parsed
                            statusMessage = ""
                            return
                        }
                    } catch (e) {
                        console.warn("[CultureSearch] JSON parse error:", e)
                    }
                }
                statusMessage = "Nenhum resultado externo encontrado para ‘" + query + "’. Verifique o nome ou conexão."
            }
        }
        xhr.send()
    }
}
