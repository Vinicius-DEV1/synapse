#ifndef VIDEO_SUBTITLE_FORMAT_H
#define VIDEO_SUBTITLE_FORMAT_H

#include <QtCore/QByteArray>

QByteArray convertSubtitleToWebVtt(const QByteArray &source, bool *valid);

#endif
