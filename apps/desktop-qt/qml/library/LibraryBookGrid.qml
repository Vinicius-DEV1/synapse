import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

ColumnLayout {
    id: gridRoot
    spacing: 16

    property var books: []
    property var collections: []
    property var selectedBookIds: []
    property string activeStatusFilter: "all"
    property string activeFormatFilter: "all"
    property var authors: []
    property string selectedAuthor: ""
    property string sortBy: "last_read"
    property string sortOrder: "desc"
    property bool hasActiveFilters: false
    property string filterText: ""
    property string selectedCollectionName: ""
    property int totalBooksCount: 0
    property int viewportWidth: width > 0 ? width : 1366
    readonly property int columnCount: viewportWidth >= 1280 ? 6
                                   : viewportWidth >= 1024 ? 5
                                   : viewportWidth >= 768 ? 4
                                   : viewportWidth >= 640 ? 3 : 2
    readonly property int gridGap: viewportWidth >= 640 ? 24 : 12

    signal statusFilterChanged(string filter)
    signal formatFilterChanged(string format)
    signal authorChanged(string author)
    signal sortChanged(string key, string order)
    signal clearSearchRequested()
    signal clearStatusRequested()
    signal clearFormatRequested()
    signal clearAuthorRequested()
    signal clearCollectionRequested()
    signal clearAllFiltersRequested()
    signal bookSelected(var book)
    signal selectionToggleRequested(string bookId)
    signal bookEditRequested(var book)
    signal bookAiEnrichRequested(var book)
    signal bookCollectionToggleRequested(var book, string collectionId, bool checked)
    signal bookStatusChangeRequested(var book, string status)
    signal bookDownloadOfflineRequested(var book)
    signal bookEvictCacheRequested(var book)
    signal bookArchiveToggleRequested(var book, bool archived)

    function progressFor(book) {
        if (!book || !book.total_pages || book.total_pages <= 0) return 0
        var page = Number(book.current_page || 0)
        var lastRead = book.last_read_page
        if (typeof lastRead === "number") {
            page = lastRead
        } else if (typeof lastRead === "string" && lastRead.indexOf("epubcfi") < 0) {
            var parsed = parseInt(lastRead, 10)
            if (!isNaN(parsed) && parsed > 0) page = parsed
        }
        if (!isFinite(page) || page <= 0) return 0
        return Math.max(0, Math.min(100, Math.round(page / book.total_pages * 100)))
    }

    LibraryStatusFilterBar {
        activeStatusFilter: gridRoot.activeStatusFilter
        activeFormatFilter: gridRoot.activeFormatFilter
        authors: gridRoot.authors
        selectedAuthor: gridRoot.selectedAuthor
        sortBy: gridRoot.sortBy
        sortOrder: gridRoot.sortOrder
        onFilterSelected: function(filter) { gridRoot.statusFilterChanged(filter) }
        onFormatSelected: function(format) { gridRoot.formatFilterChanged(format) }
        onAuthorSelected: function(author) { gridRoot.authorChanged(author) }
        onSortChanged: function(key, order) { gridRoot.sortChanged(key, order) }
    }

    LibraryActiveFiltersBar {
        hasActiveFilters: gridRoot.hasActiveFilters
        filterText: gridRoot.filterText
        statusFilter: gridRoot.activeStatusFilter
        formatFilter: gridRoot.activeFormatFilter
        selectedAuthor: gridRoot.selectedAuthor
        selectedCollectionName: gridRoot.selectedCollectionName
        filteredCount: gridRoot.books.length
        totalCount: gridRoot.totalBooksCount
        onClearSearchRequested: gridRoot.clearSearchRequested()
        onClearStatusRequested: gridRoot.clearStatusRequested()
        onClearFormatRequested: gridRoot.clearFormatRequested()
        onClearAuthorRequested: gridRoot.clearAuthorRequested()
        onClearCollectionRequested: gridRoot.clearCollectionRequested()
        onClearAllRequested: gridRoot.clearAllFiltersRequested()
    }

    GridView {
        id: bookGridView
        Layout.fillWidth: true
        Layout.fillHeight: true
        clip: true
        cellWidth: width / gridRoot.columnCount
        cellHeight: Math.round(Math.max(1, cellWidth - gridRoot.gridGap) * 1.333333) + 145
        model: gridRoot.books

        delegate: Rectangle {
            id: bookCard
            required property var modelData
            readonly property int cardWidth: Math.max(1, bookGridView.cellWidth - gridRoot.gridGap)
            readonly property int coverHeight: Math.round(cardWidth * 1.333333)
            readonly property int progress: gridRoot.progressFor(modelData)
            readonly property bool isEpub: String(modelData.original_name || modelData.file_path || "").toLowerCase().endsWith(".epub")
            readonly property bool isLocal: modelData.is_local !== undefined
                                            ? Boolean(modelData.is_local)
                                            : Boolean(modelData.file_path && !String(modelData.file_path).startsWith("drive://"))
            readonly property bool isSynced: Boolean(modelData.drive_file_id)
            readonly property bool isFinished: modelData.reading_status === "finished" || modelData.reading_status === "completed"
            readonly property bool isSelected: gridRoot.selectedBookIds.indexOf(modelData.id) >= 0
            width: cardWidth
            height: bookGridView.cellHeight - 16
            radius: 12
            color: cardMouse.containsMouse ? "#211f30" : "#191821"
            border.color: bookCard.isSelected ? "#a78bfa" : cardMouse.containsMouse ? "#668b5cf6" : "#0dffffff"
            border.width: bookCard.isSelected ? 2 : 1
            clip: true

            Behavior on color { ColorAnimation { duration: 150 } }
            Behavior on border.color { ColorAnimation { duration: 150 } }

            ColumnLayout {
                anchors.fill: parent
                spacing: 0

                Item {
                    Layout.fillWidth: true
                    Layout.preferredHeight: bookCard.coverHeight
                    clip: true

                    Rectangle {
                        anchors.fill: parent
                        gradient: Gradient {
                            GradientStop { position: 0; color: "#30224a" }
                            GradientStop { position: 1; color: "#101018" }
                        }
                        AppIcon { anchors.centerIn: parent; width: 40; height: 40; name: "library"; color: "#a78bfa"; opacity: 0.7 }
                    }

                    LibraryBookActionsMenu {
                        anchors.top: parent.top
                        anchors.right: parent.right
                        anchors.margins: 8
                        z: 3
                        book: modelData
                        collections: gridRoot.collections
                        cardHovered: cardMouse.containsMouse
                        onOpenRequested: function(selectedBook) { gridRoot.bookSelected(selectedBook) }
                        onEditRequested: function(selectedBook) { gridRoot.bookEditRequested(selectedBook) }
                        onAiEnrichRequested: function(selectedBook) { gridRoot.bookAiEnrichRequested(selectedBook) }
                        onCollectionToggleRequested: function(selectedBook, collectionId, checked) {
                            gridRoot.bookCollectionToggleRequested(selectedBook, collectionId, checked)
                        }
                        onStatusChangeRequested: function(selectedBook, status) {
                            gridRoot.bookStatusChangeRequested(selectedBook, status)
                        }
                        onArchiveToggleRequested: function(selectedBook, archived) {
                            gridRoot.bookArchiveToggleRequested(selectedBook, archived)
                        }
                        onDownloadOfflineRequested: function(selectedBook) {
                            gridRoot.bookDownloadOfflineRequested(selectedBook)
                        }
                        onEvictCacheRequested: function(selectedBook) {
                            gridRoot.bookEvictCacheRequested(selectedBook)
                        }
                    }
                    Image {
                        anchors.fill: parent
                        source: modelData.cover_image || ""
                        fillMode: Image.PreserveAspectCrop
                        asynchronous: true
                        cache: true
                        visible: status === Image.Ready
                    }
                    Rectangle {
                        anchors.fill: parent
                        gradient: Gradient {
                            GradientStop { position: 0; color: "#00000000" }
                            GradientStop { position: 1; color: "#66000000" }
                        }
                        opacity: cardMouse.containsMouse ? 0.8 : 0.45
                        Behavior on opacity { NumberAnimation { duration: 180 } }
                    }
                    Rectangle {
                        anchors.left: parent.left
                        anchors.top: parent.top
                        anchors.bottom: parent.bottom
                        width: 12
                        gradient: Gradient {
                            GradientStop { position: 0; color: "#55000000" }
                            GradientStop { position: 1; color: "#00000000" }
                        }
                    }

                    LibraryBookSelectionToggle {
                        anchors.top: parent.top
                        anchors.left: parent.left
                        anchors.margins: 8
                        bookId: bookCard.modelData.id
                        selected: bookCard.isSelected
                        onToggled: function(bookId) { gridRoot.selectionToggleRequested(bookId) }
                    }

                    RowLayout {
                        anchors.top: parent.top
                        anchors.right: parent.right
                        anchors.margins: 8
                        spacing: 5
                        opacity: cardMouse.containsMouse ? 0 : 1
                        Behavior on opacity { NumberAnimation { duration: 160 } }
                        Rectangle {
                            radius: 5
                            color: bookCard.isEpub ? "#3334d399" : "#33fb7185"
                            border.color: bookCard.isEpub ? "#664ade80" : "#66fb7185"
                            implicitWidth: formatLabel.implicitWidth + 12
                            implicitHeight: 20
                            Text { id: formatLabel; anchors.centerIn: parent; text: bookCard.isEpub ? "EPUB" : "PDF"; color: bookCard.isEpub ? "#a7f3d0" : "#fecdd3"; font.pixelSize: 9; font.bold: true; font.letterSpacing: 0.5 }
                        }
                        Rectangle {
                            visible: !!modelData.is_archived
                            radius: 5
                            color: "#33f59e0b"
                            border.color: "#66fbbf24"
                            implicitWidth: archivedLabel.implicitWidth + 12
                            implicitHeight: 20
                            Text { id: archivedLabel; anchors.centerIn: parent; text: "ARQUIVADO"; color: "#fde68a"; font.pixelSize: 8; font.bold: true }
                        }
                        Rectangle {
                            radius: 5
                            color: "#99000000"
                            border.color: "#18ffffff"
                            implicitWidth: storageIcons.implicitWidth + 12
                            implicitHeight: 20
                            RowLayout {
                                id: storageIcons
                                anchors.centerIn: parent
                                spacing: 4
                                AppIcon { visible: bookCard.isLocal; width: 12; height: 12; name: "hard-drive"; color: bookCard.isSynced ? "#34d399" : "#fbbf24" }
                                AppIcon { visible: bookCard.isSynced; width: 12; height: 12; name: "cloud"; color: bookCard.isLocal ? "#34d399" : "#60a5fa" }
                            }
                        }
                    }

                    Rectangle {
                        visible: bookCard.progress > 0
                        anchors.left: parent.left
                        anchors.right: parent.right
                        anchors.bottom: parent.bottom
                        height: 4
                        color: "#66000000"
                        Rectangle { width: parent.width * bookCard.progress / 100; height: parent.height; color: "#a78bfa" }
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    Layout.margins: 12
                    spacing: 5
                    Text {
                        Layout.fillWidth: true
                        text: modelData.title || "Sem título"
                        color: cardMouse.containsMouse ? "#c4b5fd" : "#f4f4f5"
                        font.pixelSize: 13
                        font.weight: Font.Medium
                        maximumLineCount: 2
                        elide: Text.ElideRight
                        wrapMode: Text.Wrap
                    }
                    Text {
                        visible: !!modelData.author
                        Layout.fillWidth: true
                        text: modelData.author || ""
                        color: "#a7a9be"
                        font.pixelSize: 11
                        elide: Text.ElideRight
                    }
                    Item { Layout.fillHeight: true }
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 5
                        Text {
                            text: bookCard.isFinished ? "✓" : modelData.reading_status === "reading" ? "◉" : "○"
                            color: bookCard.isFinished || modelData.reading_status === "reading" ? "#34d399" : "#a7a9be"
                            font.pixelSize: 13
                        }
                        Text {
                            Layout.fillWidth: true
                            text: bookCard.isFinished ? "Concluído" : modelData.reading_status === "reading" ? "Lendo" : "Na fila"
                            color: bookCard.isFinished ? "#34d399" : modelData.reading_status === "reading" ? "#34d399" : "#a7a9be"
                            font.pixelSize: 10
                            elide: Text.ElideRight
                        }
                        Text {
                            visible: bookCard.progress > 0 && bookCard.progress < 100
                            text: bookCard.progress + "%"
                            color: "#a7a9be"
                            font.pixelSize: 10
                        }
                    }
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 4
                        Repeater {
                            model: (modelData.collections || []).slice(0, 2)
                            delegate: Rectangle {
                                required property var modelData
                                implicitWidth: collectionLabel.implicitWidth + 12
                                implicitHeight: 18
                                radius: 9
                                color: Qt.rgba(Qt.color(modelData.color || "#8b5cf6").r,
                                               Qt.color(modelData.color || "#8b5cf6").g,
                                               Qt.color(modelData.color || "#8b5cf6").b, 0.14)
                                Text { id: collectionLabel; anchors.centerIn: parent; text: modelData.name || "Coleção"; color: modelData.color || "#c4b5fd"; font.pixelSize: 9; font.weight: Font.Medium; elide: Text.ElideRight }
                            }
                        }
                    }
                }
            }

            MouseArea {
                id: cardMouse
                anchors.fill: parent
                z: -1
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: gridRoot.bookSelected(modelData)
            }
        }

        Text {
            anchors.centerIn: parent
            visible: gridRoot.books.length === 0
            text: "Nenhum livro encontrado na biblioteca."
            color: "#64748b"
            font.pixelSize: 14
        }
    }
}
