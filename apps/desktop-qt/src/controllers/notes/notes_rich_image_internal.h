#pragma once

#include <QtGui/QTextBlock>
#include <QtGui/QTextBlockFormat>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFormat>
#include <QtGui/QTextImageFormat>
#include <QtGui/QTextFragment>

namespace NotesRichImages::Internal {

inline constexpr int MaximumImageDimension = 8192;
inline constexpr int MaximumImageLabelLength = 1024;

inline bool imageOnlyBlock(const QTextBlock &block, QTextImageFormat *imageFormat = nullptr,
                           int *imagePosition = nullptr) {
    if (!block.isValid() || block.textList() || block.blockFormat().headingLevel() != 0 ||
        block.blockFormat().intProperty(QTextFormat::BlockQuoteLevel) != 0) return false;
    bool found = false;
    for (auto it = block.begin(); !it.atEnd(); ++it) {
        const QTextFragment fragment = it.fragment();
        if (!fragment.isValid()) continue;
        if (fragment.charFormat().isImageFormat()) {
            if (found || fragment.length() != 1) return false;
            found = true;
            if (imageFormat) *imageFormat = fragment.charFormat().toImageFormat();
            if (imagePosition) *imagePosition = fragment.position();
        } else if (!fragment.text().trimmed().isEmpty()) {
            return false;
        }
    }
    return found;
}

inline bool findImage(const QTextDocument &document, int position, QTextBlock &block,
                      QTextImageFormat &format, int &imagePosition) {
    if (position < 0 || position >= document.characterCount()) return false;
    block = document.findBlock(position);
    if (!imageOnlyBlock(block, &format, &imagePosition)) return false;
    return imagePosition == position || imagePosition + 1 == position;
}

inline Qt::Alignment alignmentForName(const QString &alignment) {
    if (alignment == QStringLiteral("left")) return Qt::AlignLeft;
    if (alignment == QStringLiteral("right")) return Qt::AlignRight;
    return Qt::AlignHCenter;
}

inline QString nameForAlignment(const QTextBlockFormat &format) {
    if (format.alignment() & Qt::AlignLeft) return QStringLiteral("left");
    if (format.alignment() & Qt::AlignRight) return QStringLiteral("right");
    return QStringLiteral("center");
}

}
