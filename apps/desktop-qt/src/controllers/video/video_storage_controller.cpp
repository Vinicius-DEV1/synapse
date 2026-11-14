#include "synapse_controller.h"
#include "synapse_bridge.h"

#include <QtCore/QDir>
#include <QtCore/QFileInfo>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtGui/QDesktopServices>

namespace {

QVariantMap trackStorageSizes(const QString &serializedTracks, const QString &appDirectory, qint64 *totalBytes) {
    QVariantMap sizes;
    QJsonParseError parseError;
    const QJsonDocument document = QJsonDocument::fromJson(serializedTracks.toUtf8(), &parseError);
    if (parseError.error != QJsonParseError::NoError || !document.isArray()) return sizes;

    const QJsonArray tracks = document.array();
    for (const QJsonValue &value : tracks) {
        const QJsonObject track = value.toObject();
        const QString path = track.value("local_path").toString();
        if (path.isEmpty()) continue;
        QFileInfo fileInfo(path);
        if (fileInfo.isRelative()) fileInfo.setFile(QDir(appDirectory).filePath(path));
        if (!fileInfo.exists() || !fileInfo.isFile()) continue;
        const qint64 size = fileInfo.size();
        sizes.insert(fileInfo.fileName(), size);
        *totalBytes += size;
    }
    return sizes;
}

}

QVariantMap SynapseDataController::getVideoStorageStats(const QString &videoId) {
    if (!m_db) return {};
    const QByteArray vidBytes = videoId.trimmed().toUtf8();
    char *raw = synapse_video_get_one(m_db, vidBytes.constData());
    if (!raw) return {};

    const QJsonObject video = QJsonDocument::fromJson(QByteArray(raw)).object();
    synapse_free_string(raw);

    const QString videoPath = video.value("file_path").toString();
    QFileInfo videoInfo(videoPath);
    if (videoInfo.isRelative()) videoInfo.setFile(QDir(QFileInfo(m_dbPath).absolutePath()).filePath(videoPath));

    qint64 totalLocalSize = 0;
    const bool videoExists = videoInfo.exists() && videoInfo.isFile();
    const qint64 videoSize = videoExists ? videoInfo.size() : 0;
    if (videoExists && video.value("is_local").toInt() != 0) totalLocalSize += videoSize;

    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QVariantMap audioSizes = trackStorageSizes(
        video.value("audio_tracks_json").toString(), appDirectory, &totalLocalSize);
    const QVariantMap subtitleSizes = trackStorageSizes(
        video.value("subtitles_json").toString(), appDirectory, &totalLocalSize);

    return {
        {"original_path", videoExists ? videoInfo.absoluteFilePath() : QString()},
        {"original_size", videoSize},
        {"audio_sizes", audioSizes},
        {"subtitle_sizes", subtitleSizes},
        {"total_local_size", totalLocalSize}
    };
}

bool SynapseDataController::openVideoInFolder(const QString &videoId) {
    if (!m_db) return false;
    const QByteArray vidBytes = videoId.trimmed().toUtf8();
    char *raw = synapse_video_get_one(m_db, vidBytes.constData());
    if (!raw) return false;

    const QJsonObject video = QJsonDocument::fromJson(QByteArray(raw)).object();
    synapse_free_string(raw);

    if (video.value("is_local").toInt() == 0) return false;
    const QString path = video.value("file_path").toString();
    if (path.trimmed().isEmpty()) return false;

    QFileInfo fileInfo(path);
    if (fileInfo.isRelative()) fileInfo.setFile(QDir(QFileInfo(m_dbPath).absolutePath()).filePath(path));
    if (!fileInfo.exists() || !fileInfo.isFile()) return false;

    return QDesktopServices::openUrl(QUrl::fromLocalFile(fileInfo.absolutePath()));
}
