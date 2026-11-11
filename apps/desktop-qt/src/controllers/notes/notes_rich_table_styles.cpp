#include "notes_rich_table_styles.h"
#include "notes_rich_table_cell_formatting.h"

#include <QtGui/QBrush>
#include <QtGui/QColor>
#include <QtGui/QTextBlock>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFrame>
#include <QtGui/QTextLength>
#include <QtGui/QTextTable>
#include <QtGui/QFont>

namespace NotesRichTableStyles {
namespace {
const QColor TableBorderColor(255, 255, 255, 102);
const QColor HeaderBackgroundColor(255, 255, 255, 13);
}

bool isBorderBrush(const QBrush &brush) {
    return brush.color() == TableBorderColor;
}

bool isHeaderBackground(const QBrush &brush) {
    return brush.color() == HeaderBackgroundColor;
}

void apply(QTextTable &table) {
    const bool hasHeaderRow = table.rows() > 0 && table.columns() > 0 &&
        table.cellAt(0, 0).format().fontWeight() >= QFont::Bold;
    QTextTableFormat tableFormat = table.format();
    tableFormat.setBorder(1.0);
    tableFormat.setBorderStyle(QTextFrameFormat::BorderStyle_Solid);
    tableFormat.setBorderBrush(TableBorderColor);
    tableFormat.setTopMargin(16.0);
    tableFormat.setBottomMargin(16.0);
    tableFormat.setLeftMargin(0.0);
    tableFormat.setRightMargin(0.0);
    tableFormat.setWidth(QTextLength(QTextLength::PercentageLength, 100.0));
    tableFormat.setCellSpacing(0.0);
    tableFormat.setCellPadding(0.0);
    tableFormat.setBorderCollapse(true);
    table.setFormat(tableFormat);

    for (int row = 0; row < table.rows(); ++row) {
        for (int column = 0; column < table.columns(); ++column) {
            QTextTableCell cell = table.cellAt(row, column);
            QTextTableCellFormat cellFormat;
            cellFormat.merge(cell.format());
            cellFormat.setBorder(1.0);
            cellFormat.setBorderStyle(QTextFrameFormat::BorderStyle_Solid);
            cellFormat.setBorderBrush(TableBorderColor);
            cellFormat.setTopPadding(8.0);
            cellFormat.setBottomPadding(8.0);
            cellFormat.setLeftPadding(12.0);
            cellFormat.setRightPadding(12.0);
            const QBrush existingBackground = cell.format().background();
            const bool hasCustomBackground = NotesRichTableCellFormatting::isSupportedBackground(existingBackground) &&
                !isHeaderBackground(existingBackground);
            if (hasCustomBackground) cellFormat.setBackground(existingBackground);
            else if (hasHeaderRow && row == 0) cellFormat.setBackground(HeaderBackgroundColor);
            else cellFormat.clearProperty(QTextFormat::BackgroundBrush);
            cell.setFormat(cellFormat);

            for (auto item = cell.begin(); item != cell.end(); ++item) {
                const QTextBlock block = item.currentBlock();
                if (!block.isValid()) continue;
                QTextBlockFormat blockFormat = block.blockFormat();
                blockFormat.setAlignment(Qt::AlignLeft);
                blockFormat.setTopMargin(0.0);
                blockFormat.setBottomMargin(4.0);
                QTextCursor cursor(block);
                cursor.setBlockFormat(blockFormat);
            }
        }
    }
}

void prepare(QTextDocument &document) {
    document.setUndoRedoEnabled(false);
    for (QTextFrame *frame : document.rootFrame()->childFrames()) {
        if (auto *table = qobject_cast<QTextTable *>(frame)) apply(*table);
    }
    document.setUndoRedoEnabled(true);
    document.setModified(false);
}
}
