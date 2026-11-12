#include "notes_rich_code_blocks.h"

#include "notes_rich_format.h"
#include "notes_rich_markup.h"

#include <QtCore/QRegularExpression>
#include <QtCore/QXmlStreamReader>
#include <QtGui/QTextBlock>
#include <QtGui/QTextBlockFormat>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
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
