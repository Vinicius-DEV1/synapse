#include "notes_text_operations.h"

#include "notes_rich_document.h"
#include "notes_rich_table_cell_formatting.h"
#include "notes_rich_table_cell_selection.h"
#include "notes_rich_table_merging.h"
#include "notes_rich_tables.h"

#include <QtQuick/QQuickTextDocument>
#include <QtGui/QAbstractTextDocumentLayout>
#include <QtGui/QTextBlock>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFrame>
#include <QtGui/QTextTable>

static int findRichTableIndex(QTextFrame *frame, QTextTable *target, int &nextIndex) {
    if (!frame || !target) return -1;
    for (auto it = frame->begin(); !it.atEnd(); ++it) {
        QTextFrame *child = it.currentFrame();
        if (!child) continue;
        if (auto *table = qobject_cast<QTextTable *>(child)) {
            const int tableIndex = nextIndex++;
            if (table == target) return tableIndex;
        }
        const int nestedIndex = findRichTableIndex(child, target, nextIndex);
        if (nestedIndex >= 0) return nestedIndex;
    }
    return -1;
}

int NotesTextOperations::insertRichTable(QQuickTextDocument *document, int start, int end) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichTables::insertSimpleTable(*document->textDocument(), start, end);
}

bool NotesTextOperations::isRichTableCell(QQuickTextDocument *document, int position) const {
    return document && document->textDocument() &&
        NotesRichTables::isCellAt(*document->textDocument(), position);
}

bool NotesTextOperations::canApplyRichTableAction(QQuickTextDocument *document, int position,
                                                   const QString &action, int selectionStart,
                                                   int selectionEnd) const {
    return document && document->textDocument() &&
        NotesRichTables::canApplyStructureAction(*document->textDocument(), position, action,
                                                  selectionStart, selectionEnd);
}

bool NotesTextOperations::applyRichTableAction(QQuickTextDocument *document, int position,
                                                const QString &action, int selectionStart,
                                                int selectionEnd) const {
    return document && document->textDocument() &&
        NotesRichTables::applyStructureAction(*document->textDocument(), position, action,
                                               selectionStart, selectionEnd);
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

QVariantMap NotesTextOperations::richTableSelectionRange(QQuickTextDocument *document, int position,
                                                          const QString &scope) const {
    if (!document || !document->textDocument()) return {};
    return NotesRichTableCellSelection::selectionRange(*document->textDocument(), position, scope);
}

QString NotesTextOperations::richTableSelectionScope(QQuickTextDocument *document, int cursorPosition,
                                                      int selectionStart, int selectionEnd) const {
    if (!document || !document->textDocument()) return QStringLiteral("none");
    return NotesRichTableCellSelection::selectionScope(*document->textDocument(), cursorPosition,
                                                        selectionStart, selectionEnd);
}

bool NotesTextOperations::clearRichTableFormattingOnSelection(QQuickTextDocument *document,
                                                               int selectionStart, int selectionEnd) const {
    return document && document->textDocument() &&
        NotesRichTableCellFormatting::clearFormattingOnSelection(
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

QVariantMap NotesTextOperations::richTableGeometry(QQuickTextDocument *document, int position) const {
    QVariantMap result;
    result["valid"] = false;
    if (!document || !document->textDocument()) return result;
    QTextDocument *doc = document->textDocument();
    if (position < 0 || position > doc->characterCount() - 1) return result;
    QTextCursor cursor(doc);
    cursor.setPosition(position);
    QTextTable *table = cursor.currentTable();
    if (!table) return result;
    QAbstractTextDocumentLayout *layout = doc->documentLayout();
    if (!layout) return result;

    const QRectF tableRect = layout->frameBoundingRect(table);
    const QTextTableCell activeCell = table->cellAt(cursor);
    const int rows = table->rows();
    const int cols = table->columns();
    QVariantList colWidths;
    QVariantList rowHeights;
    const qreal fallbackColW = cols > 0 ? tableRect.width() / cols : 80.0;
    for (int c = 0; c < cols; ++c) {
        const QTextTableCell cell = table->cellAt(0, c);
        const QRectF br = cell.isValid() ? layout->blockBoundingRect(cell.firstCursorPosition().block()) : QRectF();
        qreal w = br.width() > 16.0 ? (br.width() + 24.0) : fallbackColW;
        colWidths.append(w);
    }
    const qreal fallbackRowH = rows > 0 ? tableRect.height() / rows : 32.0;
    for (int r = 0; r < rows; ++r) {
        const QTextTableCell cell = table->cellAt(r, 0);
        const QRectF br = cell.isValid() ? layout->blockBoundingRect(cell.firstCursorPosition().block()) : QRectF();
        qreal h = br.height() > 12.0 ? (br.height() + 16.0) : fallbackRowH;
        rowHeights.append(h);
    }

    QString activeText;
    if (activeCell.isValid()) {
        QTextCursor cellCur = activeCell.firstCursorPosition();
        cellCur.setPosition(activeCell.lastCursorPosition().position(), QTextCursor::KeepAnchor);
        activeText = cellCur.selectedText().trimmed();
    }

    result["valid"] = true;
    result["x"] = tableRect.x();
    result["y"] = tableRect.y();
    result["width"] = tableRect.width();
    result["height"] = tableRect.height();
    result["rows"] = rows;
    result["columns"] = cols;
    int nextTableIndex = 0;
    result["tableIndex"] = findRichTableIndex(doc->rootFrame(), table, nextTableIndex);
    result["currentRow"] = activeCell.isValid() ? activeCell.row() : 0;
    result["currentCol"] = activeCell.isValid() ? activeCell.column() : 0;
    result["currentCellText"] = activeText;
    result["colWidths"] = colWidths;
    result["rowHeights"] = rowHeights;
    return result;
}

bool NotesTextOperations::setRichTableCellText(QQuickTextDocument *document, int position,
                                              const QString &value) const {
    if (!document || !document->textDocument()) return false;
    QTextDocument *doc = document->textDocument();
    if (position < 0 || position > doc->characterCount() - 1) return false;
    QTextCursor cursor(doc);
    cursor.setPosition(position);
    QTextTable *table = cursor.currentTable();
    if (!table) return false;
    const QTextTableCell cell = table->cellAt(cursor);
    if (!cell.isValid()) return false;
    QTextCursor editCur = cell.firstCursorPosition();
    editCur.setPosition(cell.lastCursorPosition().position(), QTextCursor::KeepAnchor);
    editCur.beginEditBlock();
    editCur.insertText(value);
    editCur.endEditBlock();
    return true;
}

bool NotesTextOperations::applyRichTableValidationHighlights(QQuickTextDocument *document, int position,
                                                           const QVariantList &validations) const {
    if (!document || !document->textDocument()) return false;
    QTextDocument *doc = document->textDocument();
    if (position < 0 || position > doc->characterCount() - 1) return false;
    QTextCursor cursor(doc);
    cursor.setPosition(position);
    QTextTable *table = cursor.currentTable();
    if (!table) return false;

    const QColor invalidBg(239, 68, 68, 48);
    doc->setUndoRedoEnabled(false);
    for (const QVariant &v : validations) {
        const QVariantMap item = v.toMap();
        const int r = item.value("row", -1).toInt();
        const int c = item.value("col", -1).toInt();
        const bool valid = item.value("valid", true).toBool();
        if (r <= 0 || r >= table->rows() || c < 0 || c >= table->columns()) continue;
        QTextTableCell cell = table->cellAt(r, c);
        if (!cell.isValid()) continue;
        QTextTableCellFormat fmt = cell.format().toTableCellFormat();
        const QBrush bg = fmt.background();
        if (!valid) {
            fmt.setBackground(invalidBg);
            cell.setFormat(fmt);
        } else if (bg.color() == invalidBg) {
            fmt.clearProperty(QTextFormat::BackgroundBrush);
            cell.setFormat(fmt);
        }
    }
    doc->setUndoRedoEnabled(true);
    return true;
}
