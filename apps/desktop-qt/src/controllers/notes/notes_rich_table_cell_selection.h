#pragma once

#include <QtCore/QString>
#include <QtCore/QVariantMap>

class QTextDocument;

namespace NotesRichTableCellSelection {
QVariantMap selectionRange(const QTextDocument &document, int position, const QString &scope);
QString selectionScope(const QTextDocument &document, int cursorPosition,
                       int selectionStart, int selectionEnd);
}
