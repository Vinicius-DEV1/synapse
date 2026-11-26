#include "notes_rich_page_reference_object.h"

#include "notes_rich_format.h"

#include <utility>
#include <QtCore/QVariantMap>
#include <QtGui/QColor>
#include <QtGui/QFont>
#include <QtGui/QFontMetricsF>
#include <QtGui/QPainter>
#include <QtGui/QPainterPath>
#include <QtGui/QTextDocument>

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

QString referenceLabel(const QString &title, bool deleted) {
    return deleted ? title + QStringLiteral(" (Excluída)") : title;
}

}

bool NotesRichPageReferenceObject::setPageSnapshot(const QVariantList &pages) {
    QHash<QString, QString> titles;
    QSet<QString> activeIds;
    for (const QVariant &entry : pages) {
        const QVariantMap page = entry.toMap();
        const QString id = page.value(QStringLiteral("id")).toString();
        if (id.isEmpty()) continue;
        activeIds.insert(id);
        const QString title = page.value(QStringLiteral("title")).toString();
        if (!title.isEmpty() && title.size() <= 512) titles.insert(id, title);
    }
    if (m_hasPageSnapshot && m_activePageTitles == titles && m_activePageIds == activeIds)
        return false;
    m_hasPageSnapshot = true;
    m_activePageTitles = std::move(titles);
    m_activePageIds = std::move(activeIds);
    return true;
}

QString NotesRichPageReferenceObject::resolvedTitle(const QTextFormat &format) const {
    const QString pageId = format.stringProperty(NotesRichFormat::PageReferenceId);
    const QString currentTitle = m_activePageTitles.value(pageId);
    return displayTitle(currentTitle.isEmpty()
        ? format.stringProperty(NotesRichFormat::PageReferenceTitle) : currentTitle);
}

bool NotesRichPageReferenceObject::resolvedDeleted(const QTextFormat &format) const {
    if (!m_hasPageSnapshot)
        return format.boolProperty(NotesRichFormat::PageReferenceDeleted);
    return !m_activePageIds.contains(format.stringProperty(NotesRichFormat::PageReferenceId));
}

QSizeF NotesRichPageReferenceObject::intrinsicSize(QTextDocument *document, int,
                                                    const QTextFormat &format) {
    const QString title = referenceLabel(resolvedTitle(format), resolvedDeleted(format));
    const QFont font = referenceFont(document, format);
    const QFontMetricsF metrics(font);
    return QSizeF(44.0 + metrics.horizontalAdvance(title), qMax(22.0, metrics.height() + 4.0));
}

void NotesRichPageReferenceObject::drawObject(QPainter *painter, const QRectF &rect,
                                              QTextDocument *document, int,
                                              const QTextFormat &format) {
    if (!painter) return;
    const bool deleted = resolvedDeleted(format);
    const QString title = referenceLabel(resolvedTitle(format), deleted);
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
