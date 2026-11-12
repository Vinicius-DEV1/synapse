#include "notes_text_operations.h"
#include "notes_rich_document.h"
#include "notes_rich_callouts.h"
#include "notes_rich_code_blocks.h"
#include "notes_rich_divider_editing.h"
#include "notes_rich_spoilers.h"
#include "notes_rich_table_cell_formatting.h"
#include "notes_rich_task_markup.h"
#include "notes_rich_task_lists.h"
#include "notes_rich_tables.h"

#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QClipboard>
#include <QtGui/QGuiApplication>
#include <QtQuick/QQuickTextDocument>

bool NotesTextOperations::replace(QQuickTextDocument *document, int start, int end, const QString &replacement) {
    return document && replaceDocumentText(document->textDocument(), start, end, replacement);
}

bool NotesTextOperations::supportsRichSource(const QString &source) const {
    return NotesRichDocument::supportsSource(source);
}

QString NotesTextOperations::richSourceForEditor(const QString &source) const {
    QString normalized;
    QVector<NotesRichTaskMarkup::ListItemState> items;
    if (!NotesRichTaskMarkup::normalizeSource(source, normalized, items)) return {};
    normalized = NotesRichCallouts::sourceForEditor(normalized);
    return NotesRichTableCellFormatting::editorMarkup(NotesRichSpoilers::editorMarkup(normalized));
}

bool NotesTextOperations::prepareRichHeadings(QQuickTextDocument *document, const QString &source) const {
    return document && document->textDocument() &&
        NotesRichDocument::prepareHeadingStyles(*document->textDocument(), source);
}

bool NotesTextOperations::prepareRichCodeBlocks(QQuickTextDocument *document, const QString &source) const {
    return document && document->textDocument() &&
        NotesRichCodeBlocks::prepare(*document->textDocument(), source);
}

bool NotesTextOperations::isRichCodeBlock(QQuickTextDocument *document, int position) const {
    return document && document->textDocument() &&
        NotesRichCodeBlocks::isAt(*document->textDocument(), position);
}

QString NotesTextOperations::richCodeBlockLanguage(QQuickTextDocument *document, int position) const {
    if (!document || !document->textDocument()) return {};
    return NotesRichCodeBlocks::languageAt(*document->textDocument(), position);
}

bool NotesTextOperations::setRichCodeBlockLanguage(QQuickTextDocument *document, int position,
                                                     const QString &language) const {
    return document && document->textDocument() &&
        NotesRichCodeBlocks::setLanguage(*document->textDocument(), position, language);
}

bool NotesTextOperations::copyRichCodeBlock(QQuickTextDocument *document, int position) const {
    if (!document || !document->textDocument() || !NotesRichCodeBlocks::isAt(*document->textDocument(), position))
        return false;
    QClipboard *clipboard = QGuiApplication::clipboard();
    if (!clipboard) return false;
    const QString code = NotesRichCodeBlocks::textAt(*document->textDocument(), position);
    clipboard->setText(code, QClipboard::Clipboard);
    return clipboard->text(QClipboard::Clipboard) == code;
}

bool NotesTextOperations::prepareRichCallouts(QQuickTextDocument *document, const QString &source) const {
    return document && document->textDocument() &&
        NotesRichDocument::prepareCalloutStyles(*document->textDocument(), source);
}

bool NotesTextOperations::isRichCalloutAt(QQuickTextDocument *document, int position) const {
    return document && document->textDocument() && NotesRichDocument::isCalloutAt(*document->textDocument(), position);
}

QString NotesTextOperations::richCalloutColorAt(QQuickTextDocument *document, int position) const {
    if (!document || !document->textDocument()) return {};
    return NotesRichDocument::calloutColorAt(*document->textDocument(), position);
}

bool NotesTextOperations::setRichCalloutColor(QQuickTextDocument *document, int start, int end,
                                               const QString &color) const {
    return document && document->textDocument() &&
        NotesRichDocument::setCalloutColor(*document->textDocument(), start, end, color);
}

bool NotesTextOperations::prepareRichSpoilers(QQuickTextDocument *document) const {
    return document && document->textDocument() &&
        NotesRichDocument::prepareSpoilerStyles(*document->textDocument());
}

bool NotesTextOperations::isRichSpoilerAt(QQuickTextDocument *document, int position) const {
    return document && document->textDocument() &&
        NotesRichDocument::isSpoilerAt(*document->textDocument(), position);
}

bool NotesTextOperations::isRichSpoilerRevealedAt(QQuickTextDocument *document, int position) const {
    return document && document->textDocument() &&
        NotesRichDocument::isSpoilerRevealedAt(*document->textDocument(), position);
}

bool NotesTextOperations::setRichSpoilerVisibility(QQuickTextDocument *document, int position,
                                                    const QString &action) const {
    return document && document->textDocument() &&
        NotesRichDocument::setSpoilerVisibility(*document->textDocument(), position, action);
}

QVariantMap NotesTextOperations::serializeRich(QQuickTextDocument *document) const {
    if (!document || !document->textDocument()) return {{"ok", false}};
    const QString html = NotesRichDocument::serialize(*document->textDocument());
    return html.isNull() ? QVariantMap{{"ok", false}} : QVariantMap{{"ok", true}, {"html", html}};
}

bool NotesTextOperations::toggleRich(QQuickTextDocument *document, int start, int end, const QString &mark) const {
    return document && document->textDocument() && NotesRichDocument::toggleInline(*document->textDocument(), start, end, mark);
}

bool NotesTextOperations::toggleRichBlock(QQuickTextDocument *document, int start, int end, const QString &blockType) const {
    return document && document->textDocument() && NotesRichDocument::toggleBlock(*document->textDocument(), start, end, blockType);
}

bool NotesTextOperations::changeRichListIndent(QQuickTextDocument *document, int position, bool outdent) const {
    return document && document->textDocument() &&
        NotesRichDocument::changeListIndent(*document->textDocument(), position, outdent);
}

bool NotesTextOperations::toggleRichTaskItem(QQuickTextDocument *document, int position) const {
    return document && document->textDocument() &&
        NotesRichDocument::toggleTaskItem(*document->textDocument(), position);
}

bool NotesTextOperations::toggleRichTaskItemFromCursor(QQuickTextDocument *document, int position) const {
    return document && document->textDocument() &&
        NotesRichDocument::toggleTaskItemFromCursor(*document->textDocument(), position);
}

QVariantList NotesTextOperations::richTaskCheckboxes(QQuickTextDocument *document) const {
    if (!document || !document->textDocument()) return {};
    return NotesRichTaskLists::checkboxItems(*document->textDocument());
}

int NotesTextOperations::insertRichDivider(QQuickTextDocument *document, int start, int end) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichDocument::insertDivider(*document->textDocument(), start, end);
}

bool NotesTextOperations::isRichDivider(QQuickTextDocument *document, int position) const {
    return document && document->textDocument() &&
        NotesRichDividerEditing::isDividerAt(*document->textDocument(), position);
}

bool NotesTextOperations::canMoveRichDivider(QQuickTextDocument *document, int position, bool upward) const {
    return document && document->textDocument() &&
        NotesRichDividerEditing::canMove(*document->textDocument(), position, upward);
}

int NotesTextOperations::moveRichDivider(QQuickTextDocument *document, int position, bool upward) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichDividerEditing::move(*document->textDocument(), position, upward);
}

int NotesTextOperations::moveRichDividerTo(QQuickTextDocument *document, int position, int targetPosition,
                                           bool afterTarget) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichDividerEditing::moveTo(*document->textDocument(), position, targetPosition, afterTarget);
}

int NotesTextOperations::insertRichParagraphBelowDivider(QQuickTextDocument *document, int position) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichDividerEditing::insertParagraphBelow(*document->textDocument(), position);
}

int NotesTextOperations::insertRichTable(QQuickTextDocument *document, int start, int end) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichTables::insertSimpleTable(*document->textDocument(), start, end);
}

bool NotesTextOperations::isRichTableCell(QQuickTextDocument *document, int position) const {
    return document && document->textDocument() &&
        NotesRichTables::isCellAt(*document->textDocument(), position);
}

bool NotesTextOperations::canApplyRichTableAction(QQuickTextDocument *document, int position,
                                                   const QString &action) const {
    return document && document->textDocument() &&
        NotesRichTables::canApplyStructureAction(*document->textDocument(), position, action);
}

bool NotesTextOperations::applyRichTableAction(QQuickTextDocument *document, int position,
                                                const QString &action) const {
    return document && document->textDocument() &&
        NotesRichTables::applyStructureAction(*document->textDocument(), position, action);
}

bool NotesTextOperations::setRichTableCellBackground(QQuickTextDocument *document, int position,
                                                      const QString &color, const QString &scope) const {
    return document && document->textDocument() &&
        NotesRichTableCellFormatting::setBackground(*document->textDocument(), position, color, scope);
}

bool NotesTextOperations::setRichColor(QQuickTextDocument *document, int start, int end,
                                       const QString &color, bool background) const {
    return document && document->textDocument() &&
        NotesRichDocument::setColor(*document->textDocument(), start, end, color, background);
}

bool NotesTextOperations::setRichLink(QQuickTextDocument *document, int start, int end, const QString &url) const {
    return document && document->textDocument() && NotesRichDocument::setLink(*document->textDocument(), start, end, url);
}

QString NotesTextOperations::richLinkUrl(QQuickTextDocument *document, int start, int end) const {
    if (!document || !document->textDocument()) return {};
    return NotesRichDocument::linkAtSelection(*document->textDocument(), start, end);
}

bool NotesTextOperations::replaceDocumentText(QTextDocument *document, int start, int end, const QString &replacement) {
    if (!document || start < 0 || end < start || end > document->characterCount() - 1) return false;
    QTextCursor cursor(document);
    cursor.beginEditBlock();
    cursor.setPosition(start);
    cursor.setPosition(end, QTextCursor::KeepAnchor);
    cursor.insertText(replacement);
    cursor.endEditBlock();
    return true;
}
