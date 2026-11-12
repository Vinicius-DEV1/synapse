#include "notes_text_operations.h"

#include "notes_rich_format.h"
#include "notes_rich_markup.h"

#include <QtGui/QTextBlock>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>
#include <QtQuick/QQuickTextDocument>
#include <QtCore/QVector>
#include <limits>

namespace {

QTextCharFormat formatAtCharacter(const QTextDocument &document, int position) {
    if (position < 0 || position >= document.characterCount() - 1) return {};
    const QTextBlock block = document.findBlock(position);
    for (auto it = block.begin(); !it.atEnd(); ++it) {
        const QTextFragment fragment = it.fragment();
        if (fragment.isValid() && position >= fragment.position() &&
            position < fragment.position() + fragment.length()) {
            return fragment.charFormat();
        }
    }
    return {};
}

QVariantMap referenceRangeAtCharacter(const QTextDocument &document, int position) {
    const QTextCharFormat format = formatAtCharacter(document, position);
    if (!format.isAnchor()) return {};

    const QString href = format.anchorHref();
    QString pageId;
    QString title;
    if (!NotesRichMarkup::pageReferenceFromHref(href, &pageId, &title)) return {};

    const QString plainText = document.toPlainText();
    const QVector<QString> expectedLabels = {
        QStringLiteral("↗ ") + title,
        QStringLiteral("⚠ ") + title + QStringLiteral(" (Deleted)")
    };
    for (const QString &expectedLabel : expectedLabels) {
        const int minimumStart = qMax(0, position - expectedLabel.size() + 1);
        for (int start = position; start >= minimumStart; --start) {
            const int end = start + expectedLabel.size();
            if (position >= end || end > document.characterCount() - 1 ||
                plainText.mid(start, expectedLabel.size()) != expectedLabel) continue;
            bool validAnchor = true;
            for (int index = start; index < end; ++index) {
                const QTextCharFormat labelFormat = formatAtCharacter(document, index);
                if (!labelFormat.isAnchor() || labelFormat.anchorHref() != href) {
                    validAnchor = false;
                    break;
                }
            }
            if (validAnchor) {
                return {{"start", start}, {"end", end}, {"href", href},
                        {"pageId", pageId}, {"title", title}};
            }
        }
    }
    return {};
}

bool isPageReference(const QTextCharFormat &format) {
    return format.isAnchor() && NotesRichMarkup::pageReferenceFromHref(format.anchorHref());
}

}

bool NotesTextOperations::prepareRichPageReferenceBoundaries(QQuickTextDocument *document) const {
    if (!document || !document->textDocument()) return false;
    QTextDocument *textDocument = document->textDocument();
    const bool undoEnabled = textDocument->isUndoRedoEnabled();
    textDocument->setUndoRedoEnabled(false);
    for (int position = 1; position < textDocument->characterCount() - 2; ++position) {
        if (textDocument->characterAt(position) != QChar(0x2060)) continue;
        if (!isPageReference(formatAtCharacter(*textDocument, position - 1)) ||
            !isPageReference(formatAtCharacter(*textDocument, position + 1))) continue;
        QTextCursor cursor(textDocument);
        cursor.setPosition(position);
        cursor.setPosition(position + 1, QTextCursor::KeepAnchor);
        QTextCharFormat format = cursor.charFormat();
        format.setProperty(NotesRichFormat::PageReferenceBoundary, true);
        cursor.setCharFormat(format);
    }
    textDocument->setUndoRedoEnabled(undoEnabled);
    return true;
}

QVariantMap NotesTextOperations::richPageReferenceAt(QQuickTextDocument *document, int start, int end,
                                                       bool preferPreviousCharacter) const {
    if (!document || !document->textDocument()) return {};
    const QTextDocument &textDocument = *document->textDocument();
    const int lastPosition = textDocument.characterCount() - 1;
    if (start < 0 || end < start || end > lastPosition) return {};

    if (start < end) {
        QVariantMap reference = referenceRangeAtCharacter(textDocument, start);
        return reference.value(QStringLiteral("start")).toInt() == start &&
                reference.value(QStringLiteral("end")).toInt() == end
            ? reference : QVariantMap{};
    }

    const int characterPosition = preferPreviousCharacter ? start - 1 : start;
    return referenceRangeAtCharacter(textDocument, characterPosition);
}

QVariantMap NotesTextOperations::richPageReferenceRangeForHref(QQuickTextDocument *document,
                                                                 const QString &href,
                                                                 int hintPosition) const {
    if (!document || !document->textDocument()) return {};
    QString pageId;
    if (!NotesRichMarkup::pageReferenceFromHref(href, &pageId)) return {};

    const QTextDocument &textDocument = *document->textDocument();
    QVariantMap bestRange;
    int bestDistance = std::numeric_limits<int>::max();
    for (int position = 0; position < textDocument.characterCount() - 1; ++position) {
        const QTextCharFormat format = formatAtCharacter(textDocument, position);
        if (!format.isAnchor() || format.anchorHref() != href) continue;
        const QVariantMap candidate = referenceRangeAtCharacter(textDocument, position);
        const int candidateStart = candidate.value(QStringLiteral("start")).toInt();
        const int distance = hintPosition < 0 ? candidateStart : qAbs(candidateStart - hintPosition);
        if (distance < bestDistance) {
            bestRange = candidate;
            bestDistance = distance;
        }
    }
    return bestRange;
}

bool NotesTextOperations::removeRichPageReference(QQuickTextDocument *document, int start, int end) const {
    if (!document || !document->textDocument() || start < 0 || end <= start) return false;
    const QVariantMap reference = richPageReferenceAt(document, start, end, false);
    if (reference.isEmpty()) return false;

    QTextCursor cursor(document->textDocument());
    cursor.beginEditBlock();
    cursor.setPosition(start);
    cursor.setPosition(end, QTextCursor::KeepAnchor);
    cursor.removeSelectedText();
    cursor.endEditBlock();
    return true;
}
