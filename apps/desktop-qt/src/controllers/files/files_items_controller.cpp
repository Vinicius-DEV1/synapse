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

// Native file metadata, duplication, deletion, and page links.

bool SynapseDataController::renameFile(const QString &fileId, const QString &name) {
    const QString cleanName = name.trimmed();
    if (fileId.isEmpty() || cleanName.isEmpty()) return false;
    const QString sql = QString("UPDATE files SET name = '%1', updated_at = '%2' WHERE id = '%3' AND deleted_at IS NULL")
                            .arg(escapeSql(cleanName), currentTimestamp(), escapeSql(fileId));
    const bool ok = executeSql(sql);
    if (ok) emit filesChanged();
    return ok;
}

bool SynapseDataController::moveFile(const QString &fileId, const QString &folderId) {
    if (fileId.isEmpty()) return false;
    if (!folderId.isEmpty()) {
        const QJsonArray folder = executeQuery(QString("SELECT id FROM file_folders WHERE id = '%1' AND deleted_at IS NULL")
                                               .arg(escapeSql(folderId)));
        if (folder.isEmpty()) return false;
    }
    const QString folderSql = folderId.isEmpty() ? "NULL" : QString("'%1'").arg(escapeSql(folderId));
    const QString sql = QString("UPDATE files SET folder_id = %1, updated_at = '%2' WHERE id = '%3' AND deleted_at IS NULL")
                            .arg(folderSql, currentTimestamp(), escapeSql(fileId));
    const bool ok = executeSql(sql);
    if (ok) emit filesChanged();
    return ok;
}

QString SynapseDataController::duplicateFile(const QString &fileId, const QString &folderId) {
    if (fileId.isEmpty()) return QString();
    if (!folderId.isEmpty()) {
        const QJsonArray folder = executeQuery(QString("SELECT id FROM file_folders WHERE id = '%1' AND deleted_at IS NULL")
                                               .arg(escapeSql(folderId)));
        if (folder.isEmpty()) return QString();
    }

    const QString newId = generateUuid();
    const QString sourceId = escapeSql(fileId);
    const QJsonArray sourceRows = executeQuery(QString("SELECT name FROM files WHERE id = '%1' AND deleted_at IS NULL")
                                               .arg(sourceId));
    if (sourceRows.isEmpty()) return QString();
    const QString sourceName = sourceRows.first().toObject().value("name").toString();
    const qsizetype extensionIndex = sourceName.lastIndexOf('.');
    const QString copyName = extensionIndex > 0
        ? sourceName.left(extensionIndex) + " (cópia)" + sourceName.mid(extensionIndex)
        : sourceName + " (cópia)";
    const QString folderSql = folderId.isEmpty() ? "NULL" : QString("'%1'").arg(escapeSql(folderId));
    const QString now = currentTimestamp();
    const QString sql = QString(
        "INSERT INTO files (id, name, file_type, file_size, local_path, drive_file_id, folder_id, mime_type, created_at, updated_at) "
        "SELECT '%1', '%2', file_type, file_size, local_path, drive_file_id, %3, mime_type, '%4', '%4' "
        "FROM files WHERE id = '%5' AND deleted_at IS NULL")
                            .arg(newId, escapeSql(copyName), folderSql, now, sourceId);
    if (!executeSql(sql)) return QString();
    emit filesChanged();
    return newId;
}

QVariantList SynapseDataController::duplicateFiles(const QVariantList &fileIds, const QString &folderId) {
    if (fileIds.isEmpty()) return {};
    if (!folderId.isEmpty()) {
        const QJsonArray folder = executeQuery(QString("SELECT id FROM file_folders WHERE id = '%1' AND deleted_at IS NULL")
                                               .arg(escapeSql(folderId)));
        if (folder.isEmpty()) return {};
    }

    QSet<QString> uniqueIds;
    QVariantList newIds;
    if (!executeSql("BEGIN IMMEDIATE;")) return {};
    bool ok = true;
    const QString folderSql = folderId.isEmpty() ? "NULL" : QString("'%1'").arg(escapeSql(folderId));
    const QString now = currentTimestamp();
    for (const QVariant &value : fileIds) {
        const QString sourceId = value.toString();
        if (sourceId.isEmpty() || uniqueIds.contains(sourceId)) continue;
        uniqueIds.insert(sourceId);
        const QJsonArray rows = executeQuery(QString("SELECT name FROM files WHERE id = '%1' AND deleted_at IS NULL")
                                             .arg(escapeSql(sourceId)));
        if (rows.isEmpty()) { ok = false; break; }
        const QString sourceName = rows.first().toObject().value("name").toString();
        const qsizetype extensionIndex = sourceName.lastIndexOf('.');
        const QString copyName = extensionIndex > 0
            ? sourceName.left(extensionIndex) + " (cópia)" + sourceName.mid(extensionIndex)
            : sourceName + " (cópia)";
        const QString newId = generateUuid();
        const QString sql = QString(
            "INSERT INTO files (id, name, file_type, file_size, local_path, drive_file_id, folder_id, mime_type, created_at, updated_at) "
            "SELECT '%1', '%2', file_type, file_size, local_path, drive_file_id, %3, mime_type, '%4', '%4' "
            "FROM files WHERE id = '%5' AND deleted_at IS NULL")
                                .arg(newId, escapeSql(copyName), folderSql, now, escapeSql(sourceId));
        if (!executeSql(sql)) { ok = false; break; }
        newIds.append(newId);
    }
    if (ok) ok = executeSql("COMMIT;");
    if (!ok) executeSql("ROLLBACK;");
    if (ok && !newIds.isEmpty()) emit filesChanged();
    return ok ? newIds : QVariantList();
}

bool SynapseDataController::deleteFile(const QString &fileId) {
    if (fileId.isEmpty()) return false;
    const QString id = escapeSql(fileId);
    const QString now = currentTimestamp();
    if (!executeSql("BEGIN IMMEDIATE;")) return false;
    bool ok = executeSql(QString("UPDATE files SET deleted_at = '%1', updated_at = '%1' WHERE id = '%2'").arg(now, id));
    if (ok) ok = executeSql(QString("UPDATE file_page_links SET deleted_at = '%1', updated_at = '%1' WHERE file_id = '%2'").arg(now, id));
    if (ok) ok = executeSql("COMMIT;");
    if (!ok) executeSql("ROLLBACK;");
    if (ok) emit filesChanged();
    return ok;
}

QVariantList SynapseDataController::getFileLinksByFile(const QString &fileId) {
    const QString sql = QString("SELECT links.id, links.file_id, links.page_id, links.link_type, links.widget_id, "
                                "links.created_at, pages.title AS page_title "
                                "FROM file_page_links AS links LEFT JOIN pages ON pages.id = links.page_id "
                                "WHERE links.file_id = '%1' AND links.deleted_at IS NULL ORDER BY links.created_at DESC")
                            .arg(escapeSql(fileId));
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getFileLinksByPage(const QString &pageId) {
    const QString sql = QString("SELECT links.id, links.file_id, links.page_id, links.link_type, links.widget_id, "
                                "links.created_at, files.name AS file_name "
                                "FROM file_page_links AS links LEFT JOIN files ON files.id = links.file_id "
                                "WHERE links.page_id = '%1' AND links.deleted_at IS NULL AND files.deleted_at IS NULL "
                                "ORDER BY links.created_at DESC")
                            .arg(escapeSql(pageId));
    return executeQuery(sql).toVariantList();
}

QString SynapseDataController::createFilePageLink(const QString &fileId, const QString &pageId,
                                                  const QString &linkType, const QString &widgetId) {
    if (fileId.isEmpty() || pageId.isEmpty() || (linkType != "link" && linkType != "upload")) return QString();
    const QString safeFileId = escapeSql(fileId);
    const QString safePageId = escapeSql(pageId);
    const QJsonArray file = executeQuery(QString("SELECT id FROM files WHERE id = '%1' AND deleted_at IS NULL").arg(safeFileId));
    const QJsonArray page = executeQuery(QString("SELECT id FROM pages WHERE id = '%1' AND deleted_at IS NULL").arg(safePageId));
    if (file.isEmpty() || page.isEmpty()) return QString();

    const QJsonArray existing = executeQuery(QString("SELECT id FROM file_page_links WHERE file_id = '%1' AND page_id = '%2' AND deleted_at IS NULL LIMIT 1")
                                             .arg(safeFileId, safePageId));
    if (!existing.isEmpty()) return existing[0].toObject().value("id").toString();

    const QString id = generateUuid();
    const QString widgetSql = widgetId.isEmpty() ? "NULL" : QString("'%1'").arg(escapeSql(widgetId));
    const QString sql = QString("INSERT INTO file_page_links (id, file_id, page_id, link_type, widget_id, created_at, updated_at) "
                                "VALUES ('%1', '%2', '%3', '%4', %5, '%6', '%6')")
                            .arg(id, safeFileId, safePageId, escapeSql(linkType), widgetSql, currentTimestamp());
    if (!executeSql(sql)) return QString();
    emit filesChanged();
    return id;
}

bool SynapseDataController::deleteFilePageLink(const QString &linkId) {
    if (linkId.isEmpty()) return false;
    const QString now = currentTimestamp();
    const QString sql = QString("UPDATE file_page_links SET deleted_at = '%1', updated_at = '%1' WHERE id = '%2'")
                            .arg(now, escapeSql(linkId));
    const bool ok = executeSql(sql);
    if (ok) emit filesChanged();
    return ok;
}

