#pragma once

#include <QtCore/QString>
#include <QtCore/QXmlStreamReader>
#include <QtGui/QTextCharFormat>

class QTextDocument;

namespace NotesRichSpoilers {
bool isSpoilerAttributes(const QXmlStreamAttributes &attributes);
QString editorMarkup(const QString &source);
bool prepare(QTextDocument &document);
bool toggle(QTextDocument &document, int start, int end, bool joinPreviousEditBlock = false);
bool setVisibility(QTextDocument &document, int position, const QString &action);
bool isAt(const QTextDocument &document, int position);
bool isRevealedAt(QTextDocument &document, int position);
QTextCharFormat formatForSerialization(const QTextCharFormat &format);
}
