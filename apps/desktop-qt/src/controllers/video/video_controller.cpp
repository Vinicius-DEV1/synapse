#include "synapse_controller.h"
#include "synapse_bridge.h"
#include "native_video_metadata.h"

#include <QtCore/QDebug>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QVariant>
#include <QtCore/QRegularExpression>
#include <QtCore/QSettings>
#include <QtConcurrent/QtConcurrentRun>
#include <cmath>

namespace {

constexpr double VideoResumePromptThresholdSeconds = 5.0;

}

QString SynapseDataController::getVideoGalleryViewMode() const {
    QSettings settings;
    const QString mode = settings.value("video/viewMode", "grid").toString();
    return mode == "list" || mode == "compact" ? mode : "grid";
}

bool SynapseDataController::setVideoGalleryViewMode(const QString &mode) {
    if (mode != "grid" && mode != "list" && mode != "compact") return false;
    QSettings settings;
    settings.setValue("video/viewMode", mode);
    settings.sync();
    if (settings.status() != QSettings::NoError) {
        qWarning() << "[SynapseDataController] Could not persist the native video gallery mode at"
                   << settings.fileName() << "with status" << settings.status();
        return false;
    }
    return true;
}

void SynapseDataController::importVideo(const QString &sourcePath, const QString &collectionName,
                                        const QString &collectionId) {
    const auto fail = [this](const QString &message) {
        emit fileOperationFinished({{"success", false}, {"error", message}, {"operation", "video-import"}});
    };
    if (m_fileOperationRunning) return fail("Wait for the current file operation to finish.");
    if (!m_isVaultConfigured || !m_isVaultUnlocked || m_unlockedKeys.value("culture").isEmpty()) {
        return fail("Unlock the vault before importing videos so they can be encrypted locally.");
    }

    const QFileInfo sourceInfo(sourcePath);
    const QString canonicalSource = sourceInfo.canonicalFilePath();
    if (canonicalSource.isEmpty() || !sourceInfo.isFile() || sourceInfo.size() <= 0 || !sourceInfo.isReadable()) {
        return fail("Choose a readable video file.");
    }

    const QString id = generateUuid();
    const QString videosDirectory = QFileInfo(m_dbPath).absolutePath() + "/videos";
    if (!QDir().mkpath(videosDirectory)) return fail("Could not create the local video directory.");

    QString extension = sourceInfo.suffix().toLower();
    extension.remove(QRegularExpression("[^a-z0-9]"));
    if (extension.size() > 16) extension = extension.left(16);
    const QString storedName = id + (extension.isEmpty() ? QString() : "." + extension) + ".enc";
    const QString destination = QDir(videosDirectory).filePath(storedName);
    const QString temporaryDestination = destination + ".partial";
    const QString title = sourceInfo.completeBaseName().trimmed().isEmpty()
        ? sourceInfo.fileName() : sourceInfo.completeBaseName().trimmed();
    const QString originalName = sourceInfo.fileName();
    const QString collection = collectionName.trimmed();
    QString key = m_unlockedKeys.value("culture");
    SynapseFileOperation *operation = synapse_file_operation_create();
    if (!operation) {
        key.fill(QChar(0));
        return fail("Could not start the encrypted video import.");
    }

    m_fileOperationRunning = true;
    emit fileOperationStateChanged();
    auto *watcher = new QFutureWatcher<QVariantMap>(this);
    m_fileOperationWatcher = watcher;
    m_activeFileOperation = operation;
    connect(watcher, &QFutureWatcher<QVariantMap>::finished, this,
            [this, watcher, operation, id, title, originalName, collection, collectionId,
             destination, temporaryDestination]() {
        const QVariantMap operationResult = watcher->result();
        watcher->deleteLater();
        bool success = operationResult.value("success").toBool();
        QString error = operationResult.value("error").toString();
        const QString audioTracksJson = operationResult.value("audioTracksJson").toString();
        if (success && (!m_isVaultConfigured || !m_isVaultUnlocked)) {
            QFile::remove(temporaryDestination);
            success = false;
            error = "The vault was locked before the video import finished.";
        }
        if (success && !QFile::rename(temporaryDestination, destination)) {
            QFile::remove(temporaryDestination);
            success = false;
            error = "Could not finalize encrypted video storage.";
        }
        if (success) {
            QJsonObject videoObj;
            videoObj["id"] = id;
            videoObj["title"] = title;
            videoObj["original_name"] = originalName;
            videoObj["file_path"] = destination;
            videoObj["progress"] = 0.0;
            videoObj["is_local"] = 1;
            if (!collectionId.trimmed().isEmpty()) videoObj["collection_id"] = collectionId.trimmed();
            if (!collection.trimmed().isEmpty()) videoObj["collection_name"] = collection.trimmed();
            if (!audioTracksJson.trimmed().isEmpty()) videoObj["audio_tracks_json"] = audioTracksJson;
            const QByteArray jsonBytes = QJsonDocument(videoObj).toJson(QJsonDocument::Compact);
            success = m_db && synapse_video_insert(m_db, jsonBytes.constData()) == 1;
            if (!success) {
                QFile::remove(destination);
                error = "Could not save the video record in the database.";
            } else {
                refreshStats();
            }
        } else {
            QFile::remove(temporaryDestination);
        }
        m_fileOperationRunning = false;
        emit fileOperationStateChanged();
        if (m_activeFileOperation == operation) m_activeFileOperation = nullptr;
        if (m_fileOperationWatcher == watcher) m_fileOperationWatcher = nullptr;
        synapse_file_operation_close(operation);
        emit fileOperationFinished({{"success", success}, {"id", id}, {"name", originalName},
                                    {"error", error}, {"operation", "video-import"}});
    });
    watcher->setFuture(QtConcurrent::run([canonicalSource, temporaryDestination, key, operation]() mutable {
        const QByteArray sourceBytes = canonicalSource.toUtf8();
        const QByteArray targetBytes = temporaryDestination.toUtf8();
        QByteArray keyBytes = key.toUtf8();
        key.fill(QChar(0));
        const int result = synapse_file_encrypt(sourceBytes.constData(), targetBytes.constData(), keyBytes.constData(), operation);
        keyBytes.fill('\0');
        if (result != 0) {
            QFile::remove(temporaryDestination);
            return QVariantMap{{"success", false}, {"error", "Video encryption failed."}};
        }
        const QVariantMap metadata = inspectNativeVideoTracks(canonicalSource);
        if (!metadata.value("success").toBool()) {
            qInfo() << "[SynapseDataController] Video import continues without extracted audio track metadata.";
        }
        return QVariantMap{{"success", true},
                           {"audioTracksJson", metadata.value("success").toBool()
                                ? metadata.value("audioTracksJson") : QString()}};
    }));
    key.fill(QChar(0));
    resetAutoLockTimer();
}

QVariantMap SynapseDataController::configureVideoPlayback(QObject *player, const QString &videoId) {
    const auto fail = [](const QString &message) {
        return QVariantMap{{"success", false}, {"error", message}};
    };
    if (m_isVaultConfigured && !m_isVaultUnlocked) {
        return fail("Unlock the vault before playing local media.");
    }
    if (!player) return fail("The native player is not available.");
    if (!m_db) return fail("The database is not available.");
    const QByteArray vidBytes = videoId.trimmed().toUtf8();
    char *raw = synapse_video_get_one(m_db, vidBytes.constData());
    if (!raw) return fail("The selected video is no longer available.");
    const QJsonObject video = QJsonDocument::fromJson(QByteArray(raw)).object();
    synapse_free_string(raw);
    const QString recordedPath = video.value("file_path").toString();
    if (recordedPath.trimmed().isEmpty()) return fail("This video has no local copy available.");

    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QString managedVideosDirectory = QFileInfo(appDirectory + "/videos").canonicalFilePath();
    if (managedVideosDirectory.isEmpty()) return fail("The local video storage directory is unavailable.");
    const QFileInfo pathInfo(recordedPath);
    const QString candidatePath = pathInfo.isAbsolute()
        ? recordedPath
        : QDir(appDirectory).filePath(recordedPath);
    const QString canonicalPath = QFileInfo(candidatePath).canonicalFilePath();
    const QString managedPrefix = managedVideosDirectory + QDir::separator();
#ifdef Q_OS_WIN
    const Qt::CaseSensitivity pathSensitivity = Qt::CaseInsensitive;
#else
    const Qt::CaseSensitivity pathSensitivity = Qt::CaseSensitive;
#endif
    if (canonicalPath.isEmpty() || !canonicalPath.startsWith(managedPrefix, pathSensitivity)) {
        return fail("The video path is invalid or outside the managed media directory.");
    }

    QFile file(canonicalPath);
    if (!file.open(QIODevice::ReadOnly)) return fail("The local video file could not be opened.");
    const bool encryptedAtRest = file.read(4) == QByteArrayLiteral("ENC1");
    file.close();
    QString cultureKey = encryptedAtRest ? m_unlockedKeys.value("culture") : QString();
    if (encryptedAtRest && m_isVaultConfigured && !m_isVaultUnlocked) {
        return fail("Unlock the vault before playing encrypted video.");
    }
    if (encryptedAtRest && cultureKey.isEmpty()) {
        return fail("The encrypted media key is unavailable. Unlock the vault and try again.");
    }

    const QMetaObject *playerMeta = player->metaObject();
    if (playerMeta->indexOfProperty("keyHex") < 0 || playerMeta->indexOfProperty("source") < 0) {
        cultureKey.fill(QChar(0));
        return fail("The selected object does not support native media playback.");
    }
    player->setProperty("keyHex", cultureKey);
    const bool sourceAccepted = player->setProperty("source", canonicalPath);
    cultureKey.fill(QChar(0));
    if (!sourceAccepted) {
        player->setProperty("keyHex", QString());
        return fail("The native player rejected the video path.");
    }

    const double progress = qMax(0.0, video.value("progress").toDouble());
    const bool showResumePrompt = progress > VideoResumePromptThresholdSeconds;
    player->setProperty("paused", showResumePrompt);
    if (progress > 0.0) player->setProperty("position", progress);
    if (!loadVideoSubtitles(player, videoId)) {
        qWarning() << "[SynapseDataController] One or more local subtitle tracks could not be loaded.";
    }
    resetAutoLockTimer();
    return {{"success", true}, {"title", video.value("title").toString()},
            {"duration", video.value("duration").toDouble()}, {"progress", progress},
            {"showResumePrompt", showResumePrompt}};
}

bool SynapseDataController::updateVideoProgress(const QString &videoId, double progress) {
    if (!m_db) return false;
    const QByteArray vidBytes = videoId.trimmed().toUtf8();
    return synapse_video_update_progress(m_db, vidBytes.constData(), progress) == 1;
}

bool SynapseDataController::updateVideoDuration(const QString &videoId, double duration) {
    if (!m_db || videoId.isEmpty() || !std::isfinite(duration) || duration <= 0.0) return false;
    const QByteArray vidBytes = videoId.trimmed().toUtf8();
    return synapse_video_update_duration(m_db, vidBytes.constData(), duration) == 1;
}

bool SynapseDataController::deleteVideo(const QString &videoId) {
    if (!m_db) return false;
    const QByteArray vidBytes = videoId.trimmed().toUtf8();
    char *raw = synapse_video_get_one(m_db, vidBytes.constData());
    if (!raw) return false;
    const QJsonObject video = QJsonDocument::fromJson(QByteArray(raw)).object();
    synapse_free_string(raw);

    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QString videosDirectory = QFileInfo(appDirectory + "/videos").canonicalFilePath();
    QVector<QPair<QString, QString>> stagedSubtitleFiles;
    if (!stageVideoSubtitleFiles(videoId, videosDirectory, stagedSubtitleFiles)) return false;
    const QString recordedPath = video.value("file_path").toString();
    const QString candidatePath = recordedPath.isEmpty() ? QString()
        : (QDir::isAbsolutePath(recordedPath) ? recordedPath : QDir(appDirectory).filePath(recordedPath));
    const QFileInfo candidateInfo(candidatePath);
    const QString canonicalPath = candidateInfo.canonicalFilePath();
    const bool managedFile = !canonicalPath.isEmpty() && !videosDirectory.isEmpty() && candidateInfo.isFile() &&
                             canonicalPath.startsWith(videosDirectory + QDir::separator());
    const QString stagedPath = managedFile ? canonicalPath + ".deleted-" + generateUuid() : QString();
    if (managedFile && !QFile::rename(canonicalPath, stagedPath)) {
        restoreStagedVideoSubtitleFiles(stagedSubtitleFiles);
        return false;
    }

    const bool rowUpdated = synapse_video_delete(m_db, vidBytes.constData()) == 1;
    if (!rowUpdated) {
        if (managedFile) QFile::rename(stagedPath, canonicalPath);
        restoreStagedVideoSubtitleFiles(stagedSubtitleFiles);
        return false;
    }

    if (managedFile) QFile::remove(stagedPath);
    removeStagedVideoSubtitleFiles(stagedSubtitleFiles);
    refreshStats();
    return true;
}

QVariantList SynapseDataController::getVideoWords(const QString &videoId) {
    if (!m_db) return {};
    const QByteArray vidBytes = videoId.trimmed().toUtf8();
    char *raw = synapse_video_get_words(m_db, vidBytes.constData());
    if (!raw) return {};
    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(raw));
    synapse_free_string(raw);
    return doc.array().toVariantList();
}

bool SynapseDataController::addVideoWord(const QString &videoId, const QString &word, const QString &context, double timestamp) {
    if (!m_db) return false;
    const QByteArray vidBytes = videoId.trimmed().toUtf8();
    const QByteArray wordBytes = word.trimmed().toUtf8();
    const QByteArray ctxBytes = context.trimmed().toUtf8();
    return synapse_video_add_word(
        m_db, vidBytes.constData(), wordBytes.constData(),
        ctxBytes.isEmpty() ? nullptr : ctxBytes.constData(), timestamp) == 1;
}

bool SynapseDataController::deleteVideoWord(const QString &wordId) {
    if (!m_db) return false;
    const QByteArray widBytes = wordId.trimmed().toUtf8();
    return synapse_video_delete_word(m_db, widBytes.constData()) == 1;
}

