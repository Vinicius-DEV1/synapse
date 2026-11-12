#include "notes_rich_callouts.h"

#include "notes_rich_format.h"
#include "notes_rich_markup.h"

#include <QtCore/QRegularExpression>
#include <QtCore/QStringList>
#include <QtCore/QVector>
#include <QtCore/QXmlStreamReader>
#include <QtGui/QColor>
#include <QtGui/QTextBlock>
#include <QtGui/QTextBlockFormat>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFormat>
#include <QtGui/QTextTable>

namespace NotesRichCallouts {
namespace {
bool normalizedColor(const QString &value, QString &normalized) {
    static const QRegularExpression pattern(QStringLiteral("^#[0-9a-fA-F]{6}$"));
    const QColor color = NotesRichMarkup::parseCssColor(value);
    if (!pattern.match(value).hasMatch() || !color.isValid()) return false;
    normalized = color.name(QColor::HexRgb);
    return true;
}

void applyBlockColor(QTextBlock block, const QString &color) {
    QTextBlockFormat format = block.blockFormat();
    format.setProperty(QTextFormat::BlockQuoteLevel, 1);
    format.setLeftMargin(40.0);
    format.setRightMargin(40.0);
    if (color.isEmpty()) {
        format.clearProperty(NotesRichFormat::QuoteColor);
        format.clearProperty(QTextFormat::BackgroundBrush);
    } else {
        QString normalized;
        if (!normalizedColor(color, normalized)) return;
        QColor background(normalized);
        background.setAlpha(0x15);
        format.setProperty(NotesRichFormat::QuoteColor, normalized);
        format.setBackground(background);
    }
    QTextCursor cursor(block);
    cursor.setBlockFormat(format);
}

struct CalloutMarkup {
    QString color;
    int paragraphCount = 0;
};
}

bool isAt(const QTextDocument &document, int position) {
    if (position < 0 || position >= document.characterCount()) return false;
    const QTextBlock block = document.findBlock(position);
    return block.isValid() && block.blockFormat().intProperty(QTextFormat::BlockQuoteLevel) == 1;
}

QString colorAt(const QTextDocument &document, int position) {
    if (!isAt(document, position)) return {};
    const QString color = document.findBlock(position).blockFormat().stringProperty(NotesRichFormat::QuoteColor);
    return color.isEmpty() ? QStringLiteral("default") : color;
}

QString sourceForEditor(const QString &source) {
    static const QRegularExpression openingTag(QStringLiteral("<blockquote\\b[^>]*>"));
    static const QRegularExpression styleAttribute(QStringLiteral("\\s+style\\s*=\\s*(?:\"[^\"]*\"|'[^']*')"));
    QString result;
    int copiedThrough = 0;
    auto matches = openingTag.globalMatch(source);
    while (matches.hasNext()) {
        const auto match = matches.next();
        result += source.mid(copiedThrough, match.capturedStart() - copiedThrough);
        QString tag = match.captured();
        tag.remove(styleAttribute);
        result += tag;
        copiedThrough = match.capturedEnd();
    }
    result += source.mid(copiedThrough);
    return result;
}

bool applyColor(QTextDocument &document, int start, int end, const QString &color) {
    if (start < 0 || end < start || end > document.characterCount() - 1) return false;
    QString normalized;
    if (color != QStringLiteral("default") && !color.isEmpty() && !normalizedColor(color, normalized)) return false;
    const QString nextColor = color == QStringLiteral("default") || color.isEmpty() ? QString() : normalized;
    const int lastPosition = end > start ? end - 1 : start;
    QVector<QTextBlock> blocks;
    for (QTextBlock block = document.findBlock(start); block.isValid() && block.position() <= lastPosition;
         block = block.next()) {
        QTextCursor cursor(block);
        if (cursor.currentTable() || block.textList() ||
            block.blockFormat().intProperty(QTextFormat::BlockQuoteLevel) != 1) return false;
        blocks.append(block);
    }
    if (blocks.isEmpty()) return false;

    QTextCursor edit(&document);
    edit.beginEditBlock();
    for (QTextBlock block : blocks) applyBlockColor(block, nextColor);
    edit.endEditBlock();
    return true;
}

bool prepare(QTextDocument &document, const QString &source) {
    QString normalizedSource = NotesRichMarkup::normalizeVoidTags(source);
    QXmlStreamReader xml(QStringLiteral("<root>") + normalizedSource + QStringLiteral("</root>"));
    QVector<CalloutMarkup> callouts;
    QStringList stack;
    CalloutMarkup current;
    bool readingCallout = false;
    while (!xml.atEnd()) {
        xml.readNext();
        if (xml.isStartElement()) {
            const QString name = xml.name().toString();
            if (stack.size() == 1 && name == QStringLiteral("blockquote")) {
                current = {};
                readingCallout = true;
                const QString color = xml.attributes().value(QStringLiteral("data-color")).toString();
                if (!color.isEmpty() && !normalizedColor(color, current.color)) return false;
            } else if (readingCallout && stack.last() == QStringLiteral("blockquote") &&
                       name == QStringLiteral("p")) {
                ++current.paragraphCount;
            }
            stack.append(name);
        } else if (xml.isEndElement()) {
            if (stack.isEmpty()) return false;
            const QString name = xml.name().toString();
            if (name == QStringLiteral("blockquote") && readingCallout) {
                if (current.paragraphCount < 1) return false;
                callouts.append(current);
                readingCallout = false;
            }
            stack.removeLast();
        }
    }
    if (xml.hasError() || !stack.isEmpty()) return false;
    if (callouts.isEmpty()) return true;

    document.setUndoRedoEnabled(false);
    QTextBlock block = document.begin();
    for (const CalloutMarkup &callout : callouts) {
        while (block.isValid()) {
            QTextCursor cursor(block);
            if (!cursor.currentTable() &&
                block.blockFormat().intProperty(QTextFormat::BlockQuoteLevel) == 1) break;
            block = block.next();
        }
        for (int paragraph = 0; paragraph < callout.paragraphCount; ++paragraph) {
            if (!block.isValid()) {
                document.setUndoRedoEnabled(true);
                return false;
            }
            QTextCursor cursor(block);
            if (cursor.currentTable() || block.textList() || block.blockFormat().headingLevel() != 0) {
                document.setUndoRedoEnabled(true);
                return false;
            }
            applyBlockColor(block, callout.color);
            block = block.next();
        }
    }
    document.setUndoRedoEnabled(true);
    document.setModified(false);
    return true;
}
}
