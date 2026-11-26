#include "notes_rich_page_reference_object.h"

#include "notes_rich_format.h"
#include "notes_rich_markup.h"

#include <algorithm>
#include <QtCore/QVector>
#include <QtGui/QAbstractTextDocumentLayout>
#include <QtGui/QTextBlock>
#include <QtGui/QTextCharFormat>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>
#include <utility>

namespace {

QString displayTitle(const QString &title) {
    return title.isEmpty() ? QStringLiteral("Página") : title;
}

QTextCharFormat objectFormat(const QTextCharFormat &source, const QString &pageId,
                             const QString &title, bool deleted) {
    QTextCharFormat format = source;
    format.clearProperty(QTextFormat::IsAnchor);
    format.clearProperty(QTextFormat::AnchorHref);
    format.setObjectType(NotesRichFormat::PageReferenceObjectType);
    format.setProperty(NotesRichFormat::PageReferenceId, pageId);
    format.setProperty(NotesRichFormat::PageReferenceTitle, title);
    format.setProperty(NotesRichFormat::PageReferenceDeleted, deleted);
    return format;
}

void ensureHandler(QTextDocument &document) {
    QAbstractTextDocumentLayout *layout = document.documentLayout();
    if (!layout->handlerForObject(NotesRichFormat::PageReferenceObjectType)) {
        auto *handler = new NotesRichPageReferenceObject(layout);
        layout->registerHandler(NotesRichFormat::PageReferenceObjectType, handler);
    }
}

NotesRichPageReferenceObject *pageReferenceHandler(QTextDocument &document) {
    ensureHandler(document);
    return dynamic_cast<NotesRichPageReferenceObject *>(
        document.documentLayout()->handlerForObject(NotesRichFormat::PageReferenceObjectType));
}

struct Replacement {
    int start = 0;
    int end = 0;
    QString pageId;
    QString title;
    bool deleted = false;
    QTextCharFormat format;
    bool boundaryOnly = false;
};

bool isPageReferenceAnchor(const QTextCharFormat &format) {
    return format.isAnchor() && NotesRichMarkup::pageReferenceFromHref(format.anchorHref());
}

QTextCharFormat formatAtCharacter(const QTextDocument &document, int position) {
    if (position < 0 || position >= document.characterCount() - 1) return {};
    const QTextBlock block = document.findBlock(position);
    for (auto iterator = block.begin(); !iterator.atEnd(); ++iterator) {
        const QTextFragment fragment = iterator.fragment();
        if (fragment.isValid() && position >= fragment.position() &&
            position < fragment.position() + fragment.length()) return fragment.charFormat();
    }
    return {};
}

bool collectReplacements(const QTextDocument &document, QVector<Replacement> &replacements) {
    for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
        for (auto iterator = block.begin(); !iterator.atEnd();) {
            const QTextFragment fragment = iterator.fragment();
            if (!fragment.isValid()) {
                ++iterator;
                continue;
            }
            const QTextCharFormat format = fragment.charFormat();
            QString pageId;
            QString title;
            if (!format.isAnchor() ||
                !NotesRichMarkup::pageReferenceFromHref(format.anchorHref(), &pageId, &title)) {
                ++iterator;
                continue;
            }

            const QString href = format.anchorHref();
            const int start = fragment.position();
            int end = start;
            QString text;
            auto referenceIterator = iterator;
            while (!referenceIterator.atEnd()) {
                const QTextFragment part = referenceIterator.fragment();
                if (!part.isValid() || part.position() != end ||
                    !part.charFormat().isAnchor() || part.charFormat().anchorHref() != href) break;
                text += part.text();
                end += part.length();
                ++referenceIterator;
            }

            const bool deleted = text == QStringLiteral("⚠ ") + title + QStringLiteral(" (Deleted)");
            const bool active = text == QStringLiteral("↗ ") + title;
            if (!active && !deleted) return false;
            replacements.append({start, end, pageId, title, deleted, format, false});
            iterator = referenceIterator;
        }
    }

    for (int position = 1; position < document.characterCount() - 1; ++position) {
        if (document.characterAt(position) != QChar(0x2060)) continue;
        const QTextCharFormat before = formatAtCharacter(document, position - 1);
        const QTextCharFormat after = formatAtCharacter(document, position + 1);
        if (isPageReferenceAnchor(before) && isPageReferenceAnchor(after))
            replacements.append({position, position + 1, {}, {}, false, {}, true});
    }
    std::sort(replacements.begin(), replacements.end(), [](const Replacement &left, const Replacement &right) {
        return left.start > right.start;
    });
    return true;
}

}

namespace NotesRichPageReferences {

bool refreshPageSnapshot(QTextDocument &document, const QVariantList &pages) {
    auto *handler = pageReferenceHandler(document);
    if (!handler) return false;

    struct PresentationSnapshot {
        int position;
        int length;
        QString title;
        bool deleted;
        QTextCharFormat format;
    };
    QVector<PresentationSnapshot> changedCandidates;
    for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
        for (auto iterator = block.begin(); !iterator.atEnd(); ++iterator) {
            const QTextFragment fragment = iterator.fragment();
            if (!fragment.isValid() ||
                fragment.charFormat().objectType() != NotesRichFormat::PageReferenceObjectType) continue;
            const QTextCharFormat format = fragment.charFormat();
            changedCandidates.append({fragment.position(), fragment.length(),
                                      handler->resolvedTitle(format),
                                      handler->resolvedDeleted(format), format});
        }
    }
    if (!handler->setPageSnapshot(pages)) return true;
    for (const auto &candidate : changedCandidates) {
        if (candidate.title != handler->resolvedTitle(candidate.format) ||
            candidate.deleted != handler->resolvedDeleted(candidate.format)) {
            document.markContentsDirty(candidate.position, candidate.length);
        }
    }
    return true;
}

QString resolvedTitle(const QTextDocument &document, const QTextFormat &format) {
    const auto *handler = dynamic_cast<const NotesRichPageReferenceObject *>(
        document.documentLayout()->handlerForObject(NotesRichFormat::PageReferenceObjectType));
    return handler ? handler->resolvedTitle(format)
                   : displayTitle(format.stringProperty(NotesRichFormat::PageReferenceTitle));
}

bool resolvedDeleted(const QTextDocument &document, const QTextFormat &format) {
    const auto *handler = dynamic_cast<const NotesRichPageReferenceObject *>(
        document.documentLayout()->handlerForObject(NotesRichFormat::PageReferenceObjectType));
    return handler ? handler->resolvedDeleted(format)
                   : format.boolProperty(NotesRichFormat::PageReferenceDeleted);
}

bool prepare(QTextDocument &document, const QVariantList &pages) {
    if (!pageReferenceHandler(document)) return false;
    QVector<Replacement> replacements;
    if (!collectReplacements(document, replacements)) return false;
    if (replacements.isEmpty()) return refreshPageSnapshot(document, pages);

    const bool undoEnabled = document.isUndoRedoEnabled();
    document.setUndoRedoEnabled(false);
    for (const Replacement &replacement : replacements) {
        QTextCursor cursor(&document);
        cursor.setPosition(replacement.start);
        cursor.setPosition(replacement.end, QTextCursor::KeepAnchor);
        cursor.removeSelectedText();
        if (replacement.boundaryOnly) continue;
        cursor.insertText(QString(QChar::ObjectReplacementCharacter),
                          objectFormat(replacement.format, replacement.pageId,
                                       replacement.title, replacement.deleted));
    }
    document.setUndoRedoEnabled(undoEnabled);
    document.setModified(false);
    return refreshPageSnapshot(document, pages);
}

int insertAtCursor(QTextCursor &cursor, const QString &pageId, const QString &title, bool deleted) {
    QTextDocument *document = cursor.document();
    if (!document || NotesRichMarkup::pageReferenceHref(pageId, title).isEmpty()) return -1;
    ensureHandler(*document);
    cursor.insertText(QString(QChar::ObjectReplacementCharacter),
                      objectFormat({}, pageId, title, deleted));
    return cursor.position();
}

int insert(QTextDocument &document, int position, const QString &pageId, const QString &title,
           bool deleted) {
    if (position < 0 || position > document.characterCount() - 1) return -1;
    QTextCursor cursor(&document);
    cursor.setPosition(position);
    cursor.beginEditBlock();
    const int insertedPosition = insertAtCursor(cursor, pageId, title, deleted);
    cursor.endEditBlock();
    return insertedPosition;
}

}
