import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

ColumnLayout {
    id: mediaGridRoot
    spacing: 16

    property var filteredItems: []
    property string activeTypeFilter: "all"
    property string activeStatusFilter: "all"

    signal typeFilterChanged(string filter)
    signal statusFilterChanged(string filter)
    signal itemSelected(var item)
    signal progressUpdated(string itemId, int newProgress)
    signal itemIncremented(string itemId)
    signal itemDeleted(string itemId)

    // Secondary Bar: Filter Pills (Types & Status)
    Flickable {
        Layout.fillWidth: true
        Layout.preferredHeight: 34
        contentWidth: filterPillsLayout.implicitWidth
        clip: true
        flickableDirection: Flickable.HorizontalFlick
        boundsBehavior: Flickable.StopAtBounds

        RowLayout {
            id: filterPillsLayout
            height: 34
            spacing: 16

            // Type Pills
            RowLayout {
                spacing: 6

                Repeater {
                    model: [
                        { key: "all", label: "Todas as Mídias" },
                        { key: "anime", label: "⛩️ Animes" },
                        { key: "série", label: "📺 Séries" },
                        { key: "filme", label: "🎬 Filmes" }
                    ]

                    delegate: Rectangle {
                        width: typePillText.contentWidth + 18
                        height: 32
                        radius: 8
                        color: mediaGridRoot.activeTypeFilter === modelData.key ? "#268b5cf6" : "#1a1924"
                        border.color: mediaGridRoot.activeTypeFilter === modelData.key ? "#668b5cf6" : "#0fffffff"

                        Text {
                            id: typePillText
                            anchors.centerIn: parent
                            text: modelData.label
                            color: mediaGridRoot.activeTypeFilter === modelData.key ? "#c4b5fd" : "#a7a9be"
                            font.pixelSize: 12
                            font.bold: mediaGridRoot.activeTypeFilter === modelData.key
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: mediaGridRoot.typeFilterChanged(modelData.key)
                        }
                    }
                }
            }

            Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 20; color: "#15ffffff" }

            // Status Pills
            RowLayout {
                spacing: 6

                Repeater {
                    model: [
                        { key: "all", label: "Todos os Status" },
                        { key: "watching", label: "Assistindo" },
                        { key: "backlog", label: "Quero Ver" },
                        { key: "finished", label: "Concluído" }
                    ]

                    delegate: Rectangle {
                        width: statusPillText.contentWidth + 18
                        height: 32
                        radius: 8
                        color: mediaGridRoot.activeStatusFilter === modelData.key ? "#268b5cf6" : "#1a1924"
                        border.color: mediaGridRoot.activeStatusFilter === modelData.key ? "#668b5cf6" : "#0fffffff"

                        Text {
                            id: statusPillText
                            anchors.centerIn: parent
                            text: modelData.label
                            color: mediaGridRoot.activeStatusFilter === modelData.key ? "#c4b5fd" : "#a7a9be"
                            font.pixelSize: 12
                            font.bold: mediaGridRoot.activeStatusFilter === modelData.key
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: mediaGridRoot.statusFilterChanged(modelData.key)
                        }
                    }
                }
            }
        }
    }

    // Grid View of Culture Items
    GridView {
        id: cultureGridView
        Layout.fillWidth: true
        Layout.fillHeight: true
        clip: true
        readonly property int columnCount: Math.max(1, Math.floor(width / 310))
        cellWidth: Math.floor(width / columnCount)
        cellHeight: 170
        model: mediaGridRoot.filteredItems

        delegate: Rectangle {
            id: cultureCardDelegate
            width: cultureGridView.cellWidth - 16
            height: 154
            x: 8
            radius: 12
            color: cardMouse.containsMouse ? "#211f30" : "#1a1924"
            border.color: cardMouse.containsMouse ? "#668b5cf6" : "#0fffffff"
            border.width: 1

            Behavior on color { ColorAnimation { duration: 150 } }
            Behavior on border.color { ColorAnimation { duration: 150 } }

            RowLayout {
                anchors.fill: parent
                anchors.margins: 12
                spacing: 12

                // Cover image / poster
                Rectangle {
                    Layout.preferredWidth: 84
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
                            text: modelData.type === "filme" ? "🎬" : (modelData.type === "anime" ? "⛩️" : "📺")
                            font.pixelSize: 26
                        }
                    }

                    Image {
                        id: cultureImgStatus
                        visible: false
                        source: modelData.cover_image || ""
                    }
                }

                // Metadata & Action Controls
                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    spacing: 4

                    // Title & Type Badge
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 6

                        Text {
                            Layout.fillWidth: true
                            text: modelData.title
                            color: cardMouse.containsMouse ? "#c4b5fd" : "#fffffe"
                            font.pixelSize: 14
                            font.bold: true
                            elide: Text.ElideRight
                        }

                        Rectangle {
                            Layout.preferredWidth: typeText.contentWidth + 8
                            Layout.preferredHeight: 18
                            radius: 4
                            color: "#1a8b5cf6"

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

                    // Synopsis preview
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

                    // Progress bar preview
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 4
                        radius: 2
                        color: "#15141b"
                        Rectangle {
                            width: parent.width * (modelData.total_episodes > 0 ? Math.min(1.0, (modelData.progress || 0) / modelData.total_episodes) : 0.05)
                            height: parent.height
                            radius: 2
                            color: (modelData.progress >= modelData.total_episodes && modelData.total_episodes > 0) ? "#10b981" : "#8b5cf6"
                        }
                    }

                    // Bottom Actions: Stepper and Delete
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Text {
                            text: "Ep. " + (modelData.progress || 0) + (modelData.total_episodes ? "/" + modelData.total_episodes : "")
                            color: "#fffffe"
                            font.pixelSize: 12
                            font.bold: true
                        }

                        Item { Layout.fillWidth: true }

                        // -1 Ep Stepper
                        Rectangle {
                            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 6
                            color: "#262438"; border.color: "#12ffffff"
                            Text { anchors.centerIn: parent; text: "-1"; color: "#fffffe"; font.pixelSize: 10; font.bold: true }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    var nextP = Math.max(0, (modelData.progress || 0) - 1)
                                    mediaGridRoot.progressUpdated(modelData.id, nextP)
                                }
                            }
                        }

                        // +1 Ep Stepper
                        Rectangle {
                            Layout.preferredWidth: 44; Layout.preferredHeight: 26; radius: 6
                            color: "#268b5cf6"; border.color: "#668b5cf6"
                            Text { anchors.centerIn: parent; text: "+1 Ep"; color: "#c4b5fd"; font.pixelSize: 10; font.bold: true }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: mediaGridRoot.itemIncremented(modelData.id)
                            }
                        }

                        // Delete Button
                        Rectangle {
                            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 6
                            color: delCultureMouse.containsMouse ? "#26f43f5e" : "transparent"
                            border.color: delCultureMouse.containsMouse ? "#55f43f5e" : "transparent"
                            AppIcon {
                                anchors.centerIn: parent
                                width: 13
                                height: 13
                                name: "trash"
                                color: delCultureMouse.containsMouse ? "#f43f5e" : "#71717a"
                            }
                            MouseArea {
                                id: delCultureMouse
                                anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                                onClicked: mediaGridRoot.itemDeleted(modelData.id)
                            }
                        }
                    }
                }
            }

            MouseArea {
                id: cardMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                z: -1
                onClicked: mediaGridRoot.itemSelected(modelData)
            }
        }

        Text {
            anchors.centerIn: parent
            visible: mediaGridRoot.filteredItems.length === 0
            text: "Nenhuma obra cadastrada nesta categoria ou filtro."
            color: "#64748b"
            font.pixelSize: 15
        }
    }
}
