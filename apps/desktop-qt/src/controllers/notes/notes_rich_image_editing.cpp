#include "notes_rich_image_editing.h"

#include "notes_rich_format.h"
#include "notes_rich_images.h"

#include <QtGui/QTextBlock>
#include <QtGui/QTextBlockFormat>
#include <QtGui/QTextCharFormat>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextDocumentFragment>
#include <QtGui/QTextFormat>
#include <QtGui/QTextFragment>
#include <QtGui/QTextTable>
#include <QtGui/QTextTableCell>

namespace NotesRichImageEditing {
namespace {

bool imageBlockAt(const QTextDocument &document, int position, QTextBlock *block = nullptr) {
    const QVariantMap state = NotesRichImages::imageAt(document, position, position, position);
    if (!state.value(QStringLiteral("valid")).toBool() ||
        state.value(QStringLiteral("position")).toInt() != position) return false;
    const QTextBlock imageBlock = document.findBlock(position);
    if (!imageBlock.isValid()) return false;
    if (block) *block = imageBlock;
    return true;
}

bool shareEditableRegion(const QTextBlock &left, const QTextBlock &right) {
    if (!left.isValid() || !right.isValid()) return false;
    const QTextCursor leftCursor(left);
    const QTextCursor rightCursor(right);
    if (leftCursor.currentFrame() != rightCursor.currentFrame()) return false;
    QTextTable *leftTable = leftCursor.currentTable();
    QTextTable *rightTable = rightCursor.currentTable();
    if (leftTable != rightTable) return false;
    if (!leftTable) return true;
    const QTextTableCell leftCell = leftTable->cellAt(leftCursor);
    const QTextTableCell rightCell = rightTable->cellAt(rightCursor);
    return leftCell.isValid() && rightCell.isValid() && leftCell.row() == rightCell.row() &&
        leftCell.column() == rightCell.column();
}

bool isImageBlock(const QTextBlock &block) {
    if (!block.isValid()) return false;
    for (auto it = block.begin(); !it.atEnd(); ++it) {
        const QTextFragment fragment = it.fragment();
        if (fragment.isValid() && fragment.charFormat().isImageFormat()) return true;
    }
    return false;
}

bool isMovableNeighbor(const QTextBlock &imageBlock, const QTextBlock &neighbor) {
    if (!shareEditableRegion(imageBlock, neighbor) || neighbor.textList() || isImageBlock(neighbor) ||
        neighbor.blockFormat().intProperty(NotesRichFormat::ListItemGroup) > 0 ||
        neighbor.blockFormat().hasProperty(NotesRichFormat::TaskItemChecked) ||
        neighbor.blockFormat().hasProperty(QTextFormat::BlockNonBreakableLines) ||
        neighbor.blockFormat().hasProperty(QTextFormat::BlockTrailingHorizontalRulerWidth)) return false;
    return true;
}

QTextDocumentFragment blockContent(const QTextBlock &block) {
    QTextCursor cursor(block);
    cursor.setPosition(block.position());
    cursor.setPosition(block.position() + block.length() - 1, QTextCursor::KeepAnchor);
    return QTextDocumentFragment(cursor);
}

int swapWithNeighbor(QTextDocument &document, int imagePosition, bool upward) {
    QTextBlock imageBlock;
    if (!imageBlockAt(document, imagePosition, &imageBlock)) return -1;
    const QTextBlock neighbor = upward ? imageBlock.previous() : imageBlock.next();
    if (!isMovableNeighbor(imageBlock, neighbor)) return -1;

    const QTextBlock first = upward ? neighbor : imageBlock;
    const QTextBlock second = upward ? imageBlock : neighbor;
    const QTextDocumentFragment firstContent = blockContent(first);
    const QTextDocumentFragment secondContent = blockContent(second);
    const QTextBlockFormat firstFormat = first.blockFormat();
    const QTextBlockFormat secondFormat = second.blockFormat();

    for (const QTextBlock &block : {first, second}) {
        QTextCursor cursor(block);
        cursor.setPosition(block.position());
        cursor.setPosition(block.position() + block.length() - 1, QTextCursor::KeepAnchor);
        cursor.removeSelectedText();
    }

    QTextCursor firstCursor(first);
    firstCursor.setPosition(first.position());
    firstCursor.insertFragment(secondContent);
    firstCursor.setBlockFormat(secondFormat);

    QTextCursor secondCursor(second);
    secondCursor.setPosition(second.position());
    secondCursor.insertFragment(firstContent);
    secondCursor.setBlockFormat(firstFormat);

    return upward ? first.position() : second.position();
}

}

bool canMove(const QTextDocument &document, int imagePosition, bool upward) {
    QTextBlock imageBlock;
    if (!imageBlockAt(document, imagePosition, &imageBlock)) return false;
    return isMovableNeighbor(imageBlock, upward ? imageBlock.previous() : imageBlock.next());
}

int move(QTextDocument &document, int imagePosition, bool upward) {
    if (!canMove(document, imagePosition, upward)) return -1;
    QTextCursor edit(&document);
    edit.beginEditBlock();
    const int movedPosition = swapWithNeighbor(document, imagePosition, upward);
    edit.endEditBlock();
    return movedPosition;
}

int insertParagraphBelow(QTextDocument &document, int imagePosition) {
    QTextBlock imageBlock;
    if (!imageBlockAt(document, imagePosition, &imageBlock)) return -1;
    const QTextBlock following = imageBlock.next();
    const QTextBlockFormat followingFormat = following.isValid() ? following.blockFormat() : QTextBlockFormat();
    const int insertionPosition = qMin(imageBlock.position() + imageBlock.text().size(), document.characterCount() - 1);

    QTextCursor cursor(&document);
    cursor.beginEditBlock();
    cursor.setPosition(insertionPosition);
    QTextBlockFormat paragraphFormat;
    paragraphFormat.setTopMargin(12.0);
    paragraphFormat.setBottomMargin(12.0);
    cursor.insertBlock(paragraphFormat, QTextCharFormat());

    const QTextBlock inserted = cursor.block();
    if (!inserted.isValid()) {
        cursor.endEditBlock();
        return -1;
    }
    const QTextBlock originalFollowing = inserted.next();
    if (originalFollowing.isValid()) {
        QTextCursor followingCursor(originalFollowing);
        followingCursor.setBlockFormat(followingFormat);
    }
    const int insertedPosition = inserted.position();
    cursor.endEditBlock();
    return insertedPosition;
}

}
