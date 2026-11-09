import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: gridRoot
    spacing: 16

    property var books: []
    property string activeStatusFilter: "all"

    signal statusFilterChanged(string filter)
    signal bookSelected(var book)

    // Status Filter Tabs
    RowLayout {
        Layout.fillWidth: true
        spacing: 8

        Repeater {
            model: [
                { key: "all", label: "Todos" },
                { key: "reading", label: "Lendo" },
                { key: "finished", label: "Concluídos" },
                { key: "queue", label: "Na Fila" }
            ]
            delegate: Rectangle {
                property bool isSelected: gridRoot.activeStatusFilter === modelData.key
                height: 30
                width: tabText.contentWidth + 24
                radius: 15
                color: isSelected ? "#7c3aed" : "#161524"
                border.color: isSelected ? "#a78bfa" : "#ffffff10"
                border.width: 1

                Text {
                    id: tabText
                    anchors.centerIn: parent
                    text: modelData.label
                    color: isSelected ? "#ffffff" : "#a7a9be"
                    font.pixelSize: 12
                    font.bold: isSelected
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: gridRoot.statusFilterChanged(modelData.key)
                }
            }
        }
    }

    // Books GridView
    GridView {
        id: bookGridView
        Layout.fillWidth: true
        Layout.fillHeight: true
        clip: true
        cellWidth: 320
        cellHeight: 180
        model: gridRoot.books

        delegate: Rectangle {
            id: bookCardDelegate
            width: 300
            height: 160
            radius: 12
            color: cardMouse.containsMouse ? "#211f30" : "#1a1924"
            border.color: cardMouse.containsMouse ? "#8b5cf666" : "#ffffff0f"
            border.width: 1

            Behavior on color { ColorAnimation { duration: 150 } }
            Behavior on border.color { ColorAnimation { duration: 150 } }

            RowLayout {
                anchors.fill: parent
                anchors.margins: 14
                spacing: 14

                // Book Cover Spine
                Rectangle {
                    Layout.preferredWidth: 70
                    Layout.fillHeight: true
                    radius: 8
                    color: modelData.cover_color || "#7c3aed"
                    clip: true

                    Image {
                        anchors.fill: parent
                        source: modelData.cover_image || ""
                        fillMode: Image.PreserveAspectCrop
                        visible: status === Image.Ready
                    }

                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 4
                        visible: !modelData.cover_image
                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: "📖"
                            font.pixelSize: 22
                        }
                    }
                }

                // Book Metadata and Reading Progress
                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    spacing: 6

                    Text {
                        Layout.fillWidth: true
                        text: modelData.title
                        color: cardMouse.containsMouse ? "#c4b5fd" : "#fffffe"
                        font.pixelSize: 14
                        font.bold: true
                        elide: Text.ElideRight
                    }

                    Text {
                        Layout.fillWidth: true
                        text: modelData.author || "Autor Desconhecido"
                        color: "#a7a9be"
                        font.pixelSize: 12
                        elide: Text.ElideRight
                    }

                    Item { Layout.fillHeight: true }

                    // Status Tag & Page Numbers
                    RowLayout {
                        Layout.fillWidth: true

                        Text {
                            text: "Pág. " + (modelData.current_page || 0) + (modelData.total_pages ? "/" + modelData.total_pages : "")
                            color: "#a7a9be"
                            font.pixelSize: 11
                        }

                        Item { Layout.fillWidth: true }

                        Rectangle {
                            width: statusText.contentWidth + 10
                            height: 20
                            radius: 4
                            color: modelData.reading_status === "completed" ? "#10b9811a" : "#8b5cf61a"
                            border.color: modelData.reading_status === "completed" ? "#10b98133" : "#8b5cf633"

                            Text {
                                id: statusText
                                anchors.centerIn: parent
                                text: modelData.reading_status === "completed" ? "Lido ✓" : "Lendo"
                                color: modelData.reading_status === "completed" ? "#34d399" : "#c4b5fd"
                                font.pixelSize: 10
                                font.bold: true
                            }
                        }
                    }

                    // Progress Bar
                    Rectangle {
                        Layout.fillWidth: true
                        height: 5
                        radius: 2.5
                        color: "#15141b"

                        Rectangle {
                            width: parent.width * (modelData.total_pages > 0 ? Math.min(1.0, (modelData.current_page || 0) / modelData.total_pages) : 0.05)
                            height: parent.height
                            radius: 2.5
                            color: modelData.reading_status === "completed" ? "#10b981" : "#7c3aed"
                        }
                    }
                }
            }

            MouseArea {
                id: cardMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: gridRoot.bookSelected(modelData)
            }
        }

        Text {
            anchors.centerIn: parent
            visible: gridRoot.books.length === 0
            text: "Nenhum livro encontrado na biblioteca."
            color: "#64748b"
            font.pixelSize: 15
        }
    }
}
