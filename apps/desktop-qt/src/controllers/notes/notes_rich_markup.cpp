#include "notes_rich_markup.h"

#include <QtCore/QRegularExpression>
#include <QtCore/QHash>
#include <QtCore/QSet>
#include <QtCore/QVector>
#include <QtCore/QUrl>
#include <QtCore/QUrlQuery>

namespace NotesRichMarkup {

QColor parseCssColor(const QString &value) {
    static const QRegularExpression hexPattern(QStringLiteral("^#[0-9a-fA-F]{6}$"));
    static const QRegularExpression rgbPattern(QStringLiteral("^rgb\\(\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*\\)$"));
    static const QRegularExpression rgbaPattern(QStringLiteral("^rgba\\(\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*,\\s*(0(?:\\.\\d+)?|1(?:\\.0+)?)\\s*\\)$"));
    if (hexPattern.match(value).hasMatch()) return QColor(value);
    const auto rgb = rgbPattern.match(value);
    if (rgb.hasMatch()) {
        const int red = rgb.captured(1).toInt();
        const int green = rgb.captured(2).toInt();
        const int blue = rgb.captured(3).toInt();
        if (red <= 255 && green <= 255 && blue <= 255) return QColor(red, green, blue);
        return {};
    }
    const auto rgba = rgbaPattern.match(value);
    if (rgba.hasMatch()) {
        const int red = rgba.captured(1).toInt();
        const int green = rgba.captured(2).toInt();
        const int blue = rgba.captured(3).toInt();
        if (red <= 255 && green <= 255 && blue <= 255)
            return QColor(red, green, blue, qRound(rgba.captured(4).toDouble() * 255.0));
    }
    return {};
}

QString colorCss(const QColor &color) {
    if (color.alpha() == 255) return color.name(QColor::HexRgb);
    return QStringLiteral("rgba(%1, %2, %3, %4)")
        .arg(color.red()).arg(color.green()).arg(color.blue()).arg(color.alphaF(), 0, 'f', 3);
}

bool isSafeLink(const QString &value) {
    if (value.isEmpty() || value.contains(QRegularExpression(QStringLiteral("\\s")))) return false;
    const QUrl url(value, QUrl::StrictMode);
    const QString scheme = url.scheme().toLower();
    if (scheme == "http" || scheme == "https") return url.isValid() && !url.host().isEmpty();
    return scheme == "mailto" && url.isValid() && url.path().contains('@');
}

namespace {
bool isPageReferenceId(const QString &value) {
    static const QRegularExpression idPattern(QStringLiteral("^[A-Za-z0-9_-]{1,128}$"));
    return idPattern.match(value).hasMatch();
}
}

bool isPageReferenceAttributes(const QXmlStreamAttributes &attributes) {
    if (!attributes.hasAttribute(QStringLiteral("data-page-id")) || attributes.size() > 3 ||
        !isPageReferenceId(attributes.value(QStringLiteral("data-page-id")).toString())) return false;
    for (const auto &attribute : attributes) {
        if (!attribute.namespaceUri().isEmpty()) return false;
        const QString name = attribute.name().toString();
        if (name == QStringLiteral("class")) {
            if (attribute.value() != QStringLiteral("page-reference")) return false;
        } else if (name == QStringLiteral("title")) {
            if (attribute.value().size() > 512) return false;
        } else if (name != QStringLiteral("data-page-id")) {
            return false;
        }
    }
    return true;
}

bool pageReferenceFromHref(const QString &value, QString *pageId, QString *title) {
    const QUrl url(value, QUrl::StrictMode);
    if (!url.isValid() || url.scheme() != QStringLiteral("synapse-page") || !url.host().isEmpty() ||
        !url.userInfo().isEmpty() ||
        !url.fragment().isEmpty()) return false;
    static const QRegularExpression pathPattern(QStringLiteral("^/([A-Za-z0-9_-]{1,128})$"));
    const auto pathMatch = pathPattern.match(url.path());
    QUrlQuery query(url);
    const auto queryItems = query.queryItems(QUrl::FullyDecoded);
    if (!pathMatch.hasMatch() || queryItems.size() != 1 ||
        queryItems.constFirst().first != QStringLiteral("title") || queryItems.constFirst().second.size() > 512)
        return false;
    if (pageId) *pageId = pathMatch.captured(1);
    if (title) *title = queryItems.constFirst().second;
    return true;
}

QString pageReferenceHref(const QString &pageId, const QString &title) {
    if (!isPageReferenceId(pageId) || title.size() > 512) return {};
    QUrl url;
    url.setScheme(QStringLiteral("synapse-page"));
    url.setPath(QStringLiteral("/") + pageId);
    QUrlQuery query;
    query.addQueryItem(QStringLiteral("title"), title);
    url.setQuery(query);
    return url.toString(QUrl::FullyEncoded);
}

QString pageReferencesForEditor(const QString &source, const QVariantList &pages) {
    QHash<QString, QString> currentTitles;
    QSet<QString> activePageIds;
    for (const QVariant &entry : pages) {
        const QVariantMap page = entry.toMap();
        const QString id = page.value(QStringLiteral("id")).toString();
        const QString title = page.value(QStringLiteral("title")).toString();
        if (!isPageReferenceId(id)) continue;
        activePageIds.insert(id);
        if (!title.isEmpty() && title.size() <= 512) currentTitles.insert(id, title);
    }

    const QRegularExpression referencePattern(QStringLiteral("<span\\b([^>]*?)(?:></span>|\\s*/>)"));
    QString result = source;
    struct Replacement { qsizetype start; qsizetype length; QString html; };
    QVector<Replacement> replacements;
    auto match = referencePattern.globalMatch(source);
    while (match.hasNext()) {
        const auto current = match.next();
        QXmlStreamReader xml(QStringLiteral("<span%1></span>").arg(current.captured(1)));
        if (!xml.readNextStartElement() || !isPageReferenceAttributes(xml.attributes())) continue;
        const auto attributes = xml.attributes();
        const QString id = attributes.value(QStringLiteral("data-page-id")).toString();
        const QString storedTitle = attributes.value(QStringLiteral("title")).toString();
        const QString title = currentTitles.value(id, storedTitle.isEmpty() ? id : storedTitle);
        const QString href = pageReferenceHref(id, title);
        if (href.isEmpty()) continue;
        const bool isActive = activePageIds.contains(id);
        const QString displayLabel = isActive
            ? QStringLiteral("↗ %1").arg(title)
            : QStringLiteral("⚠ %1 (Deleted)").arg(title);
        const QString style = isActive
            ? QStringLiteral("color:rgba(255,255,255,0.75);background-color:rgba(255,255,255,0.04);text-decoration:none")
            : QStringLiteral("color:rgba(248,113,113,1);background-color:rgba(239,68,68,0.08);text-decoration:none");
        const QString replacement = QStringLiteral("<a href=\"%1\" style=\"%2\">%3</a>")
            .arg(href.toHtmlEscaped(), style, displayLabel.toHtmlEscaped());
        replacements.append({current.capturedStart(), current.capturedLength(), replacement});
    }
    for (auto it = replacements.crbegin(); it != replacements.crend(); ++it) {
        result.replace(it->start, it->length, it->html);
    }
    return result;
}

QString styleValue(const QXmlStreamAttributes &attributes) {
    return attributes.value(QStringLiteral("style")).toString().trimmed();
}

QColor parseSingleStyle(const QString &style, const QString &property) {
    const QStringList declarations = style.split(';', Qt::SkipEmptyParts);
    if (declarations.size() != 1) return {};
    const int colon = declarations.constFirst().indexOf(':');
    if (colon < 0 || declarations.constFirst().left(colon).trimmed() != property) return {};
    return parseCssColor(declarations.constFirst().mid(colon + 1).trimmed());
}

QColor parseHighlightStyle(const QString &style) {
    QColor background;
    bool hasBackground = false;
    bool hasInheritColor = false;
    const QStringList declarations = style.split(';', Qt::SkipEmptyParts);
    for (const QString &declaration : declarations) {
        const int colon = declaration.indexOf(':');
        if (colon < 0) return {};
        const QString property = declaration.left(colon).trimmed();
        const QString value = declaration.mid(colon + 1).trimmed();
        if (property == "background-color" && !hasBackground) {
            background = parseCssColor(value);
            if (!background.isValid()) return {};
            hasBackground = true;
        } else if (property == "color" && value == "inherit" && !hasInheritColor) {
            hasInheritColor = true;
        } else {
            return {};
        }
    }
    return hasBackground ? background : QColor();
}

QString normalizeVoidTags(const QString &source) {
    QString normalized = source;
    normalized.replace(QRegularExpression(QStringLiteral("<br\\s*>"), QRegularExpression::CaseInsensitiveOption), QStringLiteral("<br/>"));
    normalized.replace(QRegularExpression(QStringLiteral("<hr\\s*>"), QRegularExpression::CaseInsensitiveOption), QStringLiteral("<hr/>"));
    const QRegularExpression inputTag(QStringLiteral("(<input\\b[^>]*?)(?<!/)\\s*>"),
                                     QRegularExpression::CaseInsensitiveOption);
    normalized.replace(inputTag, QStringLiteral("\\1/>"));
    return normalized;
}

}
