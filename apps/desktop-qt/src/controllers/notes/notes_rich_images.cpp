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
    return alt.size() <= MaximumImageLabelLength && title.size() <= MaximumImageLabelLength;
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
    if (!attributes.hasAttribute(QStringLiteral("src")) || attributes.size() > 5) return false;
    for (const auto &attribute : attributes) {
        const QString name = attribute.name().toString();
        if (name != QStringLiteral("src") && name != QStringLiteral("width") &&
            name != QStringLiteral("height") && name != QStringLiteral("alt") &&
            name != QStringLiteral("title")) return false;
    }
    if (attributes.hasAttribute(QStringLiteral("width")) &&
        !parsePositiveDimension(attributes.value(QStringLiteral("width")).toString())) return false;
    if (attributes.hasAttribute(QStringLiteral("height")) &&
        !parsePositiveDimension(attributes.value(QStringLiteral("height")).toString())) return false;
    if (attributes.value(QStringLiteral("alt")).size() > MaximumImageLabelLength ||
        attributes.value(QStringLiteral("title")).size() > MaximumImageLabelLength) return false;
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
    html += QStringLiteral("/>");
    return true;
}

bool serializeStandaloneBlock(const QTextBlock &block, QString &html) {
    if (!block.isValid() || block.textList() || block.blockFormat().headingLevel() != 0 ||
        block.blockFormat().intProperty(QTextFormat::BlockQuoteLevel) != 0) return false;
    bool foundImage = false;
    QString imageHtml;
    for (auto it = block.begin(); !it.atEnd(); ++it) {
        const QTextFragment fragment = it.fragment();
        if (!fragment.isValid()) continue;
        if (fragment.charFormat().isImageFormat()) {
            if (foundImage || fragment.length() != 1 || !serialize(fragment.charFormat().toImageFormat(), imageHtml))
                return false;
            foundImage = true;
        } else if (!fragment.text().trimmed().isEmpty()) {
            return false;
        }
    }
    if (!foundImage) return false;
    html = imageHtml;
    return true;
}

bool prepare(QTextDocument &document) {
    for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
        QString imageHtml;
        if (!serializeStandaloneBlock(block, imageHtml)) continue;
        QTextBlockFormat format = block.blockFormat();
        format.setAlignment(Qt::AlignHCenter);
        format.setTopMargin(12.0);
        format.setBottomMargin(12.0);
        QTextCursor cursor(block);
        cursor.setBlockFormat(format);
    }
    return true;
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
