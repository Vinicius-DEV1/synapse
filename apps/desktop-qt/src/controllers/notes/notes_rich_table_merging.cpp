#include "notes_rich_table_merging.h"

#include "notes_rich_table_styles.h"

#include <QtGui/QFont>
#include <QtCore/QRegularExpression>
#include <QtCore/QXmlStreamReader>
#include <QtCore/QVector>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextTable>
#include <QtGui/QTextTableCell>

namespace NotesRichTableMerging {
namespace {
struct Operation {
    QTextTable *table = nullptr;
    int row = -1;
    int column = -1;
    int rows = 0;
    int columns = 0;
    bool merge = false;
};

int spanAttribute(const QXmlStreamAttributes &attributes, const QString &name, bool *valid) {
    if (!attributes.hasAttribute(name)) {
        *valid = true;
        return 1;
    }
    static const QRegularExpression pattern(QStringLiteral("^[1-9][0-9]?$"));
    const QString value = attributes.value(name).toString();
    if (!pattern.match(value).hasMatch()) {
        *valid = false;
        return 0;
    }
    const int span = value.toInt(valid);
    if (!*valid || span > MaxSupportedCellSpan) *valid = false;
    return span;
}

QTextTable *tableAt(QTextDocument &document, int position) {
    if (position < 0 || position >= document.characterCount()) return nullptr;
    QTextCursor cursor(&document);
    cursor.setPosition(position);
    return cursor.currentTable();
}

bool validSpan(const QTextTableCell &cell, const QTextTable &table) {
    return isSupportedCellSpan(cell) && cell.row() + cell.rowSpan() <= table.rows() &&
        cell.column() + cell.columnSpan() <= table.columns();
}

bool resolveOperation(QTextDocument &document, int cursorPosition,
                      int selectionStart, int selectionEnd, Operation &operation) {
    if (selectionStart < 0 || selectionEnd < selectionStart ||
        selectionEnd > document.characterCount() - 1 || cursorPosition < 0 ||
        cursorPosition > document.characterCount() - 1) return false;

    QTextTable *activeTable = tableAt(document, cursorPosition);
    if (!activeTable && selectionEnd > selectionStart) activeTable = tableAt(document, selectionStart);
    if (!activeTable) return false;

    if (selectionEnd > selectionStart) {
        QTextTable *startTable = tableAt(document, selectionStart);
        QTextTable *endTable = tableAt(document, selectionEnd - 1);
        if (startTable != activeTable || endTable != activeTable) return false;
        QTextCursor selection(&document);
        selection.setPosition(selectionStart);
        selection.setPosition(selectionEnd, QTextCursor::KeepAnchor);
        int firstRow = -1;
        int rowCount = 0;
        int firstColumn = -1;
        int columnCount = 0;
        selection.selectedTableCells(&firstRow, &rowCount, &firstColumn, &columnCount);
        if (rowCount > 0 && columnCount > 0 && rowCount * columnCount > 1) {
            const int headerRow = NotesRichTableStyles::headerRowIndex(*activeTable);
            if (headerRow == -2 || firstRow < 0 || firstColumn < 0 ||
                firstRow + rowCount > activeTable->rows() ||
                firstColumn + columnCount > activeTable->columns() ||
                (headerRow >= 0 && firstRow <= headerRow && firstRow + rowCount > headerRow + 1))
                return false;

            bool header = false;
            for (int row = firstRow; row < firstRow + rowCount; ++row) {
                for (int column = firstColumn; column < firstColumn + columnCount; ++column) {
                    const QTextTableCell cell = activeTable->cellAt(row, column);
                    if (!validSpan(cell, *activeTable) || cell.row() != row || cell.column() != column ||
                        cell.rowSpan() != 1 || cell.columnSpan() != 1) return false;
                    const bool currentHeader = cell.format().fontWeight() >= QFont::Bold;
                    if (row == firstRow && column == firstColumn) header = currentHeader;
                    else if (currentHeader != header) return false;
                }
            }
            operation = {activeTable, firstRow, firstColumn, rowCount, columnCount, true};
            return true;
        }
    }

    QTextCursor activeCursor(&document);
    activeCursor.setPosition(cursorPosition);
    QTextTableCell cell = activeTable->cellAt(activeCursor);
    if (!validSpan(cell, *activeTable) || (cell.rowSpan() == 1 && cell.columnSpan() == 1)) return false;
    const int headerRow = NotesRichTableStyles::headerRowIndex(*activeTable);
    if (headerRow == -2 || (headerRow >= 0 && cell.row() <= headerRow &&
                            cell.row() + cell.rowSpan() > headerRow + 1)) return false;
    operation = {activeTable, cell.row(), cell.column(), 1, 1, false};
    return true;
}
}

bool isSupportedCellSpan(const QTextTableCell &cell) {
    return cell.isValid() && cell.rowSpan() >= 1 && cell.rowSpan() <= MaxSupportedCellSpan &&
        cell.columnSpan() >= 1 && cell.columnSpan() <= MaxSupportedCellSpan;
}

QString htmlSpanAttributes(const QTextTableCell &cell) {
    QString attributes;
    if (cell.columnSpan() > 1) attributes += QStringLiteral(" colspan=\"%1\"").arg(cell.columnSpan());
    if (cell.rowSpan() > 1) attributes += QStringLiteral(" rowspan=\"%1\"").arg(cell.rowSpan());
    return attributes;
}

bool supportsSourceSpans(const QString &source) {
    QXmlStreamReader xml(QStringLiteral("<root>") + source + QStringLiteral("</root>"));
    QVector<QVector<bool>> occupied;
    int tableRows = 0;
    int tableColumns = -1;
    bool insideTable = false;
    bool insideRow = false;
    while (!xml.atEnd()) {
        xml.readNext();
        if (xml.isStartElement()) {
            const QString name = xml.name().toString();
            if (name == QStringLiteral("table")) {
                if (insideTable) return false;
                insideTable = true;
                tableRows = 0;
                tableColumns = -1;
                occupied.clear();
            } else if (name == QStringLiteral("tr") && insideTable) {
                if (insideRow) return false;
                insideRow = true;
                if (occupied.size() <= tableRows) occupied.resize(tableRows + 1);
            } else if ((name == QStringLiteral("td") || name == QStringLiteral("th")) && insideRow) {
                bool validColumnSpan = false;
                bool validRowSpan = false;
                const int columnSpan = spanAttribute(xml.attributes(), QStringLiteral("colspan"), &validColumnSpan);
                const int rowSpan = spanAttribute(xml.attributes(), QStringLiteral("rowspan"), &validRowSpan);
                if (!validColumnSpan || !validRowSpan || (name == QStringLiteral("th") && rowSpan > 1))
                    return false;
                int column = 0;
                while (column < occupied.at(tableRows).size() && occupied.at(tableRows).at(column)) ++column;
                if (tableColumns >= 0 && column + columnSpan > tableColumns) return false;
                for (int row = tableRows; row < tableRows + rowSpan; ++row) {
                    if (occupied.size() <= row) occupied.resize(row + 1);
                    if (occupied[row].size() < column + columnSpan)
                        occupied[row].resize(column + columnSpan);
                    for (int slot = column; slot < column + columnSpan; ++slot) {
                        if (occupied.at(row).at(slot)) return false;
                        occupied[row][slot] = true;
                    }
                }
            }
        } else if (xml.isEndElement()) {
            const QString name = xml.name().toString();
            if (name == QStringLiteral("tr") && insideRow) {
                const QVector<bool> row = occupied.at(tableRows);
                int width = row.size();
                while (width > 0 && !row.at(width - 1)) --width;
                if (width == 0) return false;
                if (tableColumns < 0) tableColumns = width;
                if (width != tableColumns) return false;
                for (int column = 0; column < tableColumns; ++column)
                    if (column >= row.size() || !row.at(column)) return false;
                ++tableRows;
                insideRow = false;
            } else if (name == QStringLiteral("table") && insideTable) {
                if (tableRows == 0 || tableColumns < 1) return false;
                for (int row = tableRows; row < occupied.size(); ++row)
                    for (bool cell : occupied.at(row))
                        if (cell) return false;
                insideTable = false;
            }
        }
    }
    return !xml.hasError() && !insideTable && !insideRow;
}

bool canMergeOrSplit(const QTextDocument &document, int cursorPosition,
                     int selectionStart, int selectionEnd) {
    Operation operation;
    return resolveOperation(*const_cast<QTextDocument *>(&document), cursorPosition,
                             selectionStart, selectionEnd, operation);
}

bool mergeOrSplit(QTextDocument &document, int cursorPosition,
                  int selectionStart, int selectionEnd) {
    Operation operation;
    if (!resolveOperation(document, cursorPosition, selectionStart, selectionEnd, operation)) return false;
    QTextCursor transaction(&document);
    transaction.beginEditBlock();
    if (operation.merge)
        operation.table->mergeCells(operation.row, operation.column, operation.rows, operation.columns);
    else
        operation.table->splitCell(operation.row, operation.column, operation.rows, operation.columns);
    NotesRichTableStyles::apply(*operation.table);
    transaction.endEditBlock();
    return true;
}
}
