#include "synapse_controller.h"

#include <QtConcurrent/QtConcurrentRun>
#include <QtCore/QBuffer>
#include <QtCore/QFileInfo>
#include <QtCore/QFutureWatcher>
#include <QtCore/QSharedPointer>
#include <QtCore/QTimer>
#include <QtGui/QImage>
#include <QtGui/QImageReader>
#include <QtNetwork/QNetworkAccessManager>
#include <QtNetwork/QNetworkReply>
#include <QtNetwork/QNetworkRequest>

#include <utility>

namespace {

constexpr qint64 MaximumNotesCoverFileBytes = 20 * 1024 * 1024;
constexpr qint64 MaximumNotesCoverPixels = 30 * 1000 * 1000;
constexpr qint64 MaximumNotesCoverDownloadBytes = 20 * 1024 * 1024;
constexpr int MaximumNotesCoverWidth = 1280;
constexpr int NotesCoverRequestTimeoutMs = 30000;

QVariantMap notesCoverFailure(const QString &message) {
    return {{"success", false}, {"error", message}, {"operation", "notes-cover-process"}};
}

QVariantMap encodeNotesCover(QImage image) {
    if (image.isNull()) return notesCoverFailure("The selected image could not be decoded.");
    if (image.width() > MaximumNotesCoverWidth) {
        image = image.scaledToWidth(MaximumNotesCoverWidth, Qt::SmoothTransformation);
    }

    QByteArray encoded;
    QBuffer buffer(&encoded);
    if (!buffer.open(QIODevice::WriteOnly)) return notesCoverFailure("Could not prepare the cover image.");
    if (!image.save(&buffer, "JPEG", 72) || encoded.isEmpty()) {
        return notesCoverFailure("Could not encode the cover image.");
    }

    const QString dataUrl = QStringLiteral("data:image/jpeg;base64,%1")
        .arg(QString::fromLatin1(encoded.toBase64()));
    return {{"success", true}, {"coverImage", dataUrl}};
}

QVariantMap decodeNotesCoverBytes(QByteArray imageBytes) {
    QBuffer buffer(&imageBytes);
    if (!buffer.open(QIODevice::ReadOnly)) return notesCoverFailure("Could not read the downloaded cover image.");

    QImageReader reader(&buffer);
    reader.setAutoTransform(true);
    const QSize sourceSize = reader.size();
    if (!reader.canRead() || !sourceSize.isValid() ||
        static_cast<qint64>(sourceSize.width()) * sourceSize.height() > MaximumNotesCoverPixels) {
        return notesCoverFailure("The downloaded cover image is invalid or has too many pixels.");
    }

    QSize targetSize = sourceSize;
    if (targetSize.width() > MaximumNotesCoverWidth) {
        targetSize.scale(MaximumNotesCoverWidth, sourceSize.height(), Qt::KeepAspectRatio);
    }
    reader.setScaledSize(targetSize);
    QImage image = reader.read();
    if (!image.isNull() && image.size() != targetSize) {
        image = image.scaled(targetSize, Qt::KeepAspectRatio, Qt::SmoothTransformation);
    }
    return encodeNotesCover(std::move(image));
}

}

void SynapseDataController::processNotesPageCover(const QUrl &sourceUrl) {
    if (m_fileOperationRunning) {
        emit fileOperationFinished(notesCoverFailure("Wait for the current file operation to finish."));
        return;
    }

    const QString sourcePath = sourceUrl.toLocalFile();
    const QFileInfo sourceInfo(sourcePath);
    const QString canonicalPath = sourceInfo.canonicalFilePath();
    if (canonicalPath.isEmpty() || !sourceInfo.isFile() || !sourceInfo.isReadable() ||
        sourceInfo.size() <= 0 || sourceInfo.size() > MaximumNotesCoverFileBytes) {
        emit fileOperationFinished(notesCoverFailure("Choose a readable image smaller than 20 MB."));
        return;
    }

    QImageReader imageReader(canonicalPath);
    const QSize sourceSize = imageReader.size();
    if (!imageReader.canRead() || !sourceSize.isValid() ||
        static_cast<qint64>(sourceSize.width()) * sourceSize.height() > MaximumNotesCoverPixels) {
        emit fileOperationFinished(notesCoverFailure("The selected image is invalid or has too many pixels."));
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
        result.insert(QStringLiteral("operation"), QStringLiteral("notes-cover-process"));
        emit fileOperationFinished(result);
    });

    watcher->setFuture(QtConcurrent::run([canonicalPath, sourceSize]() {
        QImageReader reader(canonicalPath);
        reader.setAutoTransform(true);
        QSize targetSize = sourceSize;
        if (targetSize.width() > MaximumNotesCoverWidth) {
            targetSize.scale(MaximumNotesCoverWidth, sourceSize.height(), Qt::KeepAspectRatio);
        }
        reader.setScaledSize(targetSize);
        QImage image = reader.read();
        if (image.isNull()) return notesCoverFailure("The selected image could not be decoded.");
        if (image.size() != targetSize) {
            image = image.scaled(targetSize, Qt::KeepAspectRatio, Qt::SmoothTransformation);
        }

        return encodeNotesCover(std::move(image));
    }));
}

void SynapseDataController::processRandomNotesPageCover() {
    if (m_fileOperationRunning) {
        emit fileOperationFinished(notesCoverFailure("Wait for the current file operation to finish."));
        return;
    }

    m_fileOperationRunning = true;
    emit fileOperationStateChanged();

    auto *manager = new QNetworkAccessManager(this);
    QNetworkRequest request{QUrl(createRandomPageCoverUrl())};
    request.setAttribute(QNetworkRequest::RedirectPolicyAttribute, QNetworkRequest::NoLessSafeRedirectPolicy);
    QNetworkReply *reply = manager->get(request);
    const auto receivedBytes = QSharedPointer<QByteArray>::create();
    auto *timeout = new QTimer(reply);
    timeout->setSingleShot(true);
    connect(timeout, &QTimer::timeout, reply, &QNetworkReply::abort);
    timeout->start(NotesCoverRequestTimeoutMs);
    connect(reply, &QIODevice::readyRead, this, [reply, receivedBytes]() {
        const QByteArray chunk = reply->readAll();
        if (receivedBytes->size() + chunk.size() > MaximumNotesCoverDownloadBytes) {
            reply->setProperty("coverTooLarge", true);
            reply->abort();
            return;
        }
        receivedBytes->append(chunk);
    });
    connect(reply, &QNetworkReply::finished, this, [this, manager, reply, receivedBytes, timeout]() {
        timeout->stop();
        bool tooLarge = reply->property("coverTooLarge").toBool();
        if (!tooLarge) {
            const QByteArray remaining = reply->readAll();
            if (receivedBytes->size() + remaining.size() > MaximumNotesCoverDownloadBytes) {
                tooLarge = true;
            } else {
                receivedBytes->append(remaining);
            }
        }

        const bool failed = reply->error() != QNetworkReply::NoError;
        const QString networkError = reply->errorString();
        reply->deleteLater();
        manager->deleteLater();

        if (tooLarge) {
            m_fileOperationRunning = false;
            emit fileOperationStateChanged();
            emit fileOperationFinished(notesCoverFailure("The downloaded cover image exceeds 20 MB."));
            return;
        }
        if (failed || receivedBytes->isEmpty()) {
            m_fileOperationRunning = false;
            emit fileOperationStateChanged();
            emit fileOperationFinished(notesCoverFailure(QStringLiteral("Could not download a random cover: %1").arg(networkError)));
            return;
        }

        const QByteArray imageBytes = std::move(*receivedBytes);
        auto *watcher = new QFutureWatcher<QVariantMap>(this);
        m_fileOperationWatcher = watcher;
        connect(watcher, &QFutureWatcher<QVariantMap>::finished, this, [this, watcher]() {
            QVariantMap result = watcher->result();
            watcher->deleteLater();
            m_fileOperationRunning = false;
            emit fileOperationStateChanged();
            if (m_fileOperationWatcher == watcher) m_fileOperationWatcher = nullptr;
            result.insert(QStringLiteral("operation"), QStringLiteral("notes-cover-process"));
            emit fileOperationFinished(result);
        });
        watcher->setFuture(QtConcurrent::run([imageBytes]() { return decodeNotesCoverBytes(imageBytes); }));
    });
}
