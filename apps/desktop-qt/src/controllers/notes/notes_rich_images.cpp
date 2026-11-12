#include "notes_rich_images.h"

#include "notes_rich_format.h"
#include "notes_rich_image_internal.h"

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
using Internal::MaximumImageDimension;
using Internal::MaximumImageLabelLength;
using Internal::alignmentForName;
using Internal::imageOnlyBlock;

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

}
