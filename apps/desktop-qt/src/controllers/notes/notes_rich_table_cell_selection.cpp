#include "notes_rich_table_cell_selection.h"

#include "notes_rich_table_merging.h"

#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextTable>
#include <QtGui/QTextTableCell>

namespace NotesRichTableCellSelection {
namespace {
QTextTable *tableAt(QTextDocument &document, int position) {
    if (position < 0 || position > document.characterCount() - 1) return nullptr;
    QTextCursor cursor(&document);
    cursor.setPosition(position);
    return cursor.currentTable();
}

bool expandToCellBoundaries(QTextTable &table, int &firstRow, int &lastRow,
                            int &firstColumn, int &lastColumn) {
    bool changed = true;
    while (changed) {
        changed = false;
        for (int row = firstRow; row <= lastRow; ++row) {
            for (int column = firstColumn; column <= lastColumn; ++column) {
                const QTextTableCell cell = table.cellAt(row, column);
                if (!NotesRichTableMerging::isSupportedCellSpan(cell) || cell.row() < 0 || cell.column() < 0 ||
                    cell.row() + cell.rowSpan() > table.rows() ||
                    cell.column() + cell.columnSpan() > table.columns()) return false;
                const int nextFirstRow = qMin(firstRow, cell.row());
                const int nextLastRow = qMax(lastRow, cell.row() + cell.rowSpan() - 1);
                const int nextFirstColumn = qMin(firstColumn, cell.column());
                const int nextLastColumn = qMax(lastColumn, cell.column() + cell.columnSpan() - 1);
                changed = changed || nextFirstRow != firstRow || nextLastRow != lastRow ||
                    nextFirstColumn != firstColumn || nextLastColumn != lastColumn;
                firstRow = nextFirstRow;
                lastRow = nextLastRow;
                firstColumn = nextFirstColumn;
                lastColumn = nextLastColumn;
            }
        }
    }
    return firstRow >= 0 && firstColumn >= 0 && lastRow < table.rows() && lastColumn < table.columns();
}

bool selectedRectangle(const QTextDocument &document, int selectionStart, int selectionEnd,
                       QTextTable *&table, int &firstRow, int &rowCount,
                       int &firstColumn, int &columnCount) {
    if (selectionStart < 0 || selectionEnd <= selectionStart ||
        selectionEnd > document.characterCount() - 1) return false;
    QTextDocument &mutableDocument = *const_cast<QTextDocument *>(&document);
    table = tableAt(mutableDocument, selectionStart);
    if (!table || tableAt(mutableDocument, selectionEnd - 1) != table) return false;
    QTextCursor selection(&mutableDocument);
    selection.setPosition(selectionStart);
    selection.setPosition(selectionEnd, QTextCursor::KeepAnchor);
    selection.selectedTableCells(&firstRow, &rowCount, &firstColumn, &columnCount);
    return firstRow >= 0 && firstColumn >= 0 && rowCount > 0 && columnCount > 0 &&
        firstRow + rowCount <= table->rows() && firstColumn + columnCount <= table->columns();
}
}

QVariantMap selectionRange(const QTextDocument &document, int position, const QString &scope) {
    if (position < 0 || position > document.characterCount() - 1 ||
        (scope != QStringLiteral("row") && scope != QStringLiteral("column") &&
         scope != QStringLiteral("table"))) return {};
    QTextDocument &mutableDocument = *const_cast<QTextDocument *>(&document);
    QTextTable *table = tableAt(mutableDocument, position);
    if (!table || table->rows() < 1 || table->columns() < 1) return {};
    QTextCursor cursor(&mutableDocument);
    cursor.setPosition(position);
    const QTextTableCell activeCell = table->cellAt(cursor);
    if (!NotesRichTableMerging::isSupportedCellSpan(activeCell)) return {};

    int firstRow = 0;
    int lastRow = table->rows() - 1;
    int firstColumn = 0;
    int lastColumn = table->columns() - 1;
    if (scope == QStringLiteral("row")) {
        firstRow = activeCell.row();
        lastRow = firstRow + activeCell.rowSpan() - 1;
    } else if (scope == QStringLiteral("column")) {
        firstColumn = activeCell.column();
        lastColumn = firstColumn + activeCell.columnSpan() - 1;
    }
    if (!expandToCellBoundaries(*table, firstRow, lastRow, firstColumn, lastColumn)) return {};

    const QTextTableCell firstCell = table->cellAt(firstRow, firstColumn);
    const QTextTableCell lastCell = table->cellAt(lastRow, lastColumn);
    if (!firstCell.isValid() || !lastCell.isValid() || firstCell.row() != firstRow ||
        firstCell.column() != firstColumn || lastCell.row() + lastCell.rowSpan() - 1 != lastRow ||
        lastCell.column() + lastCell.columnSpan() - 1 != lastColumn) return {};
    return {{QStringLiteral("start"), firstCell.firstCursorPosition().position()},
            {QStringLiteral("end"), lastCell.lastCursorPosition().position()}};
}

QString selectionScope(const QTextDocument &document, int cursorPosition,
                       int selectionStart, int selectionEnd) {
    QTextTable *table = nullptr;
    int firstRow = -1;
    int rowCount = 0;
    int firstColumn = -1;
    int columnCount = 0;
    if (selectedRectangle(document, selectionStart, selectionEnd, table, firstRow, rowCount,
                          firstColumn, columnCount)) {
        if (rowCount == table->rows() && columnCount == table->columns()) return QStringLiteral("table");
        if (rowCount == 1 && firstColumn == 0 && columnCount == table->columns()) return QStringLiteral("row");
        if (columnCount == 1 && firstRow == 0 && rowCount == table->rows()) return QStringLiteral("column");
        if (rowCount > 1 || columnCount > 1) return QStringLiteral("multi-cell");
    }

    QTextDocument &mutableDocument = *const_cast<QTextDocument *>(&document);
    if (tableAt(mutableDocument, cursorPosition) || tableAt(mutableDocument, cursorPosition - 1))
        return QStringLiteral("cell");
    return QStringLiteral("none");
}
}
