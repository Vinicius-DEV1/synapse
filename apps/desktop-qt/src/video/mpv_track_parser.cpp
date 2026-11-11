#include "mpv_track_parser.h"

#include <QtCore/QVariantMap>

namespace {

const mpv_node *findValue(const mpv_node &map, const char *key) {
    if (map.format != MPV_FORMAT_NODE_MAP || !map.u.list) return nullptr;
    for (int i = 0; i < map.u.list->num; ++i) {
        if (qstrcmp(map.u.list->keys[i], key) == 0) return &map.u.list->values[i];
    }
    return nullptr;
}

QString stringValue(const mpv_node &map, const char *key) {
    const mpv_node *value = findValue(map, key);
    if (!value || value->format != MPV_FORMAT_STRING || !value->u.string) return {};
    return QString::fromUtf8(value->u.string);
}

bool boolValue(const mpv_node &map, const char *key) {
    const mpv_node *value = findValue(map, key);
    if (!value) return false;
    if (value->format == MPV_FORMAT_FLAG) return value->u.flag != 0;
    if (value->format == MPV_FORMAT_INT64) return value->u.int64 != 0;
    return false;
}

bool trackId(const mpv_node &map, qint64 *id) {
    const mpv_node *value = findValue(map, "id");
    if (!value) return false;
    if (value->format == MPV_FORMAT_INT64) {
        *id = value->u.int64;
        return true;
    }
    if (value->format == MPV_FORMAT_STRING && value->u.string) {
        bool valid = false;
        const qint64 parsed = QString::fromUtf8(value->u.string).toLongLong(&valid);
        if (valid) *id = parsed;
        return valid;
    }
    return false;
}

QVariantMap parseTrack(const mpv_node &track) {
    qint64 id = -1;
    if (!trackId(track, &id)) return {};

    QVariantMap result;
    result.insert(QStringLiteral("id"), id);
    result.insert(QStringLiteral("type"), stringValue(track, "type"));
    result.insert(QStringLiteral("title"), stringValue(track, "title"));
    result.insert(QStringLiteral("lang"), stringValue(track, "lang"));
    result.insert(QStringLiteral("codec"), stringValue(track, "codec"));
    result.insert(QStringLiteral("selected"), boolValue(track, "selected"));
    result.insert(QStringLiteral("default"), boolValue(track, "default"));
    result.insert(QStringLiteral("external"), boolValue(track, "external"));
    return result;
}

}

QVariantList parseMpvTrackList(const mpv_node &tracks, const QString &type) {
    QVariantList result;
    if (tracks.format != MPV_FORMAT_NODE_ARRAY || !tracks.u.list) return result;

    for (int i = 0; i < tracks.u.list->num; ++i) {
        const mpv_node &track = tracks.u.list->values[i];
        if (track.format != MPV_FORMAT_NODE_MAP || stringValue(track, "type") != type) continue;
        QVariantMap parsed = parseTrack(track);
        if (!parsed.isEmpty()) result.append(parsed);
    }
    return result;
}
