#include "synapse_controller.h"

#include <cmath>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRegularExpression>
#include <QtCore/QUrl>
#include <QtNetwork/QNetworkAccessManager>
#include <QtNetwork/QNetworkReply>
#include <QtNetwork/QNetworkRequest>

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
    if (!m_db || !isHttpUrl(url)) return {};
    const QByteArray urlBytes = url.trimmed().toUtf8();
    char *raw = synapse_notes_get_link_metadata(m_db, urlBytes.constData());
    if (!raw) return {};
    const QByteArray json(raw);
    synapse_free_string(raw);
    const QJsonDocument doc = QJsonDocument::fromJson(json);
    return doc.isObject() ? doc.object().toVariantMap() : QVariantMap();
}

bool SynapseDataController::saveLinkMetadata(const QVariantMap &entry) {
    if (!m_db) return false;
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

    QJsonObject obj;
    obj["url"] = url;
    if (!title.isEmpty()) obj["title"] = title;
    if (!channel.isEmpty()) obj["channel"] = channel;
    if (duration.isValid() && !duration.isNull()) obj["duration"] = duration.toDouble();
    if (playlist.isValid() && !playlist.isNull()) obj["isPlaylist"] = playlist.toBool();
    if (playlistCount.isValid() && !playlistCount.isNull()) obj["playlistCount"] = playlistCount.toInt();
    if (!uploadDateText.isEmpty()) obj["uploadDate"] = uploadDateText;
    if (!imageUrlText.isEmpty()) obj["imageUrl"] = imageUrlText;

    const QByteArray jsonBytes = QJsonDocument(obj).toJson(QJsonDocument::Compact);
    return synapse_notes_save_link_metadata(m_db, jsonBytes.constData()) == 1;
}

void SynapseDataController::captureWebScrap(const QString &url, const QString &requestId) {
    QString cleanUrl = url.trimmed();
    if (!cleanUrl.startsWith("http://", Qt::CaseInsensitive) &&
        !cleanUrl.startsWith("https://", Qt::CaseInsensitive)) {
        cleanUrl = QStringLiteral("https://") + cleanUrl;
    }
    if (!isHttpUrl(cleanUrl)) {
        QVariantMap err;
        err["status"] = "error";
        err["url"] = cleanUrl;
        err["error_reason"] = QStringLiteral("URL inválida.");
        emit webScrapCaptured(requestId, err);
        return;
    }

    auto *nam = new QNetworkAccessManager(this);
    QNetworkRequest req{QUrl(cleanUrl)};
    req.setHeader(QNetworkRequest::UserAgentHeader, QStringLiteral("Mozilla/5.0 SynapseDesktop/1.0"));
    req.setAttribute(QNetworkRequest::RedirectPolicyAttribute, QNetworkRequest::NoLessSafeRedirectPolicy);
    req.setTransferTimeout(15000);

    QNetworkReply *reply = nam->get(req);
    connect(reply, &QNetworkReply::finished, this, [this, nam, reply, requestId, cleanUrl]() {
        reply->deleteLater();
        nam->deleteLater();
        QVariantMap res;
        res["url"] = cleanUrl;
        if (reply->error() != QNetworkReply::NoError) {
            res["status"] = "error";
            res["error_reason"] = reply->errorString();
            emit webScrapCaptured(requestId, res);
            return;
        }
        const QByteArray rawBytes = reply->readAll();
        const QString html = QString::fromUtf8(rawBytes);
        QString title;
        const QRegularExpression titleRe(QStringLiteral("<title[^>]*>([\\s\\S]*?)</title>"),
                                         QRegularExpression::CaseInsensitiveOption);
        const QRegularExpressionMatch tm = titleRe.match(html);
        if (tm.hasMatch()) title = tm.captured(1).simplified();
        if (title.isEmpty()) title = QUrl(cleanUrl).host();

        QString bodyText = html;
        bodyText.remove(QRegularExpression(QStringLiteral("<(script|style|noscript)[^>]*>[\\s\\S]*?</\\1>"),
                                           QRegularExpression::CaseInsensitiveOption));
        bodyText.remove(QRegularExpression(QStringLiteral("<[^>]+>")));
        bodyText = bodyText.simplified().left(4000);

        res["status"] = "ready";
        res["title"] = title;
        res["file_size"] = rawBytes.size();
        res["excerpt"] = QStringLiteral("<p>%1</p>").arg(bodyText.toHtmlEscaped());
        emit webScrapCaptured(requestId, res);
    });
}
