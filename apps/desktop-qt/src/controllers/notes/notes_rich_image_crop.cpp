#include "synapse_controller.h"
#include "controllers/notes/notes_rich_images.h"

#include <QtCore/QBuffer>
#include <QtCore/QRect>
#include <QtGui/QImage>
#include <QtGui/QImageReader>

namespace {

constexpr qint64 MaximumRichImagePixels = 30 * 1000 * 1000;
constexpr qsizetype MaximumRichImageBytes = 2 * 1024 * 1024;

QVariantMap cropFailure(const QString &requestId, const QString &message) {
    return {{"success", false}, {"requestId", requestId}, {"error", message}};
}

QVariantMap cropImage(const QString &imageDataUrl, int x, int y, int width, int height,
                      const QString &requestId) {
    QSize sourceSize;
    if (requestId.isEmpty() || !NotesRichImages::supportsDataUrl(imageDataUrl, &sourceSize))
        return cropFailure(requestId, QStringLiteral("The selected image is invalid or unsupported."));
    if (width < 1 || height < 1 || x < 0 || y < 0 || x > sourceSize.width() - width ||
        y > sourceSize.height() - height || static_cast<qint64>(width) * height > MaximumRichImagePixels)
        return cropFailure(requestId, QStringLiteral("The crop area is outside the image bounds."));

    const int comma = imageDataUrl.indexOf(QLatin1Char(','));
    QByteArray sourceBytes = QByteArray::fromBase64(imageDataUrl.mid(comma + 1).toLatin1());
    QBuffer sourceBuffer(&sourceBytes);
    if (!sourceBuffer.open(QIODevice::ReadOnly))
        return cropFailure(requestId, QStringLiteral("The image could not be decoded for cropping."));
    QImageReader reader(&sourceBuffer);
    reader.setAutoTransform(true);
    const QImage source = reader.read();
    if (source.isNull() || static_cast<qint64>(source.width()) * source.height() > MaximumRichImagePixels ||
        x > source.width() - width || y > source.height() - height)
        return cropFailure(requestId, QStringLiteral("The crop area no longer matches the image dimensions."));

    const QImage cropped = source.copy(QRect(x, y, width, height));
    if (cropped.isNull())
        return cropFailure(requestId, QStringLiteral("The selected crop could not be created."));
    QByteArray jpegBytes;
    QBuffer jpegBuffer(&jpegBytes);
    if (!jpegBuffer.open(QIODevice::WriteOnly) || !cropped.save(&jpegBuffer, "JPEG", 92) ||
        jpegBytes.isEmpty() || jpegBytes.size() > MaximumRichImageBytes) {
        return cropFailure(requestId, QStringLiteral("The cropped image could not be encoded within the image size limit."));
    }

    const QString resultDataUrl = QStringLiteral("data:image/jpeg;base64,%1")
        .arg(QString::fromLatin1(jpegBytes.toBase64()));
    if (!NotesRichImages::supportsDataUrl(resultDataUrl))
        return cropFailure(requestId, QStringLiteral("The cropped image failed validation."));
    return {{"success", true}, {"requestId", requestId}, {"imageDataUrl", resultDataUrl},
            {"width", cropped.width()}, {"height", cropped.height()}};
}

}

void SynapseDataController::cropNotesRichImage(const QString &imageDataUrl, int x, int y,
                                               int width, int height, const QString &requestId) {
    if (m_fileOperationRunning) {
        emit fileOperationFinished({{"success", false}, {"operation", "notes-rich-image-crop"},
                                   {"requestId", requestId},
                                   {"error", QStringLiteral("Wait for the current file operation to finish.")}});
        return;
    }
    startNotesRichImageOperation(
        [imageDataUrl, x, y, width, height, requestId]() {
            return cropImage(imageDataUrl, x, y, width, height, requestId);
        }, QStringLiteral("notes-rich-image-crop"));
}
