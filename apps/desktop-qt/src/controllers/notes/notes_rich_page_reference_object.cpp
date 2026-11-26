#include "notes_rich_page_reference_object.h"

#include "notes_rich_format.h"
#include "notes_rich_markup.h"

#include <algorithm>
#include <QtCore/QVector>
#include <QtGui/QAbstractTextDocumentLayout>
#include <QtGui/QColor>
#include <QtGui/QFontMetricsF>
#include <QtGui/QPainter>
#include <QtGui/QPainterPath>
#include <QtGui/QTextBlock>
#include <QtGui/QTextCharFormat>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>

namespace {

QString displayTitle(const QString &title) {
    return title.isEmpty() ? QStringLiteral("Página") : title;
}

QFont referenceFont(const QTextDocument *document, const QTextFormat &format) {
    QFont font = format.toCharFormat().font();
    if (document) font = font.resolve(document->defaultFont());
    font.setPixelSize(14);
    font.setWeight(QFont::Medium);
    return font;
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

QSizeF NotesRichPageReferenceObject::intrinsicSize(QTextDocument *document, int,
                                                    const QTextFormat &format) {
    const QString title = displayTitle(
        format.stringProperty(NotesRichFormat::PageReferenceTitle));
    const QFont font = referenceFont(document, format);
    const QFontMetricsF metrics(font);
    return QSizeF(44.0 + metrics.horizontalAdvance(title), qMax(22.0, metrics.height() + 4.0));
}

void NotesRichPageReferenceObject::drawObject(QPainter *painter, const QRectF &rect,
                                              QTextDocument *document, int,
                                              const QTextFormat &format) {
    if (!painter) return;
    const bool deleted = format.boolProperty(NotesRichFormat::PageReferenceDeleted);
    const QString title = displayTitle(format.stringProperty(NotesRichFormat::PageReferenceTitle));
    const QColor background = deleted ? QColor(239, 68, 68, 20) : QColor(255, 255, 255, 10);
    const QColor border = deleted ? QColor(239, 68, 68, 102) : QColor(255, 255, 255, 31);
    const QColor foreground = deleted ? QColor(248, 113, 113) : QColor(255, 255, 255, 191);
    const QFont font = referenceFont(document, format);
    const QFontMetricsF metrics(font);
    const QRectF chip = rect.adjusted(4.5, 0.5, -4.5, -0.5);

    painter->save();
    painter->setRenderHint(QPainter::Antialiasing, true);
    painter->setPen(QPen(border, 1.0));
    painter->setBrush(background);
    painter->drawRoundedRect(chip, 8.0, 8.0);

    const qreal iconLeft = rect.left() + 11.0;
    const qreal iconTop = rect.center().y() - 6.0;
    const QColor iconColor = deleted ? QColor(239, 68, 68, 230) : QColor(255, 255, 255, 153);
    painter->setPen(QPen(iconColor, 1.1, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin));
    painter->setBrush(Qt::NoBrush);
    if (deleted) {
        painter->drawEllipse(QRectF(iconLeft + 0.5, iconTop + 0.5, 11.0, 11.0));
        painter->drawLine(QPointF(iconLeft + 6.0, iconTop + 3.0),
                          QPointF(iconLeft + 6.0, iconTop + 7.0));
        painter->drawPoint(QPointF(iconLeft + 6.0, iconTop + 9.0));
    } else {
        QPainterPath documentPath;
        documentPath.moveTo(iconLeft + 1.0, iconTop + 0.5);
        documentPath.lineTo(iconLeft + 7.5, iconTop + 0.5);
        documentPath.lineTo(iconLeft + 11.0, iconTop + 4.0);
        documentPath.lineTo(iconLeft + 11.0, iconTop + 12.0);
        documentPath.lineTo(iconLeft + 1.0, iconTop + 12.0);
        documentPath.closeSubpath();
        painter->drawPath(documentPath);
        painter->drawLine(QPointF(iconLeft + 3.0, iconTop + 7.0),
                          QPointF(iconLeft + 9.0, iconTop + 7.0));
        painter->drawLine(QPointF(iconLeft + 3.0, iconTop + 9.5),
                          QPointF(iconLeft + 8.0, iconTop + 9.5));
    }

    painter->setFont(font);
    painter->setPen(foreground);
    const qreal baseline = rect.center().y() + (metrics.ascent() - metrics.descent()) / 2.0;
    painter->drawText(QPointF(rect.left() + 31.0, baseline), title);
    painter->restore();
}

namespace NotesRichPageReferences {

bool prepare(QTextDocument &document) {
    ensureHandler(document);
    QVector<Replacement> replacements;
    if (!collectReplacements(document, replacements)) return false;
    if (replacements.isEmpty()) return true;

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
    return true;
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
