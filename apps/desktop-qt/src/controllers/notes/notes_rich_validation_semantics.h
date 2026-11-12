#pragma once

#include <QtCore/QChar>
#include <QtCore/QString>

class QTextDocument;

namespace NotesRichValidationSemantics {
bool matchesText(const QTextDocument &document, const QString &expected, QChar blockSeparator);
int embeddedDividerCount(const QTextDocument &document);
}
