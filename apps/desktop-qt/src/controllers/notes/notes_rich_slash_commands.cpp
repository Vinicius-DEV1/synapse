#include "notes_rich_slash_commands.h"

#include "notes_rich_document.h"
#include "notes_rich_tables.h"

#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextDocumentFragment>
#include <QtQuick/QQuickTextDocument>

namespace NotesRichSlashCommands {
int execute(QQuickTextDocument *document, int start, int end, const QString &commandId) {
    if (!document || !document->textDocument()) return -1;
    QTextDocument *richDocument = document->textDocument();
    if (start < 0 || end <= start || end > richDocument->characterCount() - 1) return -1;

    QString blockType;
    if (commandId == "text") blockType = "paragraph";
    else if (commandId == "h1") blockType = "heading1";
    else if (commandId == "h2") blockType = "heading2";
    else if (commandId == "h3") blockType = "heading3";
    else if (commandId == "todo") blockType = "taskList";
    else if (commandId == "bullet") blockType = "bulletList";
    else if (commandId == "callout") blockType = "quote";
    else if (commandId == "code") blockType = "codeBlock";
    else if (commandId != "divider" && commandId != "table" && commandId != "page") return -1;

    QTextCursor queryCursor(richDocument);
    queryCursor.setPosition(start);
    queryCursor.setPosition(end, QTextCursor::KeepAnchor);
    const QString queryText = queryCursor.selectedText();
    if (!queryText.startsWith(QLatin1Char('/')) || queryText.contains(QChar::ParagraphSeparator) ||
        queryText.contains(QChar::LineSeparator)) return -1;
    if (commandId == "divider") return NotesRichDocument::insertDivider(*richDocument, start, end);
    if (commandId == "table") return NotesRichTables::insertSimpleTable(*richDocument, start, end);
    const QTextDocumentFragment originalQuery = queryCursor.selection();

    if (commandId == "page") {
        queryCursor.beginEditBlock();
        queryCursor.removeSelectedText();
        queryCursor.endEditBlock();
        return start;
    }

    queryCursor.beginEditBlock();
    queryCursor.removeSelectedText();

    const bool applied = NotesRichDocument::toggleBlock(*richDocument, start, start, blockType);
    if (!applied) {
        queryCursor.setPosition(start);
        queryCursor.insertFragment(originalQuery);
        queryCursor.endEditBlock();
        return -1;
    }
    queryCursor.endEditBlock();
    return start;
}
}
