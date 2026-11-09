import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: detailsModalRoot
    anchors.fill: parent
    color: "#aa000000"
    visible: isOpen && item !== null
    z: 90

    property bool isOpen: false
    property var item: null

    signal closed()
    signal statusChanged(string itemId, string newStatus)
    signal progressChanged(string itemId, int newProgress)
    signal itemCompleted(string itemId, int totalEpisodes)

    MouseArea {
        anchors.fill: parent
        onClicked: detailsModalRoot.closed()
    }

    Rectangle {
        width: Math.min(parent.width - 64, 620)
        height: Math.min(parent.height - 64, 480)
        anchors.centerIn: parent
        radius: 16
        color: "#1a1924"
        border.color: "#8b5cf655"
        border.width: 1

        MouseArea {
            anchors.fill: parent
        }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            // Modal Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Text {
                    Layout.fillWidth: true
                    text: detailsModalRoot.item ? detailsModalRoot.item.title : ""
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                    elide: Text.ElideRight
                }

                Rectangle {
                    width: 28; height: 28; radius: 6
                    color: "#ffffff10"
                    Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 13 }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: detailsModalRoot.closed()
                    }
                }
            }

            // Two-Column Body: Poster on Left, Details on Right
            RowLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 20

                // Left: Large Poster
                Rectangle {
                    Layout.preferredWidth: 140
                    Layout.fillHeight: true
                    radius: 10
                    color: "#15141b"
                    border.color: "#ffffff0f"
                    clip: true

                    Image {
                        anchors.fill: parent
                        source: (detailsModalRoot.item && detailsModalRoot.item.cover_image) ? detailsModalRoot.item.cover_image : ""
                        fillMode: Image.PreserveAspectCrop
                        visible: status === Image.Ready
                    }

                    ColumnLayout {
                        anchors.centerIn: parent
                        visible: !detailsModalRoot.item || !detailsModalRoot.item.cover_image
                        spacing: 6
                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: (detailsModalRoot.item && detailsModalRoot.item.type === "filme") ? "🎬" : ((detailsModalRoot.item && detailsModalRoot.item.type === "anime") ? "⛩️" : "📺")
                            font.pixelSize: 42
                        }
                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: detailsModalRoot.item ? detailsModalRoot.item.type : ""
                            color: "#a7a9be"
                            font.pixelSize: 11
                        }
                    }
                }

                // Right: Details, Status, Steppers, Synopsis
                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    spacing: 12

                    // Status Selector Pills
                    RowLayout {
                        spacing: 8
                        Text { text: "Status:"; color: "#a7a9be"; font.pixelSize: 12 }
                        Repeater {
                            model: [
                                { key: "watching", label: "Assistindo" },
                                { key: "finished", label: "Concluído" },
                                { key: "backlog", label: "Na Fila" }
                            ]
                            delegate: Rectangle {
                                property bool isCurStatus: (detailsModalRoot.item && detailsModalRoot.item.status === modelData.key)
                                height: 24
                                width: statusText.contentWidth + 14
                                radius: 12
                                color: isCurStatus ? "#8b5cf6" : "#ffffff10"
                                border.color: isCurStatus ? "#a78bfa" : "transparent"

                                Text {
                                    id: statusText
                                    anchors.centerIn: parent
                                    text: modelData.label
                                    color: isCurStatus ? "#ffffff" : "#a7a9be"
                                    font.pixelSize: 11
                                    font.bold: isCurStatus
                                }

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        if (detailsModalRoot.item) {
                                            detailsModalRoot.statusChanged(detailsModalRoot.item.id, modelData.key)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Progress Steppers
                    RowLayout {
                        spacing: 8
                        Text {
                            text: "Progresso: Ep. " + ((detailsModalRoot.item && detailsModalRoot.item.progress) || 0) + " / " + ((detailsModalRoot.item && detailsModalRoot.item.total_episodes) || "∞")
                            color: "#fffffe"
                            font.pixelSize: 13
                            font.bold: true
                        }

                        Item { Layout.fillWidth: true }

                        // -5
                        Rectangle {
                            width: 30; height: 26; radius: 6; color: "#262438"
                            Text { anchors.centerIn: parent; text: "-5"; color: "#a7a9be"; font.pixelSize: 10 }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    if (detailsModalRoot.item) {
                                        var newP = Math.max(0, (detailsModalRoot.item.progress || 0) - 5)
                                        detailsModalRoot.progressChanged(detailsModalRoot.item.id, newP)
                                    }
                                }
                            }
                        }

                        // -1
                        Rectangle {
                            width: 26; height: 26; radius: 6; color: "#262438"
                            Text { anchors.centerIn: parent; text: "-1"; color: "#a7a9be"; font.pixelSize: 10 }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    if (detailsModalRoot.item) {
                                        var newP = Math.max(0, (detailsModalRoot.item.progress || 0) - 1)
                                        detailsModalRoot.progressChanged(detailsModalRoot.item.id, newP)
                                    }
                                }
                            }
                        }

                        // +1
                        Rectangle {
                            width: 26; height: 26; radius: 6; color: "#8b5cf626"; border.color: "#8b5cf666"
                            Text { anchors.centerIn: parent; text: "+1"; color: "#c4b5fd"; font.pixelSize: 10; font.bold: true }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    if (detailsModalRoot.item) {
                                        var newP = (detailsModalRoot.item.progress || 0) + 1
                                        detailsModalRoot.progressChanged(detailsModalRoot.item.id, newP)
                                    }
                                }
                            }
                        }

                        // +5
                        Rectangle {
                            width: 30; height: 26; radius: 6; color: "#8b5cf626"; border.color: "#8b5cf666"
                            Text { anchors.centerIn: parent; text: "+5"; color: "#c4b5fd"; font.pixelSize: 10; font.bold: true }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    if (detailsModalRoot.item) {
                                        var newP = (detailsModalRoot.item.progress || 0) + 5
                                        detailsModalRoot.progressChanged(detailsModalRoot.item.id, newP)
                                    }
                                }
                            }
                        }
                    }

                    // Complete button
                    Rectangle {
                        Layout.fillWidth: true
                        height: 32
                        radius: 6
                        color: "#10b98120"
                        border.color: "#10b98155"
                        Text {
                            anchors.centerIn: parent
                            text: "Marcar Obra como Concluída ✓"
                            color: "#34d399"
                            font.pixelSize: 11
                            font.bold: true
                        }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                if (detailsModalRoot.item) {
                                    var total = detailsModalRoot.item.total_episodes || detailsModalRoot.item.progress || 1
                                    detailsModalRoot.itemCompleted(detailsModalRoot.item.id, total)
                                }
                            }
                        }
                    }

                    // Synopsis Section
                    Text { text: "Sinopse:"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true }

                    ScrollView {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        clip: true

                        Text {
                            width: parent.width
                            text: (detailsModalRoot.item && detailsModalRoot.item.synopsis) ? detailsModalRoot.item.synopsis : "Sem sinopse cadastrada."
                            color: "#fffffe"
                            font.pixelSize: 12
                            wrapMode: Text.WordWrap
                            lineHeight: 1.4
                        }
                    }
                }
            }
        }
    }
}
