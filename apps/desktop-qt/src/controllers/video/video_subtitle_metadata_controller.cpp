#include "synapse_controller.h"
#include "video_subtitle_helpers.h"

#include <QtCore/QDebug>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QSet>

namespace {

QJsonArray parseSubtitleMetadata(const QString &serialized, bool *valid) {
    *valid = true;
    if (serialized.trimmed().isEmpty()) return {};
    QJsonParseError parseError;
    const QJsonDocument document = QJsonDocument::fromJson(serialized.toUtf8(), &parseError);
    *valid = parseError.error == QJsonParseError::NoError && document.isArray();
    return *valid ? document.array() : QJsonArray();
}

}

bool SynapseDataController::renameVideoSubtitle(const QString &videoId, const QString &trackId,
                                                const QString &label) {
    const QString normalizedVideoId = videoId.trimmed();
    const QString normalizedTrackId = trackId.trimmed();
    const QString normalizedLabel = label.trimmed();
    if (normalizedVideoId.isEmpty() || normalizedTrackId.isEmpty() ||
        normalizedLabel.isEmpty() || normalizedLabel.size() > 120 || !executeSql("BEGIN IMMEDIATE;")) return false;

    const QJsonArray rows = executeQueryPrepared(
        "SELECT subtitles_json, local_subtitle_path FROM videos WHERE id = ?1 AND deleted_at IS NULL",
        {normalizedVideoId});
    if (rows.isEmpty()) {
        executeSql("ROLLBACK;");
        return false;
    }
    const QJsonObject video = rows.first().toObject();
    bool valid = false;
    QJsonArray tracks = parseSubtitleMetadata(video.value("subtitles_json").toString(), &valid);
    if (!valid) {
        qWarning() << "[SynapseDataController] Refusing to rename a subtitle with invalid metadata.";
        executeSql("ROLLBACK;");
        return false;
    }

    bool found = false;
    for (qsizetype index = 0; index < tracks.size(); ++index) {
        QJsonObject track = tracks.at(index).toObject();
        if (track.value("id").toString() != normalizedTrackId) continue;
        track.insert(QStringLiteral("label"), normalizedLabel);
        tracks.replace(index, track);
        found = true;
        break;
    }
    if (!found && normalizedTrackId == QStringLiteral("legacy")) {
        const QString legacyPath = video.value("local_subtitle_path").toString();
        if (!legacyPath.isEmpty()) {
            tracks.append(QJsonObject{{"id", "legacy"}, {"label", normalizedLabel}, {"local_path", legacyPath}});
            found = true;
        }
    }
    if (!found) {
        executeSql("ROLLBACK;");
        return false;
    }

    const int updatedRows = executeSqlPrepared(
        "UPDATE videos SET subtitles_json = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        {QString::fromUtf8(QJsonDocument(tracks).toJson(QJsonDocument::Compact)),
         currentTimestamp(), normalizedVideoId});
    if (updatedRows == 1 && executeSql("COMMIT;")) return true;
    executeSql("ROLLBACK;");
    return false;
}

bool SynapseDataController::removeVideoSubtitle(const QString &videoId, const QString &trackId) {
    const QString normalizedVideoId = videoId.trimmed();
    const QString normalizedTrackId = trackId.trimmed();
    if (normalizedVideoId.isEmpty() || normalizedTrackId.isEmpty() || !executeSql("BEGIN IMMEDIATE;")) return false;

    const QJsonArray rows = executeQueryPrepared(
        "SELECT subtitles_json, local_subtitle_path FROM videos WHERE id = ?1 AND deleted_at IS NULL",
        {normalizedVideoId});
    if (rows.isEmpty()) {
        executeSql("ROLLBACK;");
        return false;
    }
    const QJsonObject video = rows.first().toObject();
    bool valid = false;
    QJsonArray tracks = parseSubtitleMetadata(video.value("subtitles_json").toString(), &valid);
    if (!valid) {
        qWarning() << "[SynapseDataController] Refusing to remove a subtitle with invalid metadata.";
        executeSql("ROLLBACK;");
        return false;
    }

    QString pathToRemove;
    bool found = false;
    for (qsizetype index = 0; index < tracks.size(); ++index) {
        const QJsonObject track = tracks.at(index).toObject();
        if (track.value("id").toString() != normalizedTrackId) continue;
        pathToRemove = track.value("local_path").toString();
        tracks.removeAt(index);
        found = true;
        break;
    }

    QString legacyPath = video.value("local_subtitle_path").toString();
    const bool removeLegacy = normalizedTrackId == QStringLiteral("legacy");
    if (removeLegacy) {
        if (pathToRemove.isEmpty()) pathToRemove = legacyPath;
        legacyPath.clear();
        found = !pathToRemove.isEmpty() || !video.value("local_subtitle_path").toString().isEmpty() || found;
        for (qsizetype index = tracks.size() - 1; index >= 0; --index) {
            if (tracks.at(index).toObject().value("id").toString() == normalizedTrackId) tracks.removeAt(index);
        }
    }
    if (!found) {
        executeSql("ROLLBACK;");
        return false;
    }

    QVector<QPair<QString, QString>> stagedFiles;
    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QString managedDirectory = QFileInfo(QDir(appDirectory).filePath("videos")).canonicalFilePath();
    const QString canonicalPath = VideoSubtitleHelpers::canonicalManagedPath(
        pathToRemove, appDirectory, managedDirectory);
    if (!pathToRemove.isEmpty() && canonicalPath.isEmpty()) {
        const QString candidate = QDir::isAbsolutePath(pathToRemove)
            ? pathToRemove : QDir(appDirectory).filePath(pathToRemove);
        if (QFileInfo::exists(candidate)) {
            qWarning() << "[SynapseDataController] Refusing to remove a subtitle outside managed media storage.";
            executeSql("ROLLBACK;");
            return false;
        }
    }
    if (!canonicalPath.isEmpty()) {
        const QString stagedPath = canonicalPath + ".deleted-" + generateUuid();
        if (!QFile::rename(canonicalPath, stagedPath)) {
            executeSql("ROLLBACK;");
            return false;
        }
        stagedFiles.append(qMakePair(canonicalPath, stagedPath));
    }

    const QVariant legacyValue = removeLegacy ? QVariant() : QVariant(legacyPath);
    const int updatedRows = executeSqlPrepared(
        "UPDATE videos SET subtitles_json = ?1, local_subtitle_path = ?2, updated_at = ?3 "
        "WHERE id = ?4 AND deleted_at IS NULL",
        {QString::fromUtf8(QJsonDocument(tracks).toJson(QJsonDocument::Compact)), legacyValue,
         currentTimestamp(), normalizedVideoId});
    if (updatedRows == 1 && executeSql("COMMIT;")) {
        removeStagedVideoSubtitleFiles(stagedFiles);
        return true;
    }

    executeSql("ROLLBACK;");
    restoreStagedVideoSubtitleFiles(stagedFiles);
    return false;
}
