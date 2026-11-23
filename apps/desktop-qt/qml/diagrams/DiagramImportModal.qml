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
    property string errorMessage: ""

    signal closed()
    signal importConfirmed(string title, string content)

    function normalizeDiagramContent(rawText) {
        try {
            var data = JSON.parse(rawText)
            if (Array.isArray(data)) return JSON.stringify(data)
            // Excalidraw format: { elements: [ ... ] }
            if (data.elements && Array.isArray(data.elements)) {
                var converted = []
                for (var i = 0; i < data.elements.length; i++) {
                    var el = data.elements[i]
                    if (el.isDeleted) continue
                    var stroke = el.strokeColor || "#8b5cf6"
                    var lw = el.strokeWidth || 2
                    if (el.type === "rectangle") {
                        converted.push({ type: "rect", x: el.x || 0, y: el.y || 0, w: el.width || 100, h: el.height || 100, color: stroke, lineWidth: lw })
                    } else if (el.type === "ellipse") {
                        converted.push({ type: "circle", x: el.x || 0, y: el.y || 0, w: el.width || 100, h: el.height || 100, color: stroke, lineWidth: lw })
                    } else if (el.type === "freedraw" && el.points && el.points.length > 0) {
                        var pts = []
                        for (var p = 0; p < el.points.length; p++) {
                            pts.push({ x: (el.x || 0) + el.points[p][0], y: (el.y || 0) + el.points[p][1] })
                        }
                        converted.push({ type: "path", points: pts, color: stroke, lineWidth: lw })
                    }
                }
                return JSON.stringify(converted)
            }
            // Tldraw format
            if (data.records && Array.isArray(data.records)) {
                var tldrawConverted = []
                for (var r = 0; r < data.records.length; r++) {
                    var rec = data.records[r]
                    if (rec.typeName === "shape") {
                        var props = rec.props || {}
                        if (rec.type === "geo") {
                            tldrawConverted.push({ type: props.geo === "ellipse" ? "circle" : "rect", x: rec.x || 0, y: rec.y || 0, w: props.w || 100, h: props.h || 100, color: props.color || "#8b5cf6", lineWidth: 2 })
                        }
                    }
                }
                if (tldrawConverted.length > 0) return JSON.stringify(tldrawConverted)
            }
        } catch (e) {
            console.warn("[DiagramImport] Falha ao analisar JSON:", e)
        }
        return rawText
    }

    MouseArea {
        anchors.fill: parent
        onClicked: importModalRoot.closed()
    }

    Rectangle {
        width: Math.min(520, parent.width - 40)
        height: Math.min(500, parent.height - 40)
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
                text: "Importe diagramas vetoriais a partir de arquivos JSON estruturados ou formatos Excalidraw / Tldraw."
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
                        text: "Selecionar Arquivo (.json, .excalidraw, .tldr)..."
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
                    text: "CONTEÚDO ESTRUTURADO"
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

                Text {
                    visible: importModalRoot.errorMessage.length > 0
                    text: importModalRoot.errorMessage
                    color: "#fb7185"
                    font.pixelSize: 11
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
                        var raw = contentArea.text.trim()
                        if (raw.length === 0) raw = "[]"
                        var normalized = importModalRoot.normalizeDiagramContent(raw)
                        try {
                            JSON.parse(normalized)
                            importModalRoot.errorMessage = ""
                            importModalRoot.importConfirmed(title, normalized)
                            importModalRoot.closed()
                        } catch (err) {
                            importModalRoot.errorMessage = "Formato de arquivo ou JSON inválido. Verifique o conteúdo."
                        }
                    }
                }
            }
        }
    }

    FileDialog {
        id: openFileDialog
        title: "Selecionar Arquivo de Diagrama"
        nameFilters: ["Arquivos de Diagrama (*.json *.excalidraw *.tldr)", "Todos os Arquivos (*.*)"]
        onAccepted: {
            var path = selectedFile.toString()
            if (path.indexOf("file://") === 0) path = path.substring(7)
            var parts = path.split("/")
            var fileName = parts[parts.length - 1]
            titleField.text = fileName.replace(/\.[^/.]+$/, "")
            var content = dataController.readLocalTextFile(path)
            if (content && content.length > 0) {
                contentArea.text = content
                importModalRoot.errorMessage = ""
            }
        }
    }
}
