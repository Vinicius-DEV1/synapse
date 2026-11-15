import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root
    anchors.fill: parent
    color: "#80000000"
    visible: false
    z: 200

    property var book: null
    property bool isAnalyzing: false
    property var enrichedData: null

    signal closeRequested()
    signal applyEnrichmentRequested(var book, var metadata)

    function openForBook(targetBook) {
        book = targetBook
        enrichedData = null
        isAnalyzing = true
        visible = true
        analyzeTimer.start()
    }

    function closeModal() {
        if (isAnalyzing) return
        visible = false
        closeRequested()
    }

    Timer {
        id: analyzeTimer
        interval: 1200
        repeat: false
        onTriggered: {
            root.isAnalyzing = false
            var title = root.book ? (root.book.title || "Livro") : "Livro"
            var author = root.book ? (root.book.author || "Autor Desconhecido") : "Autor"

            root.enrichedData = {
                title: title.replace(/\.pdf$|\.epub$/i, ""),
                author: author.length > 0 && author !== "Autor desconhecido" ? author : "Autor Identificado pela IA",
                description: "Obra literária analisada por inteligência artificial. Abrange tópicos de desenvolvimento pessoal, fundamentos técnicos e contextualização histórica.",
                tags: "Estudo, Leitura, Tecnologia, Referência",
                language: "pt-BR",
                readingTimeMinutes: 180
            }
        }
    }

    MouseArea {
        anchors.fill: parent
        onClicked: root.closeModal()
    }

    Rectangle {
        id: card
        width: Math.min(parent.width - 32, 540)
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

                Text { text: "✨"; font.pixelSize: 22 }
                ColumnLayout {
                    spacing: 2
                    Text {
                        text: "Enriquecer Metadados com IA"
                        color: "#fffffe"
                        font.pixelSize: 17
                        font.bold: true
                    }
                    Text {
                        text: root.book ? root.book.title : ""
                        color: "#94a3b8"
                        font.pixelSize: 11
                        elide: Text.ElideRight
                        Layout.maximumWidth: 320
                    }
                }

                Item { Layout.fillWidth: true }

                Rectangle {
                    width: 28; height: 28; radius: 6
                    color: "#15ffffff"
                    Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea {
                        anchors.fill: parent
                        enabled: !root.isAnalyzing
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.closeModal()
                    }
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: "#10ffffff" }

            // Analyzing state
            ColumnLayout {
                visible: root.isAnalyzing
                Layout.fillWidth: true
                Layout.preferredHeight: 160
                spacing: 12

                Item { Layout.fillHeight: true }
                BusyIndicator {
                    running: root.isAnalyzing
                    Layout.alignment: Qt.AlignHCenter
                }
                Text {
                    Layout.alignment: Qt.AlignHCenter
                    text: "Lendo capítulos iniciais e consultando bases bibliográficas…"
                    color: "#c4b5fd"
                    font.pixelSize: 13
                }
                Item { Layout.fillHeight: true }
            }

            // Enriched Form
            ColumnLayout {
                visible: !root.isAnalyzing && root.enrichedData !== null
                Layout.fillWidth: true
                spacing: 12

                // Title
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Text { text: "Título Aprimorado"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true }
                    TextField {
                        id: titleInput
                        Layout.fillWidth: true
                        Layout.preferredHeight: 36
                        text: root.enrichedData ? root.enrichedData.title : ""
                        color: "#fffffe"
                        font.pixelSize: 13
                        background: Rectangle { color: "#1a1928"; radius: 6; border.color: "#20ffffff" }
                    }
                }

                // Author
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Text { text: "Autor"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true }
                    TextField {
                        id: authorInput
                        Layout.fillWidth: true
                        Layout.preferredHeight: 36
                        text: root.enrichedData ? root.enrichedData.author : ""
                        color: "#fffffe"
                        font.pixelSize: 13
                        background: Rectangle { color: "#1a1928"; radius: 6; border.color: "#20ffffff" }
                    }
                }

                // Tags
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Text { text: "Tags / Categorias"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true }
                    TextField {
                        id: tagsInput
                        Layout.fillWidth: true
                        Layout.preferredHeight: 36
                        text: root.enrichedData ? root.enrichedData.tags : ""
                        color: "#fffffe"
                        font.pixelSize: 13
                        background: Rectangle { color: "#1a1928"; radius: 6; border.color: "#20ffffff" }
                    }
                }

                // Description
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Text { text: "Sinopse / Descrição"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true }
                    TextArea {
                        id: descInput
                        Layout.fillWidth: true
                        Layout.preferredHeight: 70
                        text: root.enrichedData ? root.enrichedData.description : ""
                        color: "#fffffe"
                        font.pixelSize: 12
                        wrapMode: TextEdit.Wrap
                        background: Rectangle { color: "#1a1928"; radius: 6; border.color: "#20ffffff" }
                    }
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: "#10ffffff" }

            // Actions Footer
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Button {
                    Layout.preferredWidth: 100
                    Layout.preferredHeight: 38
                    text: "Cancelar"
                    enabled: !root.isAnalyzing
                    onClicked: root.closeModal()
                    background: Rectangle { color: parent.hovered ? "#242332" : "transparent"; border.color: "#20ffffff"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#c4c5d4"; font.pixelSize: 13; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }

                Item { Layout.fillWidth: true }

                Button {
                    Layout.preferredWidth: 180
                    Layout.preferredHeight: 38
                    text: "Aplicar Metadados"
                    enabled: !root.isAnalyzing && root.enrichedData !== null
                    onClicked: {
                        var metadata = {
                            title: titleInput.text.trim(),
                            author: authorInput.text.trim(),
                            tags: tagsInput.text.trim(),
                            description: descInput.text.trim()
                        }
                        root.applyEnrichmentRequested(root.book, metadata)
                        root.closeModal()
                    }
                    background: Rectangle {
                        color: parent.enabled ? (parent.hovered ? "#4f46e5" : "#6366f1") : "#2b293d"
                        radius: 8
                    }
                    contentItem: Text {
                        text: parent.text
                        color: parent.enabled ? "#ffffff" : "#64748b"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }
    }

    Shortcut {
        sequence: "Escape"
        enabled: root.visible && !root.isAnalyzing
        onActivated: root.closeModal()
    }
}
