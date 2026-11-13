#include "notes_rich_tables.h"

#include "notes_rich_format.h"
#include "notes_rich_table_movement.h"
#include "notes_rich_table_structure_range.h"
#include "notes_rich_table_styles.h"

#include <QtCore/QString>
#include <QtGui/QFont>
#include <QtGui/QTextBlock>
#include <QtGui/QTextCharFormat>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextDocumentFragment>
#include <QtGui/QTextFragment>
#include <QtGui/QTextTable>
#include <QtGui/QTextTableCell>
#include <QtGui/QTextTableCellFormat>
#include <QtGui/QTextLength>
#include <QtGui/QTextTableFormat>

namespace NotesRichTables {
namespace {
enum class TableAction {
    RowBefore,
    RowAfter,
    DeleteRow,
    ColumnBefore,
    ColumnAfter,
    DeleteColumn,
    MoveRowUp,
    MoveRowDown,
    MoveColumnLeft,
    MoveColumnRight,
    DeleteTable
};

bool parseAction(const QString &action, TableAction &result) {
    if (action == "rowBefore") result = TableAction::RowBefore;
    else if (action == "rowAfter") result = TableAction::RowAfter;
    else if (action == "deleteRow") result = TableAction::DeleteRow;
    else if (action == "columnBefore") result = TableAction::ColumnBefore;
    else if (action == "columnAfter") result = TableAction::ColumnAfter;
    else if (action == "deleteColumn") result = TableAction::DeleteColumn;
    else if (action == "moveRowUp") result = TableAction::MoveRowUp;
    else if (action == "moveRowDown") result = TableAction::MoveRowDown;
    else if (action == "moveColumnLeft") result = TableAction::MoveColumnLeft;
    else if (action == "moveColumnRight") result = TableAction::MoveColumnRight;
    else if (action == "deleteTable") result = TableAction::DeleteTable;
    else return false;
    return true;
}

QTextCharFormat normalizeHeaderCharacterFormat(QTextCharFormat format, bool header, bool empty) {
    const int state = format.intProperty(NotesRichFormat::TableHeaderBoldState);
    const bool wasBold = format.fontWeight() >= QFont::Bold;
    if (!header) {
        if (state == NotesRichFormat::TableHeaderGeneratedBold) format.setFontWeight(QFont::Normal);
        else if (state == NotesRichFormat::TableHeaderExplicitBold) format.setFontWeight(QFont::Bold);
        format.clearProperty(NotesRichFormat::TableHeaderBoldState);
        return format;
    }

    format.setFontWeight(QFont::Bold);
    if (state == NotesRichFormat::TableHeaderGeneratedBold ||
        state == NotesRichFormat::TableHeaderExplicitBold) return format;
    format.setProperty(NotesRichFormat::TableHeaderBoldState,
                       !empty && wasBold ? NotesRichFormat::TableHeaderExplicitBold
                                         : NotesRichFormat::TableHeaderGeneratedBold);
    return format;
}

void applyHeaderSemantics(QTextTable &table, int headerRow) {
    for (int row = 0; row < table.rows(); ++row) {
        for (int column = 0; column < table.columns(); ++column) {
            QTextTableCell cell = table.cellAt(row, column);
            const bool header = row == headerRow;
            QTextTableCellFormat cellFormat;
            cellFormat.merge(cell.format());
            if (header) cellFormat.setFontWeight(QFont::Bold);
            else cellFormat.clearProperty(QTextFormat::FontWeight);
            cell.setFormat(cellFormat);

            bool hasText = false;
            for (auto item = cell.begin(); item != cell.end(); ++item) {
                const QTextBlock block = item.currentBlock();
                if (!block.isValid()) continue;
                for (auto fragmentItem = block.begin(); !fragmentItem.atEnd(); ++fragmentItem) {
                    const QTextFragment fragment = fragmentItem.fragment();
                    if (!fragment.isValid()) continue;
                    hasText = true;
                    const QTextCharFormat format = normalizeHeaderCharacterFormat(fragment.charFormat(), header, false);
                    QTextCursor cursor(block);
                    cursor.setPosition(fragment.position());
                    cursor.setPosition(fragment.position() + fragment.length(), QTextCursor::KeepAnchor);
                    cursor.setCharFormat(format);
                }
            }
            if (!hasText) {
                QTextCursor cursor = cell.firstCursorPosition();
                cursor.setCharFormat(normalizeHeaderCharacterFormat(cursor.charFormat(), header, true));
            }
        }
    }
}

bool removeTable(QTextDocument &document, QTextTable &table) {
    const int start = table.firstPosition();
    const int end = qMin(table.lastPosition() + 1, document.characterCount() - 1);
    if (start < 0 || end <= start) return false;
    QTextCursor cursor(&document);
    cursor.setPosition(start);
    cursor.setPosition(end, QTextCursor::KeepAnchor);
    cursor.removeSelectedText();
    return true;
}

void synchronizeColumnFormat(QTextTable &table) {
    QTextTableFormat format = table.format();
    format.setColumns(table.columns());
    QList<QTextLength> widths = format.columnWidthConstraints();
    if (!widths.isEmpty()) {
        widths.resize(table.columns());
        format.setColumnWidthConstraints(widths);
    }
    table.setFormat(format);
}
}

bool isCellAt(const QTextDocument &document, int position) {
    if (position < 0 || position > document.characterCount() - 1) return false;
    QTextCursor cursor(const_cast<QTextDocument *>(&document));
    cursor.setPosition(position);
    return cursor.currentTable() != nullptr;
}

bool canApplyStructureAction(const QTextDocument &document, int position, const QString &action,
                             int selectionStart, int selectionEnd) {
    if (position < 0 || position > document.characterCount() - 1) return false;
    TableAction parsedAction;
    if (!parseAction(action, parsedAction)) return false;
    QTextTable *table = nullptr;
    NotesRichTableStructureRange::Rectangle rectangle;
    if (!NotesRichTableStructureRange::forSelection(document, position, selectionStart, selectionEnd,
                                                     table, rectangle) || !table) return false;
    QTextCursor cursor(const_cast<QTextDocument *>(&document));
    cursor.setPosition(position);
    const QTextTableCell cell = table->cellAt(cursor);
    if (!cell.isValid() ||
        !NotesRichTableStructureRange::allowsActionWithMergedCells(*table, action)) return false;
    for (const QTextLength &width : table->format().columnWidthConstraints())
        if (width.type() != QTextLength::VariableLength) return false;

    const int headerRow = NotesRichTableStyles::headerRowIndex(*table);
    if (headerRow == -2) return false;
    if (parsedAction == TableAction::DeleteRow) return table->rows() > rectangle.bottom - rectangle.top;
    if (parsedAction == TableAction::DeleteColumn) return table->columns() > rectangle.right - rectangle.left;
    if (parsedAction == TableAction::MoveRowUp) {
        QVector<int> map;
        return NotesRichTableMovement::computeRowMove(*table, rectangle.top, rectangle.bottom, true, map);
    }
    if (parsedAction == TableAction::MoveRowDown) {
        QVector<int> map;
        return NotesRichTableMovement::computeRowMove(*table, rectangle.top, rectangle.bottom, false, map);
    }
    if (parsedAction == TableAction::MoveColumnLeft) {
        QVector<int> map;
        return NotesRichTableMovement::computeColumnMove(*table, rectangle.left, rectangle.right, true, map);
    }
    if (parsedAction == TableAction::MoveColumnRight) {
        QVector<int> map;
        return NotesRichTableMovement::computeColumnMove(*table, rectangle.left, rectangle.right, false, map);
    }
    return true;
}

bool applyStructureAction(QTextDocument &document, int position, const QString &action,
                          int selectionStart, int selectionEnd) {
    if (position < 0 || position > document.characterCount() - 1) return false;
    TableAction parsedAction;
    if (!parseAction(action, parsedAction)) return false;
    if (!canApplyStructureAction(document, position, action, selectionStart, selectionEnd)) return false;
    QTextTable *table = nullptr;
    NotesRichTableStructureRange::Rectangle rectangle;
    if (!NotesRichTableStructureRange::forSelection(document, position, selectionStart, selectionEnd,
                                                     table, rectangle) || !table) return false;
    QTextCursor cursor(&document);
    cursor.setPosition(position);
    const QTextTableCell cell = table->cellAt(cursor);
    if (!cell.isValid()) return false;
    int headerRow = NotesRichTableStyles::headerRowIndex(*table);
    if (headerRow == -2) return false;

    cursor.beginEditBlock();
    switch (parsedAction) {
    case TableAction::RowBefore:
        table->insertRows(rectangle.top, 1);
        if (headerRow >= rectangle.top) ++headerRow;
        break;
    case TableAction::RowAfter: {
        const int insertionRow = rectangle.bottom;
        table->insertRows(insertionRow, 1);
        if (headerRow >= insertionRow) ++headerRow;
        break;
    }
    case TableAction::DeleteRow: {
        const int removedRows = rectangle.bottom - rectangle.top;
        for (int row = rectangle.bottom - 1; row >= rectangle.top; --row)
            table->removeRows(row, 1);
        if (headerRow >= rectangle.bottom) headerRow -= removedRows;
        else if (headerRow >= rectangle.top)
            headerRow = table->rows() > 0 ? qMin(rectangle.top, table->rows() - 1) : -1;
        break;
    }
    case TableAction::ColumnBefore: table->insertColumns(rectangle.left, 1); break;
    case TableAction::ColumnAfter: table->insertColumns(rectangle.right, 1); break;
    case TableAction::DeleteColumn:
        for (int column = rectangle.right - 1; column >= rectangle.left; --column)
            table->removeColumns(column, 1);
        break;
    case TableAction::MoveRowUp: {
        QVector<int> mapRow;
        if (!NotesRichTableMovement::computeRowMove(*table, rectangle.top, rectangle.bottom, true, mapRow)) {
            cursor.endEditBlock();
            return false;
        }
        QVector<int> mapCol(table->columns());
        for (int c = 0; c < table->columns(); ++c) mapCol[c] = c;
        if (!NotesRichTableMovement::applyTablePermutation(*table, mapRow, mapCol)) {
            cursor.endEditBlock();
            return false;
        }
        if (headerRow >= 0 && headerRow < table->rows())
            headerRow = mapRow.at(headerRow);
        break;
    }
    case TableAction::MoveRowDown: {
        QVector<int> mapRow;
        if (!NotesRichTableMovement::computeRowMove(*table, rectangle.top, rectangle.bottom, false, mapRow)) {
            cursor.endEditBlock();
            return false;
        }
        QVector<int> mapCol(table->columns());
        for (int c = 0; c < table->columns(); ++c) mapCol[c] = c;
        if (!NotesRichTableMovement::applyTablePermutation(*table, mapRow, mapCol)) {
            cursor.endEditBlock();
            return false;
        }
        if (headerRow >= 0 && headerRow < table->rows())
            headerRow = mapRow.at(headerRow);
        break;
    }
    case TableAction::MoveColumnLeft: {
        QVector<int> mapCol;
        if (!NotesRichTableMovement::computeColumnMove(*table, rectangle.left, rectangle.right, true, mapCol)) {
            cursor.endEditBlock();
            return false;
        }
        QVector<int> mapRow(table->rows());
        for (int r = 0; r < table->rows(); ++r) mapRow[r] = r;
        if (!NotesRichTableMovement::applyTablePermutation(*table, mapRow, mapCol)) {
            cursor.endEditBlock();
            return false;
        }
        break;
    }
    case TableAction::MoveColumnRight: {
        QVector<int> mapCol;
        if (!NotesRichTableMovement::computeColumnMove(*table, rectangle.left, rectangle.right, false, mapCol)) {
            cursor.endEditBlock();
            return false;
        }
        QVector<int> mapRow(table->rows());
        for (int r = 0; r < table->rows(); ++r) mapRow[r] = r;
        if (!NotesRichTableMovement::applyTablePermutation(*table, mapRow, mapCol)) {
            cursor.endEditBlock();
            return false;
        }
        break;
    }
    case TableAction::DeleteTable: {
        const bool removed = removeTable(document, *table);
        cursor.endEditBlock();
        return removed;
    }
    }
    synchronizeColumnFormat(*table);
    applyHeaderSemantics(*table, headerRow);
    NotesRichTableStyles::apply(*table);
    cursor.endEditBlock();
    return true;
}
}
