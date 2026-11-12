#include "notes_rich_table_cell_formatting.h"

#include "notes_rich_markup.h"
#include "notes_rich_format.h"
#include "notes_rich_spoilers.h"
#include "notes_rich_table_merging.h"
#include "notes_rich_table_styles.h"

#include <QtCore/QRegularExpression>
#include <QtCore/QSet>
#include <QtCore/QVector>
#include <QtGui/QBrush>
#include <QtGui/QFont>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>
#include <QtGui/QTextTable>
#include <QtGui/QTextTableCell>

namespace NotesRichTableCellFormatting {
namespace {
const QVector<QColor> CellBackgrounds = {
    QColor(239, 68, 68, 51), QColor(249, 115, 22, 51), QColor(234, 179, 8, 51),
    QColor(34, 197, 94, 51), QColor(59, 130, 246, 51), QColor(139, 92, 246, 51),
    QColor(236, 72, 153, 51)
};

QColor backgroundFromAttributes(const QXmlStreamAttributes &attributes) {
    if (!attributes.hasAttribute(QStringLiteral("data-bg-color"))) return {};
    const QColor dataColor = NotesRichMarkup::parseCssColor(
        attributes.value(QStringLiteral("data-bg-color")).toString());
    if (!isSupportedBackground(dataColor)) return {};
    if (!attributes.hasAttribute(QStringLiteral("style"))) return dataColor;

    static const QRegularExpression stylePattern(
        QStringLiteral("^background-color\\s*:\\s*(.+?)\\s*!important\\s*;?$"),
        QRegularExpression::CaseInsensitiveOption);
    const auto style = stylePattern.match(attributes.value(QStringLiteral("style")).toString().trimmed());
    if (!style.hasMatch()) return {};
    const QColor styleColor = NotesRichMarkup::parseCssColor(style.captured(1).trimmed());
    return styleColor == dataColor ? dataColor : QColor();
}

QString openingCellTag(const QRegularExpressionMatch &match) {
    const QString tag = match.captured(1);
    const QString attributes = match.captured(2);
    const QRegularExpression colorAttribute(QStringLiteral("\\s+data-bg-color\\s*=\\s*(['\"])(.*?)\\1"),
                                            QRegularExpression::CaseInsensitiveOption);
    const auto colorMatch = colorAttribute.match(attributes);
    if (!colorMatch.hasMatch()) return match.captured(0);
    const QColor color = NotesRichMarkup::parseCssColor(colorMatch.captured(2));
    if (!isSupportedBackground(color)) return match.captured(0);

    QString retainedAttributes = attributes;
    retainedAttributes.remove(colorAttribute);
    const QRegularExpression styleAttribute(QStringLiteral("\\s+style\\s*=\\s*(['\"])(.*?)\\1"),
                                            QRegularExpression::CaseInsensitiveOption);
    retainedAttributes.remove(styleAttribute);
    const QString canonicalStyle = QStringLiteral(" style=\"background-color: %1\"")
        .arg(NotesRichMarkup::colorCss(color));
    return QStringLiteral("<%1%2%3>").arg(tag, retainedAttributes, canonicalStyle);
}

bool validSpanAttribute(const QXmlStreamAttributes &attributes, const QString &name) {
    if (!attributes.hasAttribute(name)) return true;
    static const QRegularExpression pattern(QStringLiteral("^[1-9][0-9]?$"));
    const QString value = attributes.value(name).toString();
    if (!pattern.match(value).hasMatch()) return false;
    bool valid = false;
    const int span = value.toInt(&valid);
    return valid && span <= NotesRichTableMerging::MaxSupportedCellSpan;
}

QTextTable *tableAt(QTextDocument &document, int position) {
    if (position < 0 || position >= document.characterCount()) return nullptr;
    QTextCursor cursor(&document);
    cursor.setPosition(position);
    return cursor.currentTable();
}

bool selectedCells(QTextDocument &document, int selectionStart, int selectionEnd,
                   QVector<QTextTableCell> &cells) {
    if (selectionStart < 0 || selectionEnd <= selectionStart ||
        selectionEnd > document.characterCount() - 1) return false;
    QTextTable *table = tableAt(document, selectionStart);
    if (!table || tableAt(document, selectionEnd - 1) != table) return false;

    QTextCursor selection(&document);
    selection.setPosition(selectionStart);
    selection.setPosition(selectionEnd, QTextCursor::KeepAnchor);
    int firstRow = -1;
    int rowCount = 0;
    int firstColumn = -1;
    int columnCount = 0;
    selection.selectedTableCells(&firstRow, &rowCount, &firstColumn, &columnCount);
    if (rowCount < 1 || columnCount < 1 || rowCount * columnCount < 2 || firstRow < 0 || firstColumn < 0 ||
        firstRow + rowCount > table->rows() || firstColumn + columnCount > table->columns()) return false;

    QSet<int> seenCells;
    for (int row = firstRow; row < firstRow + rowCount; ++row) {
        for (int column = firstColumn; column < firstColumn + columnCount; ++column) {
            const QTextTableCell cell = table->cellAt(row, column);
            if (!NotesRichTableMerging::isSupportedCellSpan(cell) || cell.row() < firstRow ||
                cell.column() < firstColumn || cell.row() + cell.rowSpan() > firstRow + rowCount ||
                cell.column() + cell.columnSpan() > firstColumn + columnCount) return false;
            const int index = cell.row() * table->columns() + cell.column();
            if (seenCells.contains(index)) continue;
            seenCells.insert(index);
            cells.append(cell);
        }
    }
    return !cells.isEmpty();
}
}

bool isSupportedBackground(const QColor &color) {
    return color.isValid() && CellBackgrounds.contains(color);
}

bool isSupportedBackground(const QBrush &brush) {
    return brush.style() == Qt::SolidPattern && isSupportedBackground(brush.color());
}

bool supportsCellAttributes(const QString &tagName, const QXmlStreamAttributes &attributes) {
    if (tagName != QStringLiteral("td") && tagName != QStringLiteral("th")) return false;
    if (!validSpanAttribute(attributes, QStringLiteral("colspan")) ||
        !validSpanAttribute(attributes, QStringLiteral("rowspan"))) return false;
    bool hasColor = false;
    bool hasStyle = false;
    for (const auto &attribute : attributes) {
        const QString name = attribute.name().toString();
        if (name == QStringLiteral("colspan") || name == QStringLiteral("rowspan")) {
            continue;
        }
        if (name == QStringLiteral("data-bg-color")) {
            hasColor = true;
        } else if (name == QStringLiteral("style")) {
            hasStyle = true;
        } else {
            return false;
        }
    }
    if (attributes.size() > 4 || (hasStyle && !hasColor)) return false;
    if (!hasColor) return true;
    return isSupportedBackground(backgroundFromAttributes(attributes));
}

QString editorMarkup(const QString &source) {
    static const QRegularExpression cellTag(QStringLiteral("<(td|th)\\b([^>]*)>"),
                                            QRegularExpression::CaseInsensitiveOption);
    QString result;
    int offset = 0;
    auto match = cellTag.globalMatch(source);
    while (match.hasNext()) {
        const auto current = match.next();
        result += source.mid(offset, current.capturedStart() - offset);
        result += openingCellTag(current);
        offset = current.capturedEnd();
    }
    result += source.mid(offset);
    return result;
}

bool canSetBackgroundOnSelection(const QTextDocument &document, int selectionStart, int selectionEnd) {
    QVector<QTextTableCell> cells;
    return selectedCells(*const_cast<QTextDocument *>(&document), selectionStart, selectionEnd, cells);
}

bool clearFormattingOnSelection(QTextDocument &document, int selectionStart, int selectionEnd) {
    QVector<QTextTableCell> cells;
    if (!selectedCells(document, selectionStart, selectionEnd, cells)) return false;

    struct FormatChange {
        int start;
        int end;
        QTextCharFormat format;
    };
    QVector<FormatChange> changes;
    for (const QTextTableCell &cell : cells) {
        for (auto item = cell.begin(); item != cell.end(); ++item) {
            const QTextBlock block = item.currentBlock();
            if (!block.isValid()) continue;
            for (auto fragmentItem = block.begin(); !fragmentItem.atEnd(); ++fragmentItem) {
                const QTextFragment fragment = fragmentItem.fragment();
                if (!fragment.isValid()) continue;
                const int start = qMax(cell.firstCursorPosition().position(), fragment.position());
                const int end = qMin(cell.lastCursorPosition().position(), fragment.position() + fragment.length());
                if (end <= start) continue;

                QTextCharFormat format = fragment.charFormat();
                QString pageId;
                if (format.isAnchor() && NotesRichMarkup::pageReferenceFromHref(format.anchorHref(), &pageId))
                    continue;

                if (format.boolProperty(NotesRichFormat::SpoilerMark))
                    format = NotesRichSpoilers::formatForSerialization(format);

                const int headingLevel = block.blockFormat().headingLevel();
                if (headingLevel > 0 && format.intProperty(NotesRichFormat::HeadingBoldState) != 0) {
                    format.setFontWeight(QFont::Bold);
                    format.setProperty(NotesRichFormat::HeadingBoldState,
                                       NotesRichFormat::HeadingGeneratedBold);
                } else if (format.intProperty(NotesRichFormat::TableHeaderBoldState) != 0) {
                    format.setFontWeight(QFont::Bold);
                    format.setProperty(NotesRichFormat::TableHeaderBoldState,
                                       NotesRichFormat::TableHeaderGeneratedBold);
                } else {
                    format.clearProperty(QTextFormat::FontWeight);
                    format.clearProperty(NotesRichFormat::HeadingBoldState);
                    format.clearProperty(NotesRichFormat::TableHeaderBoldState);
                }
                format.clearProperty(QTextFormat::FontItalic);
                format.clearProperty(QTextFormat::FontUnderline);
                format.clearProperty(QTextFormat::TextUnderlineStyle);
                format.clearProperty(QTextFormat::FontStrikeOut);
                if (format.fontFamilies().toStringList().contains(QStringLiteral("monospace"), Qt::CaseInsensitive))
                    format.clearProperty(QTextFormat::FontFamilies);
                format.clearProperty(QTextFormat::ForegroundBrush);
                format.clearProperty(QTextFormat::BackgroundBrush);
                format.clearProperty(QTextFormat::IsAnchor);
                format.clearProperty(QTextFormat::AnchorHref);
                changes.append({start, end, format});
            }
        }
    }

    if (changes.isEmpty()) return true;
    QTextCursor edit(&document);
    edit.beginEditBlock();
    for (const FormatChange &change : changes) {
        QTextCursor cursor(&document);
        cursor.setPosition(change.start);
        cursor.setPosition(change.end, QTextCursor::KeepAnchor);
        cursor.setCharFormat(change.format);
    }
    edit.endEditBlock();
    return true;
}

bool setBackground(QTextDocument &document, int position, const QString &colorValue, const QString &scope,
                   int selectionStart, int selectionEnd) {
    if (position < 0 || position > document.characterCount() - 1) return false;
    if (scope != QStringLiteral("cell") && scope != QStringLiteral("row") &&
        scope != QStringLiteral("column") && scope != QStringLiteral("table") &&
        scope != QStringLiteral("selection")) return false;
    const QColor color = colorValue.isEmpty() || colorValue == QStringLiteral("transparent")
        ? QColor() : NotesRichMarkup::parseCssColor(colorValue);
    if (color.isValid() && !isSupportedBackground(color)) return false;

    QVector<QTextTableCell> cells;
    if (scope == QStringLiteral("selection")) {
        if (!selectedCells(document, selectionStart, selectionEnd, cells)) return false;
    } else {
        QTextCursor cursor(&document);
        cursor.setPosition(position);
        QTextTable *table = cursor.currentTable();
        if (!table) return false;
        QTextTableCell cell = table->cellAt(cursor);
        if (!cell.isValid()) return false;
        if (scope == QStringLiteral("cell")) {
            cells.append(cell);
        } else if (scope == QStringLiteral("row")) {
            for (int column = 0; column < table->columns(); ++column)
                cells.append(table->cellAt(cell.row(), column));
        } else if (scope == QStringLiteral("column")) {
            for (int row = 0; row < table->rows(); ++row)
                cells.append(table->cellAt(row, cell.column()));
        } else {
            for (int row = 0; row < table->rows(); ++row) {
                for (int column = 0; column < table->columns(); ++column)
                    cells.append(table->cellAt(row, column));
            }
        }
    }

    QTextCursor cursor(&document);
    cursor.setPosition(scope == QStringLiteral("selection") ? selectionStart : position);

    cursor.beginEditBlock();
    for (QTextTableCell selectedCell : cells) {
        QTextCharFormat format = selectedCell.format();
        if (color.isValid()) format.setBackground(color);
        else format.clearProperty(QTextFormat::BackgroundBrush);
        selectedCell.setFormat(format);
    }
    if (QTextTable *table = cursor.currentTable()) NotesRichTableStyles::apply(*table);
    cursor.endEditBlock();
    return true;
}
}
