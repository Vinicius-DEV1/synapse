#include "notes_rich_document.h"
#include "notes_rich_format.h"
#include "notes_rich_list_serialization.h"
#include "notes_rich_images.h"
#include "notes_rich_tables.h"

#include <QtGui/QTextBlock>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFrame>
#include <QtGui/QTextTable>
#include <QtCore/QVector>

namespace NotesRichDocument {

using NotesRichSerialization::appendBlockText;
using NotesRichSerialization::appendCodeLine;
using NotesRichSerialization::appendListRun;
using NotesRichSerialization::supportedBlock;

static bool isQtTablePlaceholder(const QTextBlock &block) {
    if (!block.isValid() || !block.text().isEmpty() || block.textList()) return false;
    const auto properties = block.blockFormat().properties();
    for (auto it = properties.cbegin(); it != properties.cend(); ++it) {
        if (it.key() != QTextFormat::BlockIndent || it.value().toInt() != 0) return false;
    }
    return true;
}

static bool isDividerBlock(const QTextBlock &block) {
    if (!block.isValid() || block.textList() || block.blockFormat().headingLevel() != 0 ||
        !block.blockFormat().hasProperty(QTextFormat::BlockTrailingHorizontalRulerWidth)) return false;
    const auto properties = block.blockFormat().properties();
    for (auto it = properties.cbegin(); it != properties.cend(); ++it) {
        if (it.key() == QTextFormat::BlockTrailingHorizontalRulerWidth) {
            const QTextLength width = it.value().value<QTextLength>();
            if (width.type() != QTextLength::VariableLength || width.rawValue() != 0.0) return false;
        } else if (it.key() == QTextFormat::BlockTopMargin || it.key() == QTextFormat::BlockBottomMargin) {
            if (it.value().toDouble() != 0.0) return false;
        } else if (it.key() == QTextFormat::BlockIndent) {
            if (it.value().toInt() != 0) return false;
        } else {
            return false;
        }
    }
    return true;
}

static bool appendBlocks(const QVector<QTextBlock> &blocks, QString &result) {
    int index = 0;
    while (index < blocks.size()) {
        QTextBlock block = blocks.at(index);
        if (isDividerBlock(block)) {
            result += "<hr/>";
            if (!block.text().isEmpty()) {
                result += "<p>";
                if (!appendBlockText(result, block)) return false;
                result += "</p>";
            }
            ++index;
            continue;
        }
        QString imageHtml;
        if (NotesRichImages::serializeStandaloneBlock(block, imageHtml)) {
            result += imageHtml;
            ++index;
            continue;
        }
        if (!supportedBlock(block)) return false;
        if (block.blockFormat().boolProperty(QTextFormat::BlockNonBreakableLines)) {
            const int groupId = block.blockFormat().intProperty(NotesRichFormat::CodeBlockGroup);
            const QString language = block.blockFormat().stringProperty(NotesRichFormat::CodeBlockLanguage);
            result += "<pre><code";
            if (!language.isEmpty()) result += QStringLiteral(" class=\"language-%1\"").arg(language.toHtmlEscaped());
            result += ">";
            while (index < blocks.size() && block.blockFormat().boolProperty(QTextFormat::BlockNonBreakableLines) &&
                   (groupId > 0 ? block.blockFormat().intProperty(NotesRichFormat::CodeBlockGroup) == groupId
                                : block.blockFormat().intProperty(NotesRichFormat::CodeBlockGroup) <= 0)) {
                if (!supportedBlock(block) || !appendCodeLine(result, block)) return false;
                ++index;
                if (index < blocks.size() && blocks.at(index).blockFormat().boolProperty(QTextFormat::BlockNonBreakableLines) &&
                    (groupId > 0 ? blocks.at(index).blockFormat().intProperty(NotesRichFormat::CodeBlockGroup) == groupId
                                 : blocks.at(index).blockFormat().intProperty(NotesRichFormat::CodeBlockGroup) <= 0)) result += '\n';
                if (index < blocks.size()) block = blocks.at(index);
            }
            result += "</code></pre>";
            continue;
        }
        if (block.textList()) {
            if (!appendListRun(blocks, index, result)) return false;
            continue;
        }
        if (block.blockFormat().intProperty(QTextFormat::BlockQuoteLevel) == 1) {
            const QString calloutColor = block.blockFormat().stringProperty(NotesRichFormat::QuoteColor);
            result += QStringLiteral("<blockquote");
            if (!calloutColor.isEmpty())
                result += QStringLiteral(" data-color=\"%1\"").arg(calloutColor.toHtmlEscaped());
            result += ">";
            while (index < blocks.size() &&
                   blocks.at(index).blockFormat().intProperty(QTextFormat::BlockQuoteLevel) == 1 &&
                   blocks.at(index).blockFormat().stringProperty(NotesRichFormat::QuoteColor) == calloutColor) {
                block = blocks.at(index);
                if (!supportedBlock(block) || block.blockFormat().headingLevel() != 0) return false;
                result += "<p>";
                if (!appendBlockText(result, block)) return false;
                result += "</p>";
                ++index;
            }
            result += "</blockquote>";
            continue;
        }
        const int headingLevel = block.blockFormat().headingLevel();
        const QString tag = headingLevel > 0 ? QStringLiteral("h%1").arg(headingLevel) : QStringLiteral("p");
        result += "<" + tag + ">";
        if (!appendBlockText(result, block)) return false;
        if (tag == QStringLiteral("p") && block.text().isEmpty()) result += "<br/>";
        result += "</" + tag + ">";
        ++index;
    }
    return true;
}

QString serialize(const QTextDocument &document) {
    QString result;
    QVector<QTextBlock> blockRun;
    bool skipTableSeparator = false;
    const QTextFrame *root = document.rootFrame();
    for (auto item = root->begin(); !item.atEnd(); ++item) {
        if (QTextFrame *frame = item.currentFrame()) {
            const auto *table = qobject_cast<QTextTable *>(frame);
            if (!table || !appendBlocks(blockRun, result)) return QString();
            blockRun.clear();
            if (!NotesRichTables::serialize(*table, result)) return QString();
            skipTableSeparator = true;
            continue;
        }
        const QTextBlock block = item.currentBlock();
        if (!block.isValid()) continue;
        if (skipTableSeparator) {
            skipTableSeparator = false;
            if (isQtTablePlaceholder(block)) continue;
        }
        auto next = item;
        ++next;
        if (isQtTablePlaceholder(block) && next.atEnd()) continue;
        if (isQtTablePlaceholder(block) && next.currentFrame() && qobject_cast<QTextTable *>(next.currentFrame())) continue;
        blockRun.append(block);
    }
    if (!appendBlocks(blockRun, result)) return QString();
    if (NotesRichDocument::supportsSource(result)) return result;
    result.replace("<p>", "<p style=\"white-space:pre-wrap\">");
    return NotesRichDocument::supportsSource(result) ? result : QString();
}

}
