#include "notes_rich_markup.h"

#include <QtCore/QRegularExpression>
#include <QtCore/QUrl>

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
