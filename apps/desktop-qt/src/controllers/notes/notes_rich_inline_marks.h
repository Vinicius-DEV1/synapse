#pragma once

#include <QtCore/QString>

class QTextDocument;

namespace NotesRichInlineMarks {
bool toggle(QTextDocument &document, int start, int end, const QString &mark,
            bool joinPreviousEditBlock = false);
bool toggleAtCursor(QTextDocument &document, int position, const QString &mark);
bool clearInsertionMarks(QTextDocument &document);
bool applyMark(QTextDocument &document, int start, int end, const QString &mark,
               bool enabled, bool joinPreviousEditBlock = false);
bool applyPendingMarks(QTextDocument &document, int start, int end);
}
