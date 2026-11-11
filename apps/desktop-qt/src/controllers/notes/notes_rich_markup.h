#pragma once

#include <QtCore/QString>
#include <QtCore/QXmlStreamReader>
#include <QtGui/QColor>

namespace NotesRichMarkup {
QColor parseCssColor(const QString &value);
QString colorCss(const QColor &color);
bool isSafeLink(const QString &value);
QString styleValue(const QXmlStreamAttributes &attributes);
QColor parseSingleStyle(const QString &style, const QString &property);
QColor parseHighlightStyle(const QString &style);
QString normalizeVoidTags(const QString &source);
}
