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
            pageInput.text = currentPage.toString()
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
        width: 480
        height: 440
        radius: 16
        color: "#161524"
        border.color: "#14ffffff"
        border.width: 1

        MouseArea {
            anchors.fill: parent
        }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 28
            spacing: 20

            // Modal Header
            RowLayout {
                Layout.fillWidth: true
                Rectangle {
                    width: 36; height: 36; radius: 8
                    color: detailsRoot.book ? (detailsRoot.book.cover_color || "#7c3aed") : "#7c3aed"
                    Text { anchors.centerIn: parent; text: "📖"; font.pixelSize: 18 }
                }
                ColumnLayout {
                    spacing: 2
                    Text {
                        text: detailsRoot.book ? detailsRoot.book.title : ""
                        color: "#fffffe"
                        font.pixelSize: 16
                        font.bold: true
                        elide: Text.ElideRight
                        Layout.preferredWidth: 320
                    }
                    Text {
                        text: detailsRoot.book ? (detailsRoot.book.author || "Autor Desconhecido") : ""
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                }
                Item { Layout.fillWidth: true }
                Text {
                    text: "✕"
                    color: "#a7a9be"
                    font.pixelSize: 16
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: detailsRoot.closed()
                    }
                }
            }

            // Progress Preview Bar
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8

                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: "Progresso de Leitura: " + (detailsRoot.totalPages > 0 ? Math.round((detailsRoot.currentPage / detailsRoot.totalPages) * 100) : 0) + "%"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                    Item { Layout.fillWidth: true }
                    Text {
                        text: detailsRoot.currentPage + " de " + detailsRoot.totalPages + " págs"
                        color: "#c4b5fd"
                        font.pixelSize: 12
                        font.bold: true
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    height: 8
                    radius: 4
                    color: "#15141b"
                    Rectangle {
                        width: parent.width * (detailsRoot.totalPages > 0 ? Math.min(1.0, detailsRoot.currentPage / detailsRoot.totalPages) : 0.05)
                        height: parent.height
                        radius: 4
                        color: detailsRoot.currentPage >= detailsRoot.totalPages ? "#10b981" : "#7c3aed"
                    }
                }
            }

            // Page Adjustment Steppers
            Rectangle {
                visible: detailsRoot.book && detailsRoot.book.file_path
                Layout.fillWidth: true
                height: 38
                radius: 8
                color: "#252139"
                border.color: "#3d8b5cf6"
                RowLayout {
                    anchors.centerIn: parent
                    spacing: 7
                    Text { text: "▸"; color: "#c4b5fd"; font.pixelSize: 14; font.bold: true }
                    Text {
                        text: detailsRoot.book && detailsRoot.book.current_page > 0 ? "Continuar leitura" : "Abrir no leitor nativo"
                        color: "#ddd6fe"
                        font.pixelSize: 12
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

            BookProgressStepper {
                currentPage: detailsRoot.currentPage
                totalPages: detailsRoot.totalPages
                onPageChanged: function(newPage) {
                    detailsRoot.currentPage = newPage
                }
            }

            Item { Layout.fillHeight: true }

            // Actions Footer: Delete and Save
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                // Delete Button
                Rectangle {
                    width: 110
                    height: 40
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
                        onClicked: {
                            deleteBookDialog.open()
                        }
                    }
                }

                Item { Layout.fillWidth: true }

                // Cancel Button
                Rectangle {
                    width: 90
                    height: 40
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
                    width: 140
                    height: 40
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
