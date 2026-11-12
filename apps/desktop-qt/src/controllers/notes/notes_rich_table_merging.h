#pragma once

#include <QtCore/QString>

class QTextDocument;
class QTextTableCell;

namespace NotesRichTableMerging {
inline constexpr int MaxSupportedCellSpan = 64;
bool isSupportedCellSpan(const QTextTableCell &cell);
QString htmlSpanAttributes(const QTextTableCell &cell);
bool supportsSourceSpans(const QString &source);
bool canMergeOrSplit(const QTextDocument &document, int cursorPosition,
                     int selectionStart, int selectionEnd);
bool mergeOrSplit(QTextDocument &document, int cursorPosition,
                  int selectionStart, int selectionEnd);
}
