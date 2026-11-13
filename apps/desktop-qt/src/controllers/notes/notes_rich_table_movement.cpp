#include "notes_rich_table_movement.h"

#include "notes_rich_table_merging.h"

#include <QtCore/QtGlobal>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocumentFragment>
#include <QtGui/QTextLength>
#include <QtGui/QTextTable>
#include <QtGui/QTextTableCell>
#include <QtGui/QTextTableCellFormat>
#include <QtGui/QTextTableFormat>

namespace NotesRichTableMovement {
namespace {
struct LogicalCellSnapshot {
    int oldRow = 0;
    int oldCol = 0;
    int rowSpan = 1;
    int colSpan = 1;
    QTextTableCellFormat format;
    QTextDocumentFragment content;
};

bool expandRowRange(const QTextTable &table, int &top, int &bottom) {
    bool changed = true;
    while (changed) {
        changed = false;
        for (int r = top; r < bottom; ++r) {
            for (int c = 0; c < table.columns(); ++c) {
                const QTextTableCell cell = table.cellAt(r, c);
                if (!cell.isValid() || !NotesRichTableMerging::isSupportedCellSpan(cell) ||
                    cell.row() < 0 || cell.column() < 0 ||
                    cell.row() + cell.rowSpan() > table.rows() ||
                    cell.column() + cell.columnSpan() > table.columns())
                    return false;
                const int expTop = qMin(top, cell.row());
                const int expBottom = qMax(bottom, cell.row() + cell.rowSpan());
                if (expTop != top || expBottom != bottom) {
                    changed = true;
                    top = expTop;
                    bottom = expBottom;
                }
            }
        }
    }
    return top >= 0 && bottom <= table.rows() && top < bottom;
}

bool expandColumnRange(const QTextTable &table, int &left, int &right) {
    bool changed = true;
    while (changed) {
        changed = false;
        for (int c = left; c < right; ++c) {
            for (int r = 0; r < table.rows(); ++r) {
                const QTextTableCell cell = table.cellAt(r, c);
                if (!cell.isValid() || !NotesRichTableMerging::isSupportedCellSpan(cell) ||
                    cell.column() < 0 || cell.column() < 0 ||
                    cell.row() + cell.rowSpan() > table.rows() ||
                    cell.column() + cell.columnSpan() > table.columns())
                    return false;
                const int expLeft = qMin(left, cell.column());
                const int expRight = qMax(right, cell.column() + cell.columnSpan());
                if (expLeft != left || expRight != right) {
                    changed = true;
                    left = expLeft;
                    right = expRight;
                }
            }
        }
    }
    return left >= 0 && right <= table.columns() && left < right;
}
}

bool computeRowMove(const QTextTable &table, int originTop, int originBottom, bool moveUp,
                    QVector<int> &mapRow) {
    if (originTop < 0 || originBottom <= originTop || originBottom > table.rows() ||
        table.columns() < 1) return false;

    if (!expandRowRange(table, originTop, originBottom)) return false;

    if (moveUp) {
        if (originTop <= 0) return false;
        int targetTop = originTop - 1;
        int targetBottom = originTop;
        if (!expandRowRange(table, targetTop, targetBottom)) return false;
        if (targetTop < 0 || targetBottom > originTop) return false;

        mapRow.resize(table.rows());
        for (int r = 0; r < targetTop; ++r) mapRow[r] = r;
        const int originCount = originBottom - originTop;
        for (int r = originTop; r < originBottom; ++r)
            mapRow[r] = targetTop + (r - originTop);
        for (int r = targetTop; r < originTop; ++r)
            mapRow[r] = targetTop + originCount + (r - targetTop);
        for (int r = originBottom; r < table.rows(); ++r)
            mapRow[r] = r;
        return true;
    }

    if (originBottom >= table.rows()) return false;
    int targetTop = originBottom;
    int targetBottom = originBottom + 1;
    if (!expandRowRange(table, targetTop, targetBottom)) return false;
    if (targetTop < originBottom || targetBottom > table.rows()) return false;

    mapRow.resize(table.rows());
    for (int r = 0; r < originTop; ++r) mapRow[r] = r;
    const int targetCount = targetBottom - originBottom;
    for (int r = originBottom; r < targetBottom; ++r)
        mapRow[r] = originTop + (r - originBottom);
    for (int r = originTop; r < originBottom; ++r)
        mapRow[r] = originTop + targetCount + (r - originTop);
    for (int r = targetBottom; r < table.rows(); ++r)
        mapRow[r] = r;
    return true;
}

bool computeColumnMove(const QTextTable &table, int originLeft, int originRight, bool moveLeft,
                       QVector<int> &mapCol) {
    if (originLeft < 0 || originRight <= originLeft || originRight > table.columns() ||
        table.rows() < 1) return false;

    if (!expandColumnRange(table, originLeft, originRight)) return false;

    if (moveLeft) {
        if (originLeft <= 0) return false;
        int targetLeft = originLeft - 1;
        int targetRight = originLeft;
        if (!expandColumnRange(table, targetLeft, targetRight)) return false;
        if (targetLeft < 0 || targetRight > originLeft) return false;

        mapCol.resize(table.columns());
        for (int c = 0; c < targetLeft; ++c) mapCol[c] = c;
        const int originCount = originRight - originLeft;
        for (int c = originLeft; c < originRight; ++c)
            mapCol[c] = targetLeft + (c - originLeft);
        for (int c = targetLeft; c < originLeft; ++c)
            mapCol[c] = targetLeft + originCount + (c - targetLeft);
        for (int c = originRight; c < table.columns(); ++c)
            mapCol[c] = c;
        return true;
    }

    if (originRight >= table.columns()) return false;
    int targetLeft = originRight;
    int targetRight = originRight + 1;
    if (!expandColumnRange(table, targetLeft, targetRight)) return false;
    if (targetLeft < originRight || targetRight > table.columns()) return false;

    mapCol.resize(table.columns());
    for (int c = 0; c < originLeft; ++c) mapCol[c] = c;
    const int targetCount = targetRight - originRight;
    for (int c = originRight; c < targetRight; ++c)
        mapCol[c] = originLeft + (c - originRight);
    for (int c = originLeft; c < originRight; ++c)
        mapCol[c] = originLeft + targetCount + (c - originLeft);
    for (int c = targetRight; c < table.columns(); ++c)
        mapCol[c] = c;
    return true;
}

bool applyTablePermutation(QTextTable &table, const QVector<int> &mapRow,
                           const QVector<int> &mapCol) {
    if (mapRow.size() != table.rows() || mapCol.size() != table.columns()) return false;

    QVector<LogicalCellSnapshot> snapshots;
    snapshots.reserve(table.rows() * table.columns());
    for (int r = 0; r < table.rows(); ++r) {
        for (int c = 0; c < table.columns(); ++c) {
            const QTextTableCell cell = table.cellAt(r, c);
            if (!cell.isValid() || !NotesRichTableMerging::isSupportedCellSpan(cell)) return false;
            if (cell.row() == r && cell.column() == c) {
                LogicalCellSnapshot snap;
                snap.oldRow = r;
                snap.oldCol = c;
                snap.rowSpan = cell.rowSpan();
                snap.colSpan = cell.columnSpan();
                snap.format.merge(cell.format());
                QTextCursor cursor = cell.firstCursorPosition();
                cursor.setPosition(cell.lastCursorPosition().position(), QTextCursor::KeepAnchor);
                snap.content = QTextDocumentFragment(cursor);
                snapshots.append(snap);
            }
        }
    }

    // Split all merged cells to unit cells first
    for (const LogicalCellSnapshot &snap : snapshots) {
        if (snap.rowSpan > 1 || snap.colSpan > 1) {
            table.splitCell(snap.oldRow, snap.oldCol, 1, 1);
        }
    }

    // Clear content of all unit cells
    for (int r = 0; r < table.rows(); ++r) {
        for (int c = 0; c < table.columns(); ++c) {
            QTextTableCell cell = table.cellAt(r, c);
            QTextCursor cursor = cell.firstCursorPosition();
            cursor.setPosition(cell.lastCursorPosition().position(), QTextCursor::KeepAnchor);
            if (cursor.hasSelection()) cursor.removeSelectedText();
        }
    }

    // Restore cell formatting and content at the permuted coordinates
    for (const LogicalCellSnapshot &snap : snapshots) {
        const int newR = mapRow.at(snap.oldRow);
        const int newC = mapCol.at(snap.oldCol);
        QTextTableCell cell = table.cellAt(newR, newC);
        cell.setFormat(snap.format);
        if (!snap.content.isEmpty()) {
            QTextCursor cursor = cell.firstCursorPosition();
            cursor.insertFragment(snap.content);
        }
    }

    // Re-merge multi-span cells at their new positions
    for (const LogicalCellSnapshot &snap : snapshots) {
        if (snap.rowSpan > 1 || snap.colSpan > 1) {
            const int newR = mapRow.at(snap.oldRow);
            const int newC = mapCol.at(snap.oldCol);
            table.mergeCells(newR, newC, snap.rowSpan, snap.colSpan);
        }
    }

    // Permute explicit column width constraints if defined
    QTextTableFormat tableFormat = table.format();
    QList<QTextLength> widths = tableFormat.columnWidthConstraints();
    if (widths.size() == table.columns()) {
        QList<QTextLength> newWidths = widths;
        for (int c = 0; c < table.columns(); ++c)
            newWidths[mapCol.at(c)] = widths.at(c);
        tableFormat.setColumnWidthConstraints(newWidths);
        table.setFormat(tableFormat);
    }

    return true;
}
}
