#include "synapse_controller.h"
#include "video_subtitle_helpers.h"

#include <QtCore/QDebug>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QSet>

bool SynapseDataController::loadVideoSubtitles(QObject *player, const QString &videoId) {
    if (!player || videoId.isEmpty()) return false;
    const QJsonArray rows = executeQueryPrepared(
        "SELECT subtitles_json, local_subtitle_path FROM videos WHERE id = ?1 AND deleted_at IS NULL",
        {videoId});
    if (rows.isEmpty()) return false;

    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QString managedVideosDirectory = QFileInfo(appDirectory + "/videos").canonicalFilePath();
    if (managedVideosDirectory.isEmpty()) return false;
    if (m_isVaultConfigured && (!m_isVaultUnlocked || m_unlockedKeys.value("culture").isEmpty())) return false;
    QString key = m_isVaultConfigured ? m_unlockedKeys.value("culture") : QString();
    const auto clearKey = [&key]() { key.fill(QChar(0)); };

    QJsonArray tracks;
    const QString serialized = rows.first().toObject().value("subtitles_json").toString();
    if (!serialized.trimmed().isEmpty()) {
        QJsonParseError parseError;
        const QJsonDocument document = QJsonDocument::fromJson(serialized.toUtf8(), &parseError);
        if (parseError.error != QJsonParseError::NoError || !document.isArray()) {
            qWarning() << "[SynapseDataController] Stored video subtitle metadata is invalid.";
            clearKey();
            return false;
        }
        tracks = document.array();
    }

    const QString legacyPath = rows.first().toObject().value("local_subtitle_path").toString();
    if (!legacyPath.isEmpty()) tracks.append(QJsonObject{{"label", "Subtitle"}, {"local_path", legacyPath}});

    QSet<QString> loadedPaths;
    bool selectNextTrack = true;
    bool success = true;
    for (const QJsonValue &value : tracks) {
        const QJsonObject track = value.toObject();
        const QString path = VideoSubtitleHelpers::canonicalManagedPath(
            track.value("local_path").toString(), appDirectory, managedVideosDirectory);
        if (path.isEmpty() || loadedPaths.contains(path)) continue;
        loadedPaths.insert(path);

        QFile file(path);
        if (!file.open(QIODevice::ReadOnly)) {
            qWarning() << "[SynapseDataController] A managed subtitle file could not be opened.";
            success = false;
            continue;
        }
        const bool encrypted = file.read(4) == QByteArrayLiteral("ENC1");
        file.close();
        if (encrypted && key.isEmpty()) {
            qWarning() << "[SynapseDataController] The encrypted subtitle key is unavailable.";
            success = false;
            continue;
        }

        QString label = track.value("label").toString().trimmed();
        if (label.isEmpty()) label = QFileInfo(path).completeBaseName();
        const bool loaded = VideoSubtitleHelpers::invokeSubtitleLoad(
            player, path, encrypted ? key : QString(), label, selectNextTrack);
        if (!loaded) {
            qWarning() << "[SynapseDataController] The native player rejected a subtitle track.";
            success = false;
        } else {
            selectNextTrack = false;
        }
    }
    clearKey();
    return success;
}

bool SynapseDataController::stageVideoSubtitleFiles(
    const QString &videoId, const QString &managedVideosDirectory,
    QVector<QPair<QString, QString>> &stagedFiles) {
    if (managedVideosDirectory.isEmpty()) return false;
    const QJsonArray rows = executeQueryPrepared(
        "SELECT subtitles_json, local_subtitle_path FROM videos WHERE id = ?1 AND deleted_at IS NULL",
        {videoId});
    if (rows.isEmpty()) return false;
    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QJsonObject video = rows.first().toObject();
    QJsonArray tracks;
    const QString serialized = video.value("subtitles_json").toString();
    if (!serialized.trimmed().isEmpty()) {
        QJsonParseError parseError;
        const QJsonDocument document = QJsonDocument::fromJson(serialized.toUtf8(), &parseError);
        if (parseError.error != QJsonParseError::NoError || !document.isArray()) return false;
        tracks = document.array();
    }
    const QString legacyPath = video.value("local_subtitle_path").toString();
    if (!legacyPath.isEmpty()) tracks.append(QJsonObject{{"local_path", legacyPath}});

    QSet<QString> canonicalPaths;
    for (const QJsonValue &value : tracks) {
        const QString path = VideoSubtitleHelpers::canonicalManagedPath(
            value.toObject().value("local_path").toString(), appDirectory, managedVideosDirectory);
        if (path.isEmpty() || canonicalPaths.contains(path)) continue;
        canonicalPaths.insert(path);
        const QString staged = path + ".deleted-" + generateUuid();
        if (!QFile::rename(path, staged)) {
            restoreStagedVideoSubtitleFiles(stagedFiles);
            stagedFiles.clear();
            return false;
        }
        stagedFiles.append(qMakePair(path, staged));
    }
    return true;
}

void SynapseDataController::restoreStagedVideoSubtitleFiles(
    const QVector<QPair<QString, QString>> &stagedFiles) {
    for (auto it = stagedFiles.crbegin(); it != stagedFiles.crend(); ++it) {
        if (!QFile::rename(it->second, it->first)) {
            qWarning() << "[SynapseDataController] Failed to restore a staged subtitle file.";
        }
    }
}

void SynapseDataController::removeStagedVideoSubtitleFiles(
    const QVector<QPair<QString, QString>> &stagedFiles) {
    for (const auto &staged : stagedFiles) {
        if (!QFile::remove(staged.second) && QFile::exists(staged.second)) {
            qWarning() << "[SynapseDataController] Failed to remove a deleted subtitle file.";
        }
    }
}
