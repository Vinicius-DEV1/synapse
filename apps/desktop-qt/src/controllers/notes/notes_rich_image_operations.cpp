#include "notes_text_operations.h"

#include "notes_rich_images.h"

bool NotesTextOperations::prepareRichImages(QQuickTextDocument *document) const {
    return document && document->textDocument() && NotesRichImages::prepare(*document->textDocument());
}

bool NotesTextOperations::canInsertRichImage(QQuickTextDocument *document, int position) const {
    return document && document->textDocument() &&
        NotesRichImages::canInsertAt(*document->textDocument(), position);
}

int NotesTextOperations::insertRichImage(QQuickTextDocument *document, int start, int end,
                                          const QString &dataUrl, const QString &alt,
                                          int width, int height) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichImages::insert(*document->textDocument(), start, end, dataUrl, alt, width, height);
}
