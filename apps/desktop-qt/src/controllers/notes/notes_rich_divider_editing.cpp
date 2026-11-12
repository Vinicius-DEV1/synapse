#include "notes_rich_divider_editing.h"

#include "notes_rich_format.h"

#include <QtGui/QTextBlock>
#include <QtGui/QTextBlockFormat>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextDocumentFragment>
#include <QtGui/QTextFormat>
#include <QtGui/QTextTable>
#include <QtGui/QTextTableCell>

namespace NotesRichDividerEditing {
namespace {
bool isDividerBlock(const QTextBlock &block) {
    return block.isValid() && !block.textList() &&
        block.blockFormat().hasProperty(QTextFormat::BlockTrailingHorizontalRulerWidth);
}

QTextBlock splitEmbeddedDivider(QTextDocument &document, const QTextBlock &divider) {
    if (divider.text().isEmpty()) return divider;
    QTextBlockFormat paragraphFormat = divider.blockFormat();
    paragraphFormat.clearProperty(QTextFormat::BlockTrailingHorizontalRulerWidth);
    paragraphFormat.setTopMargin(12.0);
    paragraphFormat.setBottomMargin(12.0);
    QTextCursor split(&document);
    split.setPosition(divider.position());
    split.insertBlock(paragraphFormat);
    return document.findBlock(divider.position());
}

QTextCursor contentCursor(const QTextBlock &block) {
    QTextCursor cursor(block);
    cursor.setPosition(block.position());
    cursor.setPosition(block.position() + block.length() - 1, QTextCursor::KeepAnchor);
    return cursor;
}

bool isMovableNeighbor(const QTextBlock &divider, const QTextBlock &neighbor) {
    if (!isDividerBlock(divider) || !neighbor.isValid() || neighbor.textList() ||
        neighbor.blockFormat().intProperty(NotesRichFormat::ListItemGroup) > 0 ||
        neighbor.blockFormat().hasProperty(NotesRichFormat::TaskItemChecked) || isDividerBlock(neighbor)) return false;

    QTextCursor dividerCursor(divider);
    QTextCursor neighborCursor(neighbor);
    if (dividerCursor.currentFrame() != neighborCursor.currentFrame()) return false;

    QTextTable *dividerTable = dividerCursor.currentTable();
    QTextTable *neighborTable = neighborCursor.currentTable();
    if (dividerTable != neighborTable) return false;
    if (dividerTable) {
        const QTextTableCell dividerCell = dividerTable->cellAt(dividerCursor);
        const QTextTableCell neighborCell = neighborTable->cellAt(neighborCursor);
        if (!dividerCell.isValid() || !neighborCell.isValid() || dividerCell.row() != neighborCell.row() ||
            dividerCell.column() != neighborCell.column()) return false;
    }
    return true;
}
}

bool isDividerAt(const QTextDocument &document, int position) {
    if (position < 0 || position >= document.characterCount()) return false;
    return isDividerBlock(document.findBlock(position));
}

bool canMove(const QTextDocument &document, int position, bool upward) {
    if (!isDividerAt(document, position)) return false;
    const QTextBlock divider = document.findBlock(position);
    if (!upward && !divider.text().isEmpty()) return true;
    const QTextBlock neighbor = upward ? divider.previous() : divider.next();
    return isMovableNeighbor(divider, neighbor);
}

int move(QTextDocument &document, int position, bool upward) {
    if (!canMove(document, position, upward)) return -1;

    QTextBlock divider = document.findBlock(position);
    QTextCursor edit(&document);
    edit.beginEditBlock();
    divider = splitEmbeddedDivider(document, divider);
    const QTextBlock neighbor = upward ? divider.previous() : divider.next();
    if (!isMovableNeighbor(divider, neighbor)) {
        edit.endEditBlock();
        return -1;
    }
    const QTextBlock first = upward ? neighbor : divider;
    const QTextBlock second = upward ? divider : neighbor;
    QTextCursor firstContent = contentCursor(first);
    QTextCursor secondContent = contentCursor(second);
    const QTextDocumentFragment firstFragment(firstContent);
    const QTextDocumentFragment secondFragment(secondContent);
    const QTextBlockFormat firstFormat = first.blockFormat();
    const QTextBlockFormat secondFormat = second.blockFormat();

    firstContent.removeSelectedText();
    secondContent.removeSelectedText();
    QTextCursor firstStart(first);
    firstStart.insertFragment(secondFragment);
    QTextCursor secondStart(second);
    secondStart.insertFragment(firstFragment);
    QTextCursor firstFormatCursor(first);
    firstFormatCursor.setBlockFormat(secondFormat);
    QTextCursor secondFormatCursor(second);
    secondFormatCursor.setBlockFormat(firstFormat);
    edit.endEditBlock();
    return upward ? first.position() : second.position();
}

int insertParagraphBelow(QTextDocument &document, int position) {
    if (!isDividerAt(document, position)) return -1;
    QTextBlock divider = document.findBlock(position);
    QTextCursor cursor(&document);
    cursor.beginEditBlock();
    divider = splitEmbeddedDivider(document, divider);
    const QTextBlock following = divider.next();
    const QTextBlockFormat followingFormat = following.isValid() ? following.blockFormat() : QTextBlockFormat();
    const int paragraphStart = qMin(divider.position() + divider.length(), document.characterCount() - 1);
    cursor.setPosition(paragraphStart);
    QTextBlockFormat paragraphFormat;
    paragraphFormat.setTopMargin(12.0);
    paragraphFormat.setBottomMargin(12.0);
    cursor.insertBlock(paragraphFormat);
    QTextBlock insertedParagraph = divider.next();
    const int paragraphPosition = insertedParagraph.isValid() ? insertedParagraph.position() : -1;
    if (insertedParagraph.isValid()) {
        QTextCursor insertedCursor(insertedParagraph);
        insertedCursor.setBlockFormat(paragraphFormat);
        QTextBlock originalFollowing = insertedParagraph.next();
        if (originalFollowing.isValid()) {
            QTextCursor originalCursor(originalFollowing);
            originalCursor.setBlockFormat(followingFormat);
        }
    }
    cursor.endEditBlock();
    return paragraphPosition;
}
}
