import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Dialogs 6.3

Rectangle {
    id: exportModalRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 98

    property string diagramTitle: "Diagrama"
    property var shapes: []
    property string exportFormat: "png" // "png", "svg", "json"
    property bool transparentBg: false

    signal closed()
    signal exportCompleted(string filePath)

    MouseArea {
        anchors.fill: parent
        onClicked: exportModalRoot.closed()
    }

    Rectangle {
        width: Math.min(480, parent.width - 40)
        height: Math.min(440, parent.height - 40)
        radius: 20
        color: "#161524"
        border.color: "#338b5cf6"
        border.width: 1
        anchors.centerIn: parent

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: "📤 Exportar Diagrama"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕"
                    flat: true
                    onClicked: exportModalRoot.closed()
                    contentItem: Text {
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 16
                    }
                }
            }

            Text {
                text: "Exporte seu diagrama em formatos vetoriais ou imagens rasterizadas de alta fidelidade."
                color: "#a7a9be"
                font.pixelSize: 12
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }

            // Format Selection
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8

                Text {
                    text: "FORMATO DE EXPORTAÇÃO"
                    color: "#a7a9be"
                    font.pixelSize: 11
                    font.bold: true
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Repeater {
                        model: [
                            { id: "png", label: "PNG", desc: "Imagem Raster" },
                            { id: "svg", label: "SVG", desc: "Vetor Escalável" },
                            { id: "json", label: "JSON", desc: "Dados Estruturados" }
                        ]
                        delegate: Button {
                            Layout.fillWidth: true
                            height: 48
                            flat: true
                            background: Rectangle {
                                color: exportModalRoot.exportFormat === modelData.id ? "#8b5cf6" : "#211f30"
                                radius: 10
                                border.color: exportModalRoot.exportFormat === modelData.id ? "#a78bfa" : "#33ffffff"
                                border.width: 1
                            }
                            contentItem: ColumnLayout {
                                anchors.centerIn: parent
                                spacing: 2
                                Text {
                                    Layout.alignment: Qt.AlignHCenter
                                    text: modelData.label
                                    color: exportModalRoot.exportFormat === modelData.id ? "#ffffff" : "#fffffe"
                                    font.pixelSize: 12
                                    font.bold: true
                                }
                                Text {
                                    Layout.alignment: Qt.AlignHCenter
                                    text: modelData.desc
                                    color: exportModalRoot.exportFormat === modelData.id ? "#e9d5ff" : "#6b7280"
                                    font.pixelSize: 9
                                }
                            }
                            onClicked: exportModalRoot.exportFormat = modelData.id
                        }
                    }
                }
            }

            // Transparent background option
            Rectangle {
                Layout.fillWidth: true
                height: 52
                radius: 10
                color: "#0f0e17"
                border.color: "#1affffff"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 12

                    Text {
                        text: "Fundo Transparente"
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                    }
                    Item { Layout.fillWidth: true }
                    Switch {
                        checked: exportModalRoot.transparentBg
                        onToggled: exportModalRoot.transparentBg = checked
                    }
                }
            }

            Item { Layout.fillHeight: true }

            // Action Buttons
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    Layout.fillWidth: true
                    height: 44
                    flat: true
                    background: Rectangle {
                        color: "#211f30"
                        radius: 10
                        border.color: "#33ffffff"
                        border.width: 1
                    }
                    contentItem: Text {
                        text: "Cancelar"
                        color: "#a7a9be"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: exportModalRoot.closed()
                }

                Button {
                    Layout.fillWidth: true
                    height: 44
                    flat: true
                    background: Rectangle {
                        color: "#8b5cf6"
                        radius: 10
                    }
                    contentItem: Text {
                        text: "Salvar Arquivo..."
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: saveFileDialog.open()
                }
            }
        }
    }

    FileDialog {
        id: saveFileDialog
        title: "Salvar Diagrama Exportado"
        fileMode: FileDialog.SaveFile
        nameFilters: {
            if (exportModalRoot.exportFormat === "svg") return ["Arquivos SVG (*.svg)"]
            if (exportModalRoot.exportFormat === "json") return ["Arquivos JSON (*.json *.excalidraw)"]
            return ["Imagens PNG (*.png)"]
        }
        currentFile: {
            var ext = exportModalRoot.exportFormat === "svg" ? ".svg" : (exportModalRoot.exportFormat === "json" ? ".json" : ".png")
            return "file://" + exportModalRoot.diagramTitle.toLowerCase().replace(/\s+/g, "-") + ext
        }
        onAccepted: {
            var path = selectedFile.toString()
            if (path.indexOf("file://") === 0) path = path.substring(7)
            exportModalRoot.exportCompleted(path)
            exportModalRoot.closed()
        }
    }
}
