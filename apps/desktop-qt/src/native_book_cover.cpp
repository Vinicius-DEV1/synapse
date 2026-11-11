#include "native_book_reader.h"

#include <QtCore/QBuffer>
#include <QtCore/QDir>
#include <QtCore/QFileInfo>
#include <QtCore/QProcess>
#include <QtCore/QStandardPaths>
#include <QtCore/QTemporaryDir>
#include <QtGui/QImage>
#include <QtGui/QImageReader>

namespace {

constexpr int MaximumPdfCoverWidth = 1280;
constexpr qint64 MaximumPdfCoverBytes = 12 * 1024 * 1024;
constexpr int PdfCoverRenderTimeoutMs = 30000;

QVariantMap coverFailure(const QString &message) {
    return {{"success", false}, {"error", message}};
}

}

QVariantMap extractNativePdfCover(const QString &path) {
    const QString renderer = QStandardPaths::findExecutable("pdftoppm");
    if (renderer.isEmpty()) return coverFailure("PDF cover extraction requires pdftoppm.");

    QTemporaryDir temporaryDirectory;
    if (!temporaryDirectory.isValid()) return coverFailure("Could not create temporary cover storage.");
    const QString outputPrefix = QDir(temporaryDirectory.path()).filePath("cover");

    QProcess process;
    process.start(renderer, {"-f", "1", "-l", "1", "-singlefile", "-scale-to",
                             QString::number(MaximumPdfCoverWidth), "-jpeg", "-jpegopt",
                             "quality=78", path, outputPrefix});
    if (!process.waitForStarted(5000)) return coverFailure("The PDF renderer could not start.");
    if (!process.waitForFinished(PdfCoverRenderTimeoutMs)) {
        process.kill();
        process.waitForFinished(5000);
        return coverFailure("PDF cover extraction timed out.");
    }
    if (process.exitStatus() != QProcess::NormalExit || process.exitCode() != 0) {
        return coverFailure("The first PDF page could not be rendered as a cover.");
    }

    const QString imagePath = outputPrefix + ".jpg";
    const QFileInfo imageInfo(imagePath);
    if (!imageInfo.isFile() || !imageInfo.isReadable() || imageInfo.size() <= 0 ||
        imageInfo.size() > MaximumPdfCoverBytes) {
        return coverFailure("The rendered PDF cover is invalid or too large.");
    }

    QImageReader imageReader(imagePath);
    imageReader.setAutoTransform(true);
    const QSize imageSize = imageReader.size();
    if (!imageReader.canRead() || !imageSize.isValid() ||
        static_cast<qint64>(imageSize.width()) * imageSize.height() > 2LL * MaximumPdfCoverWidth * MaximumPdfCoverWidth) {
        return coverFailure("The rendered PDF cover dimensions are invalid.");
    }
    QImage image = imageReader.read();
    if (image.isNull()) return coverFailure("The rendered PDF cover could not be decoded.");
    if (image.width() > MaximumPdfCoverWidth) {
        image = image.scaledToWidth(MaximumPdfCoverWidth, Qt::SmoothTransformation);
    }

    QByteArray encoded;
    QBuffer buffer(&encoded);
    if (!buffer.open(QIODevice::WriteOnly) || !image.save(&buffer, "JPEG", 78) ||
        encoded.isEmpty() || encoded.size() > MaximumPdfCoverBytes) {
        return coverFailure("The rendered PDF cover could not be encoded safely.");
    }

    return {{"success", true},
            {"coverImage", QStringLiteral("data:image/jpeg;base64,%1").arg(QString::fromLatin1(encoded.toBase64()))}};
}
