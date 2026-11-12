#include "synapse_controller.h"

#include <QtConcurrent/QtConcurrentRun>
#include <QtCore/QBuffer>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QFutureWatcher>
#include <QtCore/QMimeData>
#include <QtCore/QRegularExpression>
#include <QtGui/QClipboard>
#include <QtGui/QGuiApplication>
#include <QtGui/QImage>
#include <QtGui/QImageReader>
#include <QtGui/QPixmap>

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

bool isSupportedRasterImagePath(const QString &path) {
    const QString extension = QFileInfo(path).suffix().toLower();
    return extension == QStringLiteral("png") || extension == QStringLiteral("jpg") ||
        extension == QStringLiteral("jpeg") || extension == QStringLiteral("gif") ||
        extension == QStringLiteral("webp") || extension == QStringLiteral("bmp");
}

QUrl localImageUrl(const QString &value) {
    const QString candidate = value.trimmed();
    if (candidate.isEmpty()) return {};
    QUrl url(candidate);
    if (url.isLocalFile()) {
        return isSupportedRasterImagePath(url.toLocalFile()) ? url : QUrl();
    }
    static const QRegularExpression windowsPath(QStringLiteral("^[A-Za-z]:[/\\\\]"));
    if (QDir::isAbsolutePath(candidate) || windowsPath.match(candidate).hasMatch() ||
        candidate.startsWith(QStringLiteral("\\\\\\\\"))) {
        return isSupportedRasterImagePath(candidate) ? QUrl::fromLocalFile(candidate) : QUrl();
    }
    return {};
}

QUrl clipboardImageUrl(const QMimeData *mimeData) {
    if (!mimeData) return {};
    for (const QUrl &url : mimeData->urls()) {
        if (url.isLocalFile() && isSupportedRasterImagePath(url.toLocalFile())) return url;
    }
    const QStringList lines = mimeData->text().split(QRegularExpression(QStringLiteral("[\\r\\n]+")));
    for (const QString &line : lines) {
        const QUrl url = localImageUrl(line);
        if (!url.isEmpty()) return url;
    }
    return {};
}

QImage clipboardImage(const QMimeData *mimeData) {
    if (!mimeData || !mimeData->hasImage()) return {};
    const QVariant imageValue = mimeData->imageData();
    QImage image = qvariant_cast<QImage>(imageValue);
    if (!image.isNull()) return image;
    if (imageValue.canConvert<QPixmap>()) return qvariant_cast<QPixmap>(imageValue).toImage();
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

QVariantMap encodeClipboardImage(const QImage &image, const QString &fileName) {
    const QSize dimensions = image.size();
    if (image.isNull() || !dimensions.isValid() ||
        static_cast<qint64>(dimensions.width()) * dimensions.height() > MaximumRichImagePixels) {
        return richImageFailure(QStringLiteral("The clipboard image is invalid or exceeds 30 megapixels."));
    }
    QByteArray bytes;
    QBuffer buffer(&bytes);
    if (!buffer.open(QIODevice::WriteOnly) || !image.save(&buffer, "PNG"))
        return richImageFailure(QStringLiteral("The clipboard image could not be encoded."));
    if (bytes.isEmpty() || bytes.size() > MaximumRichImageBytes)
        return richImageFailure(QStringLiteral("Choose a clipboard image no larger than 2 MiB."));
    return {{"success", true}, {"operation", "notes-rich-image"},
            {"imageDataUrl", QStringLiteral("data:image/png;base64,%1")
                .arg(QString::fromLatin1(bytes.toBase64()))},
            {"width", dimensions.width()}, {"height", dimensions.height()}, {"fileName", fileName}};
}

}

void SynapseDataController::startNotesRichImageOperation(std::function<QVariantMap()> operation) {
    if (m_fileOperationRunning) {
        emit fileOperationFinished(richImageFailure(QStringLiteral("Wait for the current file operation to finish.")));
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
    watcher->setFuture(QtConcurrent::run(std::move(operation)));
}

void SynapseDataController::processNotesRichImage(const QUrl &sourceUrl) {
    const QFileInfo sourceInfo(sourceUrl.toLocalFile());
    const QString canonicalPath = sourceInfo.canonicalFilePath();
    if (canonicalPath.isEmpty() || !sourceInfo.isFile() || !sourceInfo.isReadable() ||
        sourceInfo.size() <= 0 || sourceInfo.size() > MaximumRichImageBytes) {
        emit fileOperationFinished(richImageFailure(QStringLiteral("Choose a readable image no larger than 2 MiB.")));
        return;
    }

    const QString fileName = sourceInfo.fileName();
    startNotesRichImageOperation([canonicalPath, fileName]() {
        return readRichImage(canonicalPath, fileName);
    });
}

bool SynapseDataController::hasClipboardNotesRichImage() const {
    QClipboard *clipboard = QGuiApplication::clipboard();
    if (!clipboard) return false;
    const QMimeData *mimeData = clipboard->mimeData(QClipboard::Clipboard);
    if (!mimeData) return false;
    return !clipboardImage(mimeData).isNull() || !clipboardImageUrl(mimeData).isEmpty();
}

void SynapseDataController::processClipboardNotesRichImage() {
    QClipboard *clipboard = QGuiApplication::clipboard();
    const QMimeData *mimeData = clipboard ? clipboard->mimeData(QClipboard::Clipboard) : nullptr;
    if (!mimeData) {
        emit fileOperationFinished(richImageFailure(QStringLiteral("The clipboard does not contain an image.")));
        return;
    }
    const QImage image = clipboardImage(mimeData);
    if (!image.isNull()) {
        startNotesRichImageOperation([image]() {
            return encodeClipboardImage(image, QStringLiteral("clipboard-image.png"));
        });
        return;
    }
    const QUrl sourceUrl = clipboardImageUrl(mimeData);
    if (!sourceUrl.isEmpty()) {
        processNotesRichImage(sourceUrl);
        return;
    }
    emit fileOperationFinished(richImageFailure(QStringLiteral("The clipboard does not contain a supported image.")));
}
