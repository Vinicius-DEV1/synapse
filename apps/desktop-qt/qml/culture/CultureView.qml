import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: cultureRoot
    color: "#0f0e17" // bg-dark-bg

    property var items: []
    property string activeStatus: "" // "" (todos), "watching", "completed", "planned"

    function refreshItems() {
        items = dataController.getCultureItems(activeStatus)
    }

    Component.onCompleted: {
        refreshItems()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

        // Header and Category Tabs
        RowLayout {
            Layout.fillWidth: true
            spacing: 16

            ColumnLayout {
                spacing: 4
                Text {
                    text: "🎭 Cultura & Entretenimento"
                    color: "#fffffe"
                    font.pixelSize: 24
                    font.bold: true
                }
                Text {
                    text: cultureRoot.items.length + " obra(s) catalogadas (filmes, animes, séries) com pôsteres"
                    color: "#a7a9be"
                    font.pixelSize: 13
                }
            }

            Item { Layout.fillWidth: true }

            // Filter Pills (Matching Caderno Tab Bar pattern)
            RowLayout {
                spacing: 6

                Rectangle {
                    width: 76; height: 32; radius: 8
                    color: cultureRoot.activeStatus === "" ? "#8b5cf626" : "#1a1924"
                    border.color: cultureRoot.activeStatus === "" ? "#8b5cf666" : "#ffffff0f"
                    Text { anchors.centerIn: parent; text: "Todos"; color: cultureRoot.activeStatus === "" ? "#c4b5fd" : "#a7a9be"; font.pixelSize: 12; font.bold: true }
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: { cultureRoot.activeStatus = ""; cultureRoot.refreshItems() } }
                }

                Rectangle {
                    width: 96; height: 32; radius: 8
                    color: cultureRoot.activeStatus === "watching" ? "#8b5cf626" : "#1a1924"
                    border.color: cultureRoot.activeStatus === "watching" ? "#8b5cf666" : "#ffffff0f"
                    Text { anchors.centerIn: parent; text: "Assistindo"; color: cultureRoot.activeStatus === "watching" ? "#c4b5fd" : "#a7a9be"; font.pixelSize: 12; font.bold: true }
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: { cultureRoot.activeStatus = "watching"; cultureRoot.refreshItems() } }
                }

                Rectangle {
                    width: 96; height: 32; radius: 8
                    color: cultureRoot.activeStatus === "completed" ? "#8b5cf626" : "#1a1924"
                    border.color: cultureRoot.activeStatus === "completed" ? "#8b5cf666" : "#ffffff0f"
                    Text { anchors.centerIn: parent; text: "Concluído"; color: cultureRoot.activeStatus === "completed" ? "#c4b5fd" : "#a7a9be"; font.pixelSize: 12; font.bold: true }
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: { cultureRoot.activeStatus = "completed"; cultureRoot.refreshItems() } }
                }
            }
        }

        // Grid View of Culture Items
        GridView {
            id: cultureGridView
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            cellWidth: 350
            cellHeight: 160
            model: cultureRoot.items

            delegate: Rectangle {
                width: 330
                height: 144
                radius: 12
                color: "#1a1924" // bg-dark-card
                border.color: cardMouse.containsMouse ? "#8b5cf64d" : "#ffffff0f"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 12

                    // Cover image / poster
                    Rectangle {
                        Layout.preferredWidth: 80
                        Layout.fillHeight: true
                        radius: 8
                        color: "#15141b"
                        clip: true

                        Image {
                            anchors.fill: parent
                            source: modelData.cover_image || ""
                            fillMode: Image.PreserveAspectCrop
                            visible: status === Image.Ready
                        }

                        ColumnLayout {
                            anchors.centerIn: parent
                            visible: !modelData.cover_image || cultureImgStatus.status !== Image.Ready
                            spacing: 4
                            Text {
                                Layout.alignment: Qt.AlignHCenter
                                text: modelData.type === "filme" ? "🎬" : "📺"
                                font.pixelSize: 24
                            }
                        }

                        Image {
                            id: cultureImgStatus
                            visible: false
                            source: modelData.cover_image || ""
                        }
                    }

                    // Metadata & Fast Action
                    ColumnLayout {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        spacing: 4

                        RowLayout {
                            Layout.fillWidth: true
                            Text {
                                Layout.fillWidth: true
                                text: modelData.title
                                color: cardMouse.containsMouse ? "#c4b5fd" : "#fffffe"
                                font.pixelSize: 14
                                font.bold: true
                                elide: Text.ElideRight
                            }

                            Rectangle {
                                width: typeText.contentWidth + 10
                                height: 18
                                radius: 4
                                color: "#8b5cf61a"

                                Text {
                                    id: typeText
                                    anchors.centerIn: parent
                                    text: modelData.type || "Mídia"
                                    color: "#a78bfa"
                                    font.pixelSize: 10
                                    font.bold: true
                                }
                            }
                        }

                        Text {
                            Layout.fillWidth: true
                            text: modelData.synopsis || "Sem sinopse disponível."
                            color: "#a7a9be"
                            font.pixelSize: 11
                            wrapMode: Text.WordWrap
                            maximumLineCount: 2
                            elide: Text.ElideRight
                        }

                        Item { Layout.fillHeight: true }

                        RowLayout {
                            Layout.fillWidth: true

                            Text {
                                text: "Progresso: " + (modelData.progress || 0) + (modelData.total_episodes ? "/" + modelData.total_episodes : " eps")
                                color: "#fffffe"
                                font.pixelSize: 12
                                font.bold: true
                            }

                            Item { Layout.fillWidth: true }

                            Rectangle {
                                width: 68
                                height: 26
                                radius: 6
                                color: btnMouse.containsMouse ? "#7c3aed" : "#7c3aed26"
                                border.color: "#8b5cf64d"

                                Text {
                                    anchors.centerIn: parent
                                    text: "+1 Ep"
                                    color: btnMouse.containsMouse ? "#ffffff" : "#c4b5fd"
                                    font.pixelSize: 11
                                    font.bold: true
                                }

                                MouseArea {
                                    id: btnMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        dataController.incrementCultureProgress(modelData.id)
                                        cultureRoot.refreshItems()
                                    }
                                }
                            }
                        }
                    }
                }

                MouseArea {
                    id: cardMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    z: -1
                }
            }

            Text {
                anchors.centerIn: parent
                visible: cultureRoot.items.length === 0
                text: "Nenhuma obra cadastrada nesta categoria."
                color: "#64748b"
                font.pixelSize: 15
            }
        }
    }
}
