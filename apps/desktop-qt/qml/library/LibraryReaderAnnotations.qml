import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: annotations
    Layout.preferredWidth: 320
    Layout.fillHeight: true
    radius: 14
    color: "#171620"
    border.color: "#12ffffff"

    property string format: ""
    property string bookId: ""
    property string pdfText: ""
    property string epubSelectedText: ""
    readonly property string selectedText: format === "pdf" ? pdfTextContent.selectedText : epubSelectedText
    property int currentPage: 1
    property int totalPages: 0
    property bool busy: false
    property var bookmarks: []
    property var highlights: []
    property var chapters: []
    property string searchQuery: ""
    readonly property var filteredHighlights: {
        var query = searchQuery.trim().toLocaleLowerCase()
        if (query.length === 0) return highlights
        return highlights.filter(function(item) {
            return String(item.text_content || "").toLocaleLowerCase().includes(query) ||
                   String(item.note || "").toLocaleLowerCase().includes(query)
        })
    }
    property string editingBookmarkId: ""
    property string editingBookmarkLabel: ""
    property string editingHighlightId: ""
    property string editingHighlightNote: ""
    property string editingHighlightColor: "yellow"
    property string pendingDeleteKind: ""
    property string pendingDeleteId: ""
    property string statusMessage: ""
    property bool statusError: false
    readonly property bool confirmationOpen: deleteAnnotationDialog.visible
    readonly property bool annotationEditorActive: editingBookmarkId.length > 0 || editingHighlightId.length > 0
    readonly property bool textInputActive: noteField.activeFocus || pdfTextContent.activeFocus || annotationSearch.activeFocus

    signal highlightRequested(string text, string note)
    signal jumpRequested(int pageNumber)
    signal updateBookmarkRequested(string id, string label)
    signal deleteBookmarkRequested(string id)
    signal updateHighlightRequested(string id, string note, string color)
    signal deleteHighlightRequested(string id)
    signal deleteAllHighlightsRequested()

    function clearNote() { noteField.clear() }
    function showStatus(success, message) {
        statusMessage = message
        statusError = !success
    }
    function resetState() {
        deleteAnnotationDialog.close()
        editingBookmarkId = ""
        editingBookmarkLabel = ""
        editingHighlightId = ""
        editingHighlightNote = ""
        editingHighlightColor = "yellow"
        pendingDeleteKind = ""
        pendingDeleteId = ""
        searchQuery = ""
        statusMessage = ""
        statusError = false
        noteField.clear()
    }
    function beginBookmarkEdit(bookmark) {
        editingBookmarkId = bookmark.id
        editingBookmarkLabel = bookmark.label || ""
        statusMessage = ""
        statusError = false
    }
    function cancelBookmarkEdit() {
        editingBookmarkId = ""
        editingBookmarkLabel = ""
        statusMessage = ""
        statusError = false
    }
    function finishBookmarkEdit(success, message) {
        if (success) cancelBookmarkEdit()
        showStatus(success, message)
    }
    function beginHighlightEdit(highlight) {
        editingHighlightId = highlight.id
        editingHighlightNote = highlight.note || ""
        editingHighlightColor = highlight.color || "yellow"
        statusMessage = ""
        statusError = false
    }
    function cancelHighlightEdit() {
        editingHighlightId = ""
        editingHighlightNote = ""
        editingHighlightColor = "yellow"
        statusMessage = ""
        statusError = false
    }
    function finishHighlightEdit(success, message) {
        if (success) cancelHighlightEdit()
        showStatus(success, message)
    }
    function requestDelete(kind, id) {
        pendingDeleteKind = kind
        pendingDeleteId = id
        deleteAnnotationDialog.open()
    }
    function finishDelete(success, message) {
        showStatus(success, message)
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 14
        spacing: 10

        Text { text: "ANOTAÇÕES"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }

        TextEdit {
            id: pdfTextContent
            Layout.fillWidth: true
            Layout.preferredHeight: 150
            visible: annotations.format === "pdf"
            text: annotations.pdfText
            textFormat: TextEdit.PlainText
            wrapMode: TextEdit.Wrap
            readOnly: true
            selectByMouse: true
            color: "#c4c5d4"
            selectionColor: "#6d4fc2"
            font.pixelSize: 12
        }

        TextArea {
            id: noteField
            Layout.fillWidth: true
            Layout.preferredHeight: 64
            placeholderText: "Nota para o trecho selecionado…"
            wrapMode: TextArea.Wrap
            color: "#eeeeF4"
            placeholderTextColor: "#767789"
            background: Rectangle { color: "#111019"; border.color: "#20ffffff"; radius: 8 }
        }

        Button {
            Layout.fillWidth: true
            text: "Destacar seleção"
            enabled: !annotations.busy && annotations.selectedText.trim().length > 0
            onClicked: annotations.highlightRequested(annotations.selectedText.trim(), noteField.text.trim())
            background: Rectangle { color: parent.enabled ? "#3e315e" : "#242331"; radius: 8 }
            contentItem: Text { text: parent.text; color: parent.enabled ? "#ddd6fe" : "#777788"; font.pixelSize: 12; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }

        Text {
            Layout.fillWidth: true
            visible: annotations.statusMessage.length > 0
            text: annotations.statusMessage
            color: annotations.statusError ? "#fb7185" : "#86efac"
            font.pixelSize: 10
            wrapMode: Text.Wrap
        }

        Rectangle { Layout.fillWidth: true; height: 1; color: "#18ffffff" }
        Text { text: "MARCADORES"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }
        ScrollView {
            Layout.fillWidth: true
            Layout.preferredHeight: 142
            clip: true
            contentWidth: availableWidth
            LibraryReaderBookmarkList {
                width: parent.width
                bookmarks: annotations.bookmarks
                busy: annotations.busy
                editingId: annotations.editingBookmarkId
                editingLabel: annotations.editingBookmarkLabel
                onJumpRequested: function(pageNumber) { annotations.jumpRequested(pageNumber) }
                onEditRequested: function(bookmark) { annotations.beginBookmarkEdit(bookmark) }
                onSaveRequested: function(id, label) { annotations.updateBookmarkRequested(id, label) }
                onCancelRequested: annotations.cancelBookmarkEdit()
                onDeleteRequested: function(id) { annotations.requestDelete("bookmark", id) }
            }
        }

        Text {
            visible: annotations.format === "epub" && annotations.chapters.length > 0
            text: "SUMÁRIO"
            color: "#a7a9be"
            font.pixelSize: 10
            font.bold: true
            font.letterSpacing: 1
        }
        ScrollView {
            Layout.fillWidth: true
            Layout.preferredHeight: 118
            visible: annotations.format === "epub" && annotations.chapters.length > 0
            clip: true
            contentWidth: availableWidth
            LibraryReaderTocList {
                width: parent.width
                chapters: annotations.chapters
                currentPage: annotations.currentPage
                onJumpRequested: function(pageNumber) { annotations.jumpRequested(pageNumber) }
            }
        }

        Rectangle { Layout.fillWidth: true; height: 1; color: "#18ffffff" }
        Text { text: "DESTAQUES"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }
        TextField {
            id: annotationSearch
            Layout.fillWidth: true
            placeholderText: "Buscar anotações..."
            text: annotations.searchQuery
            selectByMouse: true
            color: "#eeeeF4"
            placeholderTextColor: "#767789"
            font.pixelSize: 11
            background: Rectangle { color: "#111019"; border.color: "#20ffffff"; radius: 7 }
            onTextChanged: annotations.searchQuery = text
        }
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            contentWidth: availableWidth
            LibraryReaderHighlightList {
                width: parent.width
                highlights: annotations.filteredHighlights
                hasLibraryHighlights: annotations.highlights.length > 0
                busy: annotations.busy
                editingId: annotations.editingHighlightId
                editingNote: annotations.editingHighlightNote
                editingColor: annotations.editingHighlightColor
                onJumpRequested: function(pageNumber) { annotations.jumpRequested(pageNumber) }
                onEditRequested: function(highlight) { annotations.beginHighlightEdit(highlight) }
                onNoteChanged: function(note) { annotations.editingHighlightNote = note }
                onColorChanged: function(color) { annotations.editingHighlightColor = color }
                onSaveRequested: function(id, note, color) { annotations.updateHighlightRequested(id, note, color) }
                onCancelRequested: annotations.cancelHighlightEdit()
                onDeleteRequested: function(id) { annotations.requestDelete("highlight", id) }
            }
        }
        Button {
            Layout.fillWidth: true
            visible: annotations.format === "pdf" && annotations.highlights.length > 0
            enabled: !annotations.busy
            text: "Restaurar PDF (Apagar Tudo)"
            onClicked: annotations.requestDelete("allHighlights", annotations.bookId)
            background: Rectangle { color: "#351b25"; border.color: "#35fb7185"; radius: 7 }
            contentItem: Text { text: parent.text; color: "#fb7185"; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }
    }

    LibraryAnnotationDeleteDialog {
        id: deleteAnnotationDialog
        itemKind: annotations.pendingDeleteKind
        onConfirmed: {
            if (annotations.pendingDeleteKind === "bookmark") annotations.deleteBookmarkRequested(annotations.pendingDeleteId)
            else if (annotations.pendingDeleteKind === "highlight") annotations.deleteHighlightRequested(annotations.pendingDeleteId)
            else if (annotations.pendingDeleteKind === "allHighlights") annotations.deleteAllHighlightsRequested()
            annotations.pendingDeleteKind = ""
            annotations.pendingDeleteId = ""
        }
        onRejected: {
            annotations.pendingDeleteKind = ""
            annotations.pendingDeleteId = ""
        }
    }
}
