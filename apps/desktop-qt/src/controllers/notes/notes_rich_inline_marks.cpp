#include "notes_rich_inline_marks.h"
#include "notes_rich_format.h"
#include "notes_rich_spoilers.h"

#include <QtCore/QHash>
#include <QtCore/QObject>
#include <QtCore/QSet>
#include <QtCore/QVector>
#include <QtGui/QTextBlock>
#include <QtGui/QTextCharFormat>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>

namespace NotesRichInlineMarks {
static bool isCodeFormat(const QTextCharFormat &format) {
    return format.fontFamilies().toStringList().contains(QStringLiteral("monospace"), Qt::CaseInsensitive);
}

static bool isExplicitBold(const QTextCharFormat &format, int headingLevel) {
    return headingLevel > 0 ? format.intProperty(NotesRichFormat::HeadingBoldState) != NotesRichFormat::HeadingGeneratedBold
                            : format.fontWeight() >= QFont::Bold;
}

namespace {
using InlineMarkState = QHash<QString, bool>;

QHash<QTextDocument *, InlineMarkState> &insertionMarks() {
    static QHash<QTextDocument *, InlineMarkState> marks;
    return marks;
}

QSet<QTextDocument *> &trackedInsertionMarkDocuments() {
    static QSet<QTextDocument *> documents;
    return documents;
}

void trackInsertionMarkDocument(QTextDocument &document) {
    if (trackedInsertionMarkDocuments().contains(&document)) return;
    trackedInsertionMarkDocuments().insert(&document);
    QTextDocument *documentPointer = &document;
    QObject::connect(&document, &QObject::destroyed, [documentPointer]() {
        insertionMarks().remove(documentPointer);
        trackedInsertionMarkDocuments().remove(documentPointer);
    });
}

bool formatHasMark(const QTextCharFormat &format, int headingLevel, const QString &mark) {
    if (mark == "bold") return isExplicitBold(format, headingLevel);
    if (mark == "italic") return format.fontItalic();
    if (mark == "underline") return format.fontUnderline();
    if (mark == "strike") return format.fontStrikeOut();
    if (mark == "code") return isCodeFormat(format);
    return mark == "spoiler" && format.boolProperty(NotesRichFormat::SpoilerMark);
}

void beginEditBlock(QTextCursor &cursor, bool joinPreviousEditBlock) {
    if (joinPreviousEditBlock) cursor.joinPreviousEditBlock();
    else cursor.beginEditBlock();
}
}

bool toggle(QTextDocument &document, int start, int end, const QString &mark,
                  bool joinPreviousEditBlock) {
    if (start < 0 || end <= start || end > document.characterCount() - 1) return false;
    if (mark == "spoiler") return NotesRichSpoilers::toggle(document, start, end, joinPreviousEditBlock);
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
        beginEditBlock(cursor, joinPreviousEditBlock);
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
        beginEditBlock(cursor, joinPreviousEditBlock);
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
    beginEditBlock(cursor, joinPreviousEditBlock);
    cursor.mergeCharFormat(next);
    cursor.endEditBlock();
    return true;
}

bool toggleAtCursor(QTextDocument &document, int position, const QString &mark) {
    if (position < 0 || position > document.characterCount() - 1) return false;
    if (mark != "bold" && mark != "italic" && mark != "underline" && mark != "strike" &&
        mark != "code" && mark != "spoiler") return false;

    QTextCursor cursor(&document);
    cursor.setPosition(position);
    QTextBlock block = document.findBlock(position);
    if (!block.isValid()) return false;
    const QTextCharFormat format = cursor.charFormat();
    const bool effectiveMark = insertionMarks().contains(&document)
        ? insertionMarks().value(&document).value(mark, formatHasMark(format, block.blockFormat().headingLevel(), mark))
        : formatHasMark(format, block.blockFormat().headingLevel(), mark);
    InlineMarkState &marks = insertionMarks()[&document];
    marks.insert(mark, !effectiveMark);
    trackInsertionMarkDocument(document);
    return true;
}

bool clearInsertionMarks(QTextDocument &document) {
    return insertionMarks().remove(&document) > 0;
}

bool applyMark(QTextDocument &document, int start, int end, const QString &mark,
               bool enabled, bool joinPreviousEditBlock) {
    if (start < 0 || end <= start || end > document.characterCount() - 1) return false;
    if (mark != "bold" && mark != "italic" && mark != "underline" && mark != "strike" &&
        mark != "code" && mark != "spoiler") return false;

    struct FragmentRange { int start; int end; QTextCharFormat format; int headingLevel; };
    QVector<FragmentRange> fragments;
    for (QTextBlock block = document.findBlock(start); block.isValid() && block.position() < end; block = block.next()) {
        for (auto it = block.begin(); !it.atEnd(); ++it) {
            const QTextFragment fragment = it.fragment();
            if (!fragment.isValid() || fragment.position() >= end || fragment.position() + fragment.length() <= start)
                continue;
            fragments.append({qMax(start, fragment.position()),
                              qMin(end, fragment.position() + fragment.length()),
                              fragment.charFormat(), block.blockFormat().headingLevel()});
        }
    }

    for (const FragmentRange &fragment : fragments) {
        if (formatHasMark(fragment.format, fragment.headingLevel, mark) == enabled) continue;
        if (!toggle(document, fragment.start, fragment.end, mark, joinPreviousEditBlock)) return false;
        joinPreviousEditBlock = true;
    }
    return true;
}

bool applyPendingMarks(QTextDocument &document, int start, int end) {
    if (start < 0 || end <= start || end > document.characterCount() - 1) return false;
    const InlineMarkState marks = insertionMarks().value(&document);
    if (marks.isEmpty()) return true;
    for (const auto &mark : marks.asKeyValueRange())
        if (!applyMark(document, start, end, mark.first, mark.second, true)) return false;
    return true;
}

bool isMarkActive(const QTextDocument &document, int start, int end, const QString &mark) {
    if (start < 0 || end < start) return false;
    if (mark != "bold" && mark != "italic" && mark != "underline" &&
        mark != "strike" && mark != "code" && mark != "spoiler") return false;
    if (start == end) {
        if (mark == "spoiler") return NotesRichSpoilers::isAt(document, start);
        if (insertionMarks().contains(const_cast<QTextDocument *>(&document))) {
            const auto &marks = insertionMarks().value(const_cast<QTextDocument *>(&document));
            if (marks.contains(mark)) return marks.value(mark);
        }
        if (start >= document.characterCount()) return false;
        QTextCursor cursor(const_cast<QTextDocument *>(&document));
        cursor.setPosition(start);
        const QTextBlock block = document.findBlock(start);
        if (!block.isValid()) return false;
        return formatHasMark(cursor.charFormat(), block.blockFormat().headingLevel(), mark);
    }
    if (mark == "spoiler") return NotesRichSpoilers::isAt(document, start);
    const int effectiveEnd = qMin(end, document.characterCount() - 1);
    if (start >= effectiveEnd) return false;
    bool foundFragment = false;
    for (QTextBlock block = document.findBlock(start); block.isValid() && block.position() < effectiveEnd; block = block.next()) {
        for (auto it = block.begin(); !it.atEnd(); ++it) {
            const QTextFragment fragment = it.fragment();
            if (!fragment.isValid() || fragment.position() >= effectiveEnd || fragment.position() + fragment.length() <= start)
                continue;
            foundFragment = true;
            if (!formatHasMark(fragment.charFormat(), block.blockFormat().headingLevel(), mark)) {
                return false;
            }
        }
    }
    return foundFragment;
}

}
