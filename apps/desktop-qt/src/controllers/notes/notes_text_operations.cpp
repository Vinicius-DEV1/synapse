#include "notes_text_operations.h"

#include "notes_code_syntax_highlighter.h"
#include "notes_rich_document.h"
#include "notes_rich_markup.h"
#include "notes_rich_callouts.h"
#include "notes_rich_code_blocks.h"
#include "notes_rich_divider_editing.h"
#include "notes_rich_spoilers.h"
#include "notes_rich_slash_commands.h"
#include "notes_rich_table_cell_formatting.h"
#include "notes_rich_task_markup.h"
#include "notes_rich_task_lists.h"

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

QString NotesTextOperations::richSourceForEditorWithPages(const QString &source, const QVariantList &pages) const {
    const QString editorSource = richSourceForEditor(source);
    return editorSource.isEmpty() && !source.isEmpty() ? QString() :
        NotesRichMarkup::pageReferencesForEditor(editorSource, pages);
}

QString NotesTextOperations::richPageReferenceId(const QString &href) const {
    QString pageId;
    return NotesRichMarkup::pageReferenceFromHref(href, &pageId) ? pageId : QString();
}

int NotesTextOperations::insertRichPageReference(QQuickTextDocument *document, int position,
                                                  const QString &pageId, const QString &title) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichDocument::insertPageReference(*document->textDocument(), position, pageId, title);
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

bool NotesTextOperations::canMoveRichCodeBlock(QQuickTextDocument *document, int position, bool upward) const {
    return document && document->textDocument() &&
        NotesRichCodeBlocks::canMove(*document->textDocument(), position, upward);
}

int NotesTextOperations::moveRichCodeBlock(QQuickTextDocument *document, int position, bool upward) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichCodeBlocks::move(*document->textDocument(), position, upward);
}

int NotesTextOperations::moveRichCodeBlockTo(QQuickTextDocument *document, int position, int targetPosition,
                                             bool afterTarget) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichCodeBlocks::moveTo(*document->textDocument(), position, targetPosition, afterTarget);
}

QString NotesTextOperations::richCodeBlockLanguage(QQuickTextDocument *document, int position) const {
    if (!document || !document->textDocument()) return {};
    return NotesRichCodeBlocks::languageAt(*document->textDocument(), position);
}

QObject *NotesTextOperations::createRichCodeSyntaxHighlighter(QQuickTextDocument *document) {
    if (!document || !document->textDocument()) return nullptr;
    auto *highlighter = new NotesCodeSyntaxHighlighter(document->textDocument());
    highlighter->setParent(this);
    return highlighter;
}

void NotesTextOperations::releaseRichCodeSyntaxHighlighter(QObject *highlighter) {
    auto *codeHighlighter = qobject_cast<NotesCodeSyntaxHighlighter *>(highlighter);
    if (codeHighlighter && codeHighlighter->parent() == this) delete codeHighlighter;
}

void NotesTextOperations::refreshRichCodeSyntaxHighlighting(QObject *highlighter) {
    auto *codeHighlighter = qobject_cast<NotesCodeSyntaxHighlighter *>(highlighter);
    if (codeHighlighter && codeHighlighter->parent() == this) codeHighlighter->rehighlight();
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

int NotesTextOperations::insertRichParagraphBelowCodeBlock(QQuickTextDocument *document, int position) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichCodeBlocks::insertParagraphBelow(*document->textDocument(), position);
}

int NotesTextOperations::deleteRichCodeBlock(QQuickTextDocument *document, int position) const {
    if (!document || !document->textDocument()) return -1;
    return NotesRichCodeBlocks::remove(*document->textDocument(), position);
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

bool NotesTextOperations::toggleRichAtCursor(QQuickTextDocument *document, int position, const QString &mark) const {
    return document && document->textDocument() &&
        NotesRichDocument::toggleInlineAtCursor(*document->textDocument(), position, mark);
}

bool NotesTextOperations::clearRichPendingMarks(QQuickTextDocument *document) const {
    return document && document->textDocument() &&
        NotesRichDocument::clearInlineInsertionMarks(*document->textDocument());
}

bool NotesTextOperations::applyRichPendingMarks(QQuickTextDocument *document, const QString &previousText,
                                                 const QString &currentText, int cursorPosition) const {
    if (!document || !document->textDocument() || currentText == previousText) return false;
    int prefix = 0;
    const int shorterLength = qMin(previousText.size(), currentText.size());
    while (prefix < shorterLength && previousText.at(prefix) == currentText.at(prefix)) ++prefix;
    int suffix = 0;
    while (suffix < previousText.size() - prefix && suffix < currentText.size() - prefix &&
           previousText.at(previousText.size() - suffix - 1) == currentText.at(currentText.size() - suffix - 1)) ++suffix;
    const int added = currentText.size() - prefix - suffix;
    if (added <= 0 || cursorPosition != prefix + added) return false;
    return NotesRichDocument::applyPendingInlineMarks(*document->textDocument(), prefix, prefix + added);
}

QString NotesTextOperations::richPlainText(QQuickTextDocument *document) const {
    return document && document->textDocument() ? document->textDocument()->toPlainText() : QString();
}

bool NotesTextOperations::toggleRichBlock(QQuickTextDocument *document, int start, int end, const QString &blockType) const {
    return document && document->textDocument() && NotesRichDocument::toggleBlock(*document->textDocument(), start, end, blockType);
}

int NotesTextOperations::executeRichSlashCommand(QQuickTextDocument *document, int start, int end,
                                                  const QString &commandId) const {
    return NotesRichSlashCommands::execute(document, start, end, commandId);
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
