#include "notes_rich_document.h"
#include "notes_rich_code_blocks.h"
#include "notes_rich_format.h"
#include "notes_rich_task_lists.h"

#include <algorithm>
#include <QtCore/QSet>
#include <QtCore/QVector>
#include <QtGui/QTextBlock>
#include <QtGui/QTextBlockFormat>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>
#include <QtGui/QTextList>
#include <QtGui/QTextListFormat>

namespace NotesRichDocument {

static void updateHeadingCharacterStyle(QTextBlock block, int previousLevel, int nextLevel) {
    struct PendingFormat { int start; int end; QTextCharFormat format; };
    QVector<PendingFormat> pending;
    for (auto it = block.begin(); !it.atEnd(); ++it) {
        const QTextFragment fragment = it.fragment();
        if (!fragment.isValid()) continue;
        QTextCharFormat format = fragment.charFormat();
        const int state = format.intProperty(NotesRichFormat::HeadingBoldState);
        if (nextLevel > 0) {
            const int nextState = previousLevel > 0
                ? (state == 0 ? NotesRichFormat::HeadingExplicitBold : state)
                : (format.fontWeight() >= QFont::Bold ? NotesRichFormat::HeadingExplicitBold
                                                       : NotesRichFormat::HeadingGeneratedBold);
            format.setProperty(NotesRichFormat::HeadingBoldState, nextState);
            format.setProperty(QTextFormat::FontSizeAdjustment, 4 - nextLevel);
            format.setFontWeight(QFont::Bold);
        } else {
            if (state != NotesRichFormat::HeadingExplicitBold) format.clearProperty(QTextFormat::FontWeight);
            format.clearProperty(NotesRichFormat::HeadingBoldState);
            format.clearProperty(QTextFormat::FontSizeAdjustment);
        }
        pending.append({fragment.position(), fragment.position() + fragment.length(), format});
    }
    for (const PendingFormat &item : pending) {
        QTextCursor fragmentCursor(block);
        fragmentCursor.setPosition(item.start);
        fragmentCursor.setPosition(item.end, QTextCursor::KeepAnchor);
        fragmentCursor.setCharFormat(item.format);
    }
}

static bool canBecomeCodeBlock(const QTextBlock &block) {
    const bool isHeading = block.blockFormat().headingLevel() > 0;
    const bool isCode = block.blockFormat().boolProperty(QTextFormat::BlockNonBreakableLines);
    for (auto it = block.begin(); !it.atEnd(); ++it) {
        const QTextFragment fragment = it.fragment();
        if (!fragment.isValid()) continue;
        const QTextCharFormat format = fragment.charFormat();
        const int headingBoldState = format.intProperty(NotesRichFormat::HeadingBoldState);
        const auto properties = format.properties();
        for (auto property = properties.cbegin(); property != properties.cend(); ++property) {
            if (isHeading && (property.key() == QTextFormat::FontSizeAdjustment || property.key() == QTextFormat::FontWeight ||
                              (property.key() == NotesRichFormat::HeadingBoldState &&
                               headingBoldState == NotesRichFormat::HeadingGeneratedBold))) continue;
            if (isCode && property.key() == QTextFormat::FontFamilies) continue;
            return false;
        }
    }
    return true;
}

bool toggleBlock(QTextDocument &document, int start, int end, const QString &blockType) {
    if (start < 0 || end < start || end > document.characterCount() - 1) return false;
    if (blockType != "paragraph" && blockType != "heading1" && blockType != "heading2" &&
        blockType != "heading3" && blockType != "heading4" && blockType != "heading5" && blockType != "heading6" &&
        blockType != "bulletList" && blockType != "orderedList" && blockType != "taskList" &&
        blockType != "quote" && blockType != "codeBlock") return false;

    const int lastPosition = end > start ? end - 1 : start;
    QVector<QTextBlock> blocks;
    for (QTextBlock block = document.findBlock(start); block.isValid() && block.position() <= lastPosition; block = block.next())
        blocks.append(block);
    if (blocks.isEmpty()) return false;
    QSet<int> selectedListItemGroups;
    for (const QTextBlock &block : blocks) {
        if (block.textList() && block.blockFormat().intProperty(NotesRichFormat::ListItemGroup) > 0)
            selectedListItemGroups.insert(block.blockFormat().intProperty(NotesRichFormat::ListItemGroup));
    }
    for (const QTextBlock &block : blocks) {
        const int groupId = block.blockFormat().intProperty(NotesRichFormat::ListItemGroup);
        if (groupId > 0 && !block.textList() && !selectedListItemGroups.contains(groupId)) return false;
    }

    const auto matchesTarget = [&blockType](const QTextBlock &block) {
        const int heading = block.blockFormat().headingLevel();
        const int quote = block.blockFormat().intProperty(QTextFormat::BlockQuoteLevel);
        const QTextList *list = block.textList();
        if (blockType == "paragraph") return heading == 0 && quote == 0 && !list;
        if (blockType == "heading1") return heading == 1 && quote == 0 && !list;
        if (blockType == "heading2") return heading == 2 && quote == 0 && !list;
        if (blockType == "heading3") return heading == 3 && quote == 0 && !list;
        if (blockType == "heading4") return heading == 4 && quote == 0 && !list;
        if (blockType == "heading5") return heading == 5 && quote == 0 && !list;
        if (blockType == "heading6") return heading == 6 && quote == 0 && !list;
        if (blockType == "quote") return quote == 1 && heading == 0 && !list;
        if (blockType == "codeBlock") return block.blockFormat().boolProperty(QTextFormat::BlockNonBreakableLines) && heading == 0 && quote == 0 && !list;
        if (!list || heading != 0 || quote != 0) return false;
        if (blockType == "taskList") return list->format().boolProperty(NotesRichFormat::TaskListState);
        return blockType == "bulletList" ? list->format().style() == QTextListFormat::ListDisc
                                          : list->format().style() == QTextListFormat::ListDecimal;
    };
    const bool removeTarget = std::all_of(blocks.cbegin(), blocks.cend(), matchesTarget);
    const int codeBlockGroup = !removeTarget && blockType == "codeBlock"
        ? NotesRichCodeBlocks::nextGroupId(document) : 0;
    if (!removeTarget && blockType == "codeBlock" &&
        !std::all_of(blocks.cbegin(), blocks.cend(), canBecomeCodeBlock)) return false;

    QTextCursor edit(&document);
    edit.beginEditBlock();
    for (QTextBlock block : blocks) {
        const int previousHeadingLevel = block.blockFormat().headingLevel();
        if (QTextList *list = block.textList()) {
            if (block.blockFormat().hasProperty(NotesRichFormat::TaskItemChecked))
                NotesRichTaskLists::removeMarker(block);
            list->remove(block);
        }
        const bool wasCodeBlock = block.blockFormat().boolProperty(QTextFormat::BlockNonBreakableLines);
        QTextBlockFormat format = block.blockFormat();
        format.clearProperty(QTextFormat::BlockNonBreakableLines);
        format.clearProperty(QTextFormat::HeadingLevel);
        format.clearProperty(QTextFormat::BlockQuoteLevel);
        format.clearProperty(QTextFormat::BlockLeftMargin);
        format.clearProperty(QTextFormat::BlockRightMargin);
        format.clearProperty(NotesRichFormat::CodeBlockLanguage);
        format.clearProperty(NotesRichFormat::CodeBlockGroup);
        format.setTopMargin(12.0);
        format.setBottomMargin(12.0);

        if (!removeTarget && blockType.startsWith("heading")) {
            const int level = blockType.mid(QStringLiteral("heading").size()).toInt();
            format.setHeadingLevel(level);
            format.setTopMargin(20.0 - level * 2.0);
        } else if (!removeTarget && blockType == "quote") {
            format.setProperty(QTextFormat::BlockQuoteLevel, 1);
            format.setLeftMargin(40.0);
            format.setRightMargin(40.0);
        } else if (!removeTarget && blockType == "codeBlock") {
            format.setNonBreakableLines(true);
            format.setProperty(NotesRichFormat::CodeBlockGroup, codeBlockGroup);
        }
        QTextCursor blockCursor(block);
        blockCursor.setBlockFormat(format);
        const int nextHeadingLevel = !removeTarget && blockType.startsWith("heading")
            ? blockType.mid(QStringLiteral("heading").size()).toInt() : 0;
        if (previousHeadingLevel > 0 || nextHeadingLevel > 0)
            updateHeadingCharacterStyle(block, previousHeadingLevel, nextHeadingLevel);
        if (wasCodeBlock || (!removeTarget && blockType == "codeBlock")) {
            struct PendingFormat { int start; int end; QTextCharFormat format; };
            QVector<PendingFormat> pending;
            for (auto it = block.begin(); !it.atEnd(); ++it) {
                const QTextFragment fragment = it.fragment();
                if (!fragment.isValid()) continue;
                QTextCharFormat charFormat = fragment.charFormat();
                if (!removeTarget && blockType == "codeBlock") charFormat.setFontFamilies({QStringLiteral("monospace")});
                else charFormat.clearProperty(QTextFormat::FontFamilies);
                pending.append({fragment.position(), fragment.position() + fragment.length(), charFormat});
            }
            for (const PendingFormat &item : pending) {
                QTextCursor textCursor(block);
                textCursor.setPosition(item.start);
                textCursor.setPosition(item.end, QTextCursor::KeepAnchor);
                textCursor.setCharFormat(item.format);
            }
        }
        if (!removeTarget && (blockType == "bulletList" || blockType == "orderedList" || blockType == "taskList")) {
            QTextListFormat listFormat;
            if (blockType == "taskList") {
                listFormat.setStyle(QTextListFormat::ListStyleUndefined);
                listFormat.setProperty(NotesRichFormat::TaskListState, true);
            } else {
                listFormat.setStyle(blockType == "bulletList" ? QTextListFormat::ListDisc : QTextListFormat::ListDecimal);
            }
            listFormat.setIndent(1);
            listFormat.setStart(1);
            blockCursor.createList(listFormat);
            if (blockType == "taskList") NotesRichTaskLists::insertMarker(document, block, false);
        }
    }
    edit.endEditBlock();
    return true;
}

bool changeListIndent(QTextDocument &document, int position, bool outdent) {
    if (position < 0 || position > document.characterCount() - 1) return false;
    const QTextBlock selectedBlock = document.findBlock(position);
    if (!selectedBlock.isValid()) return false;

    QTextBlock itemBlock = selectedBlock;
    if (!itemBlock.textList()) {
        const int groupId = itemBlock.blockFormat().intProperty(NotesRichFormat::ListItemGroup);
        const int groupDepth = itemBlock.blockFormat().intProperty(NotesRichFormat::ListItemGroupDepth);
        if (groupId <= 0 || groupDepth < 1) return false;
        itemBlock = {};
        for (QTextBlock candidate = selectedBlock.previous(); candidate.isValid(); candidate = candidate.previous()) {
            if (candidate.textList()) {
                if (candidate.blockFormat().intProperty(NotesRichFormat::ListItemGroup) == groupId) {
                    itemBlock = candidate;
                    break;
                }
                if (candidate.textList()->format().indent() <= groupDepth) break;
            } else if (candidate.blockFormat().intProperty(NotesRichFormat::ListItemGroupDepth) < groupDepth) {
                break;
            }
        }
        if (!itemBlock.isValid()) return false;
    }

    QTextList *list = itemBlock.textList();
    if (!list) return false;

    QTextListFormat format = list->format();
    const int currentIndent = format.indent();
    const int indentDelta = outdent ? -1 : 1;
    if (outdent) {
        if (currentIndent <= 1) return false;
    } else {
        if (currentIndent < 1) return false;
        bool hasPreviousSibling = false;
        for (QTextBlock previous = itemBlock.previous(); previous.isValid(); previous = previous.previous()) {
            if (previous.textList()) {
                const int previousIndent = previous.textList()->format().indent();
                if (previousIndent < currentIndent) break;
                if (previousIndent == currentIndent) {
                    hasPreviousSibling = true;
                    break;
                }
            } else {
                const int previousGroupDepth = previous.blockFormat().intProperty(NotesRichFormat::ListItemGroupDepth);
                if (previous.blockFormat().intProperty(NotesRichFormat::ListItemGroup) <= 0 ||
                    previousGroupDepth < currentIndent) break;
            }
        }
        if (!hasPreviousSibling) return false;
    }

    struct ListBlockChange {
        QTextBlock block;
        QTextListFormat format;
    };
    QVector<QTextBlock> subtree;
    QVector<ListBlockChange> listChanges;
    for (QTextBlock candidate = itemBlock; candidate.isValid(); candidate = candidate.next()) {
        if (candidate.textList()) {
            const QTextListFormat candidateFormat = candidate.textList()->format();
            if (candidate != itemBlock && candidateFormat.indent() <= currentIndent) break;
            subtree.append(candidate);
            QTextListFormat nextFormat = candidateFormat;
            nextFormat.setIndent(candidateFormat.indent() + indentDelta);
            listChanges.append({candidate, nextFormat});
            continue;
        }
        const QTextBlockFormat candidateFormat = candidate.blockFormat();
        const int groupId = candidateFormat.intProperty(NotesRichFormat::ListItemGroup);
        const int groupDepth = candidateFormat.intProperty(NotesRichFormat::ListItemGroupDepth);
        if (groupId <= 0 || groupDepth < currentIndent) break;
        subtree.append(candidate);
    }
    if (subtree.isEmpty()) return false;

    QTextCursor edit(&document);
    edit.beginEditBlock();
    for (const ListBlockChange &change : listChanges) {
        QTextCursor listCursor(change.block);
        listCursor.createList(change.format);
    }
    for (const QTextBlock &block : subtree) {
        QTextBlockFormat blockFormat = block.blockFormat();
        if (blockFormat.intProperty(NotesRichFormat::ListItemGroup) <= 0) continue;
        blockFormat.setProperty(NotesRichFormat::ListItemGroupDepth,
                                blockFormat.intProperty(NotesRichFormat::ListItemGroupDepth) + indentDelta);
        if (!block.textList()) blockFormat.setIndent(blockFormat.intProperty(NotesRichFormat::ListItemGroupDepth));
        QTextCursor blockCursor(block);
        blockCursor.setBlockFormat(blockFormat);
    }
    edit.endEditBlock();
    return true;
}

bool toggleTaskItem(QTextDocument &document, int position) {
    return NotesRichTaskLists::toggleItem(document, position);
}

bool toggleTaskItemFromCursor(QTextDocument &document, int position) {
    return NotesRichTaskLists::isTaskCheckboxAtCursor(document, position) &&
        NotesRichTaskLists::toggleItem(document, position);
}

bool isTaskItemAt(const QTextDocument &document, int position) {
    return NotesRichTaskLists::isTaskItemAt(document, position);
}

int insertDivider(QTextDocument &document, int start, int end) {
    if (start < 0 || end < start || end > document.characterCount() - 1) return -1;
    QTextCursor cursor(&document);
    cursor.beginEditBlock();
    cursor.setPosition(start);
    cursor.setPosition(end, QTextCursor::KeepAnchor);
    cursor.insertHtml(QStringLiteral("<hr/>"));
    const int position = cursor.position();
    cursor.endEditBlock();
    return position;
}


}
