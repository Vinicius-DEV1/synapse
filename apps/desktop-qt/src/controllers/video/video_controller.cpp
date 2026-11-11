#include "synapse_controller.h"
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
            const QString now = currentTimestamp();
            const QVariant normalizedCollection = collection.isEmpty() ? QVariant() : QVariant(collection);
            const QVariant normalizedCollectionId = collectionId.trimmed().isEmpty()
                ? QVariant() : QVariant(collectionId.trimmed());
            success = executeSqlPrepared(
                "INSERT INTO videos (id, title, original_name, file_path, progress, is_local, collection_id, "
                "collection_name, audio_tracks_json, created_at, updated_at) "
                "VALUES (?1, ?2, ?3, ?4, 0, 1, ?5, ?6, ?7, ?8, ?8)",
                {id, title, originalName, destination, normalizedCollectionId, normalizedCollection,
                 audioTracksJson, now}) == 1;
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
    const QJsonArray rows = executeQueryPrepared(
        "SELECT title, file_path, duration, progress, subtitles_json, local_subtitle_path "
        "FROM videos WHERE id = ?1 AND deleted_at IS NULL", {videoId});
    if (rows.isEmpty()) return fail("The selected video is no longer available.");
    const QJsonObject video = rows.first().toObject();
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
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE videos SET progress = %1, updated_at = '%2' WHERE id = '%3'")
        .arg(progress).arg(ts, escapeSql(videoId));
    return executeSql(sql);
}

bool SynapseDataController::updateVideoDuration(const QString &videoId, double duration) {
    if (videoId.isEmpty() || !std::isfinite(duration) || duration <= 0.0) return false;
    const QString sql = QString("UPDATE videos SET duration = %1, updated_at = '%2' "
                                "WHERE id = '%3' AND deleted_at IS NULL AND (duration IS NULL OR duration <= 0)")
                            .arg(QString::number(duration, 'f', 3), currentTimestamp(), escapeSql(videoId));
    return executeSql(sql);
}

bool SynapseDataController::deleteVideo(const QString &videoId) {
    const QJsonArray rows = executeQueryPrepared(
        "SELECT file_path FROM videos WHERE id = ?1 AND deleted_at IS NULL", {videoId});
    if (rows.isEmpty()) return false;

    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QString videosDirectory = QFileInfo(appDirectory + "/videos").canonicalFilePath();
    QVector<QPair<QString, QString>> stagedSubtitleFiles;
    if (!stageVideoSubtitleFiles(videoId, videosDirectory, stagedSubtitleFiles)) return false;
    const QString recordedPath = rows.first().toObject().value("file_path").toString();
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

    const QString timestamp = currentTimestamp();
    if (!executeSql("BEGIN IMMEDIATE;")) {
        if (managedFile) QFile::rename(stagedPath, canonicalPath);
        restoreStagedVideoSubtitleFiles(stagedSubtitleFiles);
        return false;
    }
    const bool rowUpdated = executeSqlPrepared(
        "UPDATE videos SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        {timestamp, videoId}) == 1;
    const bool wordsUpdated = rowUpdated && executeSqlPrepared(
        "UPDATE video_words SET deleted_at = ?1, updated_at = ?1 "
        "WHERE video_id = ?2 AND deleted_at IS NULL", {timestamp, videoId}) >= 0;
    const bool committed = wordsUpdated && executeSql("COMMIT;");
    if (!committed) {
        executeSql("ROLLBACK;");
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
    QString sql = QString("SELECT id, video_id, word, context, timestamp "
                          "FROM video_words WHERE video_id = '%1' AND deleted_at IS NULL "
                          "ORDER BY timestamp ASC").arg(escapeSql(videoId));
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::addVideoWord(const QString &videoId, const QString &word, const QString &context, double timestamp) {
    QString id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    QString ts = currentTimestamp();
    QString sql = QString("INSERT INTO video_words (id, video_id, word, context, timestamp, created_at, updated_at) "
                          "VALUES ('%1', '%2', '%3', '%4', %5, '%6', '%6')")
        .arg(id, escapeSql(videoId), escapeSql(word), escapeSql(context))
        .arg(timestamp).arg(ts);
    return executeSql(sql);
}

bool SynapseDataController::deleteVideoWord(const QString &wordId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE video_words SET deleted_at = '%1' WHERE id = '%2'")
        .arg(ts, escapeSql(wordId));
    return executeSql(sql);
}

