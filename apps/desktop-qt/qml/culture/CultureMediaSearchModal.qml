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
                    text: "Pesquisar"
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
                        height: 72
                        radius: 8
                        color: "#1a1829"
                        border.color: "#2e2b44"

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 12

                            Rectangle {
                                width: 36
                                height: 50
                                radius: 4
                                color: "#232135"
                                Text { anchors.centerIn: parent; text: "🎬"; font.pixelSize: 16 }
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
                                    text: (modelData.type || "Obra") + " • " + (modelData.year || "2024") + " • " + (modelData.episodes ? modelData.episodes + " eps" : "Filme")
                                    color: "#94a1b2"
                                    font.pixelSize: 11
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
                        text: searchModalRoot.isSearching ? "Buscando metadados..." : "Digite o nome de uma obra e pressione Pesquisar."
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

        // Simulated fast multi-provider lookup results
        searchResults = [
            { title: query, type: "anime", year: "2024", episodes: 24, synopsis: "Sinopse detalhada e metadados sincronizados para " + query + "." },
            { title: query + " (Movie)", type: "filme", year: "2023", episodes: 1, synopsis: "Edição cinematográfica e lançamento de " + query + "." },
            { title: query + " Season 2", type: "série", year: "2025", episodes: 12, synopsis: "Continuação com novos arcos e episódios de " + query + "." }
        ]
        isSearching = false
    }
}
