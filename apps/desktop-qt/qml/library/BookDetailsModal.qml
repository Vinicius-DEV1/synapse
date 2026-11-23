import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: detailsRoot
    anchors.fill: parent
    color: "#88000000"
    visible: isOpen && book !== null
    z: 90

    property bool isOpen: false
    property var book: null
    property int currentPage: 0
    property int totalPages: 0

    signal closed()
    signal progressSaved(string bookId, int currentPage, int totalPages)
    signal bookDeleted(string bookId)
    signal bookOpenRequested(var book)

    onIsOpenChanged: {
        if (isOpen && book) {
            currentPage = book.current_page || 0
            totalPages = book.total_pages || 0
        }
    }

    function formatReadingStatus(status) {
        if (status === "finished" || (totalPages > 0 && currentPage >= totalPages)) return "Concluído"
        if (status === "reading" || currentPage > 0) return "Lendo"
        return "Não Iniciado"
    }

    function formatTimestamp(ts) {
        if (!ts || ts.length === 0) return "—"
        try {
            var d = new Date(ts)
            if (isNaN(d.getTime())) return ts
            return (d.getDate() < 10 ? "0" : "") + d.getDate() + "/" +
                   (d.getMonth() + 1 < 10 ? "0" : "") + (d.getMonth() + 1) + "/" +
                   d.getFullYear()
        } catch (e) {
            return ts
        }
    }

    MouseArea {
        anchors.fill: parent
        onClicked: detailsRoot.closed()
    }

    Dialog {
        id: deleteBookDialog
        title: "Remover livro da biblioteca"
        modal: true
        anchors.centerIn: parent
        width: 420
        standardButtons: Dialog.NoButton
        background: Rectangle { color: "#161524"; border.color: "#22ffffff"; radius: 14 }
        contentItem: Text {
            text: detailsRoot.book
                ? "Remover ‘" + detailsRoot.book.title + "’ do acervo? O arquivo local será mantido."
                : "Remover este livro do acervo?"
            color: "#d4d4dc"
            wrapMode: Text.Wrap
            padding: 20
        }
        footer: RowLayout {
            spacing: 10
            Item { Layout.fillWidth: true }
            Button {
                text: "Cancelar"
                onClicked: deleteBookDialog.reject()
                background: Rectangle { color: "#211f30"; radius: 8; border.color: "#20ffffff" }
                contentItem: Text { text: parent.text; color: "#c4c5d4"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                text: "Remover"
                onClicked: deleteBookDialog.accept()
                background: Rectangle { color: "#9f2941"; radius: 8 }
                contentItem: Text { text: parent.text; color: "white"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
        onAccepted: {
            if (detailsRoot.book) detailsRoot.bookDeleted(detailsRoot.book.id)
            detailsRoot.closed()
        }
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(560, parent.width - 40)
        height: Math.min(640, parent.height - 40)
        radius: 16
        color: "#161524"
        border.color: "#22ffffff"
        border.width: 1
        clip: true

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            spacing: 0

            // Header
            RowLayout {
                Layout.fillWidth: true
                Layout.preferredHeight: 64
                Layout.leftMargin: 24
                Layout.rightMargin: 24
                spacing: 14

                Rectangle {
                    width: 40
                    height: 40
                    radius: 10
                    color: detailsRoot.book ? (detailsRoot.book.cover_color || "#7c3aed") : "#7c3aed"
                    Text { anchors.centerIn: parent; text: "📖"; font.pixelSize: 20 }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text {
                        text: detailsRoot.book ? detailsRoot.book.title : ""
                        color: "#fffffe"
                        font.pixelSize: 16
                        font.bold: true
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }
                    Text {
                        text: detailsRoot.book ? (detailsRoot.book.author || "Autor Desconhecido") : ""
                        color: "#a7a9be"
                        font.pixelSize: 12
                        elide: Text.ElideRight
                    }
                }

                Rectangle {
                    width: 32
                    height: 32
                    radius: 8
                    color: "#18ffffff"
                    Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 13 }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: detailsRoot.closed()
                    }
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: "#14ffffff" }

            // Scrollable Content
            ScrollView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                contentWidth: availableWidth

                ColumnLayout {
                    width: parent.width
                    anchors.margins: 24
                    spacing: 16

                    // Sync & Storage Status Cards
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 12

                        // Cloud Status
                        Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 74
                            radius: 10
                            color: "#12111c"
                            border.color: "#18ffffff"

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 10
                                spacing: 4

                                RowLayout {
                                    spacing: 6
                                    Text { text: "☁️"; font.pixelSize: 12 }
                                    Text { text: "Status na Nuvem"; color: "#94a3b8"; font.pixelSize: 11; font.bold: true }
                                }

                                Text {
                                    text: detailsRoot.book && detailsRoot.book.drive_file_id ? "Sincronizado no Drive" : "Disponível Apenas Localmente"
                                    color: detailsRoot.book && detailsRoot.book.drive_file_id ? "#4ade80" : "#fbbf24"
                                    font.pixelSize: 12
                                    font.bold: true
                                }
                            }
                        }

                        // Local Storage Status
                        Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 74
                            radius: 10
                            color: "#12111c"
                            border.color: "#18ffffff"

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 10
                                spacing: 4

                                RowLayout {
                                    spacing: 6
                                    Text { text: "💾"; font.pixelSize: 12 }
                                    Text { text: "Arquivo Local"; color: "#94a3b8"; font.pixelSize: 11; font.bold: true }
                                }

                                Text {
                                    text: detailsRoot.book && detailsRoot.book.file_path ? "Disponível no Dispositivo" : "Caminho não indexado"
                                    color: detailsRoot.book && detailsRoot.book.file_path ? "#38bdf8" : "#94a3b8"
                                    font.pixelSize: 12
                                    font.bold: true
                                }
                            }
                        }
                    }

                    // Reading Stats Card
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 90
                        radius: 12
                        color: "#12111c"
                        border.color: "#18ffffff"

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 8

                            RowLayout {
                                Layout.fillWidth: true
                                Text { text: "Progresso de Leitura"; color: "#a78bfa"; font.pixelSize: 12; font.bold: true }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: detailsRoot.currentPage + " / " + detailsRoot.totalPages + " págs (" +
                                          (detailsRoot.totalPages > 0 ? Math.round((detailsRoot.currentPage / detailsRoot.totalPages) * 100) : 0) + "%)"
                                    color: "#c4b5fd"
                                    font.pixelSize: 12
                                    font.bold: true
                                }
                            }

                            // Progress Bar
                            Rectangle {
                                Layout.fillWidth: true
                                height: 8
                                radius: 4
                                color: "#1f1d2e"
                                Rectangle {
                                    width: parent.width * (detailsRoot.totalPages > 0 ? Math.min(1.0, detailsRoot.currentPage / detailsRoot.totalPages) : 0.05)
                                    height: parent.height
                                    radius: 4
                                    color: detailsRoot.currentPage >= detailsRoot.totalPages && detailsRoot.totalPages > 0 ? "#10b981" : "#7c3aed"
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "Status: " + detailsRoot.formatReadingStatus(detailsRoot.book ? detailsRoot.book.reading_status : "")
                                    color: "#94a3b8"
                                    font.pixelSize: 11
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: "Última leitura: " + detailsRoot.formatTimestamp(detailsRoot.book ? detailsRoot.book.last_read_at : "")
                                    color: "#94a3b8"
                                    font.pixelSize: 11
                                }
                            }
                        }
                    }

                    // Metadata Details Grid
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 104
                        radius: 12
                        color: "#12111c"
                        border.color: "#18ffffff"

                        GridLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            columns: 2
                            rowSpacing: 8
                            columnSpacing: 16

                            ColumnLayout {
                                spacing: 2
                                Text { text: "EDITORA"; color: "#64748b"; font.pixelSize: 10; font.bold: true }
                                Text { text: detailsRoot.book && detailsRoot.book.publisher ? detailsRoot.book.publisher : "—"; color: "#fffffe"; font.pixelSize: 12; elide: Text.ElideRight }
                            }

                            ColumnLayout {
                                spacing: 2
                                Text { text: "ANO DE PUBLICAÇÃO"; color: "#64748b"; font.pixelSize: 10; font.bold: true }
                                Text { text: detailsRoot.book && detailsRoot.book.published_year ? "" + detailsRoot.book.published_year : "—"; color: "#fffffe"; font.pixelSize: 12 }
                            }

                            ColumnLayout {
                                spacing: 2
                                Text { text: "IDIOMA"; color: "#64748b"; font.pixelSize: 10; font.bold: true }
                                Text { text: detailsRoot.book && detailsRoot.book.language ? detailsRoot.book.language.toUpperCase() : "PORTUGUÊS"; color: "#fffffe"; font.pixelSize: 12 }
                            }

                            ColumnLayout {
                                spacing: 2
                                Text { text: "ADICIONADO EM"; color: "#64748b"; font.pixelSize: 10; font.bold: true }
                                Text { text: detailsRoot.book ? detailsRoot.formatTimestamp(detailsRoot.book.created_at) : "—"; color: "#fffffe"; font.pixelSize: 12 }
                            }
                        }
                    }

                    // Open In Reader Button
                    Rectangle {
                        visible: detailsRoot.book && detailsRoot.book.file_path
                        Layout.fillWidth: true
                        height: 42
                        radius: 8
                        color: "#252139"
                        border.color: "#3d8b5cf6"
                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 8
                            Text { text: "📖"; font.pixelSize: 14 }
                            Text {
                                text: detailsRoot.book && detailsRoot.book.current_page > 0 ? "Continuar Leitura no Leitor Nativo" : "Abrir no Leitor Nativo"
                                color: "#ddd6fe"
                                font.pixelSize: 13
                                font.bold: true
                            }
                        }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                if (detailsRoot.book) detailsRoot.bookOpenRequested(detailsRoot.book)
                            }
                        }
                    }

                    // Progress Stepper
                    BookProgressStepper {
                        currentPage: detailsRoot.currentPage
                        totalPages: detailsRoot.totalPages
                        onPageChanged: function(newPage) {
                            detailsRoot.currentPage = newPage
                        }
                    }
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: "#14ffffff" }

            // Actions Footer
            RowLayout {
                Layout.fillWidth: true
                Layout.preferredHeight: 64
                Layout.leftMargin: 24
                Layout.rightMargin: 24
                spacing: 12

                // Delete Button
                Rectangle {
                    width: 110
                    height: 38
                    radius: 8
                    color: "#18f43f5e"
                    border.color: "#40f43f5e"

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 6
                        Text { text: "🗑️"; font.pixelSize: 12 }
                        Text { text: "Excluir"; color: "#fb7185"; font.pixelSize: 12; font.bold: true }
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: deleteBookDialog.open()
                    }
                }

                Item { Layout.fillWidth: true }

                // Cancel Button
                Rectangle {
                    width: 90
                    height: 38
                    radius: 8
                    color: "#211f30"
                    border.color: "#12ffffff"
                    Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: detailsRoot.closed()
                    }
                }

                // Save Button
                Rectangle {
                    width: 150
                    height: 38
                    radius: 8
                    color: "#7c3aed"

                    Text {
                        anchors.centerIn: parent
                        text: "Salvar Progresso"
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (detailsRoot.book) {
                                detailsRoot.progressSaved(detailsRoot.book.id, detailsRoot.currentPage, detailsRoot.totalPages)
                                detailsRoot.closed()
                            }
                        }
                    }
                }
            }
        }
    }
}
