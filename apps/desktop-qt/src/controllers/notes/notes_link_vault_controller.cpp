#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QJsonParseError>
#include <QtCore/QRegularExpression>
#include <QtCore/QUrl>
#include <QtGui/QClipboard>
#include <QtGui/QGuiApplication>

namespace {

QString coreCanonicalLinkUrl(const QString &rawUrl) {
    const QByteArray bytes = rawUrl.toUtf8();
    char *raw = synapse_notes_canonical_link_url(bytes.constData());
    if (!raw) return {};
    const QString result = QString::fromUtf8(raw);
    synapse_free_string(raw);
    return result;
}

QJsonObject coreDefaultLinkEntity(const QString &canonicalUrl, const QString &originalUrl) {
    const QByteArray canonBytes = canonicalUrl.toUtf8();
    const QByteArray origBytes = originalUrl.toUtf8();
    char *raw = synapse_notes_default_link_entity(canonBytes.constData(), origBytes.constData());
    if (!raw) return {};
    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(raw));
    synapse_free_string(raw);
    return doc.isObject() ? doc.object() : QJsonObject{};
}

QString nowIsoUtc() {
    return QDateTime::currentDateTimeUtc().toString(Qt::ISODateWithMs);
}

bool loadOrInitEntity(Database *db, const QString &canonicalUrl, const QString &url, QJsonObject *entity) {
    if (!entity) return false;
    *entity = coreDefaultLinkEntity(canonicalUrl, url);
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

} // namespace

QString SynapseDataController::canonicalLinkUrl(const QString &rawUrl) {
    return coreCanonicalLinkUrl(rawUrl);
}

QVariantMap SynapseDataController::getLinkEntity(const QString &url) {
    const QString canonicalUrl = coreCanonicalLinkUrl(url);
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
    const QString canonicalUrl = coreCanonicalLinkUrl(url);
    if (canonicalUrl.isEmpty() || (watched && watching)) {
        qWarning() << "[NotesLinkVault] Rejected invalid link status for" << url;
        return {{"success", false}};
    }

    QJsonObject entity;
    if (!loadOrInitEntity(m_db, canonicalUrl, url, &entity)) return {{"success", false}};

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
    const QString canonicalUrl = coreCanonicalLinkUrl(url);
    if (canonicalUrl.isEmpty()) return {{"success", false}};

    QJsonObject entity;
    if (!loadOrInitEntity(m_db, canonicalUrl, url, &entity)) return {{"success", false}};

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
    const QString canonicalUrl = coreCanonicalLinkUrl(url);
    static const QRegularExpression hexColorPattern("^#[0-9A-Fa-f]{6}$");
    if (canonicalUrl.isEmpty() || (color != "default" && !hexColorPattern.match(color).hasMatch())) {
        return {{"success", false}};
    }

    QJsonObject entity;
    if (!loadOrInitEntity(m_db, canonicalUrl, url, &entity)) return {{"success", false}};

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
    if (coreCanonicalLinkUrl(url).isEmpty()) return false;
    QClipboard *clipboard = QGuiApplication::clipboard();
    if (!clipboard) return false;
    clipboard->setText(url, QClipboard::Clipboard);
    return true;
}
