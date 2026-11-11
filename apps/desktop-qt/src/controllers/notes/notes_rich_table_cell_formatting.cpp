#include "notes_rich_table_cell_formatting.h"

#include "notes_rich_markup.h"
#include "notes_rich_table_styles.h"

#include <QtCore/QRegularExpression>
#include <QtCore/QVector>
#include <QtGui/QBrush>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
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
}

bool isSupportedBackground(const QColor &color) {
    return color.isValid() && CellBackgrounds.contains(color);
}

bool isSupportedBackground(const QBrush &brush) {
    return brush.style() == Qt::SolidPattern && isSupportedBackground(brush.color());
}

bool supportsCellAttributes(const QString &tagName, const QXmlStreamAttributes &attributes) {
    if (tagName != QStringLiteral("td") && tagName != QStringLiteral("th")) return false;
    bool hasColor = false;
    bool hasStyle = false;
    for (const auto &attribute : attributes) {
        const QString name = attribute.name().toString();
        if (name == QStringLiteral("colspan") || name == QStringLiteral("rowspan")) {
            if (attribute.value() != QStringLiteral("1")) return false;
        } else if (name == QStringLiteral("data-bg-color")) {
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

bool setBackground(QTextDocument &document, int position, const QString &colorValue, const QString &scope) {
    if (position < 0 || position > document.characterCount() - 1) return false;
    if (scope != QStringLiteral("cell") && scope != QStringLiteral("row") &&
        scope != QStringLiteral("column") && scope != QStringLiteral("table")) return false;
    const QColor color = colorValue.isEmpty() || colorValue == QStringLiteral("transparent")
        ? QColor() : NotesRichMarkup::parseCssColor(colorValue);
    if (color.isValid() && !isSupportedBackground(color)) return false;

    QTextCursor cursor(&document);
    cursor.setPosition(position);
    QTextTable *table = cursor.currentTable();
    if (!table) return false;
    QTextTableCell cell = table->cellAt(cursor);
    if (!cell.isValid()) return false;

    QVector<QTextTableCell> cells;
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

    cursor.beginEditBlock();
    for (QTextTableCell selectedCell : cells) {
        QTextCharFormat format = selectedCell.format();
        if (color.isValid()) format.setBackground(color);
        else format.clearProperty(QTextFormat::BackgroundBrush);
        selectedCell.setFormat(format);
    }
    NotesRichTableStyles::apply(*table);
    cursor.endEditBlock();
    return true;
}
}
