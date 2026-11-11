#include "synapse_controller.h"
#include "video_subtitle_format.h"
#include "video_subtitle_helpers.h"

#include <QtConcurrent/QtConcurrentRun>
#include <QtCore/QDebug>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QFutureWatcher>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QPointer>

namespace {

constexpr qint64 kMaxSubtitleBytes = 20 * 1024 * 1024;

struct ByteArrayWiper {
    QByteArray &value;
    ~ByteArrayWiper() { value.fill('\0'); }
};

struct QStringWiper {
    QString &value;
    ~QStringWiper() { value.fill(QChar(0)); }
};

}

void SynapseDataController::importVideoSubtitle(QObject *player, const QString &videoId,
                                                const QUrl &sourceUrl) {
    const auto fail = [this, &videoId](const QString &message) {
        emit fileOperationFinished({{"success", false}, {"error", message},
                                    {"operation", "video-subtitle-import"}, {"videoId", videoId}});
    };
    if (m_fileOperationRunning) return fail("Wait for the current file operation to finish.");
    if (!player || player->metaObject()->indexOfMethod(
            "addSubtitleTrack(QString,QString,QString,bool)") < 0) {
        return fail("The native video player cannot load subtitle tracks.");
    }
    if (m_isVaultConfigured && (!m_isVaultUnlocked || m_unlockedKeys.value("culture").isEmpty())) {
        return fail("Unlock the vault before importing a subtitle.");
    }

    const QString sourcePath = sourceUrl.toLocalFile();
    const QFileInfo sourceInfo(sourcePath);
    const QString canonicalSource = sourceInfo.canonicalFilePath();
    const QString extension = sourceInfo.suffix().toLower();
    if (canonicalSource.isEmpty() || !sourceInfo.isFile() || !sourceInfo.isReadable() ||
        sourceInfo.size() <= 0 || sourceInfo.size() > kMaxSubtitleBytes ||
        (extension != "srt" && extension != "vtt")) {
        return fail("Choose a readable .srt or .vtt subtitle file smaller than 20 MB.");
    }

    const QJsonArray videoRows = executeQueryPrepared(
        "SELECT file_path FROM videos WHERE id = ?1 AND deleted_at IS NULL", {videoId});
    if (videoId.isEmpty() || videoRows.isEmpty()) return fail("The selected video is no longer available.");

    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QString managedVideosDirectory = QFileInfo(appDirectory + "/videos").canonicalFilePath();
    const QString videoPath = VideoSubtitleHelpers::canonicalManagedPath(
        videoRows.first().toObject().value("file_path").toString(), appDirectory, managedVideosDirectory);
    if (videoPath.isEmpty()) return fail("The selected video path is outside managed media storage.");

    const QString subtitleDirectory = QDir(managedVideosDirectory).filePath("subtitles");
    if (!QDir().mkpath(subtitleDirectory)) return fail("Could not create the subtitle storage directory.");
    const QString canonicalSubtitleDirectory = QFileInfo(subtitleDirectory).canonicalFilePath();
    if (canonicalSubtitleDirectory.isEmpty() ||
        !canonicalSubtitleDirectory.startsWith(managedVideosDirectory + QDir::separator())) {
        return fail("The subtitle storage directory is outside managed media storage.");
    }

    const QString trackId = QStringLiteral("sub_%1").arg(generateUuid());
    const QString label = sourceInfo.completeBaseName().trimmed().isEmpty()
        ? QStringLiteral("Subtitle") : sourceInfo.completeBaseName().trimmed();
    const QString destination = QDir(canonicalSubtitleDirectory).filePath(generateUuid() + ".vtt");
    const QString temporaryDestination = destination + ".partial";
    const bool encryptAtRest = m_isVaultConfigured;
    QString key = encryptAtRest ? m_unlockedKeys.value("culture") : QString();
    QStringWiper keyWiper{key};
    SynapseFileOperation *operation = synapse_file_operation_create();
    if (!operation) return fail("Could not start the subtitle import.");

    m_fileOperationRunning = true;
    emit fileOperationStateChanged();
    auto *watcher = new QFutureWatcher<QVariantMap>(this);
    m_fileOperationWatcher = watcher;
    m_activeFileOperation = operation;
    QPointer<QObject> playerPointer(player);
    connect(watcher, &QFutureWatcher<QVariantMap>::finished, this,
            [this, watcher, operation, videoId, videoPath, trackId, label, destination,
             temporaryDestination, playerPointer]() {
        QVariantMap operationResult = watcher->result();
        watcher->deleteLater();
        bool success = operationResult.value("success").toBool();
        QString error = operationResult.value("error").toString();
        if (success && !QFile::rename(temporaryDestination, destination)) {
            success = false;
            error = "Could not finalize the imported subtitle.";
        }

        if (success) {
            const QJsonArray rows = executeQueryPrepared(
                "SELECT subtitles_json FROM videos WHERE id = ?1 AND deleted_at IS NULL", {videoId});
            const QString existingJson = rows.isEmpty()
                ? QString() : rows.first().toObject().value("subtitles_json").toString();
            QJsonArray tracks;
            if (!existingJson.trimmed().isEmpty()) {
                QJsonParseError parseError;
                const QJsonDocument document = QJsonDocument::fromJson(existingJson.toUtf8(), &parseError);
                if (parseError.error == QJsonParseError::NoError && document.isArray()) tracks = document.array();
                else {
                    success = false;
                    error = "The video's subtitle list is invalid; no metadata was changed.";
                }
            } else if (rows.isEmpty()) {
                success = false;
                error = "The selected video was removed before the subtitle could be saved.";
            }

            if (success) {
                QJsonObject track;
                track.insert(QStringLiteral("id"), trackId);
                track.insert(QStringLiteral("label"), label);
                track.insert(QStringLiteral("local_path"), destination);
                tracks.append(track);

                const QString timestamp = currentTimestamp();
                if (!executeSql("BEGIN IMMEDIATE;")) {
                    success = false;
                    error = "Could not start the subtitle metadata transaction.";
                } else {
                    const int updatedRows = executeSqlPrepared(
                        "UPDATE videos SET subtitles_json = ?1, updated_at = ?2 "
                        "WHERE id = ?3 AND deleted_at IS NULL",
                        {QString::fromUtf8(QJsonDocument(tracks).toJson(QJsonDocument::Compact)),
                         timestamp, videoId});
                    const bool committed = updatedRows == 1 && executeSql("COMMIT;");
                    if (!committed) {
                        executeSql("ROLLBACK;");
                        success = false;
                        error = "Could not save the subtitle metadata.";
                    }
                }
            }
        }

        bool loaded = false;
        if (success && playerPointer && playerPointer->property("source").toString() == videoPath &&
            (!m_isVaultConfigured || (m_isVaultUnlocked && !m_unlockedKeys.value("culture").isEmpty()))) {
            QString activeKey = m_isVaultConfigured ? m_unlockedKeys.value("culture") : QString();
            loaded = VideoSubtitleHelpers::invokeSubtitleLoad(playerPointer, destination, activeKey, label, true);
            activeKey.fill(QChar(0));
        }

        if (!success) {
            if (!QFile::remove(temporaryDestination) && QFile::exists(temporaryDestination)) {
                qWarning() << "[SynapseDataController] Failed to remove an incomplete subtitle file.";
            }
            if (!QFile::remove(destination) && QFile::exists(destination)) {
                qWarning() << "[SynapseDataController] Failed to remove an uncommitted subtitle file.";
            }
        }
        m_fileOperationRunning = false;
        emit fileOperationStateChanged();
        if (m_activeFileOperation == operation) m_activeFileOperation = nullptr;
        if (m_fileOperationWatcher == watcher) m_fileOperationWatcher = nullptr;
        synapse_file_operation_close(operation);
        emit fileOperationFinished({{"success", success}, {"loaded", loaded}, {"videoId", videoId},
                                    {"trackId", trackId}, {"error", error},
                                    {"operation", "video-subtitle-import"}});
    });

    watcher->setFuture(QtConcurrent::run([canonicalSource, temporaryDestination, encryptAtRest,
                                         key, operation]() mutable {
        QString operationKey = key;
        key.fill(QChar(0));
        QStringWiper operationKeyWiper{operationKey};
        QFile source(canonicalSource);
        if (!source.open(QIODevice::ReadOnly)) {
            return QVariantMap{{"success", false}, {"error", "The subtitle file could not be opened."}};
        }
        QByteArray sourceBytes = source.readAll();
        ByteArrayWiper sourceBytesWiper{sourceBytes};
        if (source.error() != QFileDevice::NoError || sourceBytes.isEmpty() ||
            sourceBytes.size() > kMaxSubtitleBytes) {
            return QVariantMap{{"success", false}, {"error", "The subtitle file is empty or exceeds 20 MB."}};
        }

        bool valid = false;
        QByteArray webVttBytes = convertSubtitleToWebVtt(sourceBytes, &valid);
        ByteArrayWiper webVttBytesWiper{webVttBytes};
        if (!valid) return QVariantMap{{"success", false}, {"error", "The subtitle file contains no valid cues."}};

        bool written = false;
        if (encryptAtRest) {
            const QByteArray outputBytes = temporaryDestination.toUtf8();
            QByteArray keyBytes = operationKey.toUtf8();
            const int result = synapse_file_encrypt_bytes(
                reinterpret_cast<const uint8_t *>(webVttBytes.constData()),
                static_cast<size_t>(webVttBytes.size()), outputBytes.constData(), keyBytes.constData(), operation);
            keyBytes.fill('\0');
            written = result == 0;
        } else {
            QFile output(temporaryDestination);
            written = output.open(QIODevice::WriteOnly | QIODevice::Truncate) &&
                      output.write(webVttBytes) == webVttBytes.size() && output.flush();
            output.close();
        }
        if (!written) {
            QFile::remove(temporaryDestination);
            return QVariantMap{{"success", false}, {"error", "Subtitle conversion or encryption failed."}};
        }
        return QVariantMap{{"success", true}};
    }));
    resetAutoLockTimer();
}
