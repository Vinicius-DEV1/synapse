#include "synapse_controller.h"
#include "synapse_bridge.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>

QVariantList SynapseDataController::getVideos(const QString &collectionFilter) {
    if (!m_db) return {};
    const QByteArray filterBytes = collectionFilter.trimmed().toUtf8();
    char *raw = synapse_video_get_all(m_db, filterBytes.isEmpty() ? nullptr : filterBytes.constData());
    if (!raw) return {};
    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(raw));
    synapse_free_string(raw);
    return doc.array().toVariantList();
}

QVariantList SynapseDataController::getVideoCollections() {
    if (!m_db) return {};
    char *raw = synapse_video_get_collections(m_db);
    if (!raw) return {};
    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(raw));
    synapse_free_string(raw);
    return doc.array().toVariantList();
}
