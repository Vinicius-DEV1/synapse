#pragma once

class QBrush;
class QTextDocument;
class QTextTable;

namespace NotesRichTableStyles {
void apply(QTextTable &table);
void prepare(QTextDocument &document);
bool isBorderBrush(const QBrush &brush);
bool isHeaderBackground(const QBrush &brush);
}
