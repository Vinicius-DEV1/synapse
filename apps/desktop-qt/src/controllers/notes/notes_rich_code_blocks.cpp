#include "notes_rich_code_blocks.h"

#include "notes_rich_format.h"
#include "notes_rich_markup.h"

#include <QtCore/QRegularExpression>
#include <QtCore/QXmlStreamReader>
#include <QtGui/QTextBlock>
#include <QtGui/QTextBlockFormat>
#include <QtGui/QTextCharFormat>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextDocumentFragment>
#include <QtGui/QTextFragment>
#include <QtGui/QTextTable>
#include <QtGui/QTextTableCell>
#include <QtGui/QTextFormat>

namespace NotesRichCodeBlocks {
namespace {
struct CodeMarkup {
    QString text;
    QString language;
};

bool isCodeBlock(const QTextBlock &block) {
    return block.isValid() && block.blockFormat().boolProperty(QTextFormat::BlockNonBreakableLines);
}

QVector<CodeMarkup> sourceBlocks(const QString &source, bool &ok) {
    QVector<CodeMarkup> result;
    QXmlStreamReader xml(QStringLiteral("<root>") + NotesRichMarkup::normalizeVoidTags(source) + QStringLiteral("</root>"));
    QStringList stack;
    ok = true;
    while (!xml.atEnd()) {
        xml.readNext();
        if (xml.isStartElement()) {
            const QString name = xml.name().toString();
            if (name == QStringLiteral("code") && stack.size() == 2 && stack.last() == QStringLiteral("pre")) {
                QString language;
                if (!languageFromAttributes(xml.attributes(), language)) {
                    ok = false;
                    return {};
                }
                const QString text = xml.readElementText(QXmlStreamReader::ErrorOnUnexpectedElement);
                if (xml.hasError()) {
                    ok = false;
                    return {};
                }
                result.append({text, language});
                continue;
            }
            stack.append(name);
        } else if (xml.isEndElement() && !stack.isEmpty()) {
            stack.removeLast();
        }
    }
    ok = !xml.hasError();
    return result;
}

void applyLanguage(QTextBlock block, const QString &language) {
    QTextBlockFormat format = block.blockFormat();
    if (language.isEmpty()) format.clearProperty(NotesRichFormat::CodeBlockLanguage);
    else format.setProperty(NotesRichFormat::CodeBlockLanguage, language);
    QTextCursor cursor(block);
    cursor.setBlockFormat(format);
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

void resetToParagraph(QTextBlock block) {
    if (!block.isValid()) return;
    QTextBlockFormat format = block.blockFormat();
    format.clearProperty(QTextFormat::BlockNonBreakableLines);
    format.clearProperty(NotesRichFormat::CodeBlockGroup);
    format.clearProperty(NotesRichFormat::CodeBlockLanguage);
    format.setTopMargin(12.0);
    format.setBottomMargin(12.0);
    QTextCursor cursor(block);
    cursor.setBlockFormat(format);
    cursor.setCharFormat(QTextCharFormat());
}

QVector<QTextBlock> codeGroupAt(const QTextDocument &document, int position) {
    QVector<QTextBlock> result;
    if (!isAt(document, position)) return result;
    const QTextBlock selected = document.findBlock(position);
    const int groupId = selected.blockFormat().intProperty(NotesRichFormat::CodeBlockGroup);
    if (groupId <= 0) {
        result.append(selected);
        return result;
    }
    for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
        if (block.blockFormat().intProperty(NotesRichFormat::CodeBlockGroup) == groupId)
            result.append(block);
    }
    return result;
}

bool isMovableNeighbor(const QTextBlock &codeBlock, const QTextBlock &neighbor) {
    if (!shareEditableRegion(codeBlock, neighbor) || isCodeBlock(neighbor) || neighbor.textList() ||
        neighbor.blockFormat().intProperty(NotesRichFormat::ListItemGroup) > 0 ||
        neighbor.blockFormat().hasProperty(NotesRichFormat::TaskItemChecked) ||
        neighbor.blockFormat().hasProperty(QTextFormat::BlockTrailingHorizontalRulerWidth)) return false;
    for (auto it = neighbor.begin(); !it.atEnd(); ++it) {
        const QTextFragment fragment = it.fragment();
        if (fragment.isValid() && fragment.charFormat().isImageFormat()) return false;
    }
    return true;
}

QTextDocumentFragment blockContent(const QTextBlock &block) {
    QTextCursor cursor(block);
    cursor.setPosition(block.position());
    cursor.setPosition(block.position() + block.length() - 1, QTextCursor::KeepAnchor);
    return QTextDocumentFragment(cursor);
}
}

bool supportsLanguage(const QString &language) {
    static const QRegularExpression pattern(QStringLiteral("^[A-Za-z0-9][A-Za-z0-9_+#.-]{0,63}$"));
    return pattern.match(language).hasMatch();
}

bool languageFromAttributes(const QXmlStreamAttributes &attributes, QString &language) {
    language.clear();
    if (attributes.isEmpty()) return true;
    if (attributes.size() != 1 || !attributes.hasAttribute(QStringLiteral("class"))) return false;
    const QString className = attributes.value(QStringLiteral("class")).toString();
    if (!className.startsWith(QStringLiteral("language-"))) return false;
    language = className.mid(QStringLiteral("language-").size());
    return supportsLanguage(language);
}

bool prepare(QTextDocument &document, const QString &source) {
    bool parsed = false;
    const QVector<CodeMarkup> markup = sourceBlocks(source, parsed);
    if (!parsed) return false;

    QVector<QTextBlock> codeBlocks;
    for (QTextBlock block = document.begin(); block.isValid(); block = block.next())
        if (isCodeBlock(block)) codeBlocks.append(block);
    if (codeBlocks.size() < markup.size()) return false;

    struct BlockMetadata {
        QTextBlock block;
        int groupId = 0;
        QString language;
    };
    QVector<BlockMetadata> pending;
    int blockIndex = 0;
    for (int groupIndex = 0; groupIndex < markup.size(); ++groupIndex) {
        if (blockIndex >= codeBlocks.size()) return false;
        QString text;
        QVector<QTextBlock> group;
        bool matched = false;
        while (blockIndex < codeBlocks.size()) {
            const QTextBlock block = codeBlocks.at(blockIndex++);
            if (!group.isEmpty()) text += QChar::LineFeed;
            text += block.text();
            group.append(block);
            if (text == markup.at(groupIndex).text) {
                matched = true;
                break;
            }
            if (!markup.at(groupIndex).text.startsWith(text + QChar::LineFeed)) return false;
        }
        if (!matched) return false;
        const int groupId = groupIndex + 1;
        for (const QTextBlock &block : group) pending.append({block, groupId, markup.at(groupIndex).language});
    }
    if (blockIndex != codeBlocks.size()) return false;

    const bool undoEnabled = document.isUndoRedoEnabled();
    document.setUndoRedoEnabled(false);
    for (const BlockMetadata &metadata : pending) setGroup(metadata.block, metadata.groupId, metadata.language);
    document.setUndoRedoEnabled(undoEnabled);
    document.setModified(false);
    return true;
}

bool isAt(const QTextDocument &document, int position) {
    return position >= 0 && position < document.characterCount() &&
        isCodeBlock(document.findBlock(position));
}

bool canMove(const QTextDocument &document, int position, bool upward) {
    const QVector<QTextBlock> group = codeGroupAt(document, position);
    if (group.isEmpty()) return false;
    const QTextBlock neighbor = upward ? group.first().previous() : group.last().next();
    return isMovableNeighbor(group.first(), neighbor);
}

int move(QTextDocument &document, int position, bool upward) {
    if (!canMove(document, position, upward)) return -1;
    const QVector<QTextBlock> group = codeGroupAt(document, position);
    const QTextBlock neighbor = upward ? group.first().previous() : group.last().next();
    QVector<QTextBlock> positions;
    if (upward) positions.append(neighbor);
    positions += group;
    if (!upward) positions.append(neighbor);

    QVector<QTextDocumentFragment> contents;
    QVector<QTextBlockFormat> formats;
    contents.reserve(positions.size());
    formats.reserve(positions.size());
    for (const QTextBlock &block : positions) {
        contents.append(blockContent(block));
        formats.append(block.blockFormat());
    }

    QVector<int> sourceOrder;
    sourceOrder.reserve(positions.size());
    if (upward) {
        for (int index = 1; index < positions.size(); ++index) sourceOrder.append(index);
        sourceOrder.append(0);
    } else {
        sourceOrder.append(positions.size() - 1);
        for (int index = 0; index < positions.size() - 1; ++index) sourceOrder.append(index);
    }

    QTextCursor edit(&document);
    edit.beginEditBlock();
    for (const QTextBlock &block : positions) {
        QTextCursor cursor(block);
        cursor.setPosition(block.position());
        cursor.setPosition(block.position() + block.length() - 1, QTextCursor::KeepAnchor);
        cursor.removeSelectedText();
    }
    for (int index = 0; index < positions.size(); ++index) {
        QTextCursor cursor(positions.at(index));
        cursor.setPosition(positions.at(index).position());
        cursor.insertFragment(contents.at(sourceOrder.at(index)));
        cursor.setBlockFormat(formats.at(sourceOrder.at(index)));
    }
    const int movedPosition = upward ? positions.first().position() : positions.at(1).position();
    edit.endEditBlock();
    return movedPosition;
}

QString languageAt(const QTextDocument &document, int position) {
    if (!isAt(document, position)) return {};
    return document.findBlock(position).blockFormat().stringProperty(NotesRichFormat::CodeBlockLanguage);
}

QString textAt(const QTextDocument &document, int position) {
    if (!isAt(document, position)) return {};
    const QTextBlock selected = document.findBlock(position);
    const int groupId = selected.blockFormat().intProperty(NotesRichFormat::CodeBlockGroup);
    QString result;
    bool hasLine = false;
    for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
        const bool belongsToGroup = groupId > 0
            ? block.blockFormat().intProperty(NotesRichFormat::CodeBlockGroup) == groupId
            : block.position() == selected.position();
        if (!belongsToGroup) continue;
        if (hasLine) result += QChar::LineFeed;
        QString line = block.text();
        line.replace(QChar::LineSeparator, QChar::LineFeed);
        result += line;
        hasLine = true;
    }
    return result;
}

int insertParagraphBelow(QTextDocument &document, int position) {
    if (!isAt(document, position)) return -1;
    const QTextBlock selected = document.findBlock(position);
    const int groupId = selected.blockFormat().intProperty(NotesRichFormat::CodeBlockGroup);
    QTextBlock last = selected;
    if (groupId > 0) {
        for (QTextBlock block = selected.next(); block.isValid() &&
             block.blockFormat().intProperty(NotesRichFormat::CodeBlockGroup) == groupId; block = block.next())
            last = block;
    }

    const QTextBlock following = last.next();
    const QTextBlockFormat followingFormat = following.isValid() ? following.blockFormat() : QTextBlockFormat();
    const int insertionPosition = qMin(last.position() + last.text().size(), document.characterCount() - 1);
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
    QTextBlock originalFollowing = inserted.next();
    if (originalFollowing.isValid()) {
        QTextCursor followingCursor(originalFollowing);
        followingCursor.setBlockFormat(followingFormat);
    }
    const int insertedPosition = inserted.position();
    cursor.endEditBlock();
    return insertedPosition;
}

int remove(QTextDocument &document, int position) {
    if (!isAt(document, position)) return -1;
    const QTextBlock selected = document.findBlock(position);
    const int groupId = selected.blockFormat().intProperty(NotesRichFormat::CodeBlockGroup);
    QTextBlock first = selected;
    QTextBlock last = selected;
    if (groupId > 0) {
        while (first.previous().isValid() &&
               first.previous().blockFormat().intProperty(NotesRichFormat::CodeBlockGroup) == groupId)
            first = first.previous();
        while (last.next().isValid() &&
               last.next().blockFormat().intProperty(NotesRichFormat::CodeBlockGroup) == groupId)
            last = last.next();
    }

    const QTextBlock previous = first.previous();
    const QTextBlock following = last.next();
    const bool hasPrevious = shareEditableRegion(first, previous);
    const bool hasFollowing = shareEditableRegion(first, following);
    const QTextBlockFormat followingFormat = hasFollowing ? following.blockFormat() : QTextBlockFormat();
    const int start = hasFollowing
        ? first.position()
        : hasPrevious ? previous.position() + previous.length() - 1 : first.position();
    const int end = last.position() + last.text().size();

    QTextCursor edit(&document);
    edit.beginEditBlock();
    if (end > start) {
        edit.setPosition(start);
        edit.setPosition(end, QTextCursor::KeepAnchor);
        edit.removeSelectedText();
    }
    QTextBlock resultBlock = document.findBlock(start);
    if (!resultBlock.isValid()) resultBlock = document.begin();
    if (hasFollowing) {
        if (resultBlock.text().isEmpty() && resultBlock.next().isValid()) {
            QTextCursor joinCursor(resultBlock);
            joinCursor.setPosition(resultBlock.position() + resultBlock.length() - 1);
            joinCursor.deleteChar();
            resultBlock = document.findBlock(start);
        }
        QTextCursor resultCursor(resultBlock);
        resultCursor.setBlockFormat(followingFormat);
    } else if (!hasPrevious) {
        resetToParagraph(resultBlock);
    }
    const int resultPosition = resultBlock.position();
    edit.endEditBlock();
    return resultPosition;
}

int nextGroupId(const QTextDocument &document) {
    int greatest = 0;
    for (QTextBlock block = document.begin(); block.isValid(); block = block.next())
        greatest = qMax(greatest, block.blockFormat().intProperty(NotesRichFormat::CodeBlockGroup));
    return greatest + 1;
}

void setGroup(QTextBlock block, int groupId, const QString &language) {
    if (!block.isValid()) return;
    QTextBlockFormat format = block.blockFormat();
    if (groupId <= 0) {
        format.clearProperty(NotesRichFormat::CodeBlockGroup);
        format.clearProperty(NotesRichFormat::CodeBlockLanguage);
    } else {
        format.setProperty(NotesRichFormat::CodeBlockGroup, groupId);
        if (language.isEmpty()) format.clearProperty(NotesRichFormat::CodeBlockLanguage);
        else format.setProperty(NotesRichFormat::CodeBlockLanguage, language);
    }
    QTextCursor cursor(block);
    cursor.setBlockFormat(format);
}

bool setLanguage(QTextDocument &document, int position, const QString &language) {
    if (!isAt(document, position) || (!language.isEmpty() && !supportsLanguage(language))) return false;
    const QTextBlock selected = document.findBlock(position);
    const int groupId = selected.blockFormat().intProperty(NotesRichFormat::CodeBlockGroup);
    QVector<QTextBlock> blocks;
    if (groupId <= 0) {
        blocks.append(selected);
    } else {
        for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
            if (block.blockFormat().intProperty(NotesRichFormat::CodeBlockGroup) == groupId)
                blocks.append(block);
        }
    }
    if (blocks.isEmpty()) return false;
    QTextCursor edit(&document);
    edit.beginEditBlock();
    for (const QTextBlock &block : blocks) applyLanguage(block, language);
    edit.endEditBlock();
    return true;
}

}
