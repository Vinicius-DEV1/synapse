#include "synapse_controller.h"
#include "synapse_bridge.h"
#include "video_subtitle_helpers.h"

#include <QtCore/QDebug>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>

bool SynapseDataController::renameVideoSubtitle(const QString &videoId, const QString &trackId,
                                                const QString &label) {
    if (!m_db) return false;
    const QByteArray vidBytes = videoId.trimmed().toUtf8();
    const QByteArray tidBytes = trackId.trimmed().toUtf8();
    const QByteArray lblBytes = label.trimmed().toUtf8();
    if (vidBytes.isEmpty() || tidBytes.isEmpty() || lblBytes.isEmpty() || lblBytes.size() > 120) return false;
    return synapse_video_rename_subtitle(m_db, vidBytes.constData(), tidBytes.constData(), lblBytes.constData()) == 1;
}

bool SynapseDataController::removeVideoSubtitle(const QString &videoId, const QString &trackId) {
    if (!m_db) return false;
    const QByteArray vidBytes = videoId.trimmed().toUtf8();
    const QByteArray tidBytes = trackId.trimmed().toUtf8();
    if (vidBytes.isEmpty() || tidBytes.isEmpty()) return false;

    char *rawPath = synapse_video_remove_subtitle(m_db, vidBytes.constData(), tidBytes.constData());
    if (!rawPath) return false;
    const QString pathToRemove = QString::fromUtf8(rawPath);
    synapse_free_string(rawPath);

    if (pathToRemove.isEmpty()) return true;

    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QString managedDirectory = QFileInfo(QDir(appDirectory).filePath("videos")).canonicalFilePath();
    const QString canonicalPath = VideoSubtitleHelpers::canonicalManagedPath(
        pathToRemove, appDirectory, managedDirectory);
    if (!canonicalPath.isEmpty()) {
        QFile::remove(canonicalPath);
    }
    return true;
}
