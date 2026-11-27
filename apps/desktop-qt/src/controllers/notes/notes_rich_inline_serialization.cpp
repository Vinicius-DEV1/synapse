#include "notes_rich_list_serialization.h"
#include "notes_rich_serialization_support.h"
#include "notes_rich_format.h"
#include "notes_rich_images.h"
#include "notes_rich_markup.h"

#include <QtCore/QVariant>
#include <QtGui/QTextBlock>
#include <QtGui/QTextCharFormat>
#include <QtGui/QTextFragment>
#include <QtGui/QTextList>

namespace NotesRichSerialization {

bool appendBlockText(QString &result, const QTextBlock &block) {
    const int headingLevel = block.blockFormat().headingLevel();
    for (auto it = block.begin(); !it.atEnd();) {
        const QTextFragment fragment = it.fragment();
        if (!fragment.isValid()) {
            ++it;
            continue;
        }
        if (fragment.charFormat().objectType() == NotesRichFormat::PageReferenceObjectType) {
            if (!appendPageReferenceHtml(result, fragment.charFormat(), fragment.text())) return false;
            ++it;
            continue;
        }
        if (fragment.charFormat().isImageFormat()) {
            QString imageHtml;
            if (!NotesRichImages::serialize(fragment.charFormat().toImageFormat(), imageHtml)) return false;
            result += imageHtml;
            ++it;
            continue;
        }
        if (fragment.charFormat().objectType() == NotesRichFormat::TaskCheckboxObjectType) {
            if (!block.textList() || !block.textList()->format().boolProperty(NotesRichFormat::TaskListState) ||
                !block.blockFormat().hasProperty(NotesRichFormat::TaskItemChecked)) return false;
            ++it;
            continue;
        }
        QTextCharFormat format = fragment.charFormat();
        if (format.boolProperty(NotesRichFormat::TaskCheckedVisual)) {
            const QVariant saved = format.property(NotesRichFormat::TaskOriginalCharacterFormat);
            if (!saved.canConvert<QTextCharFormat>()) return false;
            format = saved.value<QTextCharFormat>();
        }
        if (!supportedCharacterFormat(format, headingLevel)) return false;

        QString pageTitle;
        if (format.isAnchor() &&
            NotesRichMarkup::pageReferenceFromHref(format.anchorHref(), nullptr, &pageTitle)) {
            QString displayedLabel;
            int nextPosition = fragment.position();
            auto referenceIt = it;
            while (!referenceIt.atEnd()) {
                const QTextFragment part = referenceIt.fragment();
                if (!part.isValid() || part.position() != nextPosition ||
                    !part.charFormat().isAnchor() ||
                    part.charFormat().anchorHref() != format.anchorHref()) break;
                if (!supportedCharacterFormat(part.charFormat(), headingLevel)) return false;
                displayedLabel += part.text();
                nextPosition += part.length();
                ++referenceIt;
            }
            const QString activeLabel = QStringLiteral("↗ ") + pageTitle;
            const QString deletedLabel = QStringLiteral("⚠ ") + pageTitle +
                QStringLiteral(" (Deleted)");
            if (displayedLabel != activeLabel && displayedLabel != deletedLabel) return false;
            result += inlineHtml(displayedLabel, format, headingLevel);
            it = referenceIt;
            continue;
        }
        result += inlineHtml(fragment.text(), format, headingLevel);
        ++it;
    }
    return true;
}

}
