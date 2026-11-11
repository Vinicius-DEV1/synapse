#ifndef VIDEO_SUBTITLE_HELPERS_H
#define VIDEO_SUBTITLE_HELPERS_H

#include <QtCore/QString>

class QObject;

namespace VideoSubtitleHelpers {

QString canonicalManagedPath(const QString &path, const QString &appDirectory,
                             const QString &managedDirectory);
bool invokeSubtitleLoad(QObject *player, const QString &path, const QString &key,
                        const QString &label, bool select);

}

#endif
