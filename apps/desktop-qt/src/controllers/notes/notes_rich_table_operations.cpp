#include "notes_rich_tables.h"

#include "notes_rich_format.h"
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

struct CellSnapshot {
    QTextTableCellFormat format;
    QTextDocumentFragment content;
};

CellSnapshot snapshotCell(const QTextTableCell &cell) {
    CellSnapshot snapshot;
    snapshot.format.merge(cell.format());
    QTextCursor cursor = cell.firstCursorPosition();
    cursor.setPosition(cell.lastCursorPosition().position(), QTextCursor::KeepAnchor);
    snapshot.content = QTextDocumentFragment(cursor);
    return snapshot;
}

void restoreCell(QTextTableCell cell, const CellSnapshot &snapshot) {
    cell.setFormat(snapshot.format);
    QTextCursor cursor = cell.firstCursorPosition();
    cursor.setPosition(cell.lastCursorPosition().position(), QTextCursor::KeepAnchor);
    if (cursor.hasSelection()) cursor.removeSelectedText();
    if (!snapshot.content.isEmpty()) cursor.insertFragment(snapshot.content);
}

void moveRow(QTextTable &table, int from, int to) {
    QVector<CellSnapshot> cells;
    cells.reserve(table.columns());
    for (int column = 0; column < table.columns(); ++column)
        cells.append(snapshotCell(table.cellAt(from, column)));
    const int insertion = to < from ? to : to + 1;
    table.insertRows(insertion, 1);
    for (int column = 0; column < cells.size(); ++column)
        restoreCell(table.cellAt(insertion, column), cells.at(column));
    table.removeRows(to < from ? from + 1 : from, 1);
}

void moveColumn(QTextTable &table, int from, int to) {
    QVector<CellSnapshot> cells;
    cells.reserve(table.rows());
    for (int row = 0; row < table.rows(); ++row)
        cells.append(snapshotCell(table.cellAt(row, from)));
    const int insertion = to < from ? to : to + 1;
    table.insertColumns(insertion, 1);
    for (int row = 0; row < cells.size(); ++row)
        restoreCell(table.cellAt(row, insertion), cells.at(row));
    table.removeColumns(to < from ? from + 1 : from, 1);
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

int movedRowIndex(int movedFrom, int movedTo, int rowIndex) {
    if (rowIndex < 0) return -1;
    if (rowIndex == movedFrom) return movedTo;
    if (movedFrom < movedTo && rowIndex > movedFrom && rowIndex <= movedTo) return rowIndex - 1;
    if (movedFrom > movedTo && rowIndex >= movedTo && rowIndex < movedFrom) return rowIndex + 1;
    return rowIndex;
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
    if (parsedAction == TableAction::MoveRowUp) return rectangle.top > 0;
    if (parsedAction == TableAction::MoveRowDown) return rectangle.bottom < table->rows();
    if (parsedAction == TableAction::MoveColumnLeft) return rectangle.left > 0;
    if (parsedAction == TableAction::MoveColumnRight) return rectangle.right < table->columns();
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
    case TableAction::MoveRowUp:
        moveRow(*table, rectangle.top, rectangle.top - 1);
        headerRow = movedRowIndex(rectangle.top, rectangle.top - 1, headerRow);
        break;
    case TableAction::MoveRowDown:
        moveRow(*table, rectangle.top, rectangle.bottom);
        headerRow = movedRowIndex(rectangle.top, rectangle.bottom, headerRow);
        break;
    case TableAction::MoveColumnLeft: moveColumn(*table, rectangle.left, rectangle.left - 1); break;
    case TableAction::MoveColumnRight: moveColumn(*table, rectangle.left, rectangle.right); break;
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
