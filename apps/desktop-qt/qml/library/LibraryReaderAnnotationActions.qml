import QtQml 2.15

QtObject {
    id: actions

    property var controller: null
    property string bookId: ""
    property string format: ""
    property int currentPage: 1
    property int totalPages: 0
    property var chapters: []

    signal annotationsChanged()
    signal statusChanged(bool success, string message)

    function complete(success, successMessage, errorMessage) {
        if (success) annotationsChanged()
        statusChanged(success, success ? successMessage : errorMessage)
    }

    function saveCurrentBookmark() {
        if (!controller || !bookId || totalPages < 1) return
        var label = format === "epub" && chapters.length >= currentPage
            ? chapters[currentPage - 1].title : "Página " + currentPage
        complete(controller.createLibraryBookmark(bookId, currentPage, label),
                 "Marcador salvo.", "Não foi possível salvar o marcador.")
    }

    function saveSelectionHighlight(selection, note) {
        var selectedText = String(selection || "").trim()
        if (!controller || !bookId || totalPages < 1 || selectedText.length === 0) return false
        var saved = controller.createLibraryHighlight(bookId, currentPage, selectedText, "yellow", note)
        complete(saved, "Destaque salvo.", "Não foi possível salvar o destaque.")
        return saved
    }

    function updateBookmark(bookmarkId, label) {
        complete(controller && controller.updateLibraryBookmark(bookmarkId, label),
                 "Marcador atualizado.", "Não foi possível atualizar o marcador.")
    }

    function deleteBookmark(bookmarkId) {
        complete(controller && controller.deleteLibraryBookmark(bookmarkId),
                 "Marcador excluído.", "Não foi possível excluir o marcador.")
    }

    function updateHighlight(highlightId, note, color) {
        complete(controller && controller.updateLibraryHighlight(highlightId, note, color),
                 "Destaque atualizado.", "Não foi possível atualizar o destaque.")
    }

    function deleteHighlight(highlightId) {
        complete(controller && controller.deleteLibraryHighlight(highlightId),
                 "Destaque excluído.", "Não foi possível excluir o destaque.")
    }

    function deleteAllHighlights() {
        complete(controller && bookId && controller.deleteLibraryHighlightsForBook(bookId),
                 "Destaques removidos.", "Não foi possível remover os destaques.")
    }
}
