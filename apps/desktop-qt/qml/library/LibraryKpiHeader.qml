import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: kpiRoot
    spacing: 24

    property var books: []
    property string filterText: ""
    property bool importRunning: false

    signal searchTextChanged(string text)
    signal requestAddBook()
    signal requestImportBook()
    signal requestReadingStats()

    function computeTotalPagesRead() {
        var total = 0
        for (var i = 0; i < books.length; i++) {
            total += (books[i].current_page || 0)
        }
        return total
    }

    function computeFinishedBooks() {
        var count = 0
        for (var i = 0; i < books.length; i++) {
            var b = books[i]
            if (b.total_pages > 0 && b.current_page >= b.total_pages) {
                count++
            }
        }
        return count
    }

    function computeGlobalReadingPercentage() {
        var read = 0
        var total = 0
        for (var i = 0; i < books.length; i++) {
            read += (books[i].current_page || 0)
            total += (books[i].total_pages || 0)
        }
        if (total === 0) return 0
        return Math.round((read / total) * 100)
    }

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
                text: kpiRoot.books.length + " livro(s) e e-pubs com sincronização de páginas lidas"
                color: "#a7a9be"
                font.pixelSize: 13
            }
        }

        Item { Layout.fillWidth: true }

        Button {
            Layout.preferredWidth: 40
            Layout.preferredHeight: 40
            Accessible.name: "Estatísticas de leitura"
            ToolTip.visible: hovered
            ToolTip.text: "Estatísticas de leitura"
            onClicked: kpiRoot.requestReadingStats()
            background: Rectangle {
                radius: 10
                color: parent.hovered ? "#252432" : "#15141b"
                border.color: "#18ffffff"
            }
            contentItem: Text {
                text: "▥"
                color: "#a7a9be"
                font.pixelSize: 20
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }

        // Search Bar
        Rectangle {
            Layout.preferredWidth: 260
            height: 40
            radius: 10
            color: "#15141b"
            border.color: bookSearchField.activeFocus ? "#808b5cf6" : "#12ffffff"
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
                    text: kpiRoot.filterText
                    onTextChanged: kpiRoot.searchTextChanged(text)

                    Text {
                        text: "Buscar livro ou autor..."
                        color: "#64748b"
                        font.pixelSize: 13
                        visible: !bookSearchField.text && !bookSearchField.activeFocus
                    }
                }
            }
        }

        Rectangle {
            width: 160
            height: 40
            radius: 10
            color: kpiRoot.importRunning ? "#343344" : "#272536"
            opacity: kpiRoot.importRunning ? 0.7 : 1.0

            RowLayout {
                anchors.centerIn: parent
                spacing: 6
                Text { text: kpiRoot.importRunning ? "◌" : "⇧"; color: "#ffffff"; font.pixelSize: 15; font.bold: true }
                Text {
                    text: kpiRoot.importRunning ? "Importando…" : "Importar PDF/EPUB"
                    color: "#ffffff"
                    font.pixelSize: 12
                    font.bold: true
                }
            }

            MouseArea {
                anchors.fill: parent
                enabled: !kpiRoot.importRunning
                cursorShape: enabled ? Qt.PointingHandCursor : Qt.ArrowCursor
                onClicked: kpiRoot.requestImportBook()
            }
        }

        // "+ Adicionar Livro" Button
        Rectangle {
            width: 150
            height: 40
            radius: 10
            color: "#7c3aed"

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
                onClicked: kpiRoot.requestAddBook()
            }
        }
    }

    // Reading Summary Metric Cards Grid
    GridLayout {
        Layout.fillWidth: true
        columns: 4
        columnSpacing: 14
        rowSpacing: 14

        // Total Books
        Rectangle {
            Layout.fillWidth: true
            height: 80
            radius: 12
            color: "#161524"
            border.color: "#0fffffff"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 14
                spacing: 4
                Text { text: "ACERVO TOTAL"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }
                Text { text: kpiRoot.books.length.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
                Text { text: "livros catalogados"; color: "#64748b"; font.pixelSize: 11 }
            }
        }

        // Pages Read
        Rectangle {
            Layout.fillWidth: true
            height: 80
            radius: 12
            color: "#161524"
            border.color: "#0fffffff"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 14
                spacing: 4
                Text { text: "PÁGINAS LIDAS"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }
                Text { text: kpiRoot.computeTotalPagesRead().toString(); color: "#38bdf8"; font.pixelSize: 20; font.bold: true }
                Text { text: "páginas acumuladas"; color: "#64748b"; font.pixelSize: 11 }
            }
        }

        // Books Finished
        Rectangle {
            Layout.fillWidth: true
            height: 80
            radius: 12
            color: "#161524"
            border.color: "#0fffffff"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 14
                spacing: 4
                Text { text: "LIVROS CONCLUÍDOS"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }
                Text { text: kpiRoot.computeFinishedBooks().toString(); color: "#34d399"; font.pixelSize: 20; font.bold: true }
                Text { text: "leituras finalizadas"; color: "#64748b"; font.pixelSize: 11 }
            }
        }

        // Global Completion
        Rectangle {
            Layout.fillWidth: true
            height: 80
            radius: 12
            color: "#161524"
            border.color: "#0fffffff"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 14
                spacing: 4
                Text { text: "PROGRESSO GLOBAL"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }
                Text { text: kpiRoot.computeGlobalReadingPercentage() + "%"; color: "#c4b5fd"; font.pixelSize: 20; font.bold: true }
                Text { text: "de todo o acervo lido"; color: "#64748b"; font.pixelSize: 11 }
            }
        }
    }
}
