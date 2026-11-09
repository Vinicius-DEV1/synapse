import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: libraryRoot
    color: "#0f0e17" // bg-dark-bg

    property var books: []
    property string filterText: ""

    function refreshBooks() {
        books = dataController.getLibraryBooks(filterText)
    }

    Component.onCompleted: {
        refreshBooks()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

        // Header and Search Bar
        RowLayout {
            Layout.fillWidth: true
            spacing: 16

            ColumnLayout {
                spacing: 4
                Text {
                    text: "📚 Biblioteca & E-Reader"
                    color: "#fffffe"
                    font.pixelSize: 24
                    font.bold: true
                }
                Text {
                    text: libraryRoot.books.length + " livro(s) e e-pubs com sincronização de páginas lidas"
                    color: "#a7a9be"
                    font.pixelSize: 13
                }
            }

            Item { Layout.fillWidth: true }

            Rectangle {
                Layout.preferredWidth: 280
                height: 38
                radius: 10
                color: "#15141b"
                border.color: bookSearchField.activeFocus ? "#8b5cf680" : "#ffffff12"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 12
                    anchors.rightMargin: 12
                    spacing: 8

                    Text { text: "🔍"; color: "#a7a9be"; font.pixelSize: 12 }

                    TextInput {
                        id: bookSearchField
                        Layout.fillWidth: true
                        color: "#fffffe"
                        font.pixelSize: 13
                        selectByMouse: true
                        onTextChanged: {
                            libraryRoot.filterText = text
                            libraryRoot.refreshBooks()
                        }

                        Text {
                            text: "Buscar livro ou autor..."
                            color: "#64748b"
                            font.pixelSize: 13
                            visible: !bookSearchField.text && !bookSearchField.activeFocus
                        }
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
            model: libraryRoot.books

            delegate: Rectangle {
                width: 300
                height: 160
                radius: 12
                color: "#1a1924" // bg-dark-card
                border.color: cardMouse.containsMouse ? "#8b5cf64d" : "#ffffff0f"
                border.width: 1

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
                }
            }

            Text {
                anchors.centerIn: parent
                visible: libraryRoot.books.length === 0
                text: "Nenhum livro encontrado na biblioteca."
                color: "#64748b"
                font.pixelSize: 15
            }
        }
    }
}
