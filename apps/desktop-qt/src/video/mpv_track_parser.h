#ifndef MPV_TRACK_PARSER_H
#define MPV_TRACK_PARSER_H

#include <QtCore/QString>
#include <QtCore/QVariantList>
#include <mpv/client.h>

QVariantList parseMpvTrackList(const mpv_node &tracks, const QString &type);

#endif
