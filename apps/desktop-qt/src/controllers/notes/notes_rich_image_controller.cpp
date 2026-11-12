#include "synapse_controller.h"

#include <QtConcurrent/QtConcurrentRun>
#include <QtCore/QBuffer>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QFutureWatcher>
#include <QtGui/QImage>
#include <QtGui/QImageReader>

namespace {

constexpr qint64 MaximumRichImageBytes = 2 * 1024 * 1024;
constexpr qint64 MaximumRichImagePixels = 30 * 1000 * 1000;

QVariantMap richImageFailure(const QString &message) {
    return {{"success", false}, {"error", message}, {"operation", "notes-rich-image"}};
}

QString imageMimeType(const QByteArray &format) {
    const QByteArray normalized = format.toLower();
    if (normalized == "png") return QStringLiteral("image/png");
    if (normalized == "jpg" || normalized == "jpeg") return QStringLiteral("image/jpeg");
    if (normalized == "gif") return QStringLiteral("image/gif");
    if (normalized == "webp") return QStringLiteral("image/webp");
    if (normalized == "bmp") return QStringLiteral("image/bmp");
    return {};
}

QVariantMap readRichImage(const QString &canonicalPath, const QString &fileName) {
    QFile file(canonicalPath);
    if (!file.open(QIODevice::ReadOnly))
        return richImageFailure(QStringLiteral("The selected image could not be read."));
    if (file.size() <= 0 || file.size() > MaximumRichImageBytes)
        return richImageFailure(QStringLiteral("Choose an image no larger than 2 MiB."));
    const QByteArray source = file.readAll();
    if (source.isEmpty() || source.size() > MaximumRichImageBytes)
        return richImageFailure(QStringLiteral("The selected image changed while it was being read."));

    QBuffer buffer;
    buffer.setData(source);
    if (!buffer.open(QIODevice::ReadOnly))
        return richImageFailure(QStringLiteral("The selected image could not be decoded."));
    QImageReader reader(&buffer);
    reader.setAutoTransform(true);
    if (!reader.canRead())
        return richImageFailure(QStringLiteral("Choose a supported PNG, JPEG, GIF, WebP, or BMP image."));
    const QString mimeType = imageMimeType(reader.format());
    const QSize dimensions = reader.size();
    if (mimeType.isEmpty() || !dimensions.isValid() ||
        static_cast<qint64>(dimensions.width()) * dimensions.height() > MaximumRichImagePixels) {
        return richImageFailure(QStringLiteral("The image format or pixel dimensions are not supported."));
    }
    if (reader.read().isNull())
        return richImageFailure(QStringLiteral("The selected image is incomplete or invalid."));

    return {{"success", true}, {"operation", "notes-rich-image"},
            {"imageDataUrl", QStringLiteral("data:%1;base64,%2")
                .arg(mimeType, QString::fromLatin1(source.toBase64()))},
            {"width", dimensions.width()}, {"height", dimensions.height()},
            {"fileName", fileName}};
}

}

void SynapseDataController::processNotesRichImage(const QUrl &sourceUrl) {
    if (m_fileOperationRunning) {
        emit fileOperationFinished(richImageFailure(QStringLiteral("Wait for the current file operation to finish.")));
        return;
    }

    const QFileInfo sourceInfo(sourceUrl.toLocalFile());
    const QString canonicalPath = sourceInfo.canonicalFilePath();
    if (canonicalPath.isEmpty() || !sourceInfo.isFile() || !sourceInfo.isReadable() ||
        sourceInfo.size() <= 0 || sourceInfo.size() > MaximumRichImageBytes) {
        emit fileOperationFinished(richImageFailure(QStringLiteral("Choose a readable image no larger than 2 MiB.")));
        return;
    }

    m_fileOperationRunning = true;
    emit fileOperationStateChanged();
    auto *watcher = new QFutureWatcher<QVariantMap>(this);
    m_fileOperationWatcher = watcher;
    connect(watcher, &QFutureWatcher<QVariantMap>::finished, this, [this, watcher]() {
        QVariantMap result = watcher->result();
        watcher->deleteLater();
        m_fileOperationRunning = false;
        emit fileOperationStateChanged();
        if (m_fileOperationWatcher == watcher) m_fileOperationWatcher = nullptr;
        emit fileOperationFinished(result);
    });
    const QString fileName = sourceInfo.fileName();
    watcher->setFuture(QtConcurrent::run([canonicalPath, fileName]() {
        return readRichImage(canonicalPath, fileName);
    }));
}
