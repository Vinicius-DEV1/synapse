#include "synapse_controller.h"

#include <QtConcurrent/QtConcurrentRun>
#include <QtCore/QBuffer>
#include <QtCore/QFileInfo>
#include <QtCore/QFutureWatcher>
#include <QtCore/QUrl>
#include <QtGui/QImage>
#include <QtGui/QImageReader>

namespace {

constexpr qint64 MaximumCoverFileBytes = 20 * 1024 * 1024;
constexpr qint64 MaximumCoverPixels = 30 * 1000 * 1000;

QVariantMap coverFailure(const QString &message) {
    return {{"success", false}, {"error", message}, {"operation", "library-cover-process"}};
}

}

void SynapseDataController::processLibraryBookCover(const QUrl &sourceUrl) {
    if (m_fileOperationRunning) {
        emit fileOperationFinished(coverFailure("Wait for the current file operation to finish."));
        return;
    }

    const QString sourcePath = sourceUrl.toLocalFile();
    const QFileInfo sourceInfo(sourcePath);
    const QString canonicalPath = sourceInfo.canonicalFilePath();
    if (canonicalPath.isEmpty() || !sourceInfo.isFile() || !sourceInfo.isReadable() ||
        sourceInfo.size() <= 0 || sourceInfo.size() > MaximumCoverFileBytes) {
        emit fileOperationFinished(coverFailure("Choose a readable image smaller than 20 MB."));
        return;
    }

    QImageReader imageReader(canonicalPath);
    const QSize sourceSize = imageReader.size();
    if (!imageReader.canRead() || !sourceSize.isValid() ||
        static_cast<qint64>(sourceSize.width()) * sourceSize.height() > MaximumCoverPixels) {
        emit fileOperationFinished(coverFailure("The selected image is invalid or has too many pixels."));
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
        result.insert(QStringLiteral("operation"), QStringLiteral("library-cover-process"));
        emit fileOperationFinished(result);
    });

    watcher->setFuture(QtConcurrent::run([canonicalPath, sourceSize]() {
        QImageReader reader(canonicalPath);
        reader.setAutoTransform(true);
        const QSize targetSize = sourceSize.scaled(QSize(600, 800), Qt::KeepAspectRatio);
        reader.setScaledSize(targetSize);
        QImage image = reader.read();
        if (image.isNull()) return coverFailure("The selected image could not be decoded.");
        if (image.size() != targetSize) {
            image = image.scaled(targetSize, Qt::KeepAspectRatio, Qt::SmoothTransformation);
        }

        QByteArray encoded;
        QBuffer buffer(&encoded);
        if (!buffer.open(QIODevice::WriteOnly)) return coverFailure("Could not prepare the cover image.");
        const bool hasAlpha = image.hasAlphaChannel();
        const char *format = hasAlpha ? "PNG" : "JPEG";
        if (!image.save(&buffer, format, hasAlpha ? -1 : 84) || encoded.isEmpty()) {
            return coverFailure("Could not encode the cover image.");
        }

        const QString mimeType = hasAlpha ? "image/png" : "image/jpeg";
        const QString dataUrl = QStringLiteral("data:%1;base64,%2")
            .arg(mimeType, QString::fromLatin1(encoded.toBase64()));
        return QVariantMap{{"success", true}, {"coverImage", dataUrl}};
    }));
}
