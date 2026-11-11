#include "notes_rich_task_lists.h"
#include "notes_rich_format.h"
#include "notes_rich_task_checkbox.h"
#include "notes_rich_task_markup.h"

#include <QtCore/QVector>
#include <QtCore/QVariant>
#include <QtCore/QVariantMap>
#include <QtCore/QCoreApplication>
#include <QtGui/QAbstractTextDocumentLayout>
#include <QtGui/QBrush>
#include <QtGui/QColor>
#include <QtGui/QTextBlock>
#include <QtGui/QTextBlockFormat>
#include <QtGui/QTextCharFormat>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextList>
#include <QtGui/QTextListFormat>

namespace NotesRichTaskLists {
namespace {
void ensureCheckboxHandler(QTextDocument &document) {
    QAbstractTextDocumentLayout *layout = document.documentLayout();
    if (!layout->handlerForObject(NotesRichFormat::TaskCheckboxObjectType)) {
        auto *handler = new NotesRichTaskCheckbox(layout);
        layout->registerHandler(NotesRichFormat::TaskCheckboxObjectType, handler);
    }
}

QTextCharFormat checkboxFormat(bool checked) {
    QTextCharFormat format;
    format.setObjectType(NotesRichFormat::TaskCheckboxObjectType);
    format.setProperty(NotesRichFormat::TaskItemChecked, checked);
    return format;
}

int nextListItemGroupId(const QTextDocument &document) {
    int groupId = 1;
    for (QTextBlock block = document.begin(); block.isValid(); block = block.next())
        groupId = qMax(groupId, block.blockFormat().intProperty(NotesRichFormat::ListItemGroup) + 1);
    return groupId;
}

QVector<QTextBlock> listItemGroupBlocks(const QTextDocument &document, int groupId) {
    QVector<QTextBlock> blocks;
    for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
        if (block.blockFormat().intProperty(NotesRichFormat::ListItemGroup) == groupId)
            blocks.append(block);
    }
    return blocks;
}

bool updateCheckedText(QTextBlock block, bool checked) {
    struct FragmentFormat {
        int start = 0;
        int end = 0;
        QTextCharFormat format;
    };
    QVector<FragmentFormat> fragments;
    for (auto it = block.begin(); !it.atEnd(); ++it) {
        const QTextFragment fragment = it.fragment();
        if (!fragment.isValid() || fragment.charFormat().objectType() == NotesRichFormat::TaskCheckboxObjectType)
            continue;
        fragments.append({fragment.position(), fragment.position() + fragment.length(), fragment.charFormat()});
    }

    for (const FragmentFormat &fragment : fragments) {
        QTextCharFormat next = fragment.format;
        if (checked) {
            QTextCharFormat original = next;
            if (next.boolProperty(NotesRichFormat::TaskCheckedVisual)) {
                const QVariant saved = next.property(NotesRichFormat::TaskOriginalCharacterFormat);
                if (!saved.canConvert<QTextCharFormat>()) return false;
                original = saved.value<QTextCharFormat>();
            }
            next = original;
            next.setProperty(NotesRichFormat::TaskCheckedVisual, true);
            next.setProperty(NotesRichFormat::TaskOriginalCharacterFormat, QVariant::fromValue(original));
            QColor foreground = original.hasProperty(QTextFormat::ForegroundBrush)
                ? original.foreground().color() : QColor(QStringLiteral("#fffffe"));
            foreground.setAlpha(qRound(foreground.alpha() * 0.5));
            next.setForeground(foreground);
            if (original.hasProperty(QTextFormat::BackgroundBrush)) {
                QColor background = original.background().color();
                background.setAlpha(qRound(background.alpha() * 0.5));
                next.setBackground(background);
            }
            next.setFontStrikeOut(true);
        } else if (next.boolProperty(NotesRichFormat::TaskCheckedVisual)) {
            const QVariant saved = next.property(NotesRichFormat::TaskOriginalCharacterFormat);
            if (!saved.canConvert<QTextCharFormat>()) return false;
            next = saved.value<QTextCharFormat>();
        } else {
            continue;
        }
        QTextCursor cursor(block);
        cursor.setPosition(fragment.start);
        cursor.setPosition(fragment.end, QTextCursor::KeepAnchor);
        cursor.setCharFormat(next);
    }
    return true;
}
}

void insertMarker(QTextDocument &document, QTextBlock block, bool checked) {
    ensureCheckboxHandler(document);
    QTextCursor cursor(block);
    cursor.setPosition(block.position());
    cursor.insertText(QString(QChar::ObjectReplacementCharacter), checkboxFormat(checked));
    block = document.findBlock(block.position());
    QTextBlockFormat blockFormat = block.blockFormat();
    if (!blockFormat.hasProperty(NotesRichFormat::ListItemGroup))
        blockFormat.setProperty(NotesRichFormat::ListItemGroup, nextListItemGroupId(document));
    if (!blockFormat.hasProperty(NotesRichFormat::ListItemGroupDepth))
        blockFormat.setProperty(NotesRichFormat::ListItemGroupDepth,
                                block.textList() ? block.textList()->format().indent() : 1);
    blockFormat.setProperty(NotesRichFormat::TaskItemChecked, checked);
    cursor.setBlockFormat(blockFormat);
}

void removeMarker(QTextBlock block) {
    if (!block.isValid()) return;
    const QTextDocument *document = block.document();
    const int groupId = block.blockFormat().intProperty(NotesRichFormat::ListItemGroup);
    QVector<QTextBlock> groupBlocks = groupId > 0 && document
        ? listItemGroupBlocks(*document, groupId) : QVector<QTextBlock>{block};
    if (groupBlocks.isEmpty()) groupBlocks.append(block);
    for (const QTextBlock &groupBlock : groupBlocks) updateCheckedText(groupBlock, false);
    const bool hasMarker = block.blockFormat().hasProperty(NotesRichFormat::TaskItemChecked);
    const int position = block.position();
    if (hasMarker) {
        QTextCursor cursor(block);
        cursor.setPosition(position);
        cursor.setPosition(position + 1, QTextCursor::KeepAnchor);
        if (cursor.selectedText() == QString(QChar::ObjectReplacementCharacter)) cursor.removeSelectedText();
    }
    QTextBlockFormat blockFormat = block.blockFormat();
    blockFormat.clearProperty(NotesRichFormat::TaskItemChecked);
    blockFormat.clearProperty(NotesRichFormat::ListItemGroup);
    blockFormat.clearProperty(NotesRichFormat::ListItemGroupDepth);
    QTextCursor blockCursor(block);
    blockCursor.setBlockFormat(blockFormat);
    for (int i = 1; i < groupBlocks.size(); ++i) {
        QTextBlockFormat continuationFormat = groupBlocks.at(i).blockFormat();
        continuationFormat.clearProperty(NotesRichFormat::ListItemGroup);
        continuationFormat.clearProperty(NotesRichFormat::ListItemGroupDepth);
        QTextCursor continuationCursor(groupBlocks.at(i));
        continuationCursor.setBlockFormat(continuationFormat);
    }
}

bool prepareDocument(QTextDocument &document, const QString &source) {
    QString normalized;
    QVector<NotesRichTaskMarkup::ListItemState> items;
    if (!NotesRichTaskMarkup::normalizeSource(source, normalized, items)) return false;
    bool hasTasks = false;
    for (const auto &item : items) hasTasks = hasTasks || item.isTask;
    if (items.isEmpty()) return true;

    QVector<QTextBlock> listBlocks;
    for (QTextBlock block = document.begin(); block.isValid(); block = block.next())
        if (block.textList()) listBlocks.append(block);
    if (listBlocks.size() != items.size()) return false;
    for (int i = 0; i < items.size(); ++i) {
        if (listBlocks.at(i).textList()->format().indent() != items.at(i).depth) return false;
        if (items.at(i).isTask && items.at(i).paragraphBlocks < 1) return false;
    }

    if (hasTasks) ensureCheckboxHandler(document);
    document.setUndoRedoEnabled(false);
    for (int i = 0; i < items.size(); ++i) {
        const auto &item = items.at(i);
        QTextBlock block = listBlocks.at(i);
        QTextList *list = block.textList();
        if (item.isTask) {
            QTextListFormat listFormat = list->format();
            listFormat.setStyle(QTextListFormat::ListStyleUndefined);
            listFormat.setProperty(NotesRichFormat::TaskListState, true);
            list->setFormat(listFormat);
        } else if (list->format().boolProperty(NotesRichFormat::TaskListState)) {
            QTextListFormat listFormat = list->format();
            listFormat.clearProperty(NotesRichFormat::TaskListState);
            list->setFormat(listFormat);
        }

        if (item.paragraphBlocks > 1) {
            const int groupId = i + 1;
            QTextBlockFormat firstFormat = block.blockFormat();
            firstFormat.setProperty(NotesRichFormat::ListItemGroup, groupId);
            firstFormat.setProperty(NotesRichFormat::ListItemGroupDepth, item.depth);
            QTextCursor firstCursor(block);
            firstCursor.setBlockFormat(firstFormat);
            QVector<QTextBlock> continuations;
            for (QTextBlock candidate = block.next(); candidate.isValid(); candidate = candidate.next()) {
                if (candidate.textList()) {
                    if (candidate.textList()->format().indent() <= item.depth) break;
                    continue;
                }
                if (candidate.blockFormat().intProperty(QTextFormat::BlockIndent) == item.depth)
                    continuations.append(candidate);
                if (continuations.size() == item.paragraphBlocks - 1) break;
            }
            if (continuations.size() != item.paragraphBlocks - 1) {
                document.setUndoRedoEnabled(true);
                return false;
            }
            for (QTextBlock continuation : continuations) {
                QTextBlockFormat continuationFormat = continuation.blockFormat();
                continuationFormat.setProperty(NotesRichFormat::ListItemGroup, groupId);
                continuationFormat.setProperty(NotesRichFormat::ListItemGroupDepth, item.depth);
                QTextCursor continuationCursor(continuation);
                continuationCursor.setBlockFormat(continuationFormat);
            }
        }

        if (item.isTask) {
            insertMarker(document, block, item.checked);
            const int groupId = block.blockFormat().intProperty(NotesRichFormat::ListItemGroup);
            const QVector<QTextBlock> groupBlocks = listItemGroupBlocks(document, groupId);
            for (const QTextBlock &groupBlock : groupBlocks) {
                if (!updateCheckedText(groupBlock, item.checked)) {
                    document.setUndoRedoEnabled(true);
                    return false;
                }
            }
            if (groupBlocks.isEmpty()) {
                document.setUndoRedoEnabled(true);
                return false;
            }
        }
    }
    document.setUndoRedoEnabled(true);
    document.setModified(false);
    return true;
}

bool isTaskItemAt(const QTextDocument &document, int position) {
    if (position < 0 || position > document.characterCount() - 1) return false;
    const QTextBlock block = document.findBlock(position);
    return block.isValid() && block.blockFormat().hasProperty(NotesRichFormat::TaskItemChecked) &&
        position <= block.position() + 1;
}

bool isTaskCheckboxAtCursor(const QTextDocument &document, int position) {
    if (position < 0 || position > document.characterCount() - 1) return false;
    const QTextBlock block = document.findBlock(position);
    return block.isValid() && block.blockFormat().hasProperty(NotesRichFormat::TaskItemChecked) &&
        position == block.position();
}

QVariantList checkboxItems(const QTextDocument &document) {
    QVariantList items;
    for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
        if (!block.blockFormat().hasProperty(NotesRichFormat::TaskItemChecked)) continue;
        int markerPosition = -1;
        for (auto it = block.begin(); !it.atEnd(); ++it) {
            const QTextFragment fragment = it.fragment();
            if (fragment.isValid() && fragment.charFormat().objectType() == NotesRichFormat::TaskCheckboxObjectType) {
                markerPosition = fragment.position();
                break;
            }
        }
        if (markerPosition < 0) continue;
        const int groupId = block.blockFormat().intProperty(NotesRichFormat::ListItemGroup);
        QString label = block.text();
        if (label.startsWith(QChar::ObjectReplacementCharacter)) label.remove(0, 1);
        label = label.trimmed();
        if (groupId > 0) {
            const int groupDepth = block.blockFormat().intProperty(NotesRichFormat::ListItemGroupDepth);
            for (QTextBlock candidate = block.next(); candidate.isValid(); candidate = candidate.next()) {
                if (candidate.textList()) {
                    if (candidate.textList()->format().indent() <= groupDepth) break;
                    continue;
                }
                if (candidate.blockFormat().intProperty(NotesRichFormat::ListItemGroup) != groupId) continue;
                if (!label.isEmpty()) label += QChar::LineFeed;
                label += candidate.text().trimmed();
            }
        }
        if (label.isEmpty()) label = QCoreApplication::translate("NotesRichTaskLists", "Task");
        items.append(QVariantMap{
            {QStringLiteral("position"), markerPosition},
            {QStringLiteral("checked"), block.blockFormat().boolProperty(NotesRichFormat::TaskItemChecked)},
            {QStringLiteral("label"), label}
        });
    }
    return items;
}

bool toggleItem(QTextDocument &document, int position) {
    if (!isTaskItemAt(document, position)) return false;
    QTextBlock block = document.findBlock(position);
    const bool checked = !block.blockFormat().boolProperty(NotesRichFormat::TaskItemChecked);
    const int groupId = block.blockFormat().intProperty(NotesRichFormat::ListItemGroup);
    const QVector<QTextBlock> groupBlocks = groupId > 0
        ? listItemGroupBlocks(document, groupId) : QVector<QTextBlock>{block};
    if (groupBlocks.isEmpty()) return false;
    QTextCursor marker(&document);
    marker.setPosition(block.position());
    marker.setPosition(block.position() + 1, QTextCursor::KeepAnchor);
    if (marker.selectedText() != QString(QChar::ObjectReplacementCharacter)) return false;
    QTextCursor edit(&document);
    edit.beginEditBlock();
    QTextBlockFormat blockFormat = block.blockFormat();
    blockFormat.setProperty(NotesRichFormat::TaskItemChecked, checked);
    QTextCursor blockCursor(block);
    blockCursor.setBlockFormat(blockFormat);
    marker.setCharFormat(checkboxFormat(checked));
    for (const QTextBlock &groupBlock : groupBlocks) {
        if (!updateCheckedText(groupBlock, checked)) {
            edit.endEditBlock();
            return false;
        }
    }
    edit.endEditBlock();
    return true;
}
}
