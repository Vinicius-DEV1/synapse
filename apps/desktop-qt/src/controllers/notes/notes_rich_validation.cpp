#include "notes_rich_document.h"
#include "notes_rich_markup.h"
#include "notes_rich_spoilers.h"
#include "notes_rich_table_cell_formatting.h"
#include "notes_rich_code_blocks.h"
#include "notes_rich_task_markup.h"

#include <QtCore/QSet>
#include <QtCore/QRegularExpression>
#include <QtCore/QXmlStreamReader>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFrame>
#include <QtGui/QTextTable>

namespace NotesRichDocument {

namespace {
const QChar SemanticBlockSeparator(0xFDD0);

bool supportsCalloutAttributes(const QXmlStreamAttributes &attributes) {
    if (!attributes.hasAttribute(QStringLiteral("data-color")) || attributes.size() > 2) return false;
    static const QRegularExpression colorPattern(QStringLiteral("^#[0-9a-fA-F]{6}$"));
    const QString color = attributes.value(QStringLiteral("data-color")).toString();
    if (!colorPattern.match(color).hasMatch() || !NotesRichMarkup::parseCssColor(color).isValid()) return false;
    if (!attributes.hasAttribute(QStringLiteral("style"))) return true;
    QString style = attributes.value(QStringLiteral("style")).toString();
    style.remove(QRegularExpression(QStringLiteral("\\s+")));
    style = style.toLower();
    const QString normalizedColor = color.toLower();
    const QString expected = QStringLiteral("background-color:%1!important;border-left-color:%2!important;")
        .arg(normalizedColor + QStringLiteral("15"), normalizedColor);
    return style == expected;
}

bool appendSemanticBlock(QString &text, const QString &blockText, bool &hasPrevious) {
    if (hasPrevious) text += SemanticBlockSeparator;
    text += blockText;
    hasPrevious = true;
    return true;
}

bool hasHorizontalRule(const QTextBlock &block) {
    return block.isValid() && block.blockFormat().hasProperty(QTextFormat::BlockTrailingHorizontalRulerWidth);
}

bool semanticText(const QTextDocument &document, QString &text) {
    bool hasPrevious = false;
    bool skipTableSeparator = false;
    for (auto item = document.rootFrame()->begin(); !item.atEnd(); ++item) {
        if (QTextFrame *frame = item.currentFrame()) {
            const auto *table = qobject_cast<QTextTable *>(frame);
            if (!table) return false;
            for (int row = 0; row < table->rows(); ++row) {
                for (int column = 0; column < table->columns(); ++column) {
                    const QTextTableCell cell = table->cellAt(row, column);
                    for (auto cellItem = cell.begin(); cellItem != cell.end(); ++cellItem) {
                        if (cellItem.currentFrame()) return false;
                        const QTextBlock block = cellItem.currentBlock();
                        if (block.isValid()) appendSemanticBlock(text, block.text(), hasPrevious);
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
        if (hasHorizontalRule(block)) appendSemanticBlock(text, QString(), hasPrevious);
        if (!hasHorizontalRule(block) || !block.text().isEmpty()) appendSemanticBlock(text, block.text(), hasPrevious);
    }
    return true;
}
}

bool supportsSource(const QString &source) {
    using namespace NotesRichMarkup;
    if (source.isEmpty()) return true;
    QString normalizedListSource;
    QVector<NotesRichTaskMarkup::ListItemState> listItemStates;
    if (!NotesRichTaskMarkup::normalizeSource(source, normalizedListSource, listItemStates)) return false;
    const QString normalizedSource = normalizeVoidTags(normalizedListSource);
    QXmlStreamReader xml(QStringLiteral("<root>") + normalizedSource + QStringLiteral("</root>"));
    const QSet<QString> inlineTags = {"strong", "b", "em", "i", "u", "s", "strike", "br", "span", "mark", "a", "code"};
    const QSet<QString> blockTags = {"p", "h1", "h2", "h3", "h4", "h5", "h6"};
    QStringList stack;
    QString expectedText;
    QString expectedSemanticText;
    QVector<QPair<int, int>> expectedTables;
    QVector<int> listItemParagraphCounts;
    QVector<int> listItemSourceIndices;
    int sourceListItemIndex = 0;
    int rootBlocks = 0;
    int contentBlocks = 0;
    int listItems = 0;
    int quoteParagraphs = 0;
    int codeChildren = 0;
    int tableRows = 0;
    int tableHeaderRows = 0;
    int tableColumns = -1;
    int rowCells = 0;
    int tableCellCount = 0;
    int cellParagraphs = 0;
    bool currentRowHeader = false;
    bool rowHeaderStateSet = false;
    bool lastRootWasTable = false;
    bool sawTbody = false;
    bool hasTable = false;
    bool hasDivider = false;
    bool insidePageReference = false;
    while (!xml.atEnd()) {
        xml.readNext();
        if (xml.isStartElement()) {
            if (insidePageReference) return false;
            const QString name = xml.name().toString();
            const auto attributes = xml.attributes();
            const bool paragraphParent = stack.isEmpty() || stack.last() == "root" || stack.last() == "li" ||
                stack.last() == "blockquote" || stack.last() == "td" || stack.last() == "th";
            const bool preservesWhitespace = name == "p" && paragraphParent && attributes.size() == 1 &&
                attributes.hasAttribute("style") && attributes.value("style") == "white-space:pre-wrap";
            const bool supportedCellSpan = (name == "td" || name == "th") &&
                NotesRichTableCellFormatting::supportsCellAttributes(name, attributes);
            bool supportedStyle = false;
            if (name == "a" && attributes.hasAttribute("href") && attributes.size() <= 3) {
                supportedStyle = isSafeLink(attributes.value("href").toString());
                if (attributes.hasAttribute("target"))
                    supportedStyle = supportedStyle && attributes.value("target") == "_blank";
                if (attributes.hasAttribute("rel"))
                    supportedStyle = supportedStyle && attributes.value("rel") == "noopener noreferrer nofollow";
                for (const auto &attribute : attributes) {
                    if (attribute.name() != "href" && attribute.name() != "target" && attribute.name() != "rel")
                        supportedStyle = false;
                }
                if (attributes.hasAttribute("rel") && !attributes.hasAttribute("target")) supportedStyle = false;
            }
            if (name == "blockquote" && !attributes.isEmpty())
                supportedStyle = supportsCalloutAttributes(attributes);
            if (name == "span" && attributes.size() == 1 && attributes.hasAttribute("style"))
                supportedStyle = parseSingleStyle(styleValue(attributes), "color").isValid();
            if (name == "span" && isPageReferenceAttributes(attributes)) supportedStyle = true;
            if (name == "span" && NotesRichSpoilers::isSpoilerAttributes(attributes))
                supportedStyle = true;
            if (name == "code" && stack.last() == "pre") {
                QString language;
                supportedStyle = NotesRichCodeBlocks::languageFromAttributes(attributes, language);
            }
            if (name == "mark" && (attributes.size() == 1 || attributes.size() == 2) && attributes.hasAttribute("style")) {
                const QColor background = parseHighlightStyle(styleValue(attributes));
                supportedStyle = background.isValid();
                if (attributes.hasAttribute("data-color"))
                    supportedStyle = supportedStyle && parseCssColor(attributes.value("data-color").toString()) == background;
                for (const auto &attribute : attributes) {
                    if (attribute.name() != "style" && attribute.name() != "data-color") supportedStyle = false;
                }
            }
            if ((!attributes.isEmpty() && !preservesWhitespace && !supportedStyle && !supportedCellSpan) ||
                !xml.namespaceUri().isEmpty()) return false;
            if (name == "span" && isPageReferenceAttributes(attributes)) insidePageReference = true;

            if (stack.isEmpty()) {
                if (name != "root") return false;
            } else if (stack.size() == 1) {
                const bool topBlock = blockTags.contains(name) || name == "blockquote" || name == "ul" ||
                    name == "ol" || name == "pre" || name == "table" || name == "hr";
                if (!topBlock) return false;
                if (rootBlocks++ > 0) {
                    expectedText += lastRootWasTable ? QStringLiteral("\n\n") : QStringLiteral("\n");
                    expectedSemanticText += SemanticBlockSeparator;
                }
                else if (name == "table") expectedText += '\n';
                lastRootWasTable = name == "table";
                if (blockTags.contains(name)) ++contentBlocks;
                if (name == "hr") ++contentBlocks;
                if (name == "hr") hasDivider = true;
                if (name == "ul" || name == "ol") listItems = 0;
                if (name == "blockquote") quoteParagraphs = 0;
                if (name == "pre") { ++contentBlocks; codeChildren = 0; }
                if (name == "table") {
                    hasTable = true;
                    tableRows = 0;
                    tableHeaderRows = 0;
                    tableColumns = -1;
                    tableCellCount = 0;
                    sawTbody = false;
                }
            } else if (stack.last() == "table" && name == "tbody" && !sawTbody) {
                sawTbody = true;
            } else if ((stack.last() == "table" || stack.last() == "tbody") && name == "tr") {
                rowCells = 0;
                currentRowHeader = false;
                rowHeaderStateSet = false;
            } else if (stack.last() == "tr" && (name == "td" || name == "th")) {
                const bool isHeader = name == "th";
                if (rowHeaderStateSet && currentRowHeader != isHeader) return false;
                currentRowHeader = isHeader;
                rowHeaderStateSet = true;
                if (tableCellCount++ > 0) {
                    expectedText += '\n';
                    expectedSemanticText += SemanticBlockSeparator;
                }
                ++rowCells;
                cellParagraphs = 0;
            } else if ((stack.last() == "td" || stack.last() == "th") && name == "p") {
                if (cellParagraphs++ > 0) {
                    expectedText += '\n';
                    expectedSemanticText += SemanticBlockSeparator;
                }
                ++contentBlocks;
            } else if (stack.last() == "tr" && name != "td" && name != "th") {
                return false;
            } else if (stack.last() == "table" && name != "tbody" && name != "tr") {
                return false;
            } else if (stack.last() == "tbody" && name != "tr") {
                return false;
            } else if ((stack.last() == "td" || stack.last() == "th") && name != "p") {
                return false;
            } else if (stack.last() == "pre" && name == "code" && codeChildren++ == 0) {
                // Code language metadata is preserved; token markup remains source-only.
            } else if ((stack.last() == "ul" || stack.last() == "ol") && name == "li") {
                if (listItems++ > 0) {
                    expectedText += '\n';
                    expectedSemanticText += SemanticBlockSeparator;
                }
                listItemParagraphCounts.append(0);
                listItemSourceIndices.append(sourceListItemIndex);
                ++sourceListItemIndex;
                ++contentBlocks;
            } else if (stack.last() == "blockquote" && name == "p") {
                if (quoteParagraphs++ > 0) {
                    expectedText += '\n';
                    expectedSemanticText += SemanticBlockSeparator;
                }
                ++contentBlocks;
            } else if (stack.last() == "li" && name == "p" && !stack.contains("p")) {
                if (listItemParagraphCounts.isEmpty()) return false;
                if (listItemParagraphCounts.last() > 0) {
                    expectedText += '\n';
                    expectedSemanticText += SemanticBlockSeparator;
                    ++contentBlocks;
                }
                ++listItemParagraphCounts.last();
            } else if (stack.last() == "li" && (name == "ul" || name == "ol")) {
                // Nested list items are represented by QTextList indentation during visual editing.
            } else if (!stack.contains("pre") && inlineTags.contains(name) && stack.last() != "br" &&
                       (blockTags.contains(stack.last()) || stack.last() == "li" || inlineTags.contains(stack.last()))) {
                if (name == "a" && stack.contains("a")) return false;
                if (name == "br") {
                    expectedText += '\n';
                    expectedSemanticText += QChar::LineSeparator;
                }
            } else {
                return false;
            }
            stack.append(name);
        } else if (xml.isEndElement()) {
            if (stack.isEmpty()) return false;
            const QString name = xml.name().toString();
            if (insidePageReference && name == "span") insidePageReference = false;
            if (name == "tr") {
                if (rowCells == 0) return false;
                if (tableRows == 0) {
                    tableColumns = rowCells;
                } else if (rowCells != tableColumns) {
                    return false;
                }
                if (currentRowHeader && ++tableHeaderRows > 1) return false;
                ++tableRows;
            } else if (name == "td" || name == "th") {
                if (cellParagraphs == 0) return false;
            } else if (name == "table") {
                if (tableRows == 0 || tableColumns < 1) return false;
                expectedTables.append(qMakePair(tableRows, tableColumns));
            } else if (name == "li") {
                if (listItemParagraphCounts.isEmpty() || listItemSourceIndices.isEmpty()) return false;
                const int itemIndex = listItemSourceIndices.last();
                if (itemIndex < 0 || itemIndex >= listItemStates.size() ||
                    listItemParagraphCounts.last() != listItemStates.at(itemIndex).paragraphBlocks) return false;
                listItemParagraphCounts.removeLast();
                listItemSourceIndices.removeLast();
            }
            stack.removeLast();
        } else if (xml.isCharacters()) {
            if (insidePageReference) return false;
            if ((stack.size() == 1 && !xml.isWhitespace()) || (!stack.isEmpty() && stack.last() == "br") ||
                ((!stack.isEmpty() && (stack.last() == "table" || stack.last() == "tbody" || stack.last() == "tr" ||
                                      stack.last() == "td" || stack.last() == "th")) && !xml.isWhitespace())) return false;
            const bool structuralWhitespace = !stack.isEmpty() && xml.isWhitespace() &&
                (stack.last() == "table" || stack.last() == "tbody" || stack.last() == "tr" ||
                 stack.last() == "td" || stack.last() == "th");
            if (stack.size() > 1 && !structuralWhitespace) {
                expectedText += xml.text();
                if (stack.contains("pre") && hasTable) {
                    QString normalized = xml.text().toString();
                    normalized.replace('\n', SemanticBlockSeparator);
                    expectedSemanticText += normalized;
                } else {
                    expectedSemanticText += xml.text();
                }
                if (stack.contains("pre")) contentBlocks += xml.text().count('\n');
            }
        } else if (xml.isComment() || xml.isDTD() || xml.isProcessingInstruction()) {
            return false;
        }
    }
    if (xml.hasError() || !stack.isEmpty() || contentBlocks == 0) return false;
    if (lastRootWasTable) expectedText += '\n';
    QTextDocument document;
    document.setHtml(normalizedSource);
    if (hasTable || hasDivider) {
        QString actualSemanticText;
        if (!semanticText(document, actualSemanticText) || actualSemanticText != expectedSemanticText) return false;
    } else if (document.toPlainText() != expectedText) {
        return false;
    }
    if (expectedTables.isEmpty()) {
        int embeddedDividers = 0;
        for (auto item = document.rootFrame()->begin(); !item.atEnd(); ++item) {
            const QTextBlock block = item.currentBlock();
            if (hasHorizontalRule(block) && !block.text().isEmpty()) ++embeddedDividers;
        }
        return document.blockCount() == contentBlocks - embeddedDividers;
    }

    QVector<QPair<int, int>> actualTables;
    for (QTextFrame *frame : document.rootFrame()->childFrames()) {
        if (const auto *table = qobject_cast<QTextTable *>(frame))
            actualTables.append(qMakePair(table->rows(), table->columns()));
        else return false;
    }
    return actualTables == expectedTables;
}
}
