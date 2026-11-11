import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Dialog {
    id: editDialog
    modal: true
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 560)
    height: Math.min(parent.height - 32, 700)
    padding: 0
    closePolicy: isSaving || isEnriching || coverSection.isProcessing ? Popup.NoAutoClose : Popup.CloseOnEscape
    standardButtons: Dialog.NoButton

    property var book: null
    property var collections: []
    property var controller: null
    property string titleValue: ""
    property string authorValue: ""
    property string publisherValue: ""
    property string yearValue: ""
    property string languageValue: ""
    property string descriptionValue: ""
    property string coverImageValue: ""
    property string statusValue: "not_started"
    property var selectedCollectionIds: []
    property bool isSaving: false
    property bool isEnriching: false
    property string errorMessage: ""
    property string metadataStatusMessage: ""

    signal saved()
    signal statusRequested(string message)

    function openFor(selectedBook) {
        book = selectedBook
        titleValue = selectedBook ? selectedBook.title || "" : ""
        authorValue = selectedBook ? selectedBook.author || "" : ""
        publisherValue = selectedBook ? selectedBook.publisher || "" : ""
        yearValue = selectedBook && selectedBook.published_year ? String(selectedBook.published_year) : ""
        languageValue = selectedBook ? selectedBook.language || "" : ""
        descriptionValue = selectedBook ? selectedBook.description || "" : ""
        coverImageValue = selectedBook ? selectedBook.cover_image || "" : ""
        var storedStatus = selectedBook ? selectedBook.reading_status || "not_started" : "not_started"
        statusValue = storedStatus === "unread" ? "not_started" : storedStatus === "completed" ? "finished" : storedStatus
        selectedCollectionIds = []
        errorMessage = ""
        isSaving = false
        isEnriching = false
        metadataStatusMessage = ""
        var associations = selectedBook ? selectedBook.collections || [] : []
        if (typeof associations === "string") {
            try { associations = JSON.parse(associations) }
            catch (error) {
                console.warn("[LibraryBookEditDialog] Invalid collection metadata for book", selectedBook ? selectedBook.id : "", error)
                associations = []
            }
        }
        for (var index = 0; index < associations.length; ++index) {
            if (associations[index].id) selectedCollectionIds.push(associations[index].id)
        }
        open()
    }

    function toggleCollection(collectionId, selected) {
        var nextIds = selectedCollectionIds.slice()
        var currentIndex = nextIds.indexOf(collectionId)
        if (selected && currentIndex < 0) nextIds.push(collectionId)
        if (!selected && currentIndex >= 0) nextIds.splice(currentIndex, 1)
        selectedCollectionIds = nextIds
    }

    function saveChanges() {
        if (isSaving || isEnriching || !book || !controller || titleValue.trim().length === 0) return
        var year = null
        if (yearValue.trim().length > 0) {
            year = Number(yearValue)
            if (!isFinite(year) || Math.floor(year) !== year || year < 0 || year > 9999) {
                errorMessage = "Enter a valid publication year."
                return
            }
        }
        isSaving = true
        errorMessage = ""
        var metadataSaved = controller.updateLibraryBookMetadata(
            book.id, titleValue, authorValue, publisherValue, year,
            languageValue, descriptionValue, statusValue, coverImageValue)
        if (!metadataSaved) {
            errorMessage = "Could not save book details. Check the title and try again."
            isSaving = false
            return
        }
        if (!controller.setBookCollections(book.id, selectedCollectionIds)) {
            errorMessage = "Book details were saved, but its collection assignments could not be updated."
            isSaving = false
            statusRequested(errorMessage)
            return
        }
        isSaving = false
        saved()
        close()
    }

    function searchMetadata() {
        if (isEnriching || isSaving || !book || !controller) return
        const query = titleValue.trim().length > 0 ? titleValue : book.original_name || ""
        isEnriching = true
        metadataStatusMessage = ""
        errorMessage = ""
        controller.searchLibraryBookMetadata(book.id, query)
    }

    onOpened: metadataFields.focusTitle()
    background: Rectangle { color: "#181720"; radius: 16; border.color: "#10ffffff" }

    header: Rectangle {
        implicitHeight: 72
        color: "#08ffffff"
        radius: 16
        Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: "#0cffffff" }
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 20
            anchors.rightMargin: 12
            spacing: 12
            Rectangle {
                Layout.preferredWidth: 40
                Layout.preferredHeight: 40
                radius: 10
                color: "#1a8b5cf6"
                border.color: "#338b5cf6"
                AppIcon { anchors.centerIn: parent; width: 20; height: 20; name: "library"; color: "#c4b5fd" }
            }
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2
                Label { text: "Edit Book"; color: "#f4f4f5"; font.pixelSize: 15; font.bold: true }
                Label { text: "Update book details, status, and collections"; color: "#9293a5"; font.pixelSize: 11 }
            }
            ToolButton {
                text: editDialog.isEnriching ? "…" : "✦"
                Accessible.name: "Search Open Library for missing book metadata"
                enabled: !editDialog.isSaving && !editDialog.isEnriching && !coverSection.isProcessing
                ToolTip.visible: hovered
                ToolTip.text: editDialog.isEnriching ? "Searching Open Library…" : "Fill missing fields from Open Library"
                onClicked: editDialog.searchMetadata()
                contentItem: Label { text: parent.text; color: parent.hovered ? "#ddd6fe" : "#a78bfa"; font.pixelSize: 18; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                background: Rectangle { color: parent.hovered ? "#1a8b5cf6" : "transparent"; radius: 8 }
            }
            ToolButton {
                text: "×"
                Accessible.name: "Close book editor"
                enabled: !editDialog.isSaving && !editDialog.isEnriching && !coverSection.isProcessing
                onClicked: editDialog.close()
                contentItem: Label { text: parent.text; color: parent.hovered ? "white" : "#a7a9be"; font.pixelSize: 22; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                background: Rectangle { color: parent.hovered ? "#1affffff" : "transparent"; radius: 8 }
            }
        }
    }

    contentItem: ColumnLayout {
        spacing: 0
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            contentWidth: availableWidth
            ColumnLayout {
                width: parent.width
                spacing: 12
                Item { Layout.preferredHeight: 4 }
                RowLayout {
                    Layout.fillWidth: true
                    Layout.leftMargin: 20
                    Layout.rightMargin: 20
                    spacing: 12
                    LibraryBookCoverSection {
                        id: coverSection
                        controller: editDialog.controller
                        coverImage: editDialog.coverImageValue
                        onImageProcessed: function(dataUrl) {
                            editDialog.coverImageValue = dataUrl
                            editDialog.errorMessage = ""
                        }
                        onStatusRequested: function(message) { editDialog.errorMessage = message }
                    }
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4
                        Label { text: editDialog.book ? editDialog.book.original_name || "" : ""; color: "#9293a5"; font.pixelSize: 10; elide: Text.ElideRight; Layout.fillWidth: true }
                        Label { text: editDialog.book ? editDialog.book.file_path || "" : ""; color: "#77798c"; font.pixelSize: 9; elide: Text.ElideMiddle; Layout.fillWidth: true }
                    }
                }
                LibraryBookMetadataFields {
                    id: metadataFields
                    Layout.fillWidth: true
                    Layout.leftMargin: 20
                    Layout.rightMargin: 20
                    titleValue: editDialog.titleValue
                    authorValue: editDialog.authorValue
                    publisherValue: editDialog.publisherValue
                    yearValue: editDialog.yearValue
                    languageValue: editDialog.languageValue
                    descriptionValue: editDialog.descriptionValue
                    statusValue: editDialog.statusValue
                    metadataStatusMessage: editDialog.metadataStatusMessage
                    collections: editDialog.collections
                    selectedCollectionIds: editDialog.selectedCollectionIds
                    onFieldEdited: function(fieldName, value) {
                        if (fieldName === "title") editDialog.titleValue = value
                        else if (fieldName === "author") editDialog.authorValue = value
                        else if (fieldName === "publisher") editDialog.publisherValue = value
                        else if (fieldName === "year") editDialog.yearValue = value
                        else if (fieldName === "language") editDialog.languageValue = value
                        else if (fieldName === "description") editDialog.descriptionValue = value
                    }
                    onStatusSelected: function(status) { editDialog.statusValue = status }
                    onCollectionToggled: function(collectionId, selected) {
                        editDialog.toggleCollection(collectionId, selected)
                    }
                }
                Label {
                    visible: editDialog.errorMessage.length > 0
                    Layout.fillWidth: true
                    Layout.leftMargin: 20
                    Layout.rightMargin: 20
                    text: editDialog.errorMessage
                    color: "#fda4af"
                    font.pixelSize: 11
                    wrapMode: Text.Wrap
                }
                Item { Layout.preferredHeight: 12 }
            }
        }
    }

    footer: RowLayout {
        implicitHeight: 62
        spacing: 10
        Item { Layout.fillWidth: true }
        Button { text: "Cancel"; enabled: !editDialog.isSaving && !editDialog.isEnriching && !coverSection.isProcessing; onClicked: editDialog.close() }
        Button {
            text: editDialog.isSaving ? "Saving…" : "Save"
            enabled: !editDialog.isSaving && !editDialog.isEnriching && !coverSection.isProcessing && editDialog.titleValue.trim().length > 0
            onClicked: editDialog.saveChanges()
            background: Rectangle { color: parent.enabled ? (parent.down ? "#6d28d9" : "#7c3aed") : "#343344"; radius: 9 }
            contentItem: Label { text: parent.text; color: parent.enabled ? "white" : "#9293a5"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter; leftPadding: 8; rightPadding: 8 }
        }
        Item { Layout.preferredWidth: 10 }
    }

    Connections {
        target: editDialog.controller
        function onLibraryBookMetadataSearchFinished(result) {
            if (!editDialog.book || result.bookId !== editDialog.book.id) return
            editDialog.isEnriching = false
            if (!result.success) {
                editDialog.errorMessage = result.error || "Open Library search failed."
                return
            }
            if (!result.found) {
                editDialog.metadataStatusMessage = "No Open Library result matched this title."
                return
            }

            const metadata = result.metadata || ({})
            var updatedFields = 0
            if ((!editDialog.authorValue.trim() || editDialog.authorValue.trim() === "Desconhecido") && metadata.author) {
                editDialog.authorValue = metadata.author
                updatedFields++
            }
            if (!editDialog.publisherValue.trim() && metadata.publisher) {
                editDialog.publisherValue = metadata.publisher
                updatedFields++
            }
            if (!editDialog.yearValue.trim() && metadata.publishedYear !== undefined) {
                editDialog.yearValue = String(metadata.publishedYear)
                updatedFields++
            }
            if (!editDialog.languageValue.trim() && metadata.language) {
                editDialog.languageValue = metadata.language
                updatedFields++
            }
            if (!editDialog.coverImageValue.trim() && metadata.coverImage) {
                editDialog.coverImageValue = metadata.coverImage
                updatedFields++
            }
            editDialog.metadataStatusMessage = updatedFields > 0
                ? "Missing fields were filled from Open Library. Review them before saving."
                : "A result was found; existing metadata was kept unchanged."
        }
    }
}
