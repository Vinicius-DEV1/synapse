#pragma once

#include <QtCore/QString>
#include <QtCore/QVariantList>
#include <QtCore/QXmlStreamReader>
#include <QtGui/QColor>

namespace NotesRichMarkup {
QColor parseCssColor(const QString &value);
QString colorCss(const QColor &color);
bool isSafeLink(const QString &value);
bool isPageReferenceAttributes(const QXmlStreamAttributes &attributes);
bool pageReferenceFromHref(const QString &value, QString *pageId = nullptr, QString *title = nullptr);
QString pageReferenceHref(const QString &pageId, const QString &title);
QString pageReferencesForEditor(const QString &source, const QVariantList &pages);
QString styleValue(const QXmlStreamAttributes &attributes);
QColor parseSingleStyle(const QString &style, const QString &property);
QColor parseHighlightStyle(const QString &style);
QString normalizeVoidTags(const QString &source);
}
