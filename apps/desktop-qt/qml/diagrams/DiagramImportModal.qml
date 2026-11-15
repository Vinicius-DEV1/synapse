import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Dialogs 6.3

Rectangle {
    id: importModalRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 98

    property string importedContent: "[]"
    property string diagramTitle: "Diagrama Importado"

    signal closed()
    signal importConfirmed(string title, string content)

    MouseArea {
        anchors.fill: parent
        onClicked: importModalRoot.closed()
    }

    Rectangle {
        width: Math.min(500, parent.width - 40)
        height: Math.min(480, parent.height - 40)
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
                    text: "📥 Importar Diagrama"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕"
                    flat: true
                    onClicked: importModalRoot.closed()
                    contentItem: Text {
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 16
                    }
                }
            }

            Text {
                text: "Importe diagramas a partir de arquivos .excalidraw, .tldr ou JSON estruturado."
                color: "#a7a9be"
                font.pixelSize: 12
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }

            // Title Input
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6

                Text {
                    text: "TÍTULO DO DIAGRAMA"
                    color: "#a7a9be"
                    font.pixelSize: 11
                    font.bold: true
                }

                TextField {
                    id: titleField
                    Layout.fillWidth: true
                    height: 40
                    text: importModalRoot.diagramTitle
                    color: "#fffffe"
                    background: Rectangle {
                        color: "#0f0e17"
                        radius: 8
                        border.color: titleField.activeFocus ? "#8b5cf6" : "#2e2f3e"
                        border.width: 1
                    }
                }
            }

            // File Chooser Button
            Button {
                Layout.fillWidth: true
                height: 44
                flat: true
                background: Rectangle {
                    color: "#211f30"
                    radius: 10
                    border.color: "#338b5cf6"
                    border.width: 1
                }
                contentItem: RowLayout {
                    anchors.centerIn: parent
                    spacing: 8
                    Text { text: "📂"; font.pixelSize: 16 }
                    Text {
                        text: "Selecionar Arquivo (.excalidraw, .tldr, .json)..."
                        color: "#c4b5fd"
                        font.pixelSize: 13
                        font.bold: true
                    }
                }
                onClicked: openFileDialog.open()
            }

            // JSON Content Preview or Paste Area
            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 6

                Text {
                    text: "CONTEÚDO JSON / VETORIAL"
                    color: "#a7a9be"
                    font.pixelSize: 11
                    font.bold: true
                }

                TextArea {
                    id: contentArea
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    text: importModalRoot.importedContent
                    placeholderText: "Cole o conteúdo JSON do diagrama aqui..."
                    color: "#fffffe"
                    font.family: "Monospace"
                    font.pixelSize: 11
                    wrapMode: Text.WordWrap
                    background: Rectangle {
                        color: "#0f0e17"
                        radius: 8
                        border.color: contentArea.activeFocus ? "#8b5cf6" : "#2e2f3e"
                        border.width: 1
                    }
                }
            }

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
                    onClicked: importModalRoot.closed()
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
                        text: "Importar Diagrama"
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: {
                        var title = titleField.text.trim() || "Diagrama Importado"
                        var content = contentArea.text.trim() || "[]"
                        importModalRoot.importConfirmed(title, content)
                        importModalRoot.closed()
                    }
                }
            }
        }
    }

    FileDialog {
        id: openFileDialog
        title: "Selecionar Arquivo de Diagrama"
        nameFilters: ["Arquivos de Diagrama (*.excalidraw *.tldr *.json)", "Todos os Arquivos (*.*)"]
        onAccepted: {
            var path = selectedFile.toString()
            if (path.indexOf("file://") === 0) path = path.substring(7)
            var parts = path.split("/")
            var fileName = parts[parts.length - 1]
            titleField.text = fileName.replace(/\\.[^/.]+$/, "")
            // Read file content
            var content = dataController.readLocalTextFile(path)
            if (content && content.length > 0) {
                contentArea.text = content
            }
        }
    }
}
