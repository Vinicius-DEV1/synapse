#pragma once

#include "notes_rich_format.h"
#include "notes_rich_markup.h"
#include "notes_rich_spoilers.h"

#include <QtGui/QColor>
#include <QtGui/QFont>
#include <QtGui/QTextFormat>
#include <QtGui/QTextFragment>

namespace NotesRichSerialization {

inline bool isCodeFormat(const QTextCharFormat &format) {
    return format.fontFamilies().toStringList().contains(QStringLiteral("monospace"), Qt::CaseInsensitive);
}

inline bool supportedCharacterFormat(const QTextCharFormat &format, int headingLevel) {
    const int expectedSize = 4 - headingLevel;
    const auto properties = format.properties();
    for (auto it = properties.cbegin(); it != properties.cend(); ++it) {
        const int key = it.key();
        if (key == QTextFormat::FontSizeAdjustment) {
            if (headingLevel == 0 || it.value().toInt() != expectedSize) return false;
        } else if (key != QTextFormat::FontWeight && key != QTextFormat::FontItalic &&
                   key != QTextFormat::FontUnderline && key != QTextFormat::TextUnderlineStyle &&
                   key != QTextFormat::FontStrikeOut && key != QTextFormat::ForegroundBrush &&
                   key != QTextFormat::BackgroundBrush && key != QTextFormat::IsAnchor &&
                   key != QTextFormat::AnchorHref && key != QTextFormat::FontFamilies &&
                   key != NotesRichFormat::HeadingBoldState && key != NotesRichFormat::TableHeaderBoldState &&
                   key != NotesRichFormat::SpoilerMark && key != NotesRichFormat::SpoilerHidden &&
                   key != NotesRichFormat::SpoilerOriginalForegroundPresent &&
                   key != NotesRichFormat::SpoilerOriginalForeground &&
                   key != NotesRichFormat::SpoilerOriginalBackgroundPresent &&
                   key != NotesRichFormat::SpoilerOriginalBackground) {
            return false;
        }
        if (key == NotesRichFormat::HeadingBoldState &&
            (headingLevel == 0 || (it.value().toInt() != NotesRichFormat::HeadingGeneratedBold &&
                                   it.value().toInt() != NotesRichFormat::HeadingExplicitBold))) return false;
        if (key == NotesRichFormat::TableHeaderBoldState &&
            (headingLevel != 0 || (it.value().toInt() != NotesRichFormat::TableHeaderGeneratedBold &&
                                   it.value().toInt() != NotesRichFormat::TableHeaderExplicitBold))) return false;
    }
    if (format.hasProperty(QTextFormat::FontFamilies) && !isCodeFormat(format)) return false;
    const int weight = format.fontWeight();
    return (weight == QFont::Normal || weight == QFont::Bold) &&
        (format.underlineStyle() == QTextCharFormat::NoUnderline ||
         format.underlineStyle() == QTextCharFormat::SingleUnderline) &&
        (!format.isAnchor() || NotesRichMarkup::isSafeLink(format.anchorHref()));
}

inline QString inlineHtml(const QString &text, const QTextCharFormat &format, int headingLevel, bool inTableHeader = false) {
    const bool spoiler = format.boolProperty(NotesRichFormat::SpoilerMark);
    const QTextCharFormat serialFormat = spoiler ? NotesRichSpoilers::formatForSerialization(format) : format;
    QString value = text.toHtmlEscaped();
    value.replace(QChar::LineSeparator, QStringLiteral("<br/>"));
    if (isCodeFormat(serialFormat)) value = "<code>" + value + "</code>";
    if (serialFormat.fontStrikeOut()) value = "<s>" + value + "</s>";
    if (serialFormat.fontUnderline()) value = "<u>" + value + "</u>";
    if (serialFormat.fontItalic()) value = "<em>" + value + "</em>";
    bool explicitBold = false;
    if (headingLevel > 0) {
        explicitBold = serialFormat.intProperty(NotesRichFormat::HeadingBoldState) != NotesRichFormat::HeadingGeneratedBold;
    } else if (inTableHeader) {
        explicitBold = serialFormat.intProperty(NotesRichFormat::TableHeaderBoldState) == NotesRichFormat::TableHeaderExplicitBold;
    } else {
        explicitBold = serialFormat.fontWeight() >= QFont::Bold;
    }
    if (explicitBold) value = "<strong>" + value + "</strong>";
    if (serialFormat.hasProperty(QTextFormat::BackgroundBrush)) {
        value = "<mark style=\"background-color:" + NotesRichMarkup::colorCss(serialFormat.background().color()) + "\">" + value + "</mark>";
    }
    if (serialFormat.hasProperty(QTextFormat::ForegroundBrush)) {
        value = "<span style=\"color:" + NotesRichMarkup::colorCss(serialFormat.foreground().color()) + "\">" + value + "</span>";
    }
    if (serialFormat.isAnchor() && NotesRichMarkup::isSafeLink(serialFormat.anchorHref()))
        value = "<a href=\"" + serialFormat.anchorHref().toHtmlEscaped() + "\">" + value + "</a>";
    if (spoiler) value = "<span data-type=\"spoiler\" class=\"caderno-spoiler\">" + value + "</span>";
    return value;
}

inline QString inlineHtml(const QTextFragment &fragment, int headingLevel, bool inTableHeader = false) {
    return inlineHtml(fragment.text(), fragment.charFormat(), headingLevel, inTableHeader);
}

}
