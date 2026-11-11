#pragma once

#include <QtCore/QString>

class QTextDocument;

namespace NotesRichDocument {
// This conservative subset deliberately excludes attributes and custom nodes.
bool supportsSource(const QString &source);
// Returns a null string if the document contains formatting this adapter cannot preserve.
QString serialize(const QTextDocument &document);
bool toggleInline(QTextDocument &document, int start, int end, const QString &mark);
bool toggleBlock(QTextDocument &document, int start, int end, const QString &blockType);
bool changeListIndent(QTextDocument &document, int position, bool outdent);
bool toggleTaskItem(QTextDocument &document, int position);
bool toggleTaskItemFromCursor(QTextDocument &document, int position);
bool isTaskItemAt(const QTextDocument &document, int position);
int insertDivider(QTextDocument &document, int start, int end);
bool prepareHeadingStyles(QTextDocument &document, const QString &source);
bool prepareSpoilerStyles(QTextDocument &document);
bool setSpoilerVisibility(QTextDocument &document, int position, const QString &action);
bool isSpoilerAt(const QTextDocument &document, int position);
bool isSpoilerRevealedAt(QTextDocument &document, int position);
bool setColor(QTextDocument &document, int start, int end, const QString &color, bool background);
bool setLink(QTextDocument &document, int start, int end, const QString &url);
QString linkAtSelection(const QTextDocument &document, int start, int end);
}
