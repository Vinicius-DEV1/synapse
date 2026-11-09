import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: headerRoot
    Layout.fillWidth: true
    spacing: 16

    property int videoCount: 0
    property var collections: []
    property string selectedCollection: "Todos"

    signal refreshRequested()
    signal collectionSelected(string colName)

    // Header Top Row
    RowLayout {
        Layout.fillWidth: true
        spacing: 16

        ColumnLayout {
            spacing: 4
            RowLayout {
                spacing: 10
                Text { text: "🎬"; font.pixelSize: 28 }
                Text {
                    text: "Media Center & Vídeos"
                    color: "#fffffe"
                    font.pixelSize: 26
                    font.bold: true
                }
            }
            Text {
                text: "Decodificação acelerada por GPU (libmpv) • " + headerRoot.videoCount + " vídeo(s) catalogado(s)"
                color: "#a7a9be"
                font.pixelSize: 13
            }
        }

        Item { Layout.fillWidth: true }

        Rectangle {
            width: 140; height: 38; radius: 10
            color: "#6366f1"

            RowLayout {
                anchors.centerIn: parent
                spacing: 8
                Text { text: "↻"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                Text { text: "Atualizar"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: headerRoot.refreshRequested()
            }
        }
    }

    // Collections Filter Pills
    RowLayout {
        Layout.fillWidth: true
        spacing: 8
        visible: headerRoot.collections.length > 1

        Repeater {
            model: headerRoot.collections

            delegate: Rectangle {
                property bool isSelected: headerRoot.selectedCollection === modelData
                height: 32
                width: colText.contentWidth + 24
                radius: 16
                color: isSelected ? "#6366f1" : "#1a1924"
                border.color: isSelected ? "#818cf8" : "#ffffff0f"

                Text {
                    id: colText
                    anchors.centerIn: parent
                    text: modelData
                    color: parent.isSelected ? "#ffffff" : "#a7a9be"
                    font.pixelSize: 12
                    font.bold: parent.isSelected
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: headerRoot.collectionSelected(modelData)
                }
            }
        }
    }
}
