#pragma once

#include <QtCore/QString>

class QTextBlock;
class QTextDocument;
class QXmlStreamAttributes;

namespace NotesRichCodeBlocks {

bool supportsLanguage(const QString &language);
bool languageFromAttributes(const QXmlStreamAttributes &attributes, QString &language);
bool prepare(QTextDocument &document, const QString &source);
bool isAt(const QTextDocument &document, int position);
bool canMove(const QTextDocument &document, int position, bool upward);
int move(QTextDocument &document, int position, bool upward);
int moveTo(QTextDocument &document, int position, int targetPosition, bool afterTarget);
QString languageAt(const QTextDocument &document, int position);
QString textAt(const QTextDocument &document, int position);
int insertParagraphBelow(QTextDocument &document, int position);
int remove(QTextDocument &document, int position);
int nextGroupId(const QTextDocument &document);
void setGroup(QTextBlock block, int groupId, const QString &language = QString());
bool setLanguage(QTextDocument &document, int position, const QString &language);

}
