import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: libraryRoot
    color: "#0f0e17" // bg-dark-bg

    property var books: []
    property string filterText: ""
    property var selectedBook: null
    property bool isEditingProgress: false
    property int editCurrentPage: 0
    property int editTotalPages: 0
    property bool isCreatingBook: false

    function refreshBooks() {
        books = dataController.getLibraryBooks(filterText)
    }

    Component.onCompleted: {
        refreshBooks()
    }

    function openBookProgress(book) {
        selectedBook = book
        editCurrentPage = book.current_page || 0
        editTotalPages = book.total_pages || 0
        isEditingProgress = true
    }

    function saveBookProgress() {
        if (!selectedBook) return
        dataController.updateBookProgress(selectedBook.id, editCurrentPage, editTotalPages)
        isEditingProgress = false
        selectedBook = null
        refreshBooks()
    }

    function deleteCurrentBook() {
        if (!selectedBook) return
        dataController.deleteLibraryBook(selectedBook.id)
        isEditingProgress = false
        selectedBook = null
        refreshBooks()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

        // Header and Search Bar + Action Button
        RowLayout {
            Layout.fillWidth: true
            spacing: 16

            ColumnLayout {
                spacing: 4
                Text {
                    text: "📚 Biblioteca & E-Reader"
                    color: "#fffffe"
                    font.pixelSize: 24
                    font.bold: true
                }
                Text {
                    text: libraryRoot.books.length + " livro(s) e e-pubs com sincronização de páginas lidas"
                    color: "#a7a9be"
                    font.pixelSize: 13
                }
            }

            Item { Layout.fillWidth: true }

            // Search Bar
            Rectangle {
                Layout.preferredWidth: 260
                height: 40
                radius: 10
                color: "#15141b"
                border.color: bookSearchField.activeFocus ? "#8b5cf680" : "#ffffff12"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 12
                    anchors.rightMargin: 12
                    spacing: 8

                    Text { text: "🔍"; color: "#a7a9be"; font.pixelSize: 12 }

                    TextInput {
                        id: bookSearchField
                        Layout.fillWidth: true
                        color: "#fffffe"
                        font.pixelSize: 13
                        selectByMouse: true
                        onTextChanged: {
                            libraryRoot.filterText = text
                            libraryRoot.refreshBooks()
                        }

                        Text {
                            text: "Buscar livro ou autor..."
                            color: "#64748b"
                            font.pixelSize: 13
                            visible: !bookSearchField.text && !bookSearchField.activeFocus
                        }
                    }
                }
            }

            // "+ Adicionar Livro" Button
            Rectangle {
                width: 150
                height: 40
                radius: 10
                color: "#7c3aed" // purple-600

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                    Text { text: "Adicionar Livro"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    hoverEnabled: true
                    onEntered: parent.color = "#6d28d9"
                    onExited: parent.color = "#7c3aed"
                    onClicked: {
                        newBookTitle.text = ""
                        newBookAuthor.text = ""
                        newBookPages.text = "100"
                        selectedColor = "#7c3aed"
                        libraryRoot.isCreatingBook = true
                    }
                }
            }
        }

        // Books GridView
        GridView {
            id: bookGridView
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            cellWidth: 320
            cellHeight: 180
            model: libraryRoot.books

            delegate: Rectangle {
                id: bookCardDelegate
                width: 300
                height: 160
                radius: 12
                color: cardMouse.containsMouse ? "#211f30" : "#1a1924" // bg-dark-card
                border.color: cardMouse.containsMouse ? "#8b5cf666" : "#ffffff0f"
                border.width: 1

                Behavior on color { ColorAnimation { duration: 150 } }
                Behavior on border.color { ColorAnimation { duration: 150 } }

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 14
                    spacing: 14

                    // Book Cover Spine
                    Rectangle {
                        Layout.preferredWidth: 70
                        Layout.fillHeight: true
                        radius: 8
                        color: modelData.cover_color || "#7c3aed"
                        clip: true

                        Image {
                            anchors.fill: parent
                            source: modelData.cover_image || ""
                            fillMode: Image.PreserveAspectCrop
                            visible: status === Image.Ready
                        }

                        ColumnLayout {
                            anchors.centerIn: parent
                            spacing: 4
                            visible: !modelData.cover_image
                            Text {
                                Layout.alignment: Qt.AlignHCenter
                                text: "📖"
                                font.pixelSize: 22
                            }
                        }
                    }

                    // Book Metadata and Reading Progress
                    ColumnLayout {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        spacing: 6

                        Text {
                            Layout.fillWidth: true
                            text: modelData.title
                            color: cardMouse.containsMouse ? "#c4b5fd" : "#fffffe"
                            font.pixelSize: 14
                            font.bold: true
                            elide: Text.ElideRight
                        }

                        Text {
                            Layout.fillWidth: true
                            text: modelData.author || "Autor Desconhecido"
                            color: "#a7a9be"
                            font.pixelSize: 12
                            elide: Text.ElideRight
                        }

                        Item { Layout.fillHeight: true }

                        // Status Tag & Page Numbers
                        RowLayout {
                            Layout.fillWidth: true

                            Text {
                                text: "Pág. " + (modelData.current_page || 0) + (modelData.total_pages ? "/" + modelData.total_pages : "")
                                color: "#a7a9be"
                                font.pixelSize: 11
                            }

                            Item { Layout.fillWidth: true }

                            Rectangle {
                                width: statusText.contentWidth + 10
                                height: 20
                                radius: 4
                                color: modelData.reading_status === "completed" ? "#10b9811a" : "#8b5cf61a"
                                border.color: modelData.reading_status === "completed" ? "#10b98133" : "#8b5cf633"

                                Text {
                                    id: statusText
                                    anchors.centerIn: parent
                                    text: modelData.reading_status === "completed" ? "Lido ✓" : "Lendo"
                                    color: modelData.reading_status === "completed" ? "#34d399" : "#c4b5fd"
                                    font.pixelSize: 10
                                    font.bold: true
                                }
                            }
                        }

                        // Progress Bar
                        Rectangle {
                            Layout.fillWidth: true
                            height: 5
                            radius: 2.5
                            color: "#15141b"

                            Rectangle {
                                width: parent.width * (modelData.total_pages > 0 ? Math.min(1.0, (modelData.current_page || 0) / modelData.total_pages) : 0.05)
                                height: parent.height
                                radius: 2.5
                                color: modelData.reading_status === "completed" ? "#10b981" : "#7c3aed"
                            }
                        }
                    }
                }

                MouseArea {
                    id: cardMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: libraryRoot.openBookProgress(modelData)
                }
            }

            Text {
                anchors.centerIn: parent
                visible: libraryRoot.books.length === 0
                text: "Nenhum livro encontrado na biblioteca."
                color: "#64748b"
                font.pixelSize: 15
            }
        }
    }

    // ===================================================================
    // Book Progress & Reading Details Modal
    // ===================================================================
    Rectangle {
        id: progressModalOverlay
        anchors.fill: parent
        color: "#00000088"
        visible: libraryRoot.isEditingProgress && libraryRoot.selectedBook !== null
        z: 90

        MouseArea {
            anchors.fill: parent
            onClicked: libraryRoot.isEditingProgress = false
        }

        Rectangle {
            anchors.centerIn: parent
            width: 480
            height: 440
            radius: 16
            color: "#161524"
            border.color: "#ffffff14"
            border.width: 1

            MouseArea {
                anchors.fill: parent
                // absorb clicks inside modal
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
                        color: libraryRoot.selectedBook ? (libraryRoot.selectedBook.cover_color || "#7c3aed") : "#7c3aed"
                        Text { anchors.centerIn: parent; text: "📖"; font.pixelSize: 18 }
                    }
                    ColumnLayout {
                        spacing: 2
                        Text {
                            text: libraryRoot.selectedBook ? libraryRoot.selectedBook.title : ""
                            color: "#fffffe"
                            font.pixelSize: 16
                            font.bold: true
                            elide: Text.ElideRight
                            Layout.preferredWidth: 320
                        }
                        Text {
                            text: libraryRoot.selectedBook ? (libraryRoot.selectedBook.author || "Autor Desconhecido") : ""
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
                            onClicked: libraryRoot.isEditingProgress = false
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
                            text: "Progresso de Leitura: " + (libraryRoot.editTotalPages > 0 ? Math.round((libraryRoot.editCurrentPage / libraryRoot.editTotalPages) * 100) : 0) + "%"
                            color: "#a7a9be"
                            font.pixelSize: 12
                        }
                        Item { Layout.fillWidth: true }
                        Text {
                            text: libraryRoot.editCurrentPage + " de " + libraryRoot.editTotalPages + " págs"
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
                            width: parent.width * (libraryRoot.editTotalPages > 0 ? Math.min(1.0, libraryRoot.editCurrentPage / libraryRoot.editTotalPages) : 0.05)
                            height: parent.height
                            radius: 4
                            color: libraryRoot.editCurrentPage >= libraryRoot.editTotalPages ? "#10b981" : "#7c3aed"
                        }
                    }
                }

                // Page Adjustment Steppers
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    Text {
                        text: "Ajustar Página Atual"
                        color: "#fffffe"
                        font.pixelSize: 13
                        font.bold: true
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        // -5 Button
                        Rectangle {
                            width: 50; height: 38; radius: 8; color: "#211f30"; border.color: "#ffffff12"
                            Text { anchors.centerIn: parent; text: "-5"; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: libraryRoot.editCurrentPage = Math.max(0, libraryRoot.editCurrentPage - 5)
                            }
                        }

                        // -1 Button
                        Rectangle {
                            width: 50; height: 38; radius: 8; color: "#211f30"; border.color: "#ffffff12"
                            Text { anchors.centerIn: parent; text: "-1"; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: libraryRoot.editCurrentPage = Math.max(0, libraryRoot.editCurrentPage - 1)
                            }
                        }

                        // Direct Numeric Input
                        Rectangle {
                            Layout.fillWidth: true
                            height: 38
                            radius: 8
                            color: "#15141b"
                            border.color: pageInput.activeFocus ? "#7c3aed" : "#ffffff15"
                            TextInput {
                                id: pageInput
                                anchors.centerIn: parent
                                text: libraryRoot.editCurrentPage.toString()
                                color: "#fffffe"
                                font.pixelSize: 14
                                font.bold: true
                                selectByMouse: true
                                onTextChanged: {
                                    var val = parseInt(text)
                                    if (!isNaN(val)) {
                                        libraryRoot.editCurrentPage = Math.max(0, val)
                                    }
                                }
                            }
                        }

                        // +1 Button
                        Rectangle {
                            width: 50; height: 38; radius: 8; color: "#211f30"; border.color: "#ffffff12"
                            Text { anchors.centerIn: parent; text: "+1"; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: libraryRoot.editCurrentPage = Math.min(libraryRoot.editTotalPages, libraryRoot.editCurrentPage + 1)
                            }
                        }

                        // +5 Button
                        Rectangle {
                            width: 50; height: 38; radius: 8; color: "#211f30"; border.color: "#ffffff12"
                            Text { anchors.centerIn: parent; text: "+5"; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: libraryRoot.editCurrentPage = Math.min(libraryRoot.editTotalPages, libraryRoot.editCurrentPage + 5)
                            }
                        }

                        // +10 Button
                        Rectangle {
                            width: 50; height: 38; radius: 8; color: "#211f30"; border.color: "#ffffff12"
                            Text { anchors.centerIn: parent; text: "+10"; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: libraryRoot.editCurrentPage = Math.min(libraryRoot.editTotalPages, libraryRoot.editCurrentPage + 10)
                            }
                        }
                    }
                }

                // Quick Toggle: Concluído
                Rectangle {
                    Layout.fillWidth: true
                    height: 38
                    radius: 8
                    color: libraryRoot.editCurrentPage >= libraryRoot.editTotalPages ? "#10b98126" : "#211f30"
                    border.color: libraryRoot.editCurrentPage >= libraryRoot.editTotalPages ? "#10b981" : "#ffffff12"

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 8
                        Text { text: libraryRoot.editCurrentPage >= libraryRoot.editTotalPages ? "✓" : "○"; color: libraryRoot.editCurrentPage >= libraryRoot.editTotalPages ? "#10b981" : "#a7a9be"; font.pixelSize: 14 }
                        Text {
                            text: libraryRoot.editCurrentPage >= libraryRoot.editTotalPages ? "Leitura Concluída" : "Marcar como Totalmente Lido"
                            color: libraryRoot.editCurrentPage >= libraryRoot.editTotalPages ? "#34d399" : "#fffffe"
                            font.pixelSize: 12
                            font.bold: true
                        }
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (libraryRoot.editCurrentPage >= libraryRoot.editTotalPages) {
                                libraryRoot.editCurrentPage = 0
                            } else {
                                libraryRoot.editCurrentPage = libraryRoot.editTotalPages
                            }
                        }
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
                        color: "#f43f5e18"
                        border.color: "#f43f5e40"

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            Text { text: "🗑️"; font.pixelSize: 12 }
                            Text { text: "Excluir"; color: "#fb7185"; font.pixelSize: 12; font.bold: true }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: libraryRoot.deleteCurrentBook()
                        }
                    }

                    Item { Layout.fillWidth: true }

                    // Cancel Button
                    Rectangle {
                        width: 90
                        height: 40
                        radius: 8
                        color: "#211f30"
                        border.color: "#ffffff12"
                        Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: libraryRoot.isEditingProgress = false
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
                            onClicked: libraryRoot.saveBookProgress()
                        }
                    }
                }
            }
        }
    }

    // ===================================================================
    // Create Book Modal
    // ===================================================================
    property string selectedColor: "#7c3aed"

    Rectangle {
        id: createBookModalOverlay
        anchors.fill: parent
        color: "#00000088"
        visible: libraryRoot.isCreatingBook
        z: 95

        MouseArea {
            anchors.fill: parent
            onClicked: libraryRoot.isCreatingBook = false
        }

        Rectangle {
            anchors.centerIn: parent
            width: 440
            height: 420
            radius: 16
            color: "#161524"
            border.color: "#ffffff14"
            border.width: 1

            MouseArea {
                anchors.fill: parent
            }

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 28
                spacing: 16

                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "📖 Adicionar Novo Livro"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                    Item { Layout.fillWidth: true }
                    Text {
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 16
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: libraryRoot.isCreatingBook = false
                        }
                    }
                }

                // Title Input
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Text { text: "Título do Livro"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true
                        height: 38
                        radius: 8
                        color: "#15141b"
                        border.color: newBookTitle.activeFocus ? "#7c3aed" : "#ffffff15"
                        TextInput {
                            id: newBookTitle
                            anchors.fill: parent
                            anchors.leftMargin: 12; anchors.rightMargin: 12
                            verticalAlignment: TextInput.AlignVCenter
                            color: "#fffffe"
                            font.pixelSize: 13
                            selectByMouse: true
                        }
                    }
                }

                // Author Input
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Text { text: "Autor"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true
                        height: 38
                        radius: 8
                        color: "#15141b"
                        border.color: newBookAuthor.activeFocus ? "#7c3aed" : "#ffffff15"
                        TextInput {
                            id: newBookAuthor
                            anchors.fill: parent
                            anchors.leftMargin: 12; anchors.rightMargin: 12
                            verticalAlignment: TextInput.AlignVCenter
                            color: "#fffffe"
                            font.pixelSize: 13
                            selectByMouse: true
                        }
                    }
                }

                // Total Pages Input
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Text { text: "Total de Páginas"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true
                        height: 38
                        radius: 8
                        color: "#15141b"
                        border.color: newBookPages.activeFocus ? "#7c3aed" : "#ffffff15"
                        TextInput {
                            id: newBookPages
                            anchors.fill: parent
                            anchors.leftMargin: 12; anchors.rightMargin: 12
                            verticalAlignment: TextInput.AlignVCenter
                            color: "#fffffe"
                            font.pixelSize: 13
                            selectByMouse: true
                            text: "100"
                        }
                    }
                }

                // Color Selector
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Text { text: "Cor da Capa"; color: "#a7a9be"; font.pixelSize: 12 }
                    RowLayout {
                        spacing: 10
                        Repeater {
                            model: ["#7c3aed", "#6366f1", "#38bdf8", "#10b981", "#f59e0b", "#f43f5e"]
                            delegate: Rectangle {
                                width: 28; height: 28; radius: 14
                                color: modelData
                                border.color: libraryRoot.selectedColor === modelData ? "#ffffff" : "transparent"
                                border.width: 2
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: libraryRoot.selectedColor = modelData
                                }
                            }
                        }
                    }
                }

                Item { Layout.fillHeight: true }

                // Actions Footer
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Item { Layout.fillWidth: true }
                    Rectangle {
                        width: 90; height: 38; radius: 8; color: "#211f30"
                        Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: libraryRoot.isCreatingBook = false
                        }
                    }
                    Rectangle {
                        width: 120; height: 38; radius: 8; color: "#7c3aed"
                        Text { anchors.centerIn: parent; text: "Criar Livro"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                if (newBookTitle.text.trim().length === 0) return
                                var p = parseInt(newBookPages.text) || 100
                                dataController.createLibraryBook(newBookTitle.text, newBookAuthor.text, p, libraryRoot.selectedColor)
                                libraryRoot.isCreatingBook = false
                                libraryRoot.refreshBooks()
                            }
                        }
                    }
                }
            }
        }
    }
}
