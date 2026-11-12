#include "notes_text_operations.h"

#include "notes_rich_images.h"
#include "notes_rich_image_editing.h"

bool NotesTextOperations::prepareRichImages(QQuickTextDocument *document, const QString &source) const {
    return document && document->textDocument() && NotesRichImages::prepare(*document->textDocument(), source);
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

int NotesTextOperations::insertRichImages(QQuickTextDocument *document, int start, int end,
                                           const QVariantList &images) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichImages::insertMany(*document->textDocument(), start, end, images);
}

int NotesTextOperations::richImageInsertionPositionAfter(QQuickTextDocument *document,
                                                          int imagePosition) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichImages::insertionPositionAfter(*document->textDocument(), imagePosition);
}

QVariantMap NotesTextOperations::richImageAt(QQuickTextDocument *document, int cursorPosition,
                                              int selectionStart, int selectionEnd) const {
    if (!document || !document->textDocument()) return {{"valid", false}, {"position", -1}};
    return NotesRichImages::imageAt(*document->textDocument(), cursorPosition, selectionStart, selectionEnd);
}

QString NotesTextOperations::richImageData(QQuickTextDocument *document, int imagePosition) const {
    if (!document || !document->textDocument()) return {};
    return NotesRichImages::imageData(*document->textDocument(), imagePosition);
}

QVariantList NotesTextOperations::richImageCaptions(QQuickTextDocument *document) const {
    if (!document || !document->textDocument()) return {};
    return NotesRichImages::captions(*document->textDocument());
}

bool NotesTextOperations::canMoveRichImage(QQuickTextDocument *document, int imagePosition,
                                            bool upward) const {
    return document && document->textDocument() &&
        NotesRichImageEditing::canMove(*document->textDocument(), imagePosition, upward);
}

int NotesTextOperations::moveRichImage(QQuickTextDocument *document, int imagePosition,
                                        bool upward) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichImageEditing::move(*document->textDocument(), imagePosition, upward);
}

int NotesTextOperations::insertRichParagraphBelowImage(QQuickTextDocument *document,
                                                         int imagePosition) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichImageEditing::insertParagraphBelow(*document->textDocument(), imagePosition);
}

bool NotesTextOperations::setRichImageAlignment(QQuickTextDocument *document, int imagePosition,
                                                 const QString &alignment) const {
    return document && document->textDocument() &&
        NotesRichImages::setAlignment(*document->textDocument(), imagePosition, alignment);
}

bool NotesTextOperations::setRichImageCaption(QQuickTextDocument *document, int imagePosition,
                                               const QString &caption) const {
    return document && document->textDocument() &&
        NotesRichImages::setCaption(*document->textDocument(), imagePosition, caption);
}

bool NotesTextOperations::setRichImageSize(QQuickTextDocument *document, int imagePosition,
                                            int width, int height) const {
    return document && document->textDocument() &&
        NotesRichImages::setSize(*document->textDocument(), imagePosition, width, height);
}
