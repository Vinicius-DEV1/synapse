import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: root
    spacing: 16
    Layout.fillWidth: true

    property string videoTitle: ""
    property double durationSeconds: 0
    property double originalSizeBytes: 0
    property string qualityLabel: "720p"

    signal doneRequested()

    function formatBytes(bytes) {
        if (!bytes || bytes <= 0) return "—"
        return (bytes / (1024 * 1024)).toFixed(2) + " MB"
    }

    Item { Layout.preferredHeight: 8 }

    // Success Icon
    Rectangle {
        Layout.alignment: Qt.AlignHCenter
        width: 64
        height: 64
        radius: 32
        color: "#1a22c55e"
        border.color: "#3322c55e"
        border.width: 1

        Text {
            anchors.centerIn: parent
            text: "✓"
            color: "#22c55e"
            font.pixelSize: 32
            font.bold: true
        }
    }

    Text {
        Layout.alignment: Qt.AlignHCenter
        text: "Vídeo Processado com Sucesso!"
        color: "#fffffe"
        font.pixelSize: 18
        font.bold: true
    }

    Text {
        Layout.alignment: Qt.AlignHCenter
        text: "O vídeo foi criptografado e catalogado no seu cofre local."
        color: "#94a3b8"
        font.pixelSize: 13
    }

    Item { Layout.preferredHeight: 8 }

    // Info Card
    Rectangle {
        Layout.fillWidth: true
        Layout.preferredHeight: infoLayout.implicitHeight + 24
        radius: 12
        color: "#141320"
        border.color: "#18ffffff"
        border.width: 1

        ColumnLayout {
            id: infoLayout
            anchors.fill: parent
            anchors.margins: 16
            spacing: 10

            RowLayout {
                Layout.fillWidth: true
                Text { text: "Arquivo:"; color: "#a7a9be"; font.pixelSize: 13 }
                Item { Layout.fillWidth: true }
                Text {
                    text: root.videoTitle.length > 0 ? root.videoTitle : "Vídeo importado"
                    color: "#fffffe"
                    font.pixelSize: 13
                    font.bold: true
                    elide: Text.ElideRight
                    Layout.maximumWidth: 260
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: "#0fffffff" }

            RowLayout {
                Layout.fillWidth: true
                Text { text: "Duração:"; color: "#a7a9be"; font.pixelSize: 13 }
                Item { Layout.fillWidth: true }
                Text {
                    text: Math.round(root.durationSeconds) + "s"
                    color: "#fffffe"
                    font.pixelSize: 13
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: "#0fffffff" }

            RowLayout {
                Layout.fillWidth: true
                Text { text: "Tamanho:"; color: "#a7a9be"; font.pixelSize: 13 }
                Item { Layout.fillWidth: true }
                Text {
                    text: root.formatBytes(root.originalSizeBytes)
                    color: "#fffffe"
                    font.pixelSize: 13
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: "#0fffffff" }

            RowLayout {
                Layout.fillWidth: true
                Text { text: "Perfil:"; color: "#a7a9be"; font.pixelSize: 13 }
                Item { Layout.fillWidth: true }
                Text {
                    text: root.qualityLabel
                    color: "#818cf8"
                    font.pixelSize: 13
                    font.bold: true
                }
            }
        }
    }

    Item { Layout.preferredHeight: 8 }

    Button {
        Layout.fillWidth: true
        Layout.preferredHeight: 42
        text: "Concluir"
        onClicked: root.doneRequested()

        background: Rectangle {
            color: parent.hovered ? "#4f46e5" : "#6366f1"
            radius: 10
        }
        contentItem: Text {
            text: parent.text
            color: "#ffffff"
            font.pixelSize: 14
            font.bold: true
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }
}
