#include "synapse_controller.h"

#include <cmath>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonObject>
#include <QtCore/QUrl>

namespace {

bool isHttpUrl(const QString &value) {
    if (value.isEmpty() || value.size() > 4096 || value != value.trimmed()) return false;
    const QUrl url(value, QUrl::StrictMode);
    const QString scheme = url.scheme().toLower();
    return url.isValid() && !url.host().isEmpty() && (scheme == "http" || scheme == "https");
}

QVariant firstValue(const QVariantMap &entry, const QString &primary, const QString &fallback) {
    return entry.contains(primary) ? entry.value(primary) : entry.value(fallback);
}

bool optionalText(const QVariant &value, qsizetype maximumLength) {
    return value.isNull() || value.toString().size() <= maximumLength;
}

bool optionalNonNegativeNumber(const QVariant &value, double maximum, bool integerOnly) {
    if (!value.isValid() || value.isNull()) return true;
    bool converted = false;
    const double number = value.toDouble(&converted);
    return converted && std::isfinite(number) && number >= 0.0 && number <= maximum &&
        (!integerOnly || std::floor(number) == number);
}

}

QVariantMap SynapseDataController::getLinkMetadata(const QString &url) {
    if (!isHttpUrl(url)) return {};
    const QJsonArray rows = executeQueryPrepared(
        "SELECT url, title, channel, duration, is_playlist AS isPlaylist, "
        "playlist_count AS playlistCount, upload_date AS uploadDate, image_url AS imageUrl "
        "FROM link_metadata_cache WHERE url = ?1 AND deleted_at IS NULL LIMIT 1",
        {url});
    return rows.isEmpty() ? QVariantMap() : rows.first().toObject().toVariantMap();
}

bool SynapseDataController::saveLinkMetadata(const QVariantMap &entry) {
    const QString url = entry.value("url").toString();
    const QVariant duration = entry.value("duration");
    const QVariant playlistCount = firstValue(entry, "playlistCount", "playlist_count");
    const QVariant uploadDate = firstValue(entry, "uploadDate", "upload_date");
    const QVariant imageUrl = firstValue(entry, "imageUrl", "image_url");
    const QVariant playlist = firstValue(entry, "isPlaylist", "is_playlist");
    const QString title = entry.value("title").toString();
    const QString channel = entry.value("channel").toString();
    const QString uploadDateText = uploadDate.toString();
    const QString imageUrlText = imageUrl.toString();

    if (!isHttpUrl(url) || (title.isEmpty() && channel.isEmpty()) || title.size() > 512 || channel.size() > 512 ||
        !optionalNonNegativeNumber(duration, 1'000'000'000.0, false) ||
        !optionalNonNegativeNumber(playlistCount, 1'000'000'000.0, true) ||
        !optionalText(uploadDate, 64) || !optionalText(imageUrl, 4096) ||
        (!imageUrlText.isEmpty() && !isHttpUrl(imageUrlText)) ||
        (!playlist.isNull() && playlist.isValid() && playlist.metaType().id() != QMetaType::Bool)) {
        qWarning() << "[NotesLinkMetadata] Rejected invalid cache entry for URL" << url;
        return false;
    }

    const int changedRows = executeSqlPrepared(
        "INSERT INTO link_metadata_cache "
        "(url, title, channel, duration, is_playlist, playlist_count, upload_date, image_url, updated_at, deleted_at) "
        "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL) "
        "ON CONFLICT(url) DO UPDATE SET title = excluded.title, channel = excluded.channel, "
        "duration = excluded.duration, is_playlist = excluded.is_playlist, "
        "playlist_count = excluded.playlist_count, upload_date = excluded.upload_date, "
        "image_url = excluded.image_url, updated_at = excluded.updated_at, deleted_at = NULL",
        {url, title.isEmpty() ? QVariant() : QVariant(title), channel.isEmpty() ? QVariant() : QVariant(channel),
         duration, playlist.isNull() ? QVariant(false) : playlist,
         playlistCount, uploadDateText.isEmpty() ? QVariant() : QVariant(uploadDateText),
         imageUrlText.isEmpty() ? QVariant() : QVariant(imageUrlText), currentTimestamp()});
    return changedRows == 1;
}
