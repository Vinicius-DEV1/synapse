#include "synapse_controller.h"
#include "synapse_bridge.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

QVariantList SynapseDataController::getVideoFolders() {
    if (!m_db) return {};
    char *raw = synapse_video_get_folders(m_db);
    if (!raw) return {};
    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(raw));
    synapse_free_string(raw);
    return doc.array().toVariantList();
}

bool SynapseDataController::saveVideoFolders(const QVariantList &folders) {
    if (!m_db) return false;
    const QByteArray json = QJsonDocument(QJsonArray::fromVariantList(folders))
                                .toJson(QJsonDocument::Compact);
    return synapse_video_save_folders(m_db, json.constData()) == 1;
}

QVariantMap SynapseDataController::createVideoFolder(const QString &name) {
    if (!m_db) return {};
    const QByteArray nameBytes = name.trimmed().toUtf8();
    if (nameBytes.isEmpty()) return {};
    char *raw = synapse_video_create_folder(m_db, nameBytes.constData());
    if (!raw) return {};
    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(raw));
    synapse_free_string(raw);
    return doc.object().toVariantMap();
}

bool SynapseDataController::renameVideoFolder(const QString &folderId, const QString &name) {
    if (!m_db) return false;
    const QByteArray idBytes = folderId.trimmed().toUtf8();
    const QByteArray nameBytes = name.trimmed().toUtf8();
    if (idBytes.isEmpty() || nameBytes.isEmpty()) return false;
    return synapse_video_rename_folder(m_db, idBytes.constData(), nameBytes.constData()) == 1;
}

bool SynapseDataController::deleteVideoFolder(const QString &folderId) {
    if (!m_db) return false;
    const QByteArray idBytes = folderId.trimmed().toUtf8();
    if (idBytes.isEmpty()) return false;
    return synapse_video_delete_folder(m_db, idBytes.constData()) == 1;
}

bool SynapseDataController::moveVideoToFolder(const QString &videoId, const QString &folderId) {
    if (!m_db) return false;
    const QByteArray vidBytes = videoId.trimmed().toUtf8();
    const QByteArray fidBytes = folderId.trimmed().toUtf8();
    if (vidBytes.isEmpty()) return false;
    return synapse_video_move_to_folder(
        m_db, vidBytes.constData(), fidBytes.isEmpty() ? nullptr : fidBytes.constData()) == 1;
}
