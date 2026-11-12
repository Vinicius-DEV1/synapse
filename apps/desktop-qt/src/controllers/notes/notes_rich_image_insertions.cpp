#include "notes_rich_images.h"

#include "notes_rich_format.h"
#include "notes_rich_image_internal.h"

#include <QtCore/QVector>
#include <QtGui/QTextBlockFormat>
#include <QtGui/QTextCharFormat>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>

#include <utility>

namespace NotesRichImages {
using Internal::MaximumImageDimension;
using Internal::MaximumImageLabelLength;
using Internal::findImage;
using Internal::imageOnlyBlock;

bool canInsertAt(const QTextDocument &document, int position) {
    if (position < 0 || position > document.characterCount() - 1) return false;
    QTextCursor cursor(const_cast<QTextDocument *>(&document));
    cursor.setPosition(position);
    const QTextBlock block = cursor.block();
    if (!block.isValid() || block.textList() || cursor.currentTable() ||
        block.blockFormat().headingLevel() > 0 ||
        block.blockFormat().intProperty(QTextFormat::BlockQuoteLevel) > 0 ||
        block.blockFormat().boolProperty(QTextFormat::BlockNonBreakableLines) ||
        block.blockFormat().hasProperty(QTextFormat::BlockTrailingHorizontalRulerWidth)) return false;
    for (auto it = block.begin(); !it.atEnd(); ++it) {
        const QTextFragment fragment = it.fragment();
        if (fragment.isValid() && fragment.charFormat().isImageFormat()) return false;
    }
    return true;
}

int insertionPositionAfter(const QTextDocument &document, int imagePosition) {
    QTextBlock imageBlock;
    QTextImageFormat imageFormat;
    int resolvedPosition = -1;
    if (!findImage(document, imagePosition, imageBlock, imageFormat, resolvedPosition) ||
        resolvedPosition != imagePosition) return -1;
    const QTextBlock followingBlock = imageBlock.next();
    return followingBlock.isValid() ? followingBlock.position() : -1;
}

int insert(QTextDocument &document, int start, int end, const QString &dataUrl,
           const QString &alt, int width, int height) {
    const QVariantList image{QVariantMap{{"imageDataUrl", dataUrl}, {"fileName", alt},
                                         {"width", width}, {"height", height}}};
    return insertMany(document, start, end, image);
}

int insertMany(QTextDocument &document, int start, int end, const QVariantList &images) {
    if (start < 0 || end < start || end > document.characterCount() - 1 ||
        images.isEmpty() || images.size() > MaximumBatchSize || !canInsertAt(document, start)) return -1;
    if (end > start && document.findBlock(start) != document.findBlock(end - 1)) return -1;

    struct ImagePayload {
        QString dataUrl;
        QString alt;
        int width = 0;
        int height = 0;
    };
    QVector<ImagePayload> payloads;
    payloads.reserve(images.size());
    for (const QVariant &value : images) {
        const QVariantMap image = value.toMap();
        ImagePayload payload{image.value("imageDataUrl").toString(),
                             image.value("fileName").toString(),
                             image.value("width").toInt(),
                             image.value("height").toInt()};
        if (!supportsDataUrl(payload.dataUrl) || payload.width < 1 ||
            payload.width > MaximumImageDimension || payload.height < 1 ||
            payload.height > MaximumImageDimension || payload.alt.size() > MaximumImageLabelLength) return -1;
        payloads.append(std::move(payload));
    }

    QTextCursor cursor(&document);
    cursor.setPosition(start);
    cursor.setPosition(end, QTextCursor::KeepAnchor);
    cursor.beginEditBlock();
    if (cursor.hasSelection()) cursor.removeSelectedText();

    const QTextBlock originalBlock = cursor.block();
    const bool hasPrefix = cursor.position() > originalBlock.position();
    QTextBlockFormat imageBlockFormat;
    imageBlockFormat.setAlignment(Qt::AlignHCenter);
    imageBlockFormat.setTopMargin(12.0);
    imageBlockFormat.setBottomMargin(12.0);
    if (hasPrefix) cursor.insertBlock(imageBlockFormat, QTextCharFormat());
    else cursor.setBlockFormat(imageBlockFormat);

    cursor.setCharFormat(QTextCharFormat());
    for (qsizetype index = 0; index < payloads.size(); ++index) {
        const ImagePayload &payload = payloads.at(index);
        QTextImageFormat imageFormat;
        imageFormat.setName(payload.dataUrl);
        imageFormat.setWidth(payload.width);
        imageFormat.setHeight(payload.height);
        imageFormat.setProperty(NotesRichFormat::ImageAlignment, QStringLiteral("center"));
        imageFormat.setProperty(NotesRichFormat::ImageCaption, QString());
        if (!payload.alt.isEmpty()) imageFormat.setProperty(QTextFormat::ImageAltText, payload.alt);
        cursor.insertImage(imageFormat);
        if (index + 1 < payloads.size()) cursor.insertBlock(imageBlockFormat, QTextCharFormat());
    }
    QTextBlockFormat followingParagraphFormat;
    followingParagraphFormat.setTopMargin(12.0);
    followingParagraphFormat.setBottomMargin(12.0);
    cursor.insertBlock(followingParagraphFormat, QTextCharFormat());
    const int resultPosition = cursor.position();
    cursor.endEditBlock();
    return resultPosition;
}
}
