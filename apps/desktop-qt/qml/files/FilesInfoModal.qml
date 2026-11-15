import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root
    anchors.fill: parent
    color: "#80000000"
    visible: false
    z: 200

    property var item: null

    signal closeRequested()

    function openForItem(fileItem) {
        item = fileItem
        visible = true
    }

    function closeModal() {
        visible = false
        closeRequested()
    }

    function formatBytes(bytes) {
        if (!bytes || bytes <= 0) return "0 KB"
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
        return (bytes / (1024 * 1024)).toFixed(2) + " MB"
    }

    MouseArea {
        anchors.fill: parent
        onClicked: root.closeModal()
    }

    Rectangle {
        id: card
        width: Math.min(parent.width - 32, 480)
        implicitHeight: contentCol.implicitHeight + 36
        anchors.centerIn: parent
        radius: 16
        color: "#161524"
        border.color: "#25ffffff"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: contentCol
            anchors.fill: parent
            anchors.margins: 20
            spacing: 16

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Text { text: "ℹ️"; font.pixelSize: 20 }
                Text {
                    text: "Detalhes do Arquivo"
                    color: "#fffffe"
                    font.pixelSize: 17
                    font.bold: true
                }

                Item { Layout.fillWidth: true }

                Rectangle {
                    width: 28; height: 28; radius: 6
                    color: "#15ffffff"
                    Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.closeModal()
                    }
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: "#10ffffff" }

            // Metadata card
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 12

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    Rectangle {
                        width: 52
                        height: 52
                        radius: 10
                        color: "#222035"
                        border.color: "#25ffffff"
                        Text { anchors.centerIn: parent; text: "📄"; font.pixelSize: 26 }
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        Text {
                            text: root.item ? (root.item.name || root.item.title || "Arquivo") : ""
                            color: "#fffffe"
                            font.pixelSize: 15
                            font.bold: true
                            elide: Text.ElideMiddle
                            Layout.fillWidth: true
                        }
                        Text {
                            text: root.item ? (root.item.mime_type || root.item.category || "Documento") : ""
                            color: "#818cf8"
                            font.pixelSize: 12
                        }
                    }
                }

                Rectangle { Layout.fillWidth: true; height: 1; color: "#0fffffff" }

                // Metadata Rows
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "Tamanho:"; color: "#a7a9be"; font.pixelSize: 13 }
                        Item { Layout.fillWidth: true }
                        Text {
                            text: root.formatBytes(root.item ? root.item.file_size : 0)
                            color: "#fffffe"
                            font.pixelSize: 13
                            font.bold: true
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "Criptografia:"; color: "#a7a9be"; font.pixelSize: 13 }
                        Item { Layout.fillWidth: true }
                        Text {
                            text: "🔒 AES-256-GCM (Chave Files)"
                            color: "#4ade80"
                            font.pixelSize: 12
                            font.bold: true
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "Criado em:"; color: "#a7a9be"; font.pixelSize: 13 }
                        Item { Layout.fillWidth: true }
                        Text {
                            text: root.item && root.item.created_at ? root.item.created_at : "Recentemente"
                            color: "#fffffe"
                            font.pixelSize: 12
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "Modificado em:"; color: "#a7a9be"; font.pixelSize: 13 }
                        Item { Layout.fillWidth: true }
                        Text {
                            text: root.item && root.item.updated_at ? root.item.updated_at : "Sem alterações"
                            color: "#fffffe"
                            font.pixelSize: 12
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "Pasta:"; color: "#a7a9be"; font.pixelSize: 13 }
                        Item { Layout.fillWidth: true }
                        Text {
                            text: root.item && root.item.folder_name ? root.item.folder_name : "Raiz (Todos os Arquivos)"
                            color: "#c4b5fd"
                            font.pixelSize: 12
                        }
                    }
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: "#10ffffff" }

            // Footer
            Button {
                Layout.fillWidth: true
                Layout.preferredHeight: 38
                text: "Fechar"
                onClicked: root.closeModal()

                background: Rectangle { color: parent.hovered ? "#4f46e5" : "#6366f1"; radius: 8 }
                contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 13; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
    }

    Shortcut {
        sequence: "Escape"
        enabled: root.visible
        onActivated: root.closeModal()
    }
}
