#include "video_subtitle_helpers.h"

#include <QtCore/QDir>
#include <QtCore/QFileInfo>
#include <QtCore/QMetaObject>

namespace VideoSubtitleHelpers {

QString canonicalManagedPath(const QString &path, const QString &appDirectory,
                             const QString &managedDirectory) {
    if (path.trimmed().isEmpty() || managedDirectory.isEmpty()) return {};
    const QFileInfo info(QDir::isAbsolutePath(path) ? path : QDir(appDirectory).filePath(path));
    const QString canonical = info.canonicalFilePath();
    const QString prefix = managedDirectory + QDir::separator();
#ifdef Q_OS_WIN
    constexpr Qt::CaseSensitivity pathCaseSensitivity = Qt::CaseInsensitive;
#else
    constexpr Qt::CaseSensitivity pathCaseSensitivity = Qt::CaseSensitive;
#endif
    return info.isFile() && canonical.startsWith(prefix, pathCaseSensitivity) ? canonical : QString();
}

bool invokeSubtitleLoad(QObject *player, const QString &path, const QString &key,
                        const QString &label, bool select) {
    if (!player || player->metaObject()->indexOfMethod(
            "addSubtitleTrack(QString,QString,QString,bool)") < 0) return false;
    bool loaded = false;
    const bool invoked = QMetaObject::invokeMethod(
        player, "addSubtitleTrack", Qt::DirectConnection, Q_RETURN_ARG(bool, loaded),
        Q_ARG(QString, path), Q_ARG(QString, key), Q_ARG(QString, label), Q_ARG(bool, select));
    return invoked && loaded;
}

}
