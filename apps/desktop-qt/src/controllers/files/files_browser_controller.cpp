#include "synapse_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

// Native file collections, folders, selection moves, and trash operations delegated to synapse_files_* domain APIs.

QVariantList SynapseDataController::getFiles(const QString &folderId) {
    return getFilesForSection("folders", folderId);
}

QVariantList SynapseDataController::getFilesForSection(const QString &section, const QString &folderId) {
    if (!m_db) return {};

    const QByteArray secBytes = section.trimmed().toUtf8();
    const QByteArray folBytes = folderId.trimmed().toUtf8();
    const char *secPtr = secBytes.isEmpty() ? nullptr : secBytes.constData();
    const char *folPtr = folBytes.isEmpty() ? nullptr : folBytes.constData();

    char *jsonStr = synapse_files_get_for_section(m_db, secPtr, folPtr);
    if (!jsonStr) return {};

    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);

    const QJsonArray rows = doc.array();
    QVariantList files;
    const bool canDecrypt = m_isVaultUnlocked && m_unlockedKeys.contains("files");
    QString key = m_unlockedKeys.value("files");
    for (const QJsonValue &value : rows) {
        QJsonObject file = value.toObject();
        const QString encryptedPath = file.value("local_path").toString();
        const QString encryptedDriveId = file.value("drive_file_id").toString();
        if (canDecrypt) {
            if (!encryptedPath.isEmpty()) {
                const QString decryptedPath = decryptContent(key, encryptedPath);
                file["local_path"] = decryptedPath.isNull() ? QString() : decryptedPath;
                if (decryptedPath.isNull()) file["decryption_error"] = true;
            }
            if (!encryptedDriveId.isEmpty()) {
                const QString decryptedDriveId = decryptContent(key, encryptedDriveId);
                file["drive_file_id"] = decryptedDriveId.isNull() ? QString() : decryptedDriveId;
                if (decryptedDriveId.isNull()) file["decryption_error"] = true;
            }
        } else if (m_isVaultConfigured) {
            file["local_path"] = QString();
            file["drive_file_id"] = QString();
        }
        files.append(file.toVariantMap());
    }
    key.fill(QChar(0));
    return files;
}

int SynapseDataController::getDriveFileCount() {
    if (!m_db) return 0;
    return synapse_files_get_drive_count(m_db);
}

QVariantList SynapseDataController::getFileFolders(const QString &parentId) {
    if (!m_db) return {};
    const QByteArray pBytes = parentId.trimmed().toUtf8();
    const char *pPtr = pBytes.isEmpty() ? nullptr : pBytes.constData();

    char *jsonStr = synapse_files_get_folders(m_db, pPtr);
    if (!jsonStr) return {};

    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);
    return doc.array().toVariantList();
}

QVariantList SynapseDataController::getAllFileFolders() {
    if (!m_db) return {};
    char *jsonStr = synapse_files_get_all_folders(m_db);
    if (!jsonStr) return {};

    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);
    return doc.array().toVariantList();
}

QString SynapseDataController::createFileFolder(const QString &name, const QString &parentId, const QString &color) {
    if (!m_db || name.trimmed().isEmpty()) return QString();

    const QByteArray nameBytes = name.trimmed().toUtf8();
    const QByteArray pBytes = parentId.trimmed().toUtf8();
    const QByteArray colBytes = color.trimmed().toUtf8();

    char *newId = synapse_files_create_folder(
        m_db,
        nameBytes.constData(),
        pBytes.isEmpty() ? nullptr : pBytes.constData(),
        colBytes.isEmpty() ? nullptr : colBytes.constData()
    );

    if (!newId) return QString();
    const QString result = QString::fromUtf8(newId);
    synapse_free_string(newId);
    emit filesChanged();
    return result;
}

bool SynapseDataController::renameFileFolder(const QString &folderId, const QString &name) {
    if (!m_db || folderId.trimmed().isEmpty() || name.trimmed().isEmpty()) return false;
    const int ret = synapse_files_rename_folder(
        m_db,
        folderId.trimmed().toUtf8().constData(),
        name.trimmed().toUtf8().constData()
    );
    if (ret == 1) {
        emit filesChanged();
        return true;
    }
    return false;
}

bool SynapseDataController::deleteFileFolder(const QString &folderId) {
    if (!m_db || folderId.trimmed().isEmpty()) return false;
    const int ret = synapse_files_delete_folder(m_db, folderId.trimmed().toUtf8().constData());
    if (ret == 1) {
        emit filesChanged();
        return true;
    }
    return false;
}

bool SynapseDataController::moveFileFolder(const QString &folderId, const QString &parentId) {
    if (!m_db || folderId.trimmed().isEmpty() || folderId == parentId) return false;
    const QByteArray pBytes = parentId.trimmed().toUtf8();
    const int ret = synapse_files_move_folder(
        m_db,
        folderId.trimmed().toUtf8().constData(),
        pBytes.isEmpty() ? nullptr : pBytes.constData()
    );
    if (ret == 1) {
        emit filesChanged();
        return true;
    }
    return false;
}

bool SynapseDataController::moveFileItems(const QVariantList &items, const QString &folderId) {
    if (items.isEmpty()) return true;
    for (const QVariant &itemValue : items) {
        const QVariantMap item = itemValue.toMap();
        const QString itemId = item.value("id").toString();
        const bool isFolder = item.value("isFolder").toBool();
        if (isFolder) {
            if (!moveFileFolder(itemId, folderId)) return false;
        } else {
            if (!moveFile(itemId, folderId)) return false;
        }
    }
    return true;
}

bool SynapseDataController::trashFileItems(const QVariantList &items) {
    if (items.isEmpty()) return true;
    for (const QVariant &itemValue : items) {
        const QVariantMap item = itemValue.toMap();
        const QString itemId = item.value("id").toString();
        const bool isFolder = item.value("isFolder").toBool();
        if (isFolder) {
            if (!deleteFileFolder(itemId)) return false;
        } else {
            if (!deleteFile(itemId)) return false;
        }
    }
    return true;
}
