#pragma once

#include <QtCore/QString>
#include <QtCore/QVariantList>

class QTextBlock;
class QTextDocument;

namespace NotesRichTaskLists {
bool prepareDocument(QTextDocument &document, const QString &source);
bool isTaskItemAt(const QTextDocument &document, int position);
bool isTaskCheckboxAtCursor(const QTextDocument &document, int position);
bool toggleItem(QTextDocument &document, int position);
QVariantList checkboxItems(const QTextDocument &document);
void insertMarker(QTextDocument &document, QTextBlock block, bool checked);
void removeMarker(QTextBlock block);
}
