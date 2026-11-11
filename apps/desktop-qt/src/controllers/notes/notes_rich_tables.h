#pragma once

#include <QtCore/QString>

class QTextDocument;
class QTextTable;

namespace NotesRichTables {
bool serialize(const QTextTable &table, QString &html);
int insertSimpleTable(QTextDocument &document, int start, int end);
bool isCellAt(const QTextDocument &document, int position);
bool canApplyStructureAction(const QTextDocument &document, int position, const QString &action);
bool applyStructureAction(QTextDocument &document, int position, const QString &action);
void prepareVisualStyles(QTextDocument &document);
}
