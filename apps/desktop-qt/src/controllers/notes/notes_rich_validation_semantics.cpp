#include "notes_rich_validation_semantics.h"

#include <QtGui/QTextBlock>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFrame>
#include <QtGui/QTextFormat>
#include <QtGui/QTextTable>

namespace NotesRichValidationSemantics {
namespace {
bool hasHorizontalRule(const QTextBlock &block) {
    return block.isValid() && block.blockFormat().hasProperty(QTextFormat::BlockTrailingHorizontalRulerWidth);
}

void appendBlock(QString &text, const QString &blockText, bool &hasPrevious, QChar separator) {
    if (hasPrevious) text += separator;
    text += blockText;
    hasPrevious = true;
}
}

bool matchesText(const QTextDocument &document, const QString &expected, QChar blockSeparator) {
    QString actual;
    bool hasPrevious = false;
    bool skipTableSeparator = false;
    for (auto item = document.rootFrame()->begin(); !item.atEnd(); ++item) {
        if (QTextFrame *frame = item.currentFrame()) {
            const auto *table = qobject_cast<QTextTable *>(frame);
            if (!table) return false;
            for (int row = 0; row < table->rows(); ++row) {
                for (int column = 0; column < table->columns(); ++column) {
                    const QTextTableCell cell = table->cellAt(row, column);
                    if (cell.row() != row || cell.column() != column) continue;
                    for (auto cellItem = cell.begin(); cellItem != cell.end(); ++cellItem) {
                        if (cellItem.currentFrame()) return false;
                        const QTextBlock block = cellItem.currentBlock();
                        if (block.isValid()) appendBlock(actual, block.text(), hasPrevious, blockSeparator);
                    }
                }
            }
            skipTableSeparator = true;
            continue;
        }
        const QTextBlock block = item.currentBlock();
        if (!block.isValid()) continue;
        if (skipTableSeparator) {
            skipTableSeparator = false;
            if (block.text().isEmpty() && !block.textList() && block.blockFormat().properties().isEmpty()) continue;
        }
        if (block.position() == 0 && block.text().isEmpty() && block.blockFormat().properties().isEmpty()) {
            auto next = item;
            ++next;
            if (next.currentFrame() && qobject_cast<QTextTable *>(next.currentFrame())) continue;
        }
        if (hasHorizontalRule(block)) appendBlock(actual, QString(), hasPrevious, blockSeparator);
        if (!hasHorizontalRule(block) || !block.text().isEmpty())
            appendBlock(actual, block.text(), hasPrevious, blockSeparator);
    }
    return actual == expected;
}

int embeddedDividerCount(const QTextDocument &document) {
    int count = 0;
    for (auto item = document.rootFrame()->begin(); !item.atEnd(); ++item) {
        const QTextBlock block = item.currentBlock();
        if (hasHorizontalRule(block) && !block.text().isEmpty()) ++count;
    }
    return count;
}
}
