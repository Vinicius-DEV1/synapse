#pragma once

class QTextDocument;

namespace NotesRichDividerEditing {
bool isDividerAt(const QTextDocument &document, int position);
bool canMove(const QTextDocument &document, int position, bool upward);
int move(QTextDocument &document, int position, bool upward);
int moveTo(QTextDocument &document, int position, int targetPosition, bool afterTarget);
int insertParagraphBelow(QTextDocument &document, int position);
}
