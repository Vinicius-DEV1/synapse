#pragma once

#include <QtCore/QString>

class QTextDocument;
class QTextTable;

namespace NotesRichTableStructureRange {
struct Rectangle {
    int top = 0;
    int bottom = 0;
    int left = 0;
    int right = 0;
};

bool forSelection(const QTextDocument &document, int position, int selectionStart, int selectionEnd,
                  QTextTable *&table, Rectangle &rectangle);
bool allowsActionWithMergedCells(const QTextTable &table, const QString &action);
}
