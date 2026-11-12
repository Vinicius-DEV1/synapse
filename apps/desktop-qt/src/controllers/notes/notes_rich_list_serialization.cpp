#include "notes_rich_list_serialization.h"
#include "notes_rich_serialization_support.h"
#include "notes_rich_format.h"
#include "notes_rich_images.h"
#include "notes_rich_code_blocks.h"
#include "notes_rich_markup.h"
#include "notes_rich_task_lists.h"

#include <QtCore/QRegularExpression>
#include <QtCore/QVector>
#include <QtCore/QVariant>
#include <QtGui/QBrush>
#include <QtGui/QColor>
#include <QtGui/QTextBlock>
#include <QtGui/QTextBlockFormat>
#include <QtGui/QTextCharFormat>
#include <QtGui/QTextFragment>
#include <QtGui/QTextList>
#include <QtGui/QTextListFormat>

namespace NotesRichSerialization {

bool supportedBlock(const QTextBlock &block) {
    const QTextBlockFormat format = block.blockFormat();
    const int headingLevel = format.headingLevel();
    const int quoteLevel = format.intProperty(QTextFormat::BlockQuoteLevel);
    const bool hasQuoteColor = format.hasProperty(NotesRichFormat::QuoteColor);
    const bool isCodeBlock = format.boolProperty(QTextFormat::BlockNonBreakableLines);
    const int codeGroup = format.intProperty(NotesRichFormat::CodeBlockGroup);
    const QString codeLanguage = format.stringProperty(NotesRichFormat::CodeBlockLanguage);
    const QString quoteColorValue = format.stringProperty(NotesRichFormat::QuoteColor);
    static const QRegularExpression quoteColorPattern(QStringLiteral("^#[0-9a-fA-F]{6}$"));
    const QColor quoteColor = NotesRichMarkup::parseCssColor(quoteColorValue);
    const QTextList *list = block.textList();
    if (headingLevel < 0 || headingLevel > 6 || (headingLevel > 0 && quoteLevel > 0) ||
        (list && (headingLevel > 0 || quoteLevel > 0)) || quoteLevel > 1 ||
        (hasQuoteColor && (quoteLevel != 1 || !quoteColorPattern.match(quoteColorValue).hasMatch() ||
                           !quoteColor.isValid())) ||
        (codeGroup > 0 && !isCodeBlock) || (format.hasProperty(NotesRichFormat::CodeBlockGroup) && codeGroup <= 0) ||
        (!codeLanguage.isEmpty() && (!isCodeBlock || !NotesRichCodeBlocks::supportsLanguage(codeLanguage)))) return false;
    const auto properties = format.properties();
    for (auto it = properties.cbegin(); it != properties.cend(); ++it) {
        const int key = it.key();
        const double value = it.value().toDouble();
        if (key == QTextFormat::BlockTopMargin) {
            const double expectedHeadingMargin = 20.0 - headingLevel * 2.0;
            if (value != 12.0 && !(headingLevel > 0 && value == expectedHeadingMargin)) return false;
        } else if (key == QTextFormat::BlockBottomMargin) {
            if (value != 12.0 && !(headingLevel == 5 && value == 4.0)) return false;
        } else if (key == QTextFormat::HeadingLevel) {
            if (headingLevel < 1 || headingLevel > 6) return false;
        } else if (key == QTextFormat::BlockQuoteLevel) {
            if (quoteLevel != 1) return false;
        } else if (key == NotesRichFormat::QuoteColor) {
            if (!hasQuoteColor) return false;
        } else if (key == QTextFormat::BackgroundBrush) {
            QColor expectedBackground = quoteColor;
            expectedBackground.setAlpha(0x15);
            if (!hasQuoteColor || it.value().value<QBrush>().color() != expectedBackground) return false;
        } else if (key == QTextFormat::BlockIndent) {
            const bool listContinuation = !list && format.intProperty(NotesRichFormat::ListItemGroup) > 0 &&
                value == format.intProperty(NotesRichFormat::ListItemGroupDepth);
            if (!listContinuation && (!list || value != list->format().indent() - 1)) return false;
        } else if (key == QTextFormat::BlockNonBreakableLines) {
            if (!it.value().toBool() || headingLevel > 0 || quoteLevel > 0 || list) return false;
        } else if (key == NotesRichFormat::CodeBlockLanguage) {
            if (!isCodeBlock || !NotesRichCodeBlocks::supportsLanguage(it.value().toString())) return false;
        } else if (key == NotesRichFormat::CodeBlockGroup) {
            if (!isCodeBlock || it.value().toInt() <= 0) return false;
        } else if (key == QTextFormat::BlockLeftMargin || key == QTextFormat::BlockRightMargin) {
            if (quoteLevel != 1 || value != 40.0) return false;
        } else if (key == QTextFormat::ObjectIndex) {
            if (!list || it.value().toInt() < 0) return false;
        } else if (key == QTextFormat::BlockMarker) {
            if (!list || it.value().toInt() != 0) return false;
        } else if (key == NotesRichFormat::TaskItemChecked) {
            if (!list || !list->format().boolProperty(NotesRichFormat::TaskListState)) return false;
        } else if (key == NotesRichFormat::ListItemGroup) {
            const bool taskList = list && list->format().boolProperty(NotesRichFormat::TaskListState);
            if (format.intProperty(NotesRichFormat::ListItemGroup) <= 0 ||
                !format.hasProperty(NotesRichFormat::ListItemGroupDepth) ||
                (list && taskList != format.hasProperty(NotesRichFormat::TaskItemChecked)) ||
                (!list && format.hasProperty(NotesRichFormat::TaskItemChecked))) return false;
        } else if (key == NotesRichFormat::ListItemGroupDepth) {
            const int taskDepth = format.intProperty(NotesRichFormat::ListItemGroupDepth);
            if (format.intProperty(NotesRichFormat::ListItemGroup) <= 0 || taskDepth < 1 ||
                (list && list->format().indent() != taskDepth)) return false;
        } else {
            return false;
        }
    }
    return true;
}

static bool supportedList(const QTextList *list) {
    if (!list) return false;
    const QTextListFormat format = list->format();
    const bool taskList = format.boolProperty(NotesRichFormat::TaskListState);
    const bool standardStyle = format.style() == QTextListFormat::ListDisc ||
        format.style() == QTextListFormat::ListDecimal;
    if ((taskList ? format.style() != QTextListFormat::ListStyleUndefined : !standardStyle) ||
        format.indent() < 1 || format.start() != 1) return false;
    const auto properties = format.properties();
    for (auto it = properties.cbegin(); it != properties.cend(); ++it) {
        if (it.key() != QTextFormat::ListStyle && it.key() != QTextFormat::ListIndent &&
            it.key() != QTextFormat::ListStart && it.key() != NotesRichFormat::TaskListState) return false;
    }
    return true;
}

struct ListDescriptor {
    QString kind;
    QString tag;
    bool task = false;
};

static ListDescriptor listDescriptor(const QTextListFormat &format) {
    if (format.boolProperty(NotesRichFormat::TaskListState))
        return {QStringLiteral("task"), QStringLiteral("ul"), true};
    if (format.style() == QTextListFormat::ListDisc)
        return {QStringLiteral("bullet"), QStringLiteral("ul"), false};
    return {QStringLiteral("ordered"), QStringLiteral("ol"), false};
}

static void openList(QString &result, const ListDescriptor &list) {
    result += list.task ? QStringLiteral("<ul data-type=\"taskList\">") : "<" + list.tag + ">";
}

static void openListItem(QString &result, const ListDescriptor &list, const QTextBlock &block) {
    if (list.task) {
        const bool checked = block.blockFormat().boolProperty(NotesRichFormat::TaskItemChecked);
        result += checked
            ? QStringLiteral("<li data-checked=\"true\" data-type=\"taskItem\"><label><input type=\"checkbox\" checked=\"checked\"/><span></span></label><div><p>")
            : QStringLiteral("<li data-checked=\"false\" data-type=\"taskItem\"><label><input type=\"checkbox\"/><span></span></label><div><p>");
    } else {
        result += "<li><p>";
    }
}

static void closeListItem(QString &result, const ListDescriptor &list) {
    result += list.task ? QStringLiteral("</div></li>") : QStringLiteral("</li>");
}

bool appendBlockText(QString &result, const QTextBlock &block) {
    const int headingLevel = block.blockFormat().headingLevel();
    for (auto it = block.begin(); !it.atEnd(); ++it) {
        const QTextFragment fragment = it.fragment();
        if (!fragment.isValid()) continue;
        if (fragment.charFormat().isImageFormat()) {
            QString imageHtml;
            if (!NotesRichImages::serialize(fragment.charFormat().toImageFormat(), imageHtml)) return false;
            result += imageHtml;
            continue;
        }
        if (fragment.charFormat().objectType() == NotesRichFormat::TaskCheckboxObjectType) {
            if (!block.textList() || !block.textList()->format().boolProperty(NotesRichFormat::TaskListState) ||
                !block.blockFormat().hasProperty(NotesRichFormat::TaskItemChecked)) return false;
            continue;
        }
        if (fragment.charFormat().boolProperty(NotesRichFormat::PageReferenceBoundary)) {
            if (fragment.text() != QString(QChar(0x2060))) return false;
            continue;
        }
        QTextCharFormat format = fragment.charFormat();
        if (format.boolProperty(NotesRichFormat::TaskCheckedVisual)) {
            const QVariant saved = format.property(NotesRichFormat::TaskOriginalCharacterFormat);
            if (!saved.canConvert<QTextCharFormat>()) return false;
            format = saved.value<QTextCharFormat>();
        }
        if (!supportedCharacterFormat(format, headingLevel)) return false;
        result += inlineHtml(fragment.text(), format, headingLevel);
    }
    return true;
}

bool appendCodeLine(QString &result, const QTextBlock &block) {
    for (auto it = block.begin(); !it.atEnd(); ++it) {
        const QTextFragment fragment = it.fragment();
        if (!fragment.isValid()) continue;
        const QTextCharFormat format = fragment.charFormat();
        if (!isCodeFormat(format)) return false;
        const auto properties = format.properties();
        for (auto property = properties.cbegin(); property != properties.cend(); ++property) {
            if (property.key() != QTextFormat::FontFamilies) return false;
        }
        QString line = fragment.text().toHtmlEscaped();
        line.replace(QChar::LineSeparator, QStringLiteral("\n"));
        result += line;
    }
    return true;
}

bool appendListRun(const QVector<QTextBlock> &blocks, int &index, QString &result) {
    QVector<ListDescriptor> lists;
    QVector<int> itemGroups;
    int depth = 0;
    while (index < blocks.size()) {
        const QTextBlock block = blocks.at(index);
        const QTextList *list = block.textList();
        if (!list) {
            const int itemGroup = block.blockFormat().intProperty(NotesRichFormat::ListItemGroup);
            if (itemGroup <= 0) break;
            const int itemDepth = block.blockFormat().intProperty(NotesRichFormat::ListItemGroupDepth);
            if (!supportedBlock(block) || itemDepth < 1 || itemDepth > depth ||
                itemGroups.at(itemDepth - 1) != itemGroup) return false;
            while (depth > itemDepth) {
                closeListItem(result, lists.last());
                result += "</" + lists.last().tag + ">";
                lists.removeLast();
                itemGroups.removeLast();
                --depth;
            }
            result += "<p>";
            if (!appendBlockText(result, block)) return false;
            result += "</p>";
            ++index;
            continue;
        }
        if (!supportedBlock(block) || !supportedList(list)) return false;
        const ListDescriptor descriptor = listDescriptor(list->format());
        const int itemGroup = block.blockFormat().intProperty(NotesRichFormat::ListItemGroup);
        const int nextDepth = list->format().indent();
        if (depth == 0) {
            if (nextDepth != 1) return false;
            lists.append(descriptor);
            itemGroups.append(itemGroup);
            depth = 1;
            openList(result, descriptor);
            openListItem(result, descriptor, block);
        } else if (nextDepth == depth + 1) {
            lists.append(descriptor);
            itemGroups.append(itemGroup);
            depth = nextDepth;
            openList(result, descriptor);
            openListItem(result, descriptor, block);
        } else if (nextDepth == depth) {
            if (lists.last().kind == descriptor.kind) {
                closeListItem(result, lists.last());
                openListItem(result, descriptor, block);
                itemGroups.last() = itemGroup;
            } else {
                closeListItem(result, lists.last());
                result += "</" + lists.last().tag + ">";
                openList(result, descriptor);
                openListItem(result, descriptor, block);
                lists.last() = descriptor;
                itemGroups.last() = itemGroup;
            }
        } else if (nextDepth < depth) {
            while (depth > nextDepth) {
                closeListItem(result, lists.last());
                result += "</" + lists.last().tag + ">";
                lists.removeLast();
                itemGroups.removeLast();
                --depth;
            }
            if (lists.isEmpty()) return false;
            if (lists.last().kind == descriptor.kind) {
                closeListItem(result, lists.last());
                openListItem(result, descriptor, block);
                itemGroups.last() = itemGroup;
            } else {
                closeListItem(result, lists.last());
                result += "</" + lists.last().tag + ">";
                openList(result, descriptor);
                openListItem(result, descriptor, block);
                lists.last() = descriptor;
                itemGroups.last() = itemGroup;
            }
        } else {
            return false;
        }
        if (!appendBlockText(result, block)) return false;
        result += "</p>";
        ++index;
    }
    while (depth > 0) {
        closeListItem(result, lists.last());
        result += "</" + lists.last().tag + ">";
        lists.removeLast();
        itemGroups.removeLast();
        --depth;
    }
    return true;
}


}
