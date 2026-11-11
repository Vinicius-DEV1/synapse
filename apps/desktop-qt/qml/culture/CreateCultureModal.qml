import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: createModalRoot
    anchors.fill: parent
    color: "#88000000"
    visible: isOpen
    z: 95

    property bool isOpen: false
    property string selectedType: "anime"

    signal closed()
    signal itemCreated(string title, string type, string synopsis, int totalEpisodes, string coverImage)

    onIsOpenChanged: {
        if (isOpen) {
            newCultureTitle.text = ""
            newCultureSynopsis.text = ""
            newCultureEpisodes.text = "12"
            newCultureCover.text = ""
            selectedType = "anime"
            newCultureTitle.forceActiveFocus()
        }
    }

    MouseArea {
        anchors.fill: parent
        onClicked: createModalRoot.closed()
    }

    Rectangle {
        anchors.centerIn: parent
        width: 460
        height: 480
        radius: 16
        color: "#161524"
        border.color: "#14ffffff"
        border.width: 1

        MouseArea {
            anchors.fill: parent
        }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 28
            spacing: 14

            RowLayout {
                Layout.fillWidth: true
                Text { text: "🎭 Adicionar Nova Obra Cultural"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                Item { Layout.fillWidth: true }
                Text {
                    text: "✕"
                    color: "#a7a9be"
                    font.pixelSize: 16
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: createModalRoot.closed()
                    }
                }
            }

            // Title Input
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4
                Text { text: "Título da Obra"; color: "#a7a9be"; font.pixelSize: 12 }
                Rectangle {
                    Layout.fillWidth: true
                    height: 38
                    radius: 8
                    color: "#15141b"
                    border.color: newCultureTitle.activeFocus ? "#8b5cf6" : "#15ffffff"
                    TextInput {
                        id: newCultureTitle
                        anchors.fill: parent
                        anchors.leftMargin: 12; anchors.rightMargin: 12
                        verticalAlignment: TextInput.AlignVCenter
                        color: "#fffffe"
                        font.pixelSize: 13
                        selectByMouse: true
                    }
                }
            }

            // Type Selector
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4
                Text { text: "Tipo de Mídia"; color: "#a7a9be"; font.pixelSize: 12 }
                RowLayout {
                    spacing: 8
                    Repeater {
                        model: [
                            { key: "anime", label: "⛩️ Anime" },
                            { key: "série", label: "📺 Série" },
                            { key: "filme", label: "🎬 Filme" }
                        ]
                        delegate: Rectangle {
                            width: 100; height: 34; radius: 8
                            color: createModalRoot.selectedType === modelData.key ? "#8b5cf6" : "#211f30"
                            Text {
                                anchors.centerIn: parent
                                text: modelData.label
                                color: createModalRoot.selectedType === modelData.key ? "#ffffff" : "#a7a9be"
                                font.pixelSize: 12
                                font.bold: true
                            }
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: createModalRoot.selectedType = modelData.key
                            }
                        }
                    }
                }
            }

            // Total Episodes Input
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4
                Text { text: "Total de Episódios / Capítulos"; color: "#a7a9be"; font.pixelSize: 12 }
                Rectangle {
                    Layout.fillWidth: true
                    height: 38
                    radius: 8
                    color: "#15141b"
                    border.color: newCultureEpisodes.activeFocus ? "#8b5cf6" : "#15ffffff"
                    TextInput {
                        id: newCultureEpisodes
                        anchors.fill: parent
                        anchors.leftMargin: 12; anchors.rightMargin: 12
                        verticalAlignment: TextInput.AlignVCenter
                        color: "#fffffe"
                        font.pixelSize: 13
                        selectByMouse: true
                        text: "12"
                    }
                }
            }

            // Cover URL Input
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4
                Text { text: "URL do Pôster / Capa (opcional)"; color: "#a7a9be"; font.pixelSize: 12 }
                Rectangle {
                    Layout.fillWidth: true
                    height: 38
                    radius: 8
                    color: "#15141b"
                    border.color: newCultureCover.activeFocus ? "#8b5cf6" : "#15ffffff"
                    TextInput {
                        id: newCultureCover
                        anchors.fill: parent
                        anchors.leftMargin: 12; anchors.rightMargin: 12
                        verticalAlignment: TextInput.AlignVCenter
                        color: "#fffffe"
                        font.pixelSize: 13
                        selectByMouse: true
                    }
                }
            }

            // Synopsis Input
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4
                Text { text: "Sinopse (opcional)"; color: "#a7a9be"; font.pixelSize: 12 }
                Rectangle {
                    Layout.fillWidth: true
                    height: 52
                    radius: 8
                    color: "#15141b"
                    border.color: newCultureSynopsis.activeFocus ? "#8b5cf6" : "#15ffffff"
                    TextInput {
                        id: newCultureSynopsis
                        anchors.fill: parent
                        anchors.margins: 8
                        color: "#fffffe"
                        font.pixelSize: 12
                        selectByMouse: true
                    }
                }
            }

            Item { Layout.fillHeight: true }

            // Actions Footer
            RowLayout {
                Layout.fillWidth: true
                spacing: 12
                Item { Layout.fillWidth: true }
                Rectangle {
                    width: 90; height: 38; radius: 8; color: "#211f30"
                    Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: createModalRoot.closed()
                    }
                }
                Rectangle {
                    width: 130; height: 38; radius: 8; color: "#8b5cf6"
                    Text { anchors.centerIn: parent; text: "Adicionar Obra"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (newCultureTitle.text.trim().length > 0) {
                                var eps = parseInt(newCultureEpisodes.text) || 12
                                createModalRoot.itemCreated(
                                    newCultureTitle.text.trim(),
                                    createModalRoot.selectedType,
                                    newCultureSynopsis.text.trim(),
                                    eps,
                                    newCultureCover.text.trim()
                                )
                                createModalRoot.closed()
                            }
                        }
                    }
                }
            }
        }
    }
}
