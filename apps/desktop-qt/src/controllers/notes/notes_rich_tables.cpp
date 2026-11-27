#include "notes_rich_tables.h"

#include "notes_rich_serialization_support.h"
#include "notes_rich_markup.h"
#include "notes_rich_table_cell_formatting.h"
#include "notes_rich_table_merging.h"
#include "notes_rich_table_styles.h"

#include <QtCore/QVector>
#include <QtCore/QSet>
#include <QtCore/QVariantList>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFrame>
#include <QtGui/QTextLength>
#include <QtGui/QTextTable>

namespace NotesRichTables {
namespace {

bool supportedTableFormat(const QTextTableFormat &format, int columns) {
    const auto properties = format.properties();
    for (auto it = properties.cbegin(); it != properties.cend(); ++it) {
        switch (it.key()) {
        case QTextFormat::ObjectIndex:
            if (it.value().toInt() < 0) return false;
            break;
        case QTextFormat::CssFloat:
            if (it.value().toInt() != 0) return false;
            break;
        case QTextFormat::ObjectType:
            if (it.value().toInt() != QTextFormat::TableObject) return false;
            break;
        case QTextFormat::FrameMargin:
        case QTextFormat::FrameLeftMargin:
        case QTextFormat::FrameRightMargin:
            if (it.value().toDouble() != 0.0) return false;
            break;
        case QTextFormat::FrameTopMargin:
        case QTextFormat::FrameBottomMargin:
            if (it.value().toDouble() != 0.0 && it.value().toDouble() != 16.0) return false;
            break;
        case QTextFormat::FrameBorder:
            if (it.value().toDouble() != 1.0) return false;
            break;
        case QTextFormat::FrameBorderStyle:
            if (it.value().toInt() != QTextFrameFormat::BorderStyle_Solid) return false;
            break;
        case QTextFormat::FrameBorderBrush:
            if (!NotesRichTableStyles::isBorderBrush(it.value().value<QBrush>())) return false;
            break;
        case QTextFormat::FramePadding:
            if (it.value().toDouble() != 0.0) return false;
            break;
        case QTextFormat::FrameWidth:
            if (it.value().value<QTextLength>().type() != QTextLength::VariableLength &&
                !(it.value().value<QTextLength>().type() == QTextLength::PercentageLength &&
                  it.value().value<QTextLength>().rawValue() == 100.0)) return false;
            break;
        case QTextFormat::FrameHeight:
            if (it.value().value<QTextLength>().type() != QTextLength::VariableLength) return false;
            break;
        case QTextFormat::TableColumns:
            if (format.columns() != columns) return false;
            break;
        case QTextFormat::TableColumnWidthConstraints: {
            const QVariantList widths = it.value().toList();
            if (widths.size() != columns) return false;
            for (const QVariant &value : widths) {
                const QTextLength width = value.value<QTextLength>();
                if (width.type() != QTextLength::VariableLength) return false;
            }
            break;
        }
        case QTextFormat::TableCellSpacing:
            if (it.value().toDouble() != 2.0 && it.value().toDouble() != 0.0) return false;
            break;
        case QTextFormat::TableCellPadding:
            if (it.value().toDouble() != 0.0) return false;
            break;
        case QTextFormat::TableHeaderRowCount:
            if (it.value().toInt() < 0 || it.value().toInt() > 1) return false;
            break;
        case QTextFormat::TableBorderCollapse:
            if (!it.value().toBool()) return false;
            break;
        default:
            return false;
        }
    }
    return format.columns() == columns && (format.cellSpacing() == 2.0 || format.cellSpacing() == 0.0) &&
        format.cellPadding() == 0.0;
}

bool supportedCellFormat(const QTextTableCell &cell, bool &header) {
    if (!NotesRichTableMerging::isSupportedCellSpan(cell)) return false;
    const QTextCharFormat format = cell.format();
    header = format.fontWeight() >= QFont::Bold;
    const auto properties = format.properties();
    for (auto it = properties.cbegin(); it != properties.cend(); ++it) {
        const int key = it.key();
        const int borderProperty = key == QTextFormat::TableCellTopBorder || key == QTextFormat::TableCellBottomBorder ||
            key == QTextFormat::TableCellLeftBorder || key == QTextFormat::TableCellRightBorder;
        const int borderStyleProperty = key == QTextFormat::TableCellTopBorderStyle || key == QTextFormat::TableCellBottomBorderStyle ||
            key == QTextFormat::TableCellLeftBorderStyle || key == QTextFormat::TableCellRightBorderStyle;
        const int borderBrushProperty = key == QTextFormat::TableCellTopBorderBrush || key == QTextFormat::TableCellBottomBorderBrush ||
            key == QTextFormat::TableCellLeftBorderBrush || key == QTextFormat::TableCellRightBorderBrush;
        const int paddingProperty = key == QTextFormat::TableCellTopPadding || key == QTextFormat::TableCellBottomPadding ||
            key == QTextFormat::TableCellLeftPadding || key == QTextFormat::TableCellRightPadding;
        const bool spanProperty = (key == QTextFormat::TableCellRowSpan && it.value().toInt() == cell.rowSpan()) ||
            (key == QTextFormat::TableCellColumnSpan && it.value().toInt() == cell.columnSpan());
        if (key == QTextFormat::ObjectIndex || key == QTextFormat::ObjectType ||
            (key == QTextFormat::FontWeight && header) || (key == QTextFormat::BackgroundBrush &&
             ((header && NotesRichTableStyles::isHeaderBackground(it.value().value<QBrush>())) ||
              NotesRichTableCellFormatting::isSupportedBackground(it.value().value<QBrush>()))) || spanProperty ||
            borderProperty || borderStyleProperty ||
            borderBrushProperty || paddingProperty) {
            if (borderProperty && it.value().toDouble() != 1.0) return false;
            if (borderStyleProperty && it.value().toInt() != QTextFrameFormat::BorderStyle_Solid) return false;
            if (borderBrushProperty && !NotesRichTableStyles::isBorderBrush(it.value().value<QBrush>())) return false;
            if (key == QTextFormat::TableCellTopPadding && it.value().toDouble() != 8.0) return false;
            if (key == QTextFormat::TableCellBottomPadding && it.value().toDouble() != 8.0) return false;
            if (key == QTextFormat::TableCellLeftPadding && it.value().toDouble() != 12.0) return false;
            if (key == QTextFormat::TableCellRightPadding && it.value().toDouble() != 12.0) return false;
        } else {
            return false;
        }
    }
    return format.objectType() == QTextFormat::TableCellObject;
}

bool supportedCellBlock(const QTextBlock &block) {
    if (!block.isValid() || block.blockFormat().headingLevel() != 0 || block.textList() ||
        block.blockFormat().intProperty(QTextFormat::BlockQuoteLevel) != 0 ||
        block.blockFormat().boolProperty(QTextFormat::BlockNonBreakableLines)) return false;
    const auto properties = block.blockFormat().properties();
    for (auto it = properties.cbegin(); it != properties.cend(); ++it) {
        if (it.key() == QTextFormat::BlockTopMargin) {
            if (it.value().toDouble() != 0.0 && it.value().toDouble() != 12.0) return false;
        } else if (it.key() == QTextFormat::BlockBottomMargin) {
            if (it.value().toDouble() != 4.0 && it.value().toDouble() != 12.0) return false;
        } else if (it.key() == QTextFormat::BlockAlignment) {
            const int alignment = it.value().toInt();
            if (alignment != Qt::AlignLeft) return false;
        } else if (it.key() == QTextFormat::BlockIndent) {
            if (it.value().toInt() != 0) return false;
        } else if (it.key() == QTextFormat::BackgroundBrush) {
            if (!NotesRichTableCellFormatting::isSupportedBackground(it.value().value<QBrush>())) return false;
        } else {
            return false;
        }
    }
    return true;
}

bool stripVisualCellProperties(QTextCharFormat &format) {
    const auto properties = format.properties();
    for (auto it = properties.cbegin(); it != properties.cend(); ++it) {
        const int key = it.key();
        const int borderProperty = key == QTextFormat::TableCellTopBorder || key == QTextFormat::TableCellBottomBorder ||
            key == QTextFormat::TableCellLeftBorder || key == QTextFormat::TableCellRightBorder;
        const int borderStyleProperty = key == QTextFormat::TableCellTopBorderStyle || key == QTextFormat::TableCellBottomBorderStyle ||
            key == QTextFormat::TableCellLeftBorderStyle || key == QTextFormat::TableCellRightBorderStyle;
        const int borderBrushProperty = key == QTextFormat::TableCellTopBorderBrush || key == QTextFormat::TableCellBottomBorderBrush ||
            key == QTextFormat::TableCellLeftBorderBrush || key == QTextFormat::TableCellRightBorderBrush;
        const int paddingProperty = key == QTextFormat::TableCellTopPadding || key == QTextFormat::TableCellBottomPadding ||
            key == QTextFormat::TableCellLeftPadding || key == QTextFormat::TableCellRightPadding;
        const bool knownObject = key == QTextFormat::ObjectIndex && it.value().toInt() == 0;
        const bool knownType = key == QTextFormat::ObjectType && it.value().toInt() == QTextFormat::TableCellObject;
        const bool knownCellBackground = key == QTextFormat::BackgroundBrush &&
            (NotesRichTableStyles::isHeaderBackground(it.value().value<QBrush>()) ||
             NotesRichTableCellFormatting::isSupportedBackground(it.value().value<QBrush>()));
        if (!(borderProperty || borderStyleProperty || borderBrushProperty || paddingProperty || knownObject ||
              knownType || knownCellBackground)) continue;
        if (borderProperty && it.value().toDouble() != 1.0) return false;
        if (borderStyleProperty && it.value().toInt() != QTextFrameFormat::BorderStyle_Solid) return false;
        if (borderBrushProperty && !NotesRichTableStyles::isBorderBrush(it.value().value<QBrush>())) return false;
        if (key == QTextFormat::TableCellTopPadding && it.value().toDouble() != 8.0) return false;
        if (key == QTextFormat::TableCellBottomPadding && it.value().toDouble() != 8.0) return false;
        if (key == QTextFormat::TableCellLeftPadding && it.value().toDouble() != 12.0) return false;
        if (key == QTextFormat::TableCellRightPadding && it.value().toDouble() != 12.0) return false;
        format.clearProperty(key);
    }
    return true;
}

bool appendCell(QString &html, const QTextTableCell &cell, bool header) {
    const QString spanAttributes = NotesRichTableMerging::htmlSpanAttributes(cell);
    const QBrush background = cell.format().background();
    const bool customBackground = NotesRichTableCellFormatting::isSupportedBackground(background) &&
        !NotesRichTableStyles::isHeaderBackground(background);
    if (customBackground) {
        const QString color = NotesRichMarkup::colorCss(background.color());
        html += header ? "<th" : "<td";
        html += spanAttributes + QStringLiteral(" data-bg-color=\"%1\" style=\"background-color: %1 !important;\">").arg(color);
    } else {
        html += (header ? "<th" : "<td") + spanAttributes + ">";
    }
    int blocks = 0;
    for (auto it = cell.begin(); it != cell.end(); ++it) {
        if (it.currentFrame()) return false;
        const QTextBlock block = it.currentBlock();
        if (!block.isValid()) continue;
        if (++blocks > 100 || !supportedCellBlock(block)) return false;
        html += "<p>";
        for (auto fragment = block.begin(); !fragment.atEnd(); ++fragment) {
            const QTextFragment value = fragment.fragment();
            if (!value.isValid()) continue;
            QTextCharFormat textFormat = value.charFormat();
            if (!stripVisualCellProperties(textFormat)) return false;
            if (textFormat.objectType() == NotesRichFormat::PageReferenceObjectType) {
                if (!NotesRichSerialization::appendPageReferenceHtml(html, textFormat, value.text()))
                    return false;
                continue;
            }
            if (!NotesRichSerialization::supportedCharacterFormat(textFormat, 0)) return false;
            html += NotesRichSerialization::inlineHtml(value.text(), textFormat, 0, header);
        }
        html += "</p>";
    }
    if (blocks == 0) return false;
    html += header ? "</th>" : "</td>";
    return true;
}

}

bool serialize(const QTextTable &table, QString &html) {
    if (table.rows() < 1 || table.columns() < 1 || !supportedTableFormat(table.format(), table.columns())) return false;
    QVector<bool> rowHeaders;
    int headerRows = 0;
    for (int row = 0; row < table.rows(); ++row) {
        bool headerRow = false;
        for (int column = 0; column < table.columns(); ++column) {
            bool header = false;
            if (!supportedCellFormat(table.cellAt(row, column), header)) return false;
            if (column == 0) headerRow = header;
            else if (header != headerRow) return false;
        }
        if (headerRow && ++headerRows > 1) return false;
        rowHeaders.append(headerRow);
    }

    QString tableHtml = "<table><tbody>";
    for (int row = 0; row < table.rows(); ++row) {
        tableHtml += "<tr>";
        for (int column = 0; column < table.columns(); ++column) {
            const QTextTableCell cell = table.cellAt(row, column);
            if (cell.row() != row || cell.column() != column) continue;
            if (!appendCell(tableHtml, cell, rowHeaders.at(row))) return false;
        }
        tableHtml += "</tr>";
    }
    tableHtml += "</tbody></table>";
    html += tableHtml;
    return true;
}

int insertTemplateTable(QTextDocument &document, int start, int end, const QString &templateId) {
    if (start < 0 || end < start || end > document.characterCount() - 1) return -1;
    int rows = 3;
    int columns = 3;
    QStringList headers;
    if (templateId == QStringLiteral("table-week")) {
        rows = 4;
        columns = 7;
        headers = {QStringLiteral("Seg"), QStringLiteral("Ter"), QStringLiteral("Qua"),
                   QStringLiteral("Qui"), QStringLiteral("Sex"), QStringLiteral("Sáb"), QStringLiteral("Dom")};
    } else if (templateId == QStringLiteral("table-day")) {
        rows = 8;
        columns = 2;
        headers = {QStringLiteral("Horário"), QStringLiteral("Atividade")};
    } else if (templateId == QStringLiteral("table-habit")) {
        rows = 5;
        columns = 8;
        headers = {QStringLiteral("Hábito"), QStringLiteral("Seg"), QStringLiteral("Ter"), QStringLiteral("Qua"),
                   QStringLiteral("Qui"), QStringLiteral("Sex"), QStringLiteral("Sáb"), QStringLiteral("Dom")};
    } else if (templateId == QStringLiteral("cols2")) {
        rows = 2;
        columns = 2;
        headers = {QStringLiteral("Coluna 1"), QStringLiteral("Coluna 2")};
    } else if (templateId == QStringLiteral("cols3")) {
        rows = 2;
        columns = 3;
        headers = {QStringLiteral("Coluna 1"), QStringLiteral("Coluna 2"), QStringLiteral("Coluna 3")};
    }

    QString table = QStringLiteral("<table><tbody><tr>");
    for (int column = 0; column < columns; ++column) {
        const QString headerText = column < headers.size() ? headers.at(column) : QString();
        table += QStringLiteral("<th><p>%1</p></th>").arg(headerText);
    }
    table += QStringLiteral("</tr>");
    for (int row = 0; row < rows - 1; ++row) {
        table += QStringLiteral("<tr>");
        for (int column = 0; column < columns; ++column) {
            table += QStringLiteral("<td><p></p></td>");
        }
        table += QStringLiteral("</tr>");
    }
    table += QStringLiteral("</tbody></table>");
    QSet<int> existingTablePositions;
    for (QTextFrame *frame : document.rootFrame()->childFrames()) {
        if (auto *tableFrame = qobject_cast<QTextTable *>(frame))
            existingTablePositions.insert(tableFrame->firstPosition());
    }
    QTextCursor cursor(&document);
    cursor.beginEditBlock();
    cursor.setPosition(start);
    cursor.setPosition(end, QTextCursor::KeepAnchor);
    cursor.insertHtml(table);
    cursor.endEditBlock();
    cursor.joinPreviousEditBlock();
    for (QTextFrame *frame : document.rootFrame()->childFrames()) {
        auto *insertedTable = qobject_cast<QTextTable *>(frame);
        if (!insertedTable) continue;
        NotesRichTableStyles::apply(*insertedTable);
        if (!existingTablePositions.contains(insertedTable->firstPosition())) {
            QTextCharFormat generatedHeader;
            generatedHeader.setProperty(NotesRichFormat::TableHeaderBoldState, NotesRichFormat::TableHeaderGeneratedBold);
            for (int column = 0; column < insertedTable->columns(); ++column)
                insertedTable->cellAt(0, column).firstCursorPosition().mergeCharFormat(generatedHeader);
        }
    }
    const int result = cursor.position();
    cursor.endEditBlock();
    return result;
}

int insertSimpleTable(QTextDocument &document, int start, int end) {
    return insertTemplateTable(document, start, end, QStringLiteral("table"));
}

void prepareVisualStyles(QTextDocument &document) {
    NotesRichTableStyles::prepare(document);
}

}
