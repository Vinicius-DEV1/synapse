#include "notes_rich_spoilers.h"
#include "notes_rich_format.h"

#include <QtCore/QHash>
#include <QtCore/QRegularExpression>
#include <QtCore/QSet>
#include <QtCore/QVector>
#include <QtGui/QColor>
#include <QtGui/QTextBlock>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>
#include <QtGui/QTextLayout>

namespace NotesRichSpoilers {
namespace {
const QColor HiddenTextColor(0, 0, 0, 0);
const QColor HiddenBackgroundColor(QStringLiteral("#201e2d"));
using SpoilerRange = QPair<int, int>;

QHash<QTextDocument *, QVector<SpoilerRange>> &revealedRanges() {
    static QHash<QTextDocument *, QVector<SpoilerRange>> ranges;
    return ranges;
}

QSet<QTextDocument *> &trackedDocuments() {
    static QSet<QTextDocument *> documents;
    return documents;
}

bool isSpoilerFormat(const QTextCharFormat &format) {
    return format.boolProperty(NotesRichFormat::SpoilerMark);
}

QTextCharFormat setHidden(QTextCharFormat format, bool hidden) {
    if (hidden == format.boolProperty(NotesRichFormat::SpoilerHidden)) return format;
    if (hidden) {
        format.setProperty(NotesRichFormat::SpoilerOriginalForegroundPresent,
                           format.hasProperty(QTextFormat::ForegroundBrush));
        format.setProperty(NotesRichFormat::SpoilerOriginalForeground,
                           format.property(QTextFormat::ForegroundBrush));
        format.setProperty(NotesRichFormat::SpoilerOriginalBackgroundPresent,
                           format.hasProperty(QTextFormat::BackgroundBrush));
        format.setProperty(NotesRichFormat::SpoilerOriginalBackground,
                           format.property(QTextFormat::BackgroundBrush));
        format.setForeground(HiddenTextColor);
        format.setBackground(HiddenBackgroundColor);
        format.setProperty(NotesRichFormat::SpoilerHidden, true);
        return format;
    }
    if (format.boolProperty(NotesRichFormat::SpoilerOriginalForegroundPresent))
        format.setProperty(QTextFormat::ForegroundBrush,
                           format.property(NotesRichFormat::SpoilerOriginalForeground));
    else
        format.clearProperty(QTextFormat::ForegroundBrush);
    if (format.boolProperty(NotesRichFormat::SpoilerOriginalBackgroundPresent))
        format.setProperty(QTextFormat::BackgroundBrush,
                           format.property(NotesRichFormat::SpoilerOriginalBackground));
    else
        format.clearProperty(QTextFormat::BackgroundBrush);
    format.setProperty(NotesRichFormat::SpoilerHidden, false);
    return format;
}

struct FormatChange {
    int start;
    int end;
    QTextCharFormat format;
};

QVector<FormatChange> fragmentsInRange(QTextDocument &document, int start, int end) {
    QVector<FormatChange> changes;
    for (QTextBlock block = document.findBlock(start); block.isValid() && block.position() < end; block = block.next()) {
        for (auto it = block.begin(); !it.atEnd(); ++it) {
            const QTextFragment fragment = it.fragment();
            if (!fragment.isValid() || fragment.position() >= end || fragment.position() + fragment.length() <= start)
                continue;
            changes.append({qMax(start, fragment.position()),
                            qMin(end, fragment.position() + fragment.length()), fragment.charFormat()});
        }
    }
    return changes;
}

void applyChanges(QTextDocument &document, const QVector<FormatChange> &changes) {
    for (const FormatChange &change : changes) {
        QTextCursor cursor(&document);
        cursor.setPosition(change.start);
        cursor.setPosition(change.end, QTextCursor::KeepAnchor);
        cursor.setCharFormat(change.format);
    }
}

QTextCharFormat visibleFormat(const QTextCharFormat &format) {
    QTextCharFormat visual;
    if (format.boolProperty(NotesRichFormat::SpoilerOriginalForegroundPresent))
        visual.setProperty(QTextFormat::ForegroundBrush,
                           format.property(NotesRichFormat::SpoilerOriginalForeground));
    else
        visual.setForeground(QColor(QStringLiteral("#fffffe")));
    if (format.boolProperty(NotesRichFormat::SpoilerOriginalBackgroundPresent))
        visual.setProperty(QTextFormat::BackgroundBrush,
                           format.property(NotesRichFormat::SpoilerOriginalBackground));
    else
        visual.setBackground(QColor(0, 0, 0, 0));
    return visual;
}

void applyLayoutFormats(QTextDocument &document) {
    const QVector<SpoilerRange> visible = revealedRanges().value(&document);
    for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
        QTextLayout *layout = block.layout();
        if (!layout) continue;
        QList<QTextLayout::FormatRange> visualFormats;
        for (auto it = block.begin(); !it.atEnd(); ++it) {
            const QTextFragment fragment = it.fragment();
            if (!fragment.isValid() || !isSpoilerFormat(fragment.charFormat())) continue;
            const int fragmentStart = fragment.position();
            const int fragmentEnd = fragmentStart + fragment.length();
            for (const SpoilerRange &range : visible) {
                const int start = qMax(fragmentStart, range.first);
                const int end = qMin(fragmentEnd, range.second);
                if (end <= start) continue;
                QTextLayout::FormatRange visual;
                visual.start = start - block.position();
                visual.length = end - start;
                visual.format = visibleFormat(fragment.charFormat());
                visualFormats.append(visual);
            }
        }
        layout->setFormats(visualFormats);
        document.markContentsDirty(block.position(), block.length());
    }
}

void trackDocument(QTextDocument &document) {
    if (trackedDocuments().contains(&document)) return;
    trackedDocuments().insert(&document);
    QTextDocument *documentPointer = &document;
    QObject::connect(&document, &QTextDocument::contentsChange, &document,
                     [documentPointer](int position, int charsRemoved, int charsAdded) {
        QVector<SpoilerRange> adjusted;
        const int removedEnd = position + charsRemoved;
        const int shift = charsAdded - charsRemoved;
        for (const SpoilerRange &range : revealedRanges().value(documentPointer)) {
            if (charsRemoved == 0 && charsAdded == 0) {
                adjusted.append(range);
            } else if (removedEnd <= range.first) {
                adjusted.append(qMakePair(range.first + shift, range.second + shift));
            } else if (position >= range.second) {
                adjusted.append(range);
            }
        }
        revealedRanges().insert(documentPointer, adjusted);
        applyLayoutFormats(*documentPointer);
    });
    QObject::connect(&document, &QObject::destroyed, [documentPointer]() {
        revealedRanges().remove(documentPointer);
        trackedDocuments().remove(documentPointer);
    });
}

void removeRevealedRanges(QTextDocument &document, int start, int end) {
    QVector<SpoilerRange> remaining;
    for (const SpoilerRange &range : revealedRanges().value(&document)) {
        if (range.second <= start || range.first >= end) remaining.append(range);
    }
    revealedRanges().insert(&document, remaining);
}

QTextFragment fragmentAt(const QTextDocument &document, int position) {
    QTextBlock block = document.findBlock(position);
    if (!block.isValid()) return {};
    QTextFragment endingAtPosition;
    for (auto it = block.begin(); !it.atEnd(); ++it) {
        const QTextFragment fragment = it.fragment();
        if (!fragment.isValid()) continue;
        const int end = fragment.position() + fragment.length();
        if (position >= fragment.position() && position < end) return fragment;
        if (position == end && end > fragment.position()) endingAtPosition = fragment;
    }
    return endingAtPosition;
}

SpoilerRange spoilerRangeAt(const QTextDocument &document, int position) {
    if (position < 0 || position >= document.characterCount() - 1) return qMakePair(-1, -1);
    const QTextBlock block = document.findBlock(position);
    const QTextFragment selected = fragmentAt(document, position);
    if (!block.isValid() || !selected.isValid() || !isSpoilerFormat(selected.charFormat()))
        return qMakePair(-1, -1);
    int start = selected.position();
    int end = selected.position() + selected.length();
    QVector<QTextFragment> markedFragments;
    for (auto it = block.begin(); !it.atEnd(); ++it) {
        const QTextFragment fragment = it.fragment();
        if (fragment.isValid() && isSpoilerFormat(fragment.charFormat())) markedFragments.append(fragment);
    }
    int firstFragment = -1;
    int lastFragment = -1;
    for (int index = 0; index < markedFragments.size(); ++index) {
        const QTextFragment &fragment = markedFragments.at(index);
        if (fragment.position() == selected.position()) {
            firstFragment = lastFragment = index;
            break;
        }
    }
    if (firstFragment < 0) return qMakePair(-1, -1);
    while (firstFragment > 0) {
        const QTextFragment &previous = markedFragments.at(firstFragment - 1);
        if (previous.position() + previous.length() != start) break;
        start = previous.position();
        --firstFragment;
    }
    while (lastFragment + 1 < markedFragments.size()) {
        const QTextFragment &next = markedFragments.at(lastFragment + 1);
        if (next.position() != end) break;
        end = next.position() + next.length();
        ++lastFragment;
    }
    return qMakePair(start, end);
}
}

bool isSpoilerAttributes(const QXmlStreamAttributes &attributes) {
    if (attributes.isEmpty() || attributes.size() > 2) return false;
    bool hasType = false;
    bool hasClass = false;
    for (const auto &attribute : attributes) {
        const QString name = attribute.name().toString();
        const QString value = attribute.value().toString();
        if (name == QStringLiteral("data-type") && value == QStringLiteral("spoiler")) {
            if (hasType) return false;
            hasType = true;
        } else if (name == QStringLiteral("class") &&
                   (value == QStringLiteral("caderno-spoiler") || value == QStringLiteral("telegram-spoiler"))) {
            if (hasClass) return false;
            hasClass = true;
        } else {
            return false;
        }
    }
    return (hasType && (!hasClass || attributes.value(QStringLiteral("class")) == QStringLiteral("caderno-spoiler"))) ||
        (!hasType && hasClass);
}

QString editorMarkup(const QString &source) {
    static const QRegularExpression spanPattern(QStringLiteral("<span\\b([^>]*)>"),
                                                 QRegularExpression::CaseInsensitiveOption);
    static const QRegularExpression attributePattern(
        QStringLiteral("([a-zA-Z][a-zA-Z0-9-]*)\\s*=\\s*(['\"])([^'\"]*)\\2"));
    QString result;
    int copiedUntil = 0;
    auto match = spanPattern.globalMatch(source);
    while (match.hasNext()) {
        const auto span = match.next();
        const QString rawAttributes = span.captured(1);
        QXmlStreamAttributes attributes;
        auto attribute = attributePattern.globalMatch(rawAttributes);
        while (attribute.hasNext()) {
            const auto entry = attribute.next();
            attributes.append(QXmlStreamAttribute(entry.captured(1), entry.captured(3)));
        }
        if (!isSpoilerAttributes(attributes)) continue;
        result += source.mid(copiedUntil, span.capturedStart() - copiedUntil);
        result += QStringLiteral("<span style=\"text-decoration:overline\">");
        copiedUntil = span.capturedEnd();
    }
    result += source.mid(copiedUntil);
    return result;
}

bool prepare(QTextDocument &document) {
    QVector<FormatChange> changes;
    for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
        for (auto it = block.begin(); !it.atEnd(); ++it) {
            const QTextFragment fragment = it.fragment();
            if (!fragment.isValid() || !fragment.charFormat().fontOverline()) continue;
            QTextCharFormat format = fragment.charFormat();
            format.clearProperty(QTextFormat::FontOverline);
            format.setProperty(NotesRichFormat::SpoilerMark, true);
            format.setProperty(NotesRichFormat::SpoilerHidden, false);
            format = setHidden(format, true);
            changes.append({fragment.position(), fragment.position() + fragment.length(), format});
        }
    }
    document.setUndoRedoEnabled(false);
    applyChanges(document, changes);
    document.setUndoRedoEnabled(true);
    return true;
}

bool toggle(QTextDocument &document, int start, int end, bool joinPreviousEditBlock) {
    if (start < 0 || end <= start || end > document.characterCount() - 1) return false;
    const QVector<FormatChange> fragments = fragmentsInRange(document, start, end);
    if (fragments.isEmpty()) return false;
    bool allMarked = true;
    for (const FormatChange &fragment : fragments)
        allMarked = allMarked && isSpoilerFormat(fragment.format);
    QVector<FormatChange> changes;
    changes.reserve(fragments.size());
    for (const FormatChange &fragment : fragments) {
        QTextCharFormat format = fragment.format;
        if (allMarked) {
            format = setHidden(format, false);
            format.clearProperty(NotesRichFormat::SpoilerMark);
            format.clearProperty(NotesRichFormat::SpoilerHidden);
            format.clearProperty(NotesRichFormat::SpoilerOriginalForegroundPresent);
            format.clearProperty(NotesRichFormat::SpoilerOriginalForeground);
            format.clearProperty(NotesRichFormat::SpoilerOriginalBackgroundPresent);
            format.clearProperty(NotesRichFormat::SpoilerOriginalBackground);
        } else {
            if (!isSpoilerFormat(format)) {
                format.setProperty(NotesRichFormat::SpoilerMark, true);
                format.setProperty(NotesRichFormat::SpoilerHidden, false);
            } else {
                format = setHidden(format, false);
            }
            format = setHidden(format, true);
        }
        changes.append({fragment.start, fragment.end, format});
    }
    QTextCursor cursor(&document);
    if (joinPreviousEditBlock) cursor.joinPreviousEditBlock();
    else cursor.beginEditBlock();
    applyChanges(document, changes);
    cursor.endEditBlock();
    removeRevealedRanges(document, start, end);
    applyLayoutFormats(document);
    return true;
}

bool setVisibility(QTextDocument &document, int position, const QString &action) {
    const SpoilerRange selectedRange = spoilerRangeAt(document, position);
    if (selectedRange.first < 0) return false;
    trackDocument(document);
    const QVector<SpoilerRange> visibleRanges = revealedRanges().value(&document);
    const bool currentlyRevealed = visibleRanges.contains(selectedRange);
    bool nextRevealed = currentlyRevealed;
    if (action == QStringLiteral("reveal")) nextRevealed = true;
    else if (action == QStringLiteral("hide")) nextRevealed = false;
    else if (action == QStringLiteral("toggle")) nextRevealed = !currentlyRevealed;
    else return false;
    if (nextRevealed == currentlyRevealed) return true;

    QVector<SpoilerRange> nextRanges = visibleRanges;
    if (nextRevealed) nextRanges.append(selectedRange);
    else nextRanges.removeAll(selectedRange);
    revealedRanges().insert(&document, nextRanges);
    applyLayoutFormats(document);
    return true;
}

bool isAt(const QTextDocument &document, int position) {
    if (position < 0 || position >= document.characterCount() - 1) return false;
    const QTextFragment fragment = fragmentAt(document, position);
    return fragment.isValid() && isSpoilerFormat(fragment.charFormat());
}

bool isRevealedAt(QTextDocument &document, int position) {
    const SpoilerRange selectedRange = spoilerRangeAt(document, position);
    return selectedRange.first >= 0 && revealedRanges().value(&document).contains(selectedRange);
}

QTextCharFormat formatForSerialization(const QTextCharFormat &format) {
    QTextCharFormat semantic = setHidden(format, false);
    semantic.clearProperty(NotesRichFormat::SpoilerMark);
    semantic.clearProperty(NotesRichFormat::SpoilerHidden);
    semantic.clearProperty(NotesRichFormat::SpoilerOriginalForegroundPresent);
    semantic.clearProperty(NotesRichFormat::SpoilerOriginalForeground);
    semantic.clearProperty(NotesRichFormat::SpoilerOriginalBackgroundPresent);
    semantic.clearProperty(NotesRichFormat::SpoilerOriginalBackground);
    return semantic;
}
}
