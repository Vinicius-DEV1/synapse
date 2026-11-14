#include "synapse_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

// Native file metadata, duplication, deletion, and page links delegated to synapse_files_* domain APIs.

bool SynapseDataController::renameFile(const QString &fileId, const QString &name) {
    if (!m_db || fileId.trimmed().isEmpty() || name.trimmed().isEmpty()) return false;
    const int ret = synapse_files_rename_file(
        m_db,
        fileId.trimmed().toUtf8().constData(),
        name.trimmed().toUtf8().constData()
    );
    if (ret == 1) {
        emit filesChanged();
        return true;
    }
    return false;
}

bool SynapseDataController::moveFile(const QString &fileId, const QString &folderId) {
    if (!m_db || fileId.trimmed().isEmpty()) return false;
    const QByteArray folBytes = folderId.trimmed().toUtf8();
    const char *folPtr = folBytes.isEmpty() ? nullptr : folBytes.constData();

    const int ret = synapse_files_move_file(
        m_db,
        fileId.trimmed().toUtf8().constData(),
        folPtr
    );
    if (ret == 1) {
        emit filesChanged();
        return true;
    }
    return false;
}

QString SynapseDataController::duplicateFile(const QString &fileId, const QString &folderId) {
    if (!m_db || fileId.trimmed().isEmpty()) return QString();
    const QByteArray folBytes = folderId.trimmed().toUtf8();
    const char *folPtr = folBytes.isEmpty() ? nullptr : folBytes.constData();

    char *newId = synapse_files_duplicate_file(
        m_db,
        fileId.trimmed().toUtf8().constData(),
        folPtr
    );
    if (!newId) return QString();
    const QString result = QString::fromUtf8(newId);
    synapse_free_string(newId);
    emit filesChanged();
    return result;
}

QVariantList SynapseDataController::duplicateFiles(const QVariantList &fileIds, const QString &folderId) {
    QVariantList newIds;
    for (const QVariant &value : fileIds) {
        const QString fid = value.toString();
        const QString newId = duplicateFile(fid, folderId);
        if (!newId.isEmpty()) {
            newIds.append(newId);
        }
    }
    return newIds;
}

bool SynapseDataController::deleteFile(const QString &fileId) {
    if (!m_db || fileId.trimmed().isEmpty()) return false;
    const int ret = synapse_files_delete_file(m_db, fileId.trimmed().toUtf8().constData());
    if (ret == 1) {
        emit filesChanged();
        return true;
    }
    return false;
}

QVariantList SynapseDataController::getFileLinksByFile(const QString &fileId) {
    if (!m_db || fileId.trimmed().isEmpty()) return {};
    char *jsonStr = synapse_files_get_linked_pages(m_db, fileId.trimmed().toUtf8().constData());
    if (!jsonStr) return {};

    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);

    QVariantList list;
    for (const QJsonValue &val : doc.array()) {
        QVariantMap link;
        link["page_id"] = val.toString();
        list.append(link);
    }
    return list;
}

QVariantList SynapseDataController::getFileLinksByPage(const QString &pageId) {
    if (!m_db || pageId.trimmed().isEmpty()) return {};
    return {};
}

QString SynapseDataController::createFilePageLink(const QString &fileId, const QString &pageId,
                                                  const QString &linkType, const QString &widgetId) {
    Q_UNUSED(linkType);
    Q_UNUSED(widgetId);
    if (!m_db || fileId.trimmed().isEmpty() || pageId.trimmed().isEmpty()) return QString();
    const int ret = synapse_files_link_to_page(
        m_db,
        fileId.trimmed().toUtf8().constData(),
        pageId.trimmed().toUtf8().constData()
    );
    if (ret == 1) {
        emit filesChanged();
        return QStringLiteral("linked");
    }
    return QString();
}

bool SynapseDataController::deleteFilePageLink(const QString &linkId) {
    Q_UNUSED(linkId);
    return false;
}
