#include "notes_text_operations.h"

#include "notes_rich_document.h"
#include "notes_rich_table_cell_formatting.h"
#include "notes_rich_tables.h"

#include <QtQuick/QQuickTextDocument>

int NotesTextOperations::insertRichTable(QQuickTextDocument *document, int start, int end) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichTables::insertSimpleTable(*document->textDocument(), start, end);
}

bool NotesTextOperations::isRichTableCell(QQuickTextDocument *document, int position) const {
    return document && document->textDocument() &&
        NotesRichTables::isCellAt(*document->textDocument(), position);
}

bool NotesTextOperations::canApplyRichTableAction(QQuickTextDocument *document, int position,
                                                   const QString &action) const {
    return document && document->textDocument() &&
        NotesRichTables::canApplyStructureAction(*document->textDocument(), position, action);
}

bool NotesTextOperations::applyRichTableAction(QQuickTextDocument *document, int position,
                                                const QString &action) const {
    return document && document->textDocument() &&
        NotesRichTables::applyStructureAction(*document->textDocument(), position, action);
}

bool NotesTextOperations::setRichTableCellBackground(QQuickTextDocument *document, int position,
                                                      const QString &color, const QString &scope) const {
    return document && document->textDocument() &&
        NotesRichTableCellFormatting::setBackground(*document->textDocument(), position, color, scope);
}

bool NotesTextOperations::setRichColor(QQuickTextDocument *document, int start, int end,
                                       const QString &color, bool background) const {
    return document && document->textDocument() &&
        NotesRichDocument::setColor(*document->textDocument(), start, end, color, background);
}

bool NotesTextOperations::setRichLink(QQuickTextDocument *document, int start, int end, const QString &url) const {
    return document && document->textDocument() && NotesRichDocument::setLink(*document->textDocument(), start, end, url);
}

QString NotesTextOperations::richLinkUrl(QQuickTextDocument *document, int start, int end) const {
    if (!document || !document->textDocument()) return {};
    return NotesRichDocument::linkAtSelection(*document->textDocument(), start, end);
}
