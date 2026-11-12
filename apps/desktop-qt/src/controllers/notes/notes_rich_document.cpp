#include "notes_rich_document.h"
#include "notes_rich_callouts.h"
#include "notes_rich_markup.h"
#include "notes_rich_inline_marks.h"
#include "notes_rich_spoilers.h"

#include <QtGui/QTextBlock>
#include <QtGui/QTextCharFormat>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>

namespace NotesRichDocument {

int insertPageReference(QTextDocument &document, int position, const QString &pageId, const QString &title) {
    const QString href = NotesRichMarkup::pageReferenceHref(pageId, title);
    if (href.isEmpty() || position < 0 || position > document.characterCount() - 1) return -1;
    QTextCursor cursor(&document);
    cursor.setPosition(position);
    cursor.beginEditBlock();
    QTextCharFormat format;
    format.setAnchor(true);
    format.setAnchorHref(href);
    cursor.insertText(title, format);
    cursor.endEditBlock();
    return cursor.position();
}

bool toggleInline(QTextDocument &document, int start, int end, const QString &mark,
                  bool joinPreviousEditBlock) {
    return NotesRichInlineMarks::toggle(document, start, end, mark, joinPreviousEditBlock);
}

bool toggleInlineAtCursor(QTextDocument &document, int position, const QString &mark) {
    return NotesRichInlineMarks::toggleAtCursor(document, position, mark);
}

bool clearInlineInsertionMarks(QTextDocument &document) {
    return NotesRichInlineMarks::clearInsertionMarks(document);
}

bool applyInlineMark(QTextDocument &document, int start, int end, const QString &mark,
                     bool enabled, bool joinPreviousEditBlock) {
    return NotesRichInlineMarks::applyMark(document, start, end, mark, enabled, joinPreviousEditBlock);
}

bool applyPendingInlineMarks(QTextDocument &document, int start, int end) {
    return NotesRichInlineMarks::applyPendingMarks(document, start, end);
}

bool prepareSpoilerStyles(QTextDocument &document) {
    return NotesRichSpoilers::prepare(document);
}

bool setSpoilerVisibility(QTextDocument &document, int position, const QString &action) {
    return NotesRichSpoilers::setVisibility(document, position, action);
}

bool isSpoilerAt(const QTextDocument &document, int position) {
    return NotesRichSpoilers::isAt(document, position);
}

bool isSpoilerRevealedAt(QTextDocument &document, int position) {
    return NotesRichSpoilers::isRevealedAt(document, position);
}


bool setColor(QTextDocument &document, int start, int end, const QString &colorValue, bool background) {
    if (start < 0 || end <= start || end > document.characterCount() - 1) return false;
    const QColor color = colorValue.isEmpty() ? QColor() : NotesRichMarkup::parseCssColor(colorValue);
    if (!colorValue.isEmpty() && !color.isValid()) return false;
    QTextCursor cursor(&document);
    cursor.setPosition(start);
    cursor.setPosition(end, QTextCursor::KeepAnchor);
    const int property = background ? QTextFormat::BackgroundBrush : QTextFormat::ForegroundBrush;
    cursor.beginEditBlock();
    if (!color.isValid()) {
        for (QTextBlock block = document.findBlock(start); block.isValid() && block.position() < end; block = block.next()) {
            for (auto it = block.begin(); !it.atEnd(); ++it) {
                const QTextFragment fragment = it.fragment();
                if (!fragment.isValid() || fragment.position() >= end || fragment.position() + fragment.length() <= start) continue;
                const int fragmentStart = qMax(start, fragment.position());
                const int fragmentEnd = qMin(end, fragment.position() + fragment.length());
                QTextCursor fragmentCursor(&document);
                fragmentCursor.setPosition(fragmentStart);
                fragmentCursor.setPosition(fragmentEnd, QTextCursor::KeepAnchor);
                QTextCharFormat format = fragment.charFormat();
                format.clearProperty(property);
                fragmentCursor.setCharFormat(format);
            }
        }
    } else {
        QTextCharFormat format;
        if (background) format.setBackground(color);
        else format.setForeground(color);
        cursor.mergeCharFormat(format);
    }
    cursor.endEditBlock();
    return true;
}

bool setLink(QTextDocument &document, int start, int end, const QString &url) {
    if (start < 0 || end <= start || end > document.characterCount() - 1 || (!url.isEmpty() && !NotesRichMarkup::isSafeLink(url))) return false;
    QTextCursor cursor(&document);
    cursor.setPosition(start);
    cursor.setPosition(end, QTextCursor::KeepAnchor);
    cursor.beginEditBlock();
    if (url.isEmpty()) {
        for (QTextBlock block = document.findBlock(start); block.isValid() && block.position() < end; block = block.next()) {
            for (auto it = block.begin(); !it.atEnd(); ++it) {
                const QTextFragment fragment = it.fragment();
                if (!fragment.isValid() || fragment.position() >= end || fragment.position() + fragment.length() <= start) continue;
                const int fragmentStart = qMax(start, fragment.position());
                const int fragmentEnd = qMin(end, fragment.position() + fragment.length());
                QTextCursor fragmentCursor(&document);
                fragmentCursor.setPosition(fragmentStart);
                fragmentCursor.setPosition(fragmentEnd, QTextCursor::KeepAnchor);
                QTextCharFormat format = fragment.charFormat();
                format.clearProperty(QTextFormat::IsAnchor);
                format.clearProperty(QTextFormat::AnchorHref);
                fragmentCursor.setCharFormat(format);
            }
        }
    } else {
        QTextCharFormat format;
        format.setAnchor(true);
        format.setAnchorHref(url);
        cursor.mergeCharFormat(format);
    }
    cursor.endEditBlock();
    return true;
}

QString linkAtSelection(const QTextDocument &document, int start, int end) {
    if (start < 0 || end <= start || end > document.characterCount() - 1) return {};
    QString result;
    bool found = false;
    for (QTextBlock block = document.findBlock(start); block.isValid() && block.position() < end; block = block.next()) {
        for (auto it = block.begin(); !it.atEnd(); ++it) {
            const QTextFragment fragment = it.fragment();
            if (!fragment.isValid() || fragment.position() >= end || fragment.position() + fragment.length() <= start) continue;
            const QTextCharFormat format = fragment.charFormat();
            if (!format.isAnchor() || !NotesRichMarkup::isSafeLink(format.anchorHref())) return {};
            if (found && result != format.anchorHref()) return {};
            result = format.anchorHref();
            found = true;
        }
    }
    return found ? result : QString();
}

bool setCalloutColor(QTextDocument &document, int start, int end, const QString &color) {
    return NotesRichCallouts::applyColor(document, start, end, color);
}

bool isCalloutAt(const QTextDocument &document, int position) {
    return NotesRichCallouts::isAt(document, position);
}

QString calloutColorAt(const QTextDocument &document, int position) {
    return NotesRichCallouts::colorAt(document, position);
}

bool prepareCalloutStyles(QTextDocument &document, const QString &source) {
    return NotesRichCallouts::prepare(document, source);
}
}
