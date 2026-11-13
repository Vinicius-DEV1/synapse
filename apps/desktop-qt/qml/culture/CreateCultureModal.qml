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
    property var initialItem: null

    signal closed()
    signal itemCreated(string title, string type, string synopsis, int totalEpisodes, string coverImage)
    signal itemSubmitted(string title, string type, string synopsis, int totalEpisodes, string coverImage, string goalNote, string accessLink)

    onIsOpenChanged: {
        if (isOpen) {
            if (initialItem) {
                newCultureTitle.text = initialItem.title || ""
                selectedType = initialItem.type || "anime"
                newCultureEpisodes.text = String(initialItem.total_episodes || 12)
                newCultureCover.text = initialItem.cover_image || ""
                newCultureSynopsis.text = initialItem.synopsis || ""
                newCultureGoal.text = initialItem.goal_note || ""
                newCultureLink.text = initialItem.access_link || ""
            } else {
                newCultureTitle.text = ""
                newCultureSynopsis.text = ""
                newCultureEpisodes.text = "12"
                newCultureCover.text = ""
                newCultureGoal.text = ""
                newCultureLink.text = ""
                selectedType = "anime"
            }
            newCultureTitle.forceActiveFocus()
        }
    }

    MouseArea {
        anchors.fill: parent
        onClicked: createModalRoot.closed()
    }

    Rectangle {
        anchors.centerIn: parent
        width: 500
        height: 620
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
            spacing: 12

            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: createModalRoot.initialItem ? "🎭 Editar Obra Cultural" : "🎭 Adicionar Nova Obra Cultural"
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                }
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
                            id: typeDelegate
                            property var itemData: modelData
                            width: 100; height: 34; radius: 8
                            color: createModalRoot.selectedType === typeDelegate.itemData.key ? "#8b5cf6" : "#211f30"
                            Text {
                                anchors.centerIn: parent
                                text: typeDelegate.itemData.label
                                color: createModalRoot.selectedType === typeDelegate.itemData.key ? "#ffffff" : "#a7a9be"
                                font.pixelSize: 12
                                font.bold: true
                            }
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: createModalRoot.selectedType = typeDelegate.itemData.key
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

            // Goal Note & Access Link Row
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Text { text: "Meta Cultural / Nota"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true
                        height: 38
                        radius: 8
                        color: "#15141b"
                        border.color: newCultureGoal.activeFocus ? "#8b5cf6" : "#15ffffff"
                        TextInput {
                            id: newCultureGoal
                            anchors.fill: parent
                            anchors.leftMargin: 12; anchors.rightMargin: 12
                            verticalAlignment: TextInput.AlignVCenter
                            color: "#fffffe"
                            font.pixelSize: 13
                            selectByMouse: true
                        }
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Text { text: "Link de Acesso (URL)"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true
                        height: 38
                        radius: 8
                        color: "#15141b"
                        border.color: newCultureLink.activeFocus ? "#8b5cf6" : "#15ffffff"
                        TextInput {
                            id: newCultureLink
                            anchors.fill: parent
                            anchors.leftMargin: 12; anchors.rightMargin: 12
                            verticalAlignment: TextInput.AlignVCenter
                            color: "#fffffe"
                            font.pixelSize: 13
                            selectByMouse: true
                        }
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
                    height: 48
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
                    width: 140; height: 38; radius: 8; color: "#8b5cf6"
                    Text {
                        anchors.centerIn: parent
                        text: createModalRoot.initialItem ? "Salvar Alterações" : "Adicionar Obra"
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                    }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (newCultureTitle.text.trim().length > 0) {
                                var eps = parseInt(newCultureEpisodes.text) || 12
                                createModalRoot.itemSubmitted(
                                    newCultureTitle.text.trim(),
                                    createModalRoot.selectedType,
                                    newCultureSynopsis.text.trim(),
                                    eps,
                                    newCultureCover.text.trim(),
                                    newCultureGoal.text.trim(),
                                    newCultureLink.text.trim()
                                )
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
