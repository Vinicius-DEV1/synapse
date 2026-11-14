#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QJsonParseError>
#include <QtCore/QMap>
#include <QtCore/QRegularExpression>
#include <QtCore/QSet>
#include <QtCore/QUrlQuery>
#include <QtGui/QClipboard>
#include <QtGui/QGuiApplication>

namespace {

bool isHostOrSubdomain(const QString &host, const QString &domain) {
    return host == domain || host.endsWith(QLatin1Char('.') + domain);
}

QString youtubeVideoId(const QString &host, const QString &path, const QUrlQuery &query) {
    if (host == "youtu.be") {
        QString id = path;
        if (id.startsWith('/')) id.remove(0, 1);
        return id.section('/', 0, 0);
    }
    if (!isHostOrSubdomain(host, "youtube.com")) return {};

    const QString queryId = query.queryItemValue("v", QUrl::FullyDecoded);
    if (!queryId.isEmpty()) return queryId;
    static const QRegularExpression pathId("/(?:embed|shorts|v|live)/([^/]+)", QRegularExpression::CaseInsensitiveOption);
    return pathId.match(path).captured(1);
}

QString canonicalLinkUrl(const QString &rawUrl) {
    if (rawUrl.isEmpty() || rawUrl.size() > 4096 || rawUrl != rawUrl.trimmed()) return {};

    const QUrl source(rawUrl, QUrl::StrictMode);
    const QString scheme = source.scheme().toLower();
    const QString host = source.host().toLower();
    if (!source.isValid() || host.isEmpty() || (scheme != "http" && scheme != "https")) return {};

    const QUrlQuery sourceQuery(source);
    const QString videoId = youtubeVideoId(host, source.path(QUrl::FullyEncoded), sourceQuery);
    if (QRegularExpression("^[A-Za-z0-9_-]{1,128}$").match(videoId).hasMatch()) {
        return "https://www.youtube.com/watch?v=" + videoId;
    }

    const QString playlistId = sourceQuery.queryItemValue("list", QUrl::FullyDecoded);
    if ((host == "youtu.be" || isHostOrSubdomain(host, "youtube.com")) &&
        QRegularExpression("^[A-Za-z0-9_-]{1,128}$").match(playlistId).hasMatch()) {
        return "https://www.youtube.com/playlist?list=" + playlistId;
    }

    if (isHostOrSubdomain(host, "vimeo.com")) {
        static const QRegularExpression vimeoPath(
            "^(?:/channels/(?:[^/]+/)?|/groups/[^/]+/videos/|/album/[^/]+/video/|/video/|/)?([0-9]+)(?:/.*)?$");
        const auto match = vimeoPath.match(source.path(QUrl::FullyDecoded));
        if (match.hasMatch()) return "https://vimeo.com/" + match.captured(1);
    }

    QString canonicalHost = host;
    if (canonicalHost.startsWith("www.")) canonicalHost.remove(0, 4);
    QString path = source.path(QUrl::FullyDecoded).replace(QRegularExpression("/{2,}"), "/");
    if (path == "/") path.clear();
    else if (path.size() > 1 && path.endsWith('/')) path.chop(1);

    static const QSet<QString> trackingParameters = {
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
        "utm_reader", "gclid", "dclid", "_ga", "_gl", "fbclid", "igshid", "msclkid",
        "mc_eid", "mc_cid", "yclid", "si", "ref", "ref_src", "source", "feature",
        "spm", "from", "ab_channel", "t", "time_continue"};
    QMap<QString, QStringList> parameters;
    for (const auto &item : sourceQuery.queryItems(QUrl::FullyDecoded)) {
        if (!trackingParameters.contains(item.first.toLower())) parameters[item.first].append(item.second);
    }

    QUrlQuery canonicalQuery;
    for (auto iterator = parameters.cbegin(); iterator != parameters.cend(); ++iterator) {
        for (const QString &value : iterator.value()) canonicalQuery.addQueryItem(iterator.key(), value);
    }

    QUrl canonical;
    canonical.setScheme("https");
    canonical.setHost(canonicalHost);
    canonical.setPath(path);
    if (!parameters.isEmpty()) canonical.setQuery(canonicalQuery);
    if (source.fragment(QUrl::FullyDecoded).startsWith("/"))
        canonical.setFragment(source.fragment(QUrl::FullyDecoded));
    return canonical.toString(QUrl::FullyEncoded);
}

QString nowIsoUtc() {
    return QDateTime::currentDateTimeUtc().toString(Qt::ISODateWithMs);
}

QJsonObject defaultLinkEntity(const QString &canonicalUrl, const QString &originalUrl) {
    QUrl parsed(canonicalUrl, QUrl::StrictMode);
    const QString now = nowIsoUtc();
    return {{"canonicalUrl", canonicalUrl}, {"originalUrl", originalUrl},
            {"title", QJsonValue::Null}, {"channel", QJsonValue::Null},
            {"domain", parsed.host().toLower()}, {"notes", ""}, {"color", "default"},
            {"watched", false}, {"watching", false}, {"scrapId", QJsonValue::Null},
            {"scrapStatus", QJsonValue::Null}, {"scrapLocalPath", QJsonValue::Null},
            {"scrapDriveFileId", QJsonValue::Null}, {"scrapFileSize", QJsonValue::Null},
            {"scrapCreatedAt", QJsonValue::Null}, {"aiSummary", QJsonValue::Null},
            {"aiSummaryCreatedAt", QJsonValue::Null}, {"aiSummaryModel", QJsonValue::Null},
            {"firstSeenAt", now}, {"lastReferencedAt", now}, {"orphanedAt", QJsonValue::Null}};
}

bool loadOrInitEntity(Database *db, const QString &canonicalUrl, const QString &url, QJsonObject *entity) {
    if (!entity) return false;
    *entity = defaultLinkEntity(canonicalUrl, url);
    if (!db) return true;
    char *raw = synapse_notes_get_link_entity(db, canonicalUrl.toUtf8().constData());
    if (raw) {
        QJsonParseError parseError;
        const QJsonDocument document = QJsonDocument::fromJson(QByteArray(raw), &parseError);
        synapse_free_string(raw);
        if (parseError.error == QJsonParseError::NoError && document.isObject()) {
            *entity = document.object();
            return true;
        }
        qWarning() << "[NotesLinkVault] Preserving malformed config row for" << canonicalUrl;
        return false;
    }
    return true;
}

bool persistEntity(Database *db, const QString &canonicalUrl, const QJsonObject &entity) {
    if (!db) return false;
    const QString payload = QString::fromUtf8(QJsonDocument(entity).toJson(QJsonDocument::Compact));
    return synapse_notes_save_link_entity(db, canonicalUrl.toUtf8().constData(), payload.toUtf8().constData()) >= 1;
}

}

QVariantMap SynapseDataController::getLinkEntity(const QString &url) {
    const QString canonicalUrl = canonicalLinkUrl(url);
    if (canonicalUrl.isEmpty() || !m_db) return {};
    char *raw = synapse_notes_get_link_entity(m_db, canonicalUrl.toUtf8().constData());
    if (!raw) return {};

    QJsonParseError parseError;
    const QJsonDocument document = QJsonDocument::fromJson(QByteArray(raw), &parseError);
    synapse_free_string(raw);
    if (parseError.error != QJsonParseError::NoError || !document.isObject()) {
        qWarning() << "[NotesLinkVault] Invalid link entity payload for" << canonicalUrl;
        return {};
    }
    return document.object().toVariantMap();
}

QVariantMap SynapseDataController::setLinkEntityStatus(const QString &url, bool watched, bool watching) {
    const QString canonicalUrl = canonicalLinkUrl(url);
    if (canonicalUrl.isEmpty() || (watched && watching)) {
        qWarning() << "[NotesLinkVault] Rejected invalid link status for" << url;
        return {{"success", false}};
    }

    QJsonObject entity;
    if (!loadOrInitEntity(m_db, canonicalUrl, url, &entity)) {
        return {{"success", false}};
    }

    const QString now = nowIsoUtc();
    entity.insert("canonicalUrl", canonicalUrl);
    if (entity.value("originalUrl").toString().isEmpty()) entity.insert("originalUrl", url);
    if (entity.value("domain").toString().isEmpty())
        entity.insert("domain", QUrl(canonicalUrl).host().toLower());
    if (entity.value("firstSeenAt").toString().isEmpty()) entity.insert("firstSeenAt", now);
    entity.insert("lastReferencedAt", now);
    entity.insert("orphanedAt", QJsonValue::Null);
    entity.insert("watched", watched);
    entity.insert("watching", watching);

    if (!persistEntity(m_db, canonicalUrl, entity)) return {{"success", false}};

    QVariantMap result = entity.toVariantMap();
    result.insert("success", true);
    return result;
}

QVariantMap SynapseDataController::setLinkEntityNotes(const QString &url, const QString &notes) {
    const QString canonicalUrl = canonicalLinkUrl(url);
    if (canonicalUrl.isEmpty()) {
        qWarning() << "[NotesLinkVault] Rejected notes for an invalid link URL" << url;
        return {{"success", false}};
    }

    QJsonObject entity;
    if (!loadOrInitEntity(m_db, canonicalUrl, url, &entity)) {
        return {{"success", false}};
    }

    const QString now = nowIsoUtc();
    entity.insert("canonicalUrl", canonicalUrl);
    if (entity.value("originalUrl").toString().isEmpty()) entity.insert("originalUrl", url);
    if (entity.value("domain").toString().isEmpty())
        entity.insert("domain", QUrl(canonicalUrl).host().toLower());
    if (entity.value("firstSeenAt").toString().isEmpty()) entity.insert("firstSeenAt", now);
    entity.insert("lastReferencedAt", now);
    entity.insert("orphanedAt", QJsonValue::Null);
    entity.insert("notes", notes);

    if (!persistEntity(m_db, canonicalUrl, entity)) return {{"success", false}};

    QVariantMap result = entity.toVariantMap();
    result.insert("success", true);
    return result;
}

QVariantMap SynapseDataController::setLinkEntityColor(const QString &url, const QString &color) {
    const QString canonicalUrl = canonicalLinkUrl(url);
    static const QRegularExpression hexColorPattern("^#[0-9A-Fa-f]{6}$");
    if (canonicalUrl.isEmpty() || (color != "default" && !hexColorPattern.match(color).hasMatch())) {
        qWarning() << "[NotesLinkVault] Rejected invalid link color for" << url;
        return {{"success", false}};
    }

    QJsonObject entity;
    if (!loadOrInitEntity(m_db, canonicalUrl, url, &entity)) {
        return {{"success", false}};
    }

    const QString now = nowIsoUtc();
    entity.insert("canonicalUrl", canonicalUrl);
    if (entity.value("originalUrl").toString().isEmpty()) entity.insert("originalUrl", url);
    if (entity.value("domain").toString().isEmpty())
        entity.insert("domain", QUrl(canonicalUrl).host().toLower());
    if (entity.value("firstSeenAt").toString().isEmpty()) entity.insert("firstSeenAt", now);
    entity.insert("lastReferencedAt", now);
    entity.insert("orphanedAt", QJsonValue::Null);
    entity.insert("color", color == "default" ? color : color.toUpper());

    if (!persistEntity(m_db, canonicalUrl, entity)) return {{"success", false}};

    QVariantMap result = entity.toVariantMap();
    result.insert("success", true);
    return result;
}

bool SynapseDataController::copyLinkUrlToClipboard(const QString &url) {
    if (canonicalLinkUrl(url).isEmpty()) {
        qWarning() << "[NotesLinkVault] Rejected unsafe clipboard URL" << url;
        return false;
    }
    QClipboard *clipboard = QGuiApplication::clipboard();
    if (!clipboard) {
        qWarning() << "[NotesLinkVault] Qt clipboard is unavailable for URL copy";
        return false;
    }
    clipboard->setText(url, QClipboard::Clipboard);
    return true;
}
