#pragma once

class QTextDocument;

namespace NotesRichImageEditing {

bool canMove(const QTextDocument &document, int imagePosition, bool upward);
int move(QTextDocument &document, int imagePosition, bool upward);
int insertParagraphBelow(QTextDocument &document, int imagePosition);

}
