import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: galleryRoot
    anchors.fill: parent
    anchors.margins: 32
    spacing: 20

    property var diagramsList: []

    signal diagramSelected(var diagram)
    signal diagramDeleted(string diagramId)
    signal createRequested()

    // Header
    RowLayout {
        Layout.fillWidth: true
        spacing: 16

        ColumnLayout {
            spacing: 4
            Text {
                text: "🎨 Diagramas & Whiteboard Infinito"
                color: "#fffffe"
                font.pixelSize: 24
                font.bold: true
            }
            Text {
                text: galleryRoot.diagramsList.length + " diagrama(s) no acervo • Mapas mentais, fluxogramas e lousa infinita"
                color: "#a7a9be"
                font.pixelSize: 13
            }
        }

        Item { Layout.fillWidth: true }

        Rectangle {
            width: 144
            height: 40
            radius: 10
            color: newMouse.containsMouse ? "#7c3aed" : "#8b5cf6"

            RowLayout {
                anchors.centerIn: parent
                spacing: 6
                Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                Text { text: "Novo Diagrama"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
            }

            MouseArea {
                id: newMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: galleryRoot.createRequested()
            }
        }
    }

    // Diagrams Grid
    GridView {
        id: diagramsGrid
        Layout.fillWidth: true
        Layout.fillHeight: true
        clip: true
        cellWidth: 260
        cellHeight: 180
        model: galleryRoot.diagramsList

        delegate: Rectangle {
            width: 244
            height: 164
            radius: 12
            color: cardMouse.containsMouse ? "#201e30" : "#1a1924"
            border.color: cardMouse.containsMouse ? "#8b5cf680" : "#ffffff0f"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 16
                spacing: 10

                RowLayout {
                    Layout.fillWidth: true
                    Rectangle {
                        width: 36; height: 36; radius: 8; color: "#8b5cf620"
                        Text { anchors.centerIn: parent; text: modelData.icon || "🎨"; font.pixelSize: 18 }
                    }
                    Item { Layout.fillWidth: true }
                    // Delete Button
                    Rectangle {
                        width: 28; height: 28; radius: 6; color: delMouse.containsMouse ? "#f43f5e26" : "transparent"
                        Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 11 }
                        MouseArea {
                            id: delMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: galleryRoot.diagramDeleted(modelData.id)
                        }
                    }
                }

                Text {
                    text: modelData.title || "Sem título"
                    color: "#fffffe"
                    font.pixelSize: 15
                    font.bold: true
                    elide: Text.ElideRight
                    Layout.fillWidth: true
                }

                Item { Layout.fillHeight: true }

                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: modelData.updated_at ? modelData.updated_at.substring(0, 10) : "Hoje"
                        color: "#64748b"
                        font.pixelSize: 11
                    }
                    Item { Layout.fillWidth: true }
                    Text {
                        text: "Abrir Lousa →"
                        color: "#c4b5fd"
                        font.pixelSize: 11
                        font.bold: true
                    }
                }
            }

            MouseArea {
                id: cardMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                z: -1
                onClicked: galleryRoot.diagramSelected(modelData)
            }
        }

        Text {
            anchors.centerIn: parent
            visible: galleryRoot.diagramsList.length === 0
            text: "Nenhum diagrama criado. Clique em '+ Novo Diagrama' para começar a desenhar!"
            color: "#64748b"
            font.pixelSize: 14
        }
    }
}
