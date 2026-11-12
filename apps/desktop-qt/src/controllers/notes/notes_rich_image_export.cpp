#include "synapse_controller.h"
#include "controllers/notes/notes_rich_images.h"

#include <QtCore/QBuffer>
#include <QtCore/QDir>
#include <QtCore/QFileInfo>
#include <QtCore/QRegularExpression>
#include <QtCore/QSaveFile>
#include <QtCore/QStandardPaths>
#include <QtGui/QImage>
#include <QtGui/QImageReader>

namespace {

QVariantMap exportFailure(const QString &operation, const QString &message) {
    return {{"success", false}, {"error", message}, {"operation", operation}};
}

bool decodeEmbeddedImage(const QString &dataUrl, QByteArray &source, QImage *decodedImage = nullptr) {
    if (!NotesRichImages::supportsDataUrl(dataUrl)) return false;
    const int comma = dataUrl.indexOf(QLatin1Char(','));
    if (comma < 0) return false;

    source = QByteArray::fromBase64(dataUrl.mid(comma + 1).toLatin1());
    if (source.isEmpty()) return false;
    if (decodedImage) {
        QBuffer buffer(&source);
        if (!buffer.open(QIODevice::ReadOnly)) return false;
        QImageReader reader(&buffer);
        reader.setAutoTransform(true);
        *decodedImage = reader.read();
        if (decodedImage->isNull()) return false;
    }
    return true;
}

QString extensionForDataUrl(const QString &dataUrl) {
    const int comma = dataUrl.indexOf(QLatin1Char(','));
    if (comma < 0) return {};
    const QString mime = dataUrl.left(comma).section(QLatin1Char(':'), 1, 1)
        .section(QLatin1Char(';'), 0, 0).toLower();
    if (mime == QStringLiteral("image/jpeg")) return QStringLiteral("jpg");
    if (mime == QStringLiteral("image/png")) return QStringLiteral("png");
    if (mime == QStringLiteral("image/gif")) return QStringLiteral("gif");
    if (mime == QStringLiteral("image/webp")) return QStringLiteral("webp");
    if (mime == QStringLiteral("image/bmp")) return QStringLiteral("bmp");
    return {};
}

QString pathWithImageExtension(const QString &path, const QString &extension) {
    static const QRegularExpression existingExtension(QStringLiteral("\\.[a-z0-9]{2,5}$"),
                                                       QRegularExpression::CaseInsensitiveOption);
    return existingExtension.match(QFileInfo(path).fileName()).hasMatch()
        ? path : path + QLatin1Char('.') + extension;
}

QString suggestedImageName(const QString &caption, const QString &extension) {
    QString baseName = caption.trimmed().isEmpty()
        ? QStringLiteral("imagem_secreta") : QStringLiteral("imagem_%1").arg(caption.trimmed());
    baseName.replace(QRegularExpression(QStringLiteral("[\\x00-\\x1f\\\\/:*?\"<>|]")),
                      QStringLiteral("_"));
    baseName = baseName.left(120);
    while (baseName.endsWith(QLatin1Char('.')) || baseName.endsWith(QLatin1Char(' ')))
        baseName.chop(1);
    if (baseName.isEmpty()) baseName = QStringLiteral("imagem_secreta");
    static const QRegularExpression existingExtension(QStringLiteral("\\.[a-z0-9]{2,5}$"),
                                                       QRegularExpression::CaseInsensitiveOption);
    if (!existingExtension.match(baseName).hasMatch()) baseName += QLatin1Char('.') + extension;
    return baseName;
}

}

void SynapseDataController::copyNotesRichImage(const QString &imageDataUrl) {
    const QString operation = QStringLiteral("notes-rich-image-copy");
    startNotesRichImageOperation([imageDataUrl, operation]() {
        QByteArray source;
        QImage decodedImage;
        if (!decodeEmbeddedImage(imageDataUrl, source, &decodedImage))
            return exportFailure(operation, QStringLiteral("The image could not be decoded for copying."));
        QByteArray pngBytes;
        QBuffer pngBuffer(&pngBytes);
        if (!pngBuffer.open(QIODevice::WriteOnly) || !decodedImage.save(&pngBuffer, "PNG"))
            return exportFailure(operation, QStringLiteral("The image could not be encoded as PNG."));
        return QVariantMap{{"success", true}, {"operation", operation},
                           {"clipboardImage", QVariant::fromValue(decodedImage)},
                           {"clipboardPng", pngBytes}};
    }, operation);
}

void SynapseDataController::saveNotesRichImage(const QString &imageDataUrl,
                                               const QUrl &destinationUrl) {
    const QString operation = QStringLiteral("notes-rich-image-download");
    const QString requestedPath = destinationUrl.isLocalFile() ? destinationUrl.toLocalFile() : QString();
    startNotesRichImageOperation([imageDataUrl, requestedPath, operation]() {
        if (requestedPath.isEmpty())
            return exportFailure(operation, QStringLiteral("Choose a local destination for the image."));

        QByteArray source;
        if (!decodeEmbeddedImage(imageDataUrl, source))
            return exportFailure(operation, QStringLiteral("The embedded image is invalid or unsupported."));

        const QString extension = extensionForDataUrl(imageDataUrl);
        if (extension.isEmpty())
            return exportFailure(operation, QStringLiteral("The embedded image format is unsupported."));
        const QString destinationPath = pathWithImageExtension(requestedPath, extension);
        QSaveFile file(destinationPath);
        if (!file.open(QIODevice::WriteOnly))
            return exportFailure(operation, QStringLiteral("The image could not be saved to the selected location."));
        if (file.write(source) != source.size() || !file.commit())
            return exportFailure(operation, QStringLiteral("The image could not be written completely."));
        return QVariantMap{{"success", true}, {"operation", operation},
                           {"fileName", QFileInfo(destinationPath).fileName()}};
    }, operation);
}

QUrl SynapseDataController::suggestedNotesRichImageSaveUrl(const QString &imageDataUrl,
                                                            const QString &caption) const {
    const QString extension = extensionForDataUrl(imageDataUrl);
    if (extension.isEmpty()) return {};
    QString folder = QStandardPaths::writableLocation(QStandardPaths::PicturesLocation);
    if (folder.isEmpty() || !QDir(folder).exists()) folder = QDir::homePath();
    return QUrl::fromLocalFile(QDir(folder).filePath(suggestedImageName(caption, extension)));
}
