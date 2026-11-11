#include "synapse_controller.h"

#include <QtConcurrent/QtConcurrent>
#include <QtCore/QDateTime>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QMimeDatabase>
#include <QtCore/QRegularExpression>
#include <QtCore/QSaveFile>
#include <QtCore/QSet>
#include <QtCore/QTemporaryFile>
#include <QtCore/QUrl>

// Native file collections, folders, selection moves, and trash operations.


QVariantList SynapseDataController::getFiles(const QString &folderId) {
    return getFilesForSection("folders", folderId);
}

QVariantList SynapseDataController::getFilesForSection(const QString &section, const QString &folderId) {
    QString sql = "SELECT id, name, file_type, file_size, local_path, drive_file_id, "
                  "CASE WHEN drive_file_id IS NOT NULL AND drive_file_id != '' THEN 1 ELSE 0 END AS has_drive_copy, "
                  "folder_id, mime_type, created_at, updated_at "
                  "FROM files WHERE deleted_at IS NULL";

    if (section == "folders") {
        sql += folderId.isEmpty()
            ? " AND folder_id IS NULL"
            : QString(" AND folder_id = '%1'").arg(escapeSql(folderId));
    } else if (section == "recent") {
        sql += " AND updated_at >= datetime('now', '-30 days')";
    } else if (section == "drive") {
        sql += " AND drive_file_id IS NOT NULL AND drive_file_id != ''";
    }
    sql += section == "recent"
        ? " ORDER BY updated_at DESC, name COLLATE NOCASE ASC"
        : " ORDER BY name COLLATE NOCASE ASC";

    const QJsonArray rows = executeQuery(sql);
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
    const QJsonArray rows = executeQuery("SELECT count(*) AS count FROM files "
                                         "WHERE deleted_at IS NULL AND drive_file_id IS NOT NULL AND drive_file_id != ''");
    return rows.isEmpty() ? 0 : rows.first().toObject().value("count").toInt();
}

QVariantList SynapseDataController::getFileFolders(const QString &parentId) {
    QString sql = "SELECT id, name, parent_id, color, created_at, updated_at FROM file_folders WHERE deleted_at IS NULL";
    sql += parentId.isEmpty()
        ? " AND parent_id IS NULL"
        : QString(" AND parent_id = '%1'").arg(escapeSql(parentId));
    sql += " ORDER BY name COLLATE NOCASE ASC";
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getAllFileFolders() {
    return executeQuery("SELECT id, name, parent_id, color, created_at, updated_at "
                        "FROM file_folders WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE ASC")
        .toVariantList();
}

QString SynapseDataController::createFileFolder(const QString &name, const QString &parentId, const QString &color) {
    const QString cleanName = name.trimmed();
    if (cleanName.isEmpty()) return QString();
    if (!parentId.isEmpty()) {
        const QJsonArray parent = executeQuery(QString("SELECT id FROM file_folders WHERE id = '%1' AND deleted_at IS NULL")
                                               .arg(escapeSql(parentId)));
        if (parent.isEmpty()) return QString();
    }
    const QString id = generateUuid();
    const QString now = currentTimestamp();
    const QString parentSql = parentId.isEmpty() ? "NULL" : QString("'%1'").arg(escapeSql(parentId));
    const QString sql = QString("INSERT INTO file_folders (id, name, parent_id, color, created_at, updated_at) "
                                "VALUES ('%1', '%2', %3, '%4', '%5', '%5')")
                            .arg(id, escapeSql(cleanName), parentSql, escapeSql(color), now);
    if (!executeSql(sql)) return QString();
    emit filesChanged();
    return id;
}

bool SynapseDataController::renameFileFolder(const QString &folderId, const QString &name) {
    const QString cleanName = name.trimmed();
    if (folderId.isEmpty() || cleanName.isEmpty()) return false;
    const QString sql = QString("UPDATE file_folders SET name = '%1', updated_at = '%2' WHERE id = '%3' AND deleted_at IS NULL")
                            .arg(escapeSql(cleanName), currentTimestamp(), escapeSql(folderId));
    const bool ok = executeSql(sql);
    if (ok) emit filesChanged();
    return ok;
}

bool SynapseDataController::deleteFileFolder(const QString &folderId) {
    if (folderId.isEmpty()) return false;
    const QString id = escapeSql(folderId);
    const QString now = currentTimestamp();
    if (!executeSql("BEGIN IMMEDIATE;")) return false;
    bool ok = executeSql(QString("UPDATE file_folders SET deleted_at = '%1', updated_at = '%1' WHERE id = '%2'").arg(now, id));
    if (ok) ok = executeSql(QString("UPDATE files SET folder_id = NULL, updated_at = '%1' WHERE folder_id = '%2'").arg(now, id));
    if (ok) ok = executeSql(QString("UPDATE file_folders SET parent_id = NULL, updated_at = '%1' WHERE parent_id = '%2'").arg(now, id));
    if (ok) ok = executeSql("COMMIT;");
    if (!ok) executeSql("ROLLBACK;");
    if (ok) emit filesChanged();
    return ok;
}

bool SynapseDataController::moveFileFolder(const QString &folderId, const QString &parentId) {
    if (folderId.isEmpty() || folderId == parentId) return false;

    const QString safeFolderId = escapeSql(folderId);
    QString cursor = parentId;
    QSet<QString> visited;
    while (!cursor.isEmpty()) {
        if (cursor == folderId || visited.contains(cursor)) return false;
        visited.insert(cursor);
        const QJsonArray rows = executeQuery(QString("SELECT parent_id FROM file_folders "
                                                     "WHERE id = '%1' AND deleted_at IS NULL")
                                             .arg(escapeSql(cursor)));
        if (rows.isEmpty()) return false;
        cursor = rows.first().toObject().value("parent_id").toString();
    }

    const QJsonArray source = executeQuery(QString("SELECT id FROM file_folders WHERE id = '%1' AND deleted_at IS NULL")
                                           .arg(safeFolderId));
    if (source.isEmpty()) return false;
    const QString parentSql = parentId.isEmpty() ? "NULL" : QString("'%1'").arg(escapeSql(parentId));
    const bool ok = executeSql(QString("UPDATE file_folders SET parent_id = %1, updated_at = '%2' "
                                       "WHERE id = '%3' AND deleted_at IS NULL")
                                   .arg(parentSql, currentTimestamp(), safeFolderId));
    if (ok) emit filesChanged();
    return ok;
}

bool SynapseDataController::moveFileItems(const QVariantList &items, const QString &folderId) {
    if (items.isEmpty()) return true;
    if (!folderId.isEmpty()) {
        const QJsonArray target = executeQuery(QString("SELECT id FROM file_folders WHERE id = '%1' AND deleted_at IS NULL")
                                               .arg(escapeSql(folderId)));
        if (target.isEmpty()) return false;
    }

    QMap<QString, QString> parentById;
    const QJsonArray folderRows = executeQuery("SELECT id, parent_id FROM file_folders WHERE deleted_at IS NULL");
    for (const QJsonValue &value : folderRows) {
        const QJsonObject folder = value.toObject();
        parentById.insert(folder.value("id").toString(), folder.value("parent_id").toString());
    }

    struct MoveItem { QString id; bool isFolder; };
    QList<MoveItem> validated;
    QSet<QString> uniqueItems;
    for (const QVariant &itemValue : items) {
        const QVariantMap item = itemValue.toMap();
        const QString itemId = item.value("id").toString();
        const bool isFolder = item.value("isFolder").toBool();
        if (itemId.isEmpty()) return false;
        const QString identity = (isFolder ? "folder:" : "file:") + itemId;
        if (uniqueItems.contains(identity)) continue;
        uniqueItems.insert(identity);

        const QString table = isFolder ? "file_folders" : "files";
        const QJsonArray source = executeQuery(QString("SELECT id FROM %1 WHERE id = '%2' AND deleted_at IS NULL")
                                               .arg(table, escapeSql(itemId)));
        if (source.isEmpty()) return false;
        if (isFolder && !folderId.isEmpty()) {
            if (itemId == folderId) return false;
            QString cursor = folderId;
            QSet<QString> visited;
            while (!cursor.isEmpty()) {
                if (cursor == itemId || visited.contains(cursor)) return false;
                visited.insert(cursor);
                cursor = parentById.value(cursor);
                if (!cursor.isEmpty() && !parentById.contains(cursor)) return false;
            }
        }
        validated.append({itemId, isFolder});
    }

    const QString parentSql = folderId.isEmpty() ? "NULL" : QString("'%1'").arg(escapeSql(folderId));
    if (!executeSql("BEGIN IMMEDIATE;")) return false;
    bool ok = true;
    const QString now = currentTimestamp();
    for (const MoveItem &item : validated) {
        const QString table = item.isFolder ? "file_folders" : "files";
        const QString sql = QString("UPDATE %1 SET %2 = %3, updated_at = '%4' WHERE id = '%5' AND deleted_at IS NULL")
                                .arg(table, item.isFolder ? "parent_id" : "folder_id", parentSql, now, escapeSql(item.id));
        if (!executeSql(sql)) { ok = false; break; }
    }
    if (ok) ok = executeSql("COMMIT;");
    if (!ok) executeSql("ROLLBACK;");
    if (ok) emit filesChanged();
    return ok;
}

bool SynapseDataController::trashFileItems(const QVariantList &items) {
    if (items.isEmpty()) return true;
    struct TrashItem { QString id; bool isFolder; };
    QList<TrashItem> validated;
    QSet<QString> uniqueItems;
    for (const QVariant &itemValue : items) {
        const QVariantMap item = itemValue.toMap();
        const QString itemId = item.value("id").toString();
        const bool isFolder = item.value("isFolder").toBool();
        if (itemId.isEmpty()) return false;
        const QString identity = (isFolder ? "folder:" : "file:") + itemId;
        if (uniqueItems.contains(identity)) continue;
        uniqueItems.insert(identity);
        const QString table = isFolder ? "file_folders" : "files";
        const QJsonArray source = executeQuery(QString("SELECT id FROM %1 WHERE id = '%2' AND deleted_at IS NULL")
                                               .arg(table, escapeSql(itemId)));
        if (source.isEmpty()) return false;
        validated.append({itemId, isFolder});
    }

    if (!executeSql("BEGIN IMMEDIATE;")) return false;
    bool ok = true;
    const QString now = currentTimestamp();
    for (const TrashItem &item : validated) {
        const QString id = escapeSql(item.id);
        if (item.isFolder) {
            ok = executeSql(QString("UPDATE file_folders SET deleted_at = '%1', updated_at = '%1' WHERE id = '%2';")
                                .arg(now, id));
            if (ok) ok = executeSql(QString("UPDATE files SET folder_id = NULL, updated_at = '%1' WHERE folder_id = '%2';")
                                        .arg(now, id));
            if (ok) ok = executeSql(QString("UPDATE file_folders SET parent_id = NULL, updated_at = '%1' WHERE parent_id = '%2';")
                                        .arg(now, id));
        } else {
            ok = executeSql(QString("UPDATE files SET deleted_at = '%1', updated_at = '%1' WHERE id = '%2';")
                                .arg(now, id));
            if (ok) ok = executeSql(QString("UPDATE file_page_links SET deleted_at = '%1', updated_at = '%1' WHERE file_id = '%2';")
                                        .arg(now, id));
        }
        if (!ok) break;
    }
    if (ok) ok = executeSql("COMMIT;");
    if (!ok) executeSql("ROLLBACK;");
    if (ok) emit filesChanged();
    return ok;
}

