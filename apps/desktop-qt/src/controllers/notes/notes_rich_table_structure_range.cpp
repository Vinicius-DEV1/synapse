#include "notes_rich_table_structure_range.h"

#include "notes_rich_table_merging.h"

#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextTable>
#include <QtGui/QTextTableCell>

namespace NotesRichTableStructureRange {
namespace {
QTextTable *tableAt(QTextDocument &document, int position) {
    if (position < 0 || position >= document.characterCount()) return nullptr;
    QTextCursor cursor(&document);
    cursor.setPosition(position);
    return cursor.currentTable();
}

bool expandToCellBoundaries(QTextTable &table, int &top, int &bottom, int &left, int &right) {
    bool changed = true;
    while (changed) {
        changed = false;
        for (int row = top; row < bottom; ++row) {
            for (int column = left; column < right; ++column) {
                const QTextTableCell cell = table.cellAt(row, column);
                if (!NotesRichTableMerging::isSupportedCellSpan(cell) || cell.row() < 0 || cell.column() < 0 ||
                    cell.row() + cell.rowSpan() > table.rows() ||
                    cell.column() + cell.columnSpan() > table.columns()) return false;
                const int expandedTop = qMin(top, cell.row());
                const int expandedBottom = qMax(bottom, cell.row() + cell.rowSpan());
                const int expandedLeft = qMin(left, cell.column());
                const int expandedRight = qMax(right, cell.column() + cell.columnSpan());
                changed = changed || expandedTop != top || expandedBottom != bottom ||
                    expandedLeft != left || expandedRight != right;
                top = expandedTop;
                bottom = expandedBottom;
                left = expandedLeft;
                right = expandedRight;
            }
        }
    }
    return top >= 0 && left >= 0 && bottom <= table.rows() && right <= table.columns() &&
        top < bottom && left < right;
}

bool hasMergedCells(const QTextTable &table) {
    for (int row = 0; row < table.rows(); ++row) {
        for (int column = 0; column < table.columns(); ++column) {
            const QTextTableCell cell = table.cellAt(row, column);
            if (cell.rowSpan() != 1 || cell.columnSpan() != 1) return true;
        }
    }
    return false;
}

bool rectangleFromSelection(QTextDocument &document, int selectionStart, int selectionEnd,
                            QTextTable *&table, Rectangle &rectangle) {
    if (selectionStart < 0 || selectionEnd <= selectionStart ||
        selectionEnd > document.characterCount() - 1) return false;
    QTextTable *startTable = tableAt(document, selectionStart);
    QTextTable *endTable = tableAt(document, selectionEnd - 1);
    if (!startTable || startTable != endTable) return false;

    QTextCursor selection(&document);
    selection.setPosition(selectionStart);
    selection.setPosition(selectionEnd, QTextCursor::KeepAnchor);
    int rowCount = 0;
    int columnCount = 0;
    selection.selectedTableCells(&rectangle.top, &rowCount, &rectangle.left, &columnCount);
    if (rowCount < 1 || columnCount < 1) return false;
    rectangle.bottom = rectangle.top + rowCount;
    rectangle.right = rectangle.left + columnCount;
    table = startTable;
    return expandToCellBoundaries(*table, rectangle.top, rectangle.bottom,
                                  rectangle.left, rectangle.right);
}

bool rectangleFromCell(QTextDocument &document, int position, QTextTable *&table,
                       Rectangle &rectangle) {
    table = tableAt(document, position);
    if (!table) return false;
    QTextCursor cursor(&document);
    cursor.setPosition(position);
    const QTextTableCell cell = table->cellAt(cursor);
    if (!NotesRichTableMerging::isSupportedCellSpan(cell)) return false;
    rectangle = {cell.row(), cell.row() + cell.rowSpan(),
                 cell.column(), cell.column() + cell.columnSpan()};
    return expandToCellBoundaries(*table, rectangle.top, rectangle.bottom,
                                  rectangle.left, rectangle.right);
}
}

bool forSelection(const QTextDocument &document, int position, int selectionStart, int selectionEnd,
                  QTextTable *&table, Rectangle &rectangle) {
    table = nullptr;
    QTextDocument &mutableDocument = *const_cast<QTextDocument *>(&document);
    if (selectionStart != selectionEnd && selectionStart >= 0 && selectionEnd > selectionStart) {
        if (rectangleFromSelection(mutableDocument, selectionStart, selectionEnd, table, rectangle))
            return tableAt(mutableDocument, position) == table ||
                tableAt(mutableDocument, position - 1) == table;
        if (tableAt(mutableDocument, selectionStart) != tableAt(mutableDocument, selectionEnd - 1))
            return false;
    }
    return rectangleFromCell(mutableDocument, position, table, rectangle);
}

bool allowsActionWithMergedCells(const QTextTable &table, const QString &action) {
    if (!hasMergedCells(table)) return true;
    return action == QStringLiteral("rowBefore") || action == QStringLiteral("rowAfter") ||
        action == QStringLiteral("deleteRow") || action == QStringLiteral("columnBefore") ||
        action == QStringLiteral("columnAfter") || action == QStringLiteral("deleteColumn") ||
        action == QStringLiteral("deleteTable");
}
}
