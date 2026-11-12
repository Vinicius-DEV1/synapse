#include "notes_rich_images.h"

#include "notes_rich_format.h"

#include <QtCore/QBuffer>
#include <QtCore/QRegularExpression>
#include <QtGui/QImageReader>
#include <QtGui/QTextBlock>
#include <QtGui/QTextBlockFormat>
#include <QtGui/QTextCharFormat>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>

namespace NotesRichImages {
namespace {

constexpr qint64 MaximumImageBytes = 2 * 1024 * 1024;
constexpr qint64 MaximumImagePixels = 30 * 1000 * 1000;
constexpr int MaximumImageDimension = 8192;
constexpr int MaximumImageLabelLength = 1024;

QString mimeForFormat(const QByteArray &format) {
    const QByteArray normalized = format.toLower();
    if (normalized == "png") return QStringLiteral("image/png");
    if (normalized == "jpg" || normalized == "jpeg") return QStringLiteral("image/jpeg");
    if (normalized == "gif") return QStringLiteral("image/gif");
    if (normalized == "webp") return QStringLiteral("image/webp");
    if (normalized == "bmp") return QStringLiteral("image/bmp");
    return {};
}

bool parsePositiveDimension(const QString &value) {
    static const QRegularExpression pattern(QStringLiteral("^[1-9][0-9]{0,3}$"));
    if (!pattern.match(value).hasMatch()) return false;
    bool ok = false;
    const int number = value.toInt(&ok);
    return ok && number <= MaximumImageDimension;
}

bool supportedImageProperties(const QTextImageFormat &format) {
    if (!supportsDataUrl(format.name())) return false;
    if (format.hasProperty(QTextFormat::ImageWidth) &&
        (format.width() < 1 || format.width() > MaximumImageDimension)) return false;
    if (format.hasProperty(QTextFormat::ImageHeight) &&
        (format.height() < 1 || format.height() > MaximumImageDimension)) return false;
    const QString alt = format.stringProperty(QTextFormat::ImageAltText);
    const QString title = format.toolTip();
    const QString caption = format.stringProperty(NotesRichFormat::ImageCaption);
    const QString alignment = format.stringProperty(NotesRichFormat::ImageAlignment);
    return alt.size() <= MaximumImageLabelLength && title.size() <= MaximumImageLabelLength &&
        caption.size() <= MaximumImageLabelLength &&
        (alignment.isEmpty() || alignment == QStringLiteral("left") ||
         alignment == QStringLiteral("center") || alignment == QStringLiteral("right"));
}

struct ImageMetadata {
    QString source;
    QString caption;
    QString alignment = QStringLiteral("center");
};

QVector<ImageMetadata> imageMetadataFromSource(const QString &source) {
    QVector<ImageMetadata> images;
    QXmlStreamReader xml(QStringLiteral("<root>") + source + QStringLiteral("</root>"));
    while (!xml.atEnd()) {
        xml.readNext();
        if (!xml.isStartElement() || xml.name() != QStringLiteral("img")) continue;
        const auto attributes = xml.attributes();
        ImageMetadata image;
        image.source = attributes.value(QStringLiteral("src")).toString();
        image.caption = attributes.value(QStringLiteral("data-caption")).toString();
        const QString alignment = attributes.value(QStringLiteral("data-align")).toString();
        if (!alignment.isEmpty()) image.alignment = alignment;
        images.append(image);
    }
    if (xml.hasError()) images.clear();
    return images;
}

bool imageOnlyBlock(const QTextBlock &block, QTextImageFormat *imageFormat = nullptr,
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

bool findImage(const QTextDocument &document, int position, QTextBlock &block,
               QTextImageFormat &format, int &imagePosition) {
    if (position < 0 || position >= document.characterCount()) return false;
    block = document.findBlock(position);
    if (!imageOnlyBlock(block, &format, &imagePosition)) return false;
    return imagePosition == position || imagePosition + 1 == position;
}

Qt::Alignment alignmentForName(const QString &alignment) {
    if (alignment == QStringLiteral("left")) return Qt::AlignLeft;
    if (alignment == QStringLiteral("right")) return Qt::AlignRight;
    return Qt::AlignHCenter;
}

QString nameForAlignment(const QTextBlockFormat &format) {
    if (format.alignment() & Qt::AlignLeft) return QStringLiteral("left");
    if (format.alignment() & Qt::AlignRight) return QStringLiteral("right");
    return QStringLiteral("center");
}

bool isVoidTag(const QString &name) {
    return name == QStringLiteral("br") || name == QStringLiteral("hr") ||
        name == QStringLiteral("input") || name == QStringLiteral("img");
}

}

bool supportsDataUrl(const QString &dataUrl, QSize *naturalSize) {
    const int comma = dataUrl.indexOf(QLatin1Char(','));
    if (comma <= 0 || dataUrl.size() > 4 * ((MaximumImageBytes + 2) / 3) + 64) return false;

    const QString descriptor = dataUrl.left(comma);
    const QByteArray expectedMime = descriptor.toLatin1();
    if (expectedMime != "data:image/png;base64" && expectedMime != "data:image/jpeg;base64" &&
        expectedMime != "data:image/gif;base64" && expectedMime != "data:image/webp;base64" &&
        expectedMime != "data:image/bmp;base64") return false;

    const QByteArray encoded = dataUrl.mid(comma + 1).toLatin1();
    const QByteArray decoded = QByteArray::fromBase64(encoded);
    if (decoded.isEmpty() || decoded.size() > MaximumImageBytes || decoded.toBase64() != encoded) return false;

    QBuffer buffer;
    buffer.setData(decoded);
    if (!buffer.open(QIODevice::ReadOnly)) return false;
    QImageReader reader(&buffer);
    reader.setAutoTransform(true);
    if (!reader.canRead()) return false;
    const QString actualMime = mimeForFormat(reader.format());
    if (actualMime.isEmpty() || actualMime.toLatin1() != expectedMime.mid(5, expectedMime.size() - 12)) return false;
    const QSize size = reader.size();
    if (!size.isValid() || static_cast<qint64>(size.width()) * size.height() > MaximumImagePixels) return false;
    if (naturalSize) *naturalSize = size;
    return true;
}

bool supportsAttributes(const QXmlStreamAttributes &attributes) {
    if (!attributes.hasAttribute(QStringLiteral("src")) || attributes.size() > 7) return false;
    for (const auto &attribute : attributes) {
        const QString name = attribute.name().toString();
        if (name != QStringLiteral("src") && name != QStringLiteral("width") &&
            name != QStringLiteral("height") && name != QStringLiteral("alt") &&
            name != QStringLiteral("title") && name != QStringLiteral("data-align") &&
            name != QStringLiteral("data-caption")) return false;
    }
    if (attributes.hasAttribute(QStringLiteral("width")) &&
        !parsePositiveDimension(attributes.value(QStringLiteral("width")).toString())) return false;
    if (attributes.hasAttribute(QStringLiteral("height")) &&
        !parsePositiveDimension(attributes.value(QStringLiteral("height")).toString())) return false;
    if (attributes.value(QStringLiteral("alt")).size() > MaximumImageLabelLength ||
        attributes.value(QStringLiteral("title")).size() > MaximumImageLabelLength ||
        attributes.value(QStringLiteral("data-caption")).size() > MaximumImageLabelLength) return false;
    const QString alignment = attributes.value(QStringLiteral("data-align")).toString();
    if (!alignment.isEmpty() && alignment != QStringLiteral("left") &&
        alignment != QStringLiteral("center") && alignment != QStringLiteral("right")) return false;
    return supportsDataUrl(attributes.value(QStringLiteral("src")).toString());
}

QString wrapRootImages(const QString &source) {
    static const QRegularExpression tagPattern(QStringLiteral("<!--[\\s\\S]*?-->|<[^>]+>"));
    static const QRegularExpression namePattern(QStringLiteral("^<\\s*(/?)\\s*([a-zA-Z][a-zA-Z0-9-]*)\\b[^>]*>$"));
    QString result;
    QStringList stack;
    qsizetype copiedThrough = 0;
    auto it = tagPattern.globalMatch(source);
    while (it.hasNext()) {
        const auto match = it.next();
        const QString token = match.captured(0);
        const qsizetype tokenStart = match.capturedStart();
        result += source.mid(copiedThrough, tokenStart - copiedThrough);
        copiedThrough = match.capturedEnd();
        if (token.startsWith(QStringLiteral("<!--"))) {
            result += token;
            continue;
        }
        const auto nameMatch = namePattern.match(token);
        if (!nameMatch.hasMatch()) {
            result += token;
            continue;
        }
        const bool closing = !nameMatch.captured(1).isEmpty();
        const QString name = nameMatch.captured(2).toLower();
        const bool selfClosing = token.endsWith(QStringLiteral("/>"));
        if (closing) {
            result += token;
            if (!stack.isEmpty() && stack.last() == name) stack.removeLast();
        } else if (name == QStringLiteral("img") && stack.isEmpty()) {
            result += QStringLiteral("<p>") + token + QStringLiteral("</p>");
        } else {
            result += token;
            if (!selfClosing && !isVoidTag(name)) stack.append(name);
        }
    }
    result += source.mid(copiedThrough);
    return result;
}

bool serialize(const QTextImageFormat &format, QString &html) {
    if (!supportedImageProperties(format)) return false;
    html = QStringLiteral("<img src=\"%1\"").arg(format.name().toHtmlEscaped());
    if (format.hasProperty(QTextFormat::ImageWidth))
        html += QStringLiteral(" width=\"%1\"").arg(qRound(format.width()));
    if (format.hasProperty(QTextFormat::ImageHeight))
        html += QStringLiteral(" height=\"%1\"").arg(qRound(format.height()));
    const QString alt = format.stringProperty(QTextFormat::ImageAltText);
    if (!alt.isEmpty()) html += QStringLiteral(" alt=\"%1\"").arg(alt.toHtmlEscaped());
    if (!format.toolTip().isEmpty()) html += QStringLiteral(" title=\"%1\"").arg(format.toolTip().toHtmlEscaped());
    const QString caption = format.stringProperty(NotesRichFormat::ImageCaption);
    if (!caption.isEmpty()) html += QStringLiteral(" data-caption=\"%1\"").arg(caption.toHtmlEscaped());
    const QString alignment = format.stringProperty(NotesRichFormat::ImageAlignment);
    if (!alignment.isEmpty() && alignment != QStringLiteral("center"))
        html += QStringLiteral(" data-align=\"%1\"").arg(alignment.toHtmlEscaped());
    html += QStringLiteral("/>");
    return true;
}

bool serializeStandaloneBlock(const QTextBlock &block, QString &html) {
    QTextImageFormat format;
    if (!imageOnlyBlock(block, &format)) return false;
    return serialize(format, html);
}

bool prepare(QTextDocument &document, const QString &source) {
    const QVector<ImageMetadata> metadata = imageMetadataFromSource(source);
    int imageIndex = 0;
    for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
        QTextImageFormat imageFormat;
        int imagePosition = -1;
        if (!imageOnlyBlock(block, &imageFormat, &imagePosition)) continue;
        if (imageIndex >= metadata.size() || metadata.at(imageIndex).source != imageFormat.name()) return false;
        const ImageMetadata &image = metadata.at(imageIndex++);
        imageFormat.setProperty(NotesRichFormat::ImageAlignment, image.alignment);
        imageFormat.setProperty(NotesRichFormat::ImageCaption, image.caption);
        QTextCursor imageCursor(&document);
        imageCursor.setPosition(imagePosition);
        imageCursor.setPosition(imagePosition + 1, QTextCursor::KeepAnchor);
        imageCursor.setCharFormat(imageFormat);

        QTextBlockFormat blockFormat = block.blockFormat();
        blockFormat.setAlignment(alignmentForName(image.alignment));
        blockFormat.setTopMargin(12.0);
        blockFormat.setBottomMargin(image.caption.isEmpty() ? 12.0 : 30.0);
        QTextCursor blockCursor(block);
        blockCursor.setBlockFormat(blockFormat);
    }
    return imageIndex == metadata.size();
}

bool canInsertAt(const QTextDocument &document, int position) {
    if (position < 0 || position > document.characterCount() - 1) return false;
    QTextCursor cursor(const_cast<QTextDocument *>(&document));
    cursor.setPosition(position);
    const QTextBlock block = cursor.block();
    if (!block.isValid() || block.textList() || cursor.currentTable() ||
        block.blockFormat().headingLevel() > 0 || block.blockFormat().intProperty(QTextFormat::BlockQuoteLevel) > 0 ||
        block.blockFormat().boolProperty(QTextFormat::BlockNonBreakableLines) ||
        block.blockFormat().hasProperty(QTextFormat::BlockTrailingHorizontalRulerWidth)) return false;
    for (auto it = block.begin(); !it.atEnd(); ++it) {
        const QTextFragment fragment = it.fragment();
        if (fragment.isValid() && fragment.charFormat().isImageFormat()) return false;
    }
    return true;
}

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

int insert(QTextDocument &document, int start, int end, const QString &dataUrl,
           const QString &alt, int width, int height) {
    if (start < 0 || end < start || end > document.characterCount() - 1 ||
        !supportsDataUrl(dataUrl) || width < 1 || width > MaximumImageDimension ||
        height < 1 || height > MaximumImageDimension || alt.size() > MaximumImageLabelLength ||
        !canInsertAt(document, start)) return -1;
    if (end > start && document.findBlock(start) != document.findBlock(end - 1)) return -1;

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

    QTextImageFormat imageFormat;
    imageFormat.setName(dataUrl);
    imageFormat.setWidth(width);
    imageFormat.setHeight(height);
    imageFormat.setProperty(NotesRichFormat::ImageAlignment, QStringLiteral("center"));
    imageFormat.setProperty(NotesRichFormat::ImageCaption, QString());
    if (!alt.isEmpty()) imageFormat.setProperty(QTextFormat::ImageAltText, alt);
    cursor.setCharFormat(QTextCharFormat());
    cursor.insertImage(imageFormat);
    QTextBlockFormat followingParagraphFormat;
    followingParagraphFormat.setTopMargin(12.0);
    followingParagraphFormat.setBottomMargin(12.0);
    cursor.insertBlock(followingParagraphFormat, QTextCharFormat());
    const int resultPosition = cursor.position();
    cursor.endEditBlock();
    return resultPosition;
}

}
