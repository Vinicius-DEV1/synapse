#pragma once

#include <QtCore/QString>

class QTextDocument;
class QTextTable;

namespace NotesRichTables {
bool serialize(const QTextTable &table, QString &html);
int insertSimpleTable(QTextDocument &document, int start, int end);
int insertTemplateTable(QTextDocument &document, int start, int end, const QString &templateId);
bool isCellAt(const QTextDocument &document, int position);
bool canApplyStructureAction(const QTextDocument &document, int position, const QString &action,
                             int selectionStart = -1, int selectionEnd = -1);
bool applyStructureAction(QTextDocument &document, int position, const QString &action,
                          int selectionStart = -1, int selectionEnd = -1);
void prepareVisualStyles(QTextDocument &document);
}
