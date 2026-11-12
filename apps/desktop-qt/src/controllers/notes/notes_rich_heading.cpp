#include "notes_rich_document.h"
#include "notes_rich_format.h"
#include "notes_rich_markup.h"
#include "notes_rich_tables.h"
#include "notes_rich_task_markup.h"
#include "notes_rich_task_lists.h"

#include <QtCore/QVector>
#include <QtCore/QPair>
#include <QtCore/QXmlStreamReader>
#include <QtGui/QTextBlock>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>
#include <QtGui/QTextFrame>
#include <QtGui/QTextTable>

namespace NotesRichDocument {
namespace {
struct HeadingRange {
    int start = 0;
    int end = 0;
    int level = 0;
};

struct BoldRange {
    int start = 0;
    int end = 0;
};

struct TableHeaderCellMarkup {
    int textLength = 0;
    QVector<BoldRange> explicitBold;
};

struct TableHeaderRowMarkup {
    int rowIndex = 0;
    QVector<TableHeaderCellMarkup> cells;
};

int headingLevel(const QString &tag) {
    if (tag == "h1") return 1;
    if (tag == "h2") return 2;
    if (tag == "h3") return 3;
    if (tag == "h4") return 4;
    if (tag == "h5") return 5;
    if (tag == "h6") return 6;
    return 0;
}

void prepareTableHeaderStyles(QTextDocument &document,
                              const QVector<QVector<TableHeaderRowMarkup>> &tables) {
    if (tables.isEmpty()) return;
    QVector<QTextTable *> documentTables;
    for (QTextFrame *frame : document.rootFrame()->childFrames()) {
        if (auto *table = qobject_cast<QTextTable *>(frame)) documentTables.append(table);
    }
    if (documentTables.size() != tables.size()) return;

    struct PendingFormat { int start; int end; QTextCharFormat format; };
    QVector<QPair<int, int>> explicitRanges;
    QVector<PendingFormat> pending;
    QVector<QTextCursor> insertionCursors;
    for (int tableIndex = 0; tableIndex < tables.size(); ++tableIndex) {
        QTextTable *table = documentTables.at(tableIndex);
        for (const TableHeaderRowMarkup &headerRow : tables.at(tableIndex)) {
            if (headerRow.rowIndex < 0 || headerRow.rowIndex >= table->rows() ||
                table->columns() != headerRow.cells.size()) return;
            for (int column = 0; column < headerRow.cells.size(); ++column) {
                const QTextTableCell cell = table->cellAt(headerRow.rowIndex, column);
                QTextCursor insertionCursor = cell.firstCursorPosition();
                const int cellStart = insertionCursor.position();
                insertionCursors.append(insertionCursor);
                for (auto cellItem = cell.begin(); cellItem != cell.end(); ++cellItem) {
                    const QTextBlock block = cellItem.currentBlock();
                    if (!block.isValid()) continue;
                    for (auto fragmentItem = block.begin(); !fragmentItem.atEnd(); ++fragmentItem) {
                        const QTextFragment fragment = fragmentItem.fragment();
                        if (!fragment.isValid()) continue;
                        QTextCharFormat format = fragment.charFormat();
                        format.setProperty(NotesRichFormat::TableHeaderBoldState,
                                           NotesRichFormat::TableHeaderGeneratedBold);
                        pending.append({fragment.position(), fragment.position() + fragment.length(), format});
                    }
                }
                for (const BoldRange &range : headerRow.cells.at(column).explicitBold)
                    explicitRanges.append(qMakePair(cellStart + range.start, cellStart + range.end));
            }
        }
    }
    document.setUndoRedoEnabled(false);
    for (const PendingFormat &item : pending) {
        QTextCursor cursor(&document);
        cursor.setPosition(item.start);
        cursor.setPosition(item.end, QTextCursor::KeepAnchor);
        cursor.setCharFormat(item.format);
    }
    QTextCharFormat generatedHeader;
    generatedHeader.setProperty(NotesRichFormat::TableHeaderBoldState, NotesRichFormat::TableHeaderGeneratedBold);
    for (QTextCursor cursor : insertionCursors) cursor.mergeCharFormat(generatedHeader);
    QTextCharFormat explicitHeaderBold;
    explicitHeaderBold.setProperty(NotesRichFormat::TableHeaderBoldState, NotesRichFormat::TableHeaderExplicitBold);
    for (const auto &range : explicitRanges) {
        QTextCursor cursor(&document);
        cursor.setPosition(range.first);
        cursor.setPosition(range.second, QTextCursor::KeepAnchor);
        cursor.mergeCharFormat(explicitHeaderBold);
    }
    document.setUndoRedoEnabled(true);
    document.setModified(false);
}
}

bool prepareHeadingStyles(QTextDocument &document, const QString &source) {
    QString normalizedListSource;
    QVector<NotesRichTaskMarkup::ListItemState> listItems;
    if (!NotesRichTaskMarkup::normalizeSource(source, normalizedListSource, listItems)) return false;
    QXmlStreamReader xml(QStringLiteral("<root>") + NotesRichMarkup::normalizeVoidTags(normalizedListSource) + QStringLiteral("</root>"));
    QStringList stack;
    QVector<HeadingRange> headings;
    QVector<BoldRange> explicitBold;
    int position = 0;
    int rootBlockCount = 0;
    int listItemCount = 0;
    QVector<int> taskParagraphCounts;
    int quoteParagraphCount = 0;
    int activeHeadingLevel = 0;
    int activeHeadingStart = 0;
    QVector<int> strongStarts;
    QVector<QVector<TableHeaderRowMarkup>> tableHeaders;
    QVector<TableHeaderRowMarkup> currentTableHeaders;
    QVector<TableHeaderCellMarkup> activeHeaderRow;
    TableHeaderCellMarkup activeHeaderCell;
    QVector<int> headerStrongStarts;
    int tableRows = 0;
    int tableCellCount = 0;
    int headerParagraphs = 0;
    bool captureHeaderCell = false;
    bool lastRootWasTable = false;
    while (!xml.atEnd()) {
        xml.readNext();
        if (xml.isStartElement()) {
            const QString name = xml.name().toString();
            if (stack.isEmpty()) {
                stack.append(name);
                continue;
            } else if (stack.size() == 1) {
                if (rootBlockCount++ > 0) position += lastRootWasTable ? 2 : 1;
                else if (name == "table") ++position;
                lastRootWasTable = name == "table";
                if (name == "ul" || name == "ol") listItemCount = 0;
                if (name == "blockquote") quoteParagraphCount = 0;
                activeHeadingLevel = headingLevel(name);
                if (activeHeadingLevel > 0) activeHeadingStart = position;
                if (name == "table") {
                    currentTableHeaders.clear();
                    tableRows = 0;
                    tableCellCount = 0;
                }
            } else if (name == "tr") {
                activeHeaderRow.clear();
            } else if ((stack.last() == "ul" || stack.last() == "ol") && name == "li") {
                if (listItemCount++ > 0) ++position;
                taskParagraphCounts.append(0);
            } else if (stack.last() == "li" && name == "p" && !stack.contains("p")) {
                if (taskParagraphCounts.isEmpty()) return false;
                if (taskParagraphCounts.last() > 0) ++position;
                ++taskParagraphCounts.last();
            } else if (stack.last() == "blockquote" && name == "p") {
                if (quoteParagraphCount++ > 0) ++position;
            } else if (stack.last() == "tr" && (name == "td" || name == "th")) {
                if (tableCellCount++ > 0) ++position;
                captureHeaderCell = name == "th";
                if (captureHeaderCell) { activeHeaderCell = {}; headerParagraphs = 0; headerStrongStarts.clear(); }
            } else if ((stack.last() == "td" || stack.last() == "th") && name == "p" && captureHeaderCell) {
                if (headerParagraphs++ > 0) { ++position; ++activeHeaderCell.textLength; }
            }
            if (name == "br") {
                ++position;
                if (captureHeaderCell) ++activeHeaderCell.textLength;
            }
            if ((name == "strong" || name == "b") && activeHeadingLevel > 0) strongStarts.append(position);
            if ((name == "strong" || name == "b") && captureHeaderCell) headerStrongStarts.append(activeHeaderCell.textLength);
            stack.append(name);
        } else if (xml.isEndElement()) {
            if (stack.isEmpty()) return false;
            const QString name = stack.last();
            if ((name == "strong" || name == "b") && activeHeadingLevel > 0 && !strongStarts.isEmpty())
                explicitBold.append({strongStarts.takeLast(), position});
            if ((name == "strong" || name == "b") && captureHeaderCell && !headerStrongStarts.isEmpty())
                activeHeaderCell.explicitBold.append({headerStrongStarts.takeLast(), activeHeaderCell.textLength});
            if (headingLevel(name) > 0 && activeHeadingLevel > 0) {
                headings.append({activeHeadingStart, position, activeHeadingLevel});
                activeHeadingLevel = 0;
            }
            if ((name == "td" || name == "th") && captureHeaderCell) {
                activeHeaderRow.append(activeHeaderCell);
                captureHeaderCell = false;
            } else if (name == "tr" && stack.contains("table")) {
                if (!activeHeaderRow.isEmpty()) currentTableHeaders.append({tableRows, activeHeaderRow});
                ++tableRows;
            } else if (name == "table") {
                tableHeaders.append(currentTableHeaders);
            } else if (name == "li") {
                if (taskParagraphCounts.isEmpty()) return false;
                taskParagraphCounts.removeLast();
            }
            stack.removeLast();
        } else if (xml.isCharacters() && stack.size() > 1) {
            const bool structuralWhitespace = xml.isWhitespace() &&
                (stack.last() == "table" || stack.last() == "tbody" || stack.last() == "tr" ||
                 stack.last() == "td" || stack.last() == "th");
            if (!structuralWhitespace) {
                position += xml.text().size();
                if (captureHeaderCell && stack.contains("p")) activeHeaderCell.textLength += xml.text().size();
            }
        }
    }
    if (xml.hasError()) return false;

    struct PendingFormat { int start; int end; QTextCharFormat format; };
    QVector<PendingFormat> pending;
    document.setUndoRedoEnabled(false);
    for (const HeadingRange &heading : headings) {
        for (QTextBlock block = document.findBlock(heading.start); block.isValid() && block.position() < heading.end; block = block.next()) {
            for (auto it = block.begin(); !it.atEnd(); ++it) {
                const QTextFragment fragment = it.fragment();
                if (!fragment.isValid() || fragment.position() >= heading.end ||
                    fragment.position() + fragment.length() <= heading.start) continue;
                const int from = qMax(heading.start, fragment.position());
                const int to = qMin(heading.end, fragment.position() + fragment.length());
                bool isExplicitBold = false;
                for (const BoldRange &range : explicitBold) {
                    if (from >= range.start && to <= range.end) {
                        isExplicitBold = true;
                        break;
                    }
                }
                QTextCharFormat format = fragment.charFormat();
                format.setFontWeight(QFont::Bold);
                format.setProperty(QTextFormat::FontSizeAdjustment, 4 - heading.level);
                format.setProperty(NotesRichFormat::HeadingBoldState, isExplicitBold
                    ? NotesRichFormat::HeadingExplicitBold : NotesRichFormat::HeadingGeneratedBold);
                pending.append({from, to, format});
            }
        }
    }
    for (const PendingFormat &item : pending) {
        QTextCursor cursor(&document);
        cursor.setPosition(item.start);
        cursor.setPosition(item.end, QTextCursor::KeepAnchor);
        cursor.setCharFormat(item.format);
    }
    document.setUndoRedoEnabled(true);
    document.setModified(false);
    prepareTableHeaderStyles(document, tableHeaders);
    NotesRichTables::prepareVisualStyles(document);
    return NotesRichTaskLists::prepareDocument(document, source);
}

}
