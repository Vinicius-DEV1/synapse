#pragma once

class QString;
class QTextDocument;

namespace NotesRichCallouts {
bool applyColor(QTextDocument &document, int start, int end, const QString &color);
bool isAt(const QTextDocument &document, int position);
QString colorAt(const QTextDocument &document, int position);
QString sourceForEditor(const QString &source);
bool prepare(QTextDocument &document, const QString &source);
}
