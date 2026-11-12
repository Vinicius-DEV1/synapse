#include "notes_text_operations.h"

#include "notes_rich_document.h"
#include "notes_rich_table_cell_formatting.h"
#include "notes_rich_table_merging.h"
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

bool NotesTextOperations::canMergeOrSplitRichTable(QQuickTextDocument *document, int cursorPosition,
                                                    int selectionStart, int selectionEnd) const {
    return document && document->textDocument() &&
        NotesRichTableMerging::canMergeOrSplit(*document->textDocument(), cursorPosition,
                                               selectionStart, selectionEnd);
}

bool NotesTextOperations::mergeOrSplitRichTable(QQuickTextDocument *document, int cursorPosition,
                                                 int selectionStart, int selectionEnd) const {
    return document && document->textDocument() &&
        NotesRichTableMerging::mergeOrSplit(*document->textDocument(), cursorPosition,
                                            selectionStart, selectionEnd);
}

bool NotesTextOperations::canSetRichTableBackgroundOnSelection(QQuickTextDocument *document,
                                                                int selectionStart, int selectionEnd) const {
    return document && document->textDocument() &&
        NotesRichTableCellFormatting::canSetBackgroundOnSelection(
            *document->textDocument(), selectionStart, selectionEnd);
}

bool NotesTextOperations::setRichTableCellBackground(QQuickTextDocument *document, int position,
                                                      const QString &color, const QString &scope,
                                                      int selectionStart, int selectionEnd) const {
    return document && document->textDocument() &&
        NotesRichTableCellFormatting::setBackground(
            *document->textDocument(), position, color, scope, selectionStart, selectionEnd);
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
