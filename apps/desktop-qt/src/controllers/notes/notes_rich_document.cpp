#include "notes_rich_document.h"
#include "notes_rich_callouts.h"
#include "notes_rich_format.h"
#include "notes_rich_markup.h"
#include "notes_rich_spoilers.h"

#include <algorithm>
#include <QtCore/QVector>
#include <QtGui/QTextBlock>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>
#include <QtGui/QTextList>
#include <QtGui/QTextListFormat>

namespace NotesRichDocument {

static bool isCodeFormat(const QTextCharFormat &format) {
    return format.fontFamilies().toStringList().contains(QStringLiteral("monospace"), Qt::CaseInsensitive);
}

static bool isExplicitBold(const QTextCharFormat &format, int headingLevel) {
    return headingLevel > 0 ? format.intProperty(NotesRichFormat::HeadingBoldState) != NotesRichFormat::HeadingGeneratedBold
                            : format.fontWeight() >= QFont::Bold;
}

bool toggleInline(QTextDocument &document, int start, int end, const QString &mark) {
    if (start < 0 || end <= start || end > document.characterCount() - 1) return false;
    if (mark == "spoiler") return NotesRichSpoilers::toggle(document, start, end);
    if (mark != "bold" && mark != "italic" && mark != "underline" && mark != "strike" && mark != "code") return false;
    QTextCursor cursor(&document);
    cursor.setPosition(start);
    cursor.setPosition(end, QTextCursor::KeepAnchor);
    bool allMarked = true;
    for (QTextBlock block = document.findBlock(start); block.isValid() && block.position() < end; block = block.next()) {
        for (auto it = block.begin(); !it.atEnd(); ++it) {
            const QTextFragment fragment = it.fragment();
            if (!fragment.isValid() || fragment.position() >= end || fragment.position() + fragment.length() <= start) continue;
            const QTextCharFormat format = fragment.charFormat();
            const bool marked = mark == "bold" ? isExplicitBold(format, block.blockFormat().headingLevel())
                : mark == "italic" ? format.fontItalic()
                : mark == "underline" ? format.fontUnderline()
                : mark == "strike" ? format.fontStrikeOut() : isCodeFormat(format);
            allMarked = allMarked && marked;
        }
    }
    if (mark == "code" && allMarked) {
        cursor.beginEditBlock();
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
                format.clearProperty(QTextFormat::FontFamilies);
                fragmentCursor.setCharFormat(format);
            }
        }
        cursor.endEditBlock();
        return true;
    }
    if (mark == "bold") {
        struct PendingFormat { int start; int end; QTextCharFormat format; };
        QVector<PendingFormat> pending;
        cursor.beginEditBlock();
        for (QTextBlock block = document.findBlock(start); block.isValid() && block.position() < end; block = block.next()) {
            const int headingLevel = block.blockFormat().headingLevel();
            for (auto it = block.begin(); !it.atEnd(); ++it) {
                const QTextFragment fragment = it.fragment();
                if (!fragment.isValid() || fragment.position() >= end || fragment.position() + fragment.length() <= start) continue;
                QTextCharFormat format = fragment.charFormat();
                if (headingLevel > 0) {
                    format.setFontWeight(QFont::Bold);
                    format.setProperty(NotesRichFormat::HeadingBoldState,
                                       allMarked ? NotesRichFormat::HeadingGeneratedBold : NotesRichFormat::HeadingExplicitBold);
                } else {
                    format.setFontWeight(allMarked ? QFont::Normal : QFont::Bold);
                }
                pending.append({qMax(start, fragment.position()),
                                qMin(end, fragment.position() + fragment.length()), format});
            }
        }
        for (const PendingFormat &item : pending) {
            QTextCursor fragmentCursor(&document);
            fragmentCursor.setPosition(item.start);
            fragmentCursor.setPosition(item.end, QTextCursor::KeepAnchor);
            fragmentCursor.setCharFormat(item.format);
        }
        cursor.endEditBlock();
        return true;
    }
    QTextCharFormat next;
    if (mark == "italic") next.setFontItalic(!allMarked);
    else if (mark == "underline") next.setFontUnderline(!allMarked);
    else if (mark == "strike") next.setFontStrikeOut(!allMarked);
    else next.setFontFamilies({QStringLiteral("monospace")});
    cursor.beginEditBlock();
    cursor.mergeCharFormat(next);
    cursor.endEditBlock();
    return true;
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
