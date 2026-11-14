#include "synapse_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

// Native soft-delete restoration and cleanup delegated to synapse_trash_* domain APIs.

QVariantList SynapseDataController::getTrashItems() {
    if (!m_db) return {};
    char *jsonStr = synapse_trash_get_items(m_db);
    if (!jsonStr) return {};

    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);
    return doc.array().toVariantList();
}

bool SynapseDataController::restoreTrashItem(const QString &id, const QString &itemType) {
    if (!m_db || id.trimmed().isEmpty() || itemType.trimmed().isEmpty()) return false;
    const int ret = synapse_trash_restore_item(
        m_db,
        id.trimmed().toUtf8().constData(),
        itemType.trimmed().toUtf8().constData()
    );
    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::deleteTrashItemPermanently(const QString &id, const QString &itemType) {
    if (!m_db || id.trimmed().isEmpty() || itemType.trimmed().isEmpty()) return false;
    const int ret = synapse_trash_delete_permanently(
        m_db,
        id.trimmed().toUtf8().constData(),
        itemType.trimmed().toUtf8().constData()
    );
    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::emptyTrash() {
    if (!m_db) return false;
    const int ret = synapse_trash_empty(m_db);
    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}
