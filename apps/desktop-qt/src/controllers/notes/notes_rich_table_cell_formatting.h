#pragma once

#include <QtCore/QString>
#include <QtCore/QXmlStreamReader>
#include <QtGui/QColor>

class QBrush;
class QTextDocument;

namespace NotesRichTableCellFormatting {
bool isSupportedBackground(const QColor &color);
bool isSupportedBackground(const QBrush &brush);
bool supportsCellAttributes(const QString &tagName, const QXmlStreamAttributes &attributes);
QString editorMarkup(const QString &source);
bool canSetBackgroundOnSelection(const QTextDocument &document, int selectionStart, int selectionEnd);
bool setBackground(QTextDocument &document, int position, const QString &color,
                   const QString &scope = QStringLiteral("cell"), int selectionStart = -1,
                   int selectionEnd = -1);
}
