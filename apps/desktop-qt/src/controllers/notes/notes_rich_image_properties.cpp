#include "notes_rich_images.h"

#include "notes_rich_format.h"
#include "notes_rich_image_internal.h"

#include <QtCore/QVector>
#include <QtGui/QTextCursor>

namespace NotesRichImages {
using Internal::MaximumImageDimension;
using Internal::MaximumImageLabelLength;
using Internal::findImage;
using Internal::imageOnlyBlock;
using Internal::nameForAlignment;
using Internal::alignmentForName;

QVariantMap imageAt(const QTextDocument &document, int cursorPosition,
                    int selectionStart, int selectionEnd) {
    QVector<int> candidates;
    if (selectionEnd - selectionStart == 1) candidates.append(selectionStart);
    candidates.append(cursorPosition);
    candidates.append(cursorPosition - 1);
    if (selectionEnd > selectionStart) candidates.append(selectionEnd - 1);

    for (const int candidate : candidates) {
        QTextBlock block;
        QTextImageFormat format;
        int imagePosition = -1;
        if (!findImage(document, candidate, block, format, imagePosition)) continue;
        QSize naturalSize;
        if (!supportsDataUrl(format.name(), &naturalSize)) continue;
        const qreal width = format.hasProperty(QTextFormat::ImageWidth)
            ? format.width() : naturalSize.width();
        const qreal height = format.hasProperty(QTextFormat::ImageHeight)
            ? format.height() : width * naturalSize.height() / naturalSize.width();
        QString alignment = format.stringProperty(NotesRichFormat::ImageAlignment);
        if (alignment.isEmpty()) alignment = nameForAlignment(block.blockFormat());
        return {{"valid", true}, {"position", imagePosition}, {"width", qRound(width)},
                {"height", qRound(height)}, {"naturalWidth", naturalSize.width()},
                {"naturalHeight", naturalSize.height()}, {"alignment", alignment},
                {"hasWidth", format.hasProperty(QTextFormat::ImageWidth)},
                {"hasHeight", format.hasProperty(QTextFormat::ImageHeight)},
                {"caption", format.stringProperty(NotesRichFormat::ImageCaption)}};
    }
    return {{"valid", false}, {"position", -1}};
}

QString imageData(const QTextDocument &document, int imagePosition) {
    QTextBlock block;
    QTextImageFormat format;
    int resolvedPosition = -1;
    if (!findImage(document, imagePosition, block, format, resolvedPosition) ||
        !supportsDataUrl(format.name())) return {};
    return format.name();
}

QVariantList captions(const QTextDocument &document) {
    QVariantList result;
    for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
        QTextImageFormat format;
        int position = -1;
        if (!imageOnlyBlock(block, &format, &position)) continue;
        const QString caption = format.stringProperty(NotesRichFormat::ImageCaption);
        if (caption.isEmpty()) continue;
        QVariantMap item{{"position", position}, {"caption", caption},
                         {"width", qRound(format.width())},
                         {"alignment", format.stringProperty(NotesRichFormat::ImageAlignment)}};
        result.append(item);
    }
    return result;
}

bool setAlignment(QTextDocument &document, int imagePosition, const QString &alignment) {
    if (alignment != QStringLiteral("left") && alignment != QStringLiteral("center") &&
        alignment != QStringLiteral("right")) return false;
    QTextBlock block;
    QTextImageFormat imageFormat;
    int resolvedPosition = -1;
    if (!findImage(document, imagePosition, block, imageFormat, resolvedPosition)) return false;
    QString currentAlignment = imageFormat.stringProperty(NotesRichFormat::ImageAlignment);
    if (currentAlignment.isEmpty()) currentAlignment = nameForAlignment(block.blockFormat());
    if (currentAlignment == alignment) return true;
    imageFormat.setProperty(NotesRichFormat::ImageAlignment, alignment);
    QTextCursor edit(&document);
    edit.setPosition(resolvedPosition);
    edit.setPosition(resolvedPosition + 1, QTextCursor::KeepAnchor);
    edit.beginEditBlock();
    edit.setCharFormat(imageFormat);
    QTextBlockFormat blockFormat = block.blockFormat();
    blockFormat.setAlignment(alignmentForName(alignment));
    QTextCursor blockCursor(block);
    blockCursor.setBlockFormat(blockFormat);
    edit.endEditBlock();
    return true;
}

bool setCaption(QTextDocument &document, int imagePosition, const QString &caption) {
    if (caption.size() > MaximumImageLabelLength) return false;
    QTextBlock block;
    QTextImageFormat imageFormat;
    int resolvedPosition = -1;
    if (!findImage(document, imagePosition, block, imageFormat, resolvedPosition)) return false;
    const QString normalizedCaption = caption.trimmed();
    if (imageFormat.stringProperty(NotesRichFormat::ImageCaption) == normalizedCaption) return true;
    imageFormat.setProperty(NotesRichFormat::ImageCaption, normalizedCaption);
    QTextCursor edit(&document);
    edit.setPosition(resolvedPosition);
    edit.setPosition(resolvedPosition + 1, QTextCursor::KeepAnchor);
    edit.beginEditBlock();
    edit.setCharFormat(imageFormat);
    QTextBlockFormat blockFormat = block.blockFormat();
    blockFormat.setBottomMargin(normalizedCaption.isEmpty() ? 12.0 : 30.0);
    QTextCursor blockCursor(block);
    blockCursor.setBlockFormat(blockFormat);
    edit.endEditBlock();
    return true;
}

bool setSize(QTextDocument &document, int imagePosition, int width, int height) {
    QTextBlock block;
    QTextImageFormat imageFormat;
    int resolvedPosition = -1;
    if (!findImage(document, imagePosition, block, imageFormat, resolvedPosition)) return false;
    const bool sameWidth = width == -1
        ? !imageFormat.hasProperty(QTextFormat::ImageWidth)
        : imageFormat.hasProperty(QTextFormat::ImageWidth) && qRound(imageFormat.width()) == width;
    const bool sameHeight = height == -1
        ? !imageFormat.hasProperty(QTextFormat::ImageHeight)
        : imageFormat.hasProperty(QTextFormat::ImageHeight) && qRound(imageFormat.height()) == height;
    if (sameWidth && sameHeight) return true;
    if ((width != -1 && (width < 60 || width > MaximumImageDimension)) ||
        (height != -1 && (height < 60 || height > MaximumImageDimension))) return false;

    if (width == -1) imageFormat.clearProperty(QTextFormat::ImageWidth);
    else imageFormat.setWidth(width);
    if (height == -1) imageFormat.clearProperty(QTextFormat::ImageHeight);
    else imageFormat.setHeight(height);
    QTextCursor edit(&document);
    edit.setPosition(resolvedPosition);
    edit.setPosition(resolvedPosition + 1, QTextCursor::KeepAnchor);
    edit.beginEditBlock();
    edit.setCharFormat(imageFormat);
    edit.endEditBlock();
    return true;
}
}
