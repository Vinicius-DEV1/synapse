#include "synapse_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QSet>
#include <algorithm>

QVariantList SynapseDataController::getVideoFolders() {
    const QJsonArray rows = executeQuery("SELECT data, value FROM config WHERE id = 'videoFolders'");
    QJsonArray configuredFolders;
    if (!rows.isEmpty()) {
        const QJsonObject row = rows.first().toObject();
        QString serialized = row.value("data").toString();
        if (serialized.isEmpty()) serialized = row.value("value").toString();
        const QJsonDocument document = QJsonDocument::fromJson(serialized.toUtf8());
        if (document.isArray()) configuredFolders = document.array();
    }

    QVariantList folders;
    QSet<QString> seenIds;
    const auto appendFolder = [&folders, &seenIds](const QString &rawId, const QString &rawName) {
        const QString id = rawId.trimmed();
        const QString name = rawName.trimmed();
        if (id.isEmpty() || name.isEmpty() || seenIds.contains(id)) return;
        seenIds.insert(id);
        folders.append(QVariantMap{{"id", id}, {"name", name}});
    };

    for (const QJsonValue &value : configuredFolders) {
        if (!value.isObject()) continue;
        const QJsonObject item = value.toObject();
        appendFolder(item.value("id").toString(), item.value("name").toString());
    }
    const QJsonArray videoFolders = executeQuery(
        "SELECT DISTINCT collection_id, collection_name FROM videos "
        "WHERE deleted_at IS NULL AND collection_id IS NOT NULL AND collection_id != '' "
        "AND collection_name IS NOT NULL AND collection_name != '' ORDER BY collection_name ASC");
    for (const QJsonValue &value : videoFolders) {
        const QJsonObject item = value.toObject();
        appendFolder(item.value("collection_id").toString(), item.value("collection_name").toString());
    }
    return folders;
}

bool SynapseDataController::saveVideoFolders(const QVariantList &folders) {
    const QByteArray serialized = QJsonDocument(QJsonArray::fromVariantList(folders))
                                      .toJson(QJsonDocument::Compact);
    const QString json = escapeSql(QString::fromUtf8(serialized));
    const QString now = currentTimestamp();
    const QString sql = QString(
        "INSERT INTO config (id, data, value, updated_at) VALUES ('videoFolders', '%1', '%1', '%2') "
        "ON CONFLICT(id) DO UPDATE SET data = excluded.data, value = excluded.value, updated_at = excluded.updated_at")
            .arg(json, now);
    return executeSql(sql);
}

QVariantMap SynapseDataController::createVideoFolder(const QString &name) {
    const QString normalizedName = name.trimmed();
    if (normalizedName.isEmpty() || normalizedName.compare("Todos", Qt::CaseInsensitive) == 0) return {};

    QVariantList folders = getVideoFolders();
    const QVariantMap folder{{"id", generateUuid()}, {"name", normalizedName}};
    folders.append(folder);
    if (!executeSql("BEGIN IMMEDIATE;")) return {};
    const bool assignedLegacyRows = executeSql(QString(
        "UPDATE videos SET collection_id = '%1', updated_at = '%2' "
        "WHERE deleted_at IS NULL AND collection_id IS NULL AND collection_name = '%3'")
            .arg(escapeSql(folder.value("id").toString()), currentTimestamp(), escapeSql(normalizedName)));
    const bool saved = assignedLegacyRows && saveVideoFolders(folders);
    const bool committed = saved && executeSql("COMMIT;");
    if (!committed) {
        executeSql("ROLLBACK;");
        return {};
    }
    return folder;
}

bool SynapseDataController::renameVideoFolder(const QString &folderId, const QString &name) {
    const QString normalizedId = folderId.trimmed();
    const QString normalizedName = name.trimmed();
    if (normalizedId.isEmpty() || normalizedName.isEmpty() ||
        normalizedName.compare("Todos", Qt::CaseInsensitive) == 0) return false;

    QVariantList folders = getVideoFolders();
    QString previousName;
    bool found = false;
    for (QVariant &item : folders) {
        QVariantMap folder = item.toMap();
        if (folder.value("id").toString() == normalizedId) {
            previousName = folder.value("name").toString();
            folder.insert("name", normalizedName);
            item = folder;
            found = true;
        }
    }
    if (!found) return false;
    if (previousName == normalizedName) return true;

    if (!executeSql("BEGIN IMMEDIATE;")) return false;
    const QString escapedId = escapeSql(normalizedId);
    const QString escapedOldName = escapeSql(previousName);
    const QString escapedName = escapeSql(normalizedName);
    const bool assigned = executeSql(QString(
        "UPDATE videos SET collection_id = '%1', collection_name = '%2', updated_at = '%3' "
        "WHERE deleted_at IS NULL AND collection_id IS NULL AND collection_name = '%4'")
            .arg(escapedId, escapedName, currentTimestamp(), escapedOldName));
    const bool renamed = assigned && executeSql(QString(
        "UPDATE videos SET collection_name = '%1', updated_at = '%2' "
        "WHERE deleted_at IS NULL AND collection_id = '%3'")
            .arg(escapedName, currentTimestamp(), escapedId));
    const bool saved = renamed && saveVideoFolders(folders);
    const bool committed = saved && executeSql("COMMIT;");
    if (!committed) {
        executeSql("ROLLBACK;");
        return false;
    }
    return true;
}

bool SynapseDataController::deleteVideoFolder(const QString &folderId) {
    const QString normalizedId = folderId.trimmed();
    if (normalizedId.isEmpty()) return false;

    QVariantList folders = getVideoFolders();
    const auto end = std::remove_if(folders.begin(), folders.end(), [&normalizedId](const QVariant &item) {
        return item.toMap().value("id").toString() == normalizedId;
    });
    if (end == folders.end()) return false;
    folders.erase(end, folders.end());

    if (!executeSql("BEGIN IMMEDIATE;")) return false;
    const QString timestamp = currentTimestamp();
    const bool unassigned = executeSql(QString(
        "UPDATE videos SET collection_id = NULL, collection_name = NULL, updated_at = '%1' "
        "WHERE collection_id = '%2' AND deleted_at IS NULL")
            .arg(timestamp, escapeSql(normalizedId)));
    const bool saved = unassigned && saveVideoFolders(folders);
    const bool committed = saved && executeSql("COMMIT;");
    if (!committed) {
        executeSql("ROLLBACK;");
        return false;
    }
    return true;
}

bool SynapseDataController::moveVideoToFolder(const QString &videoId, const QString &folderId) {
    const QString normalizedVideoId = videoId.trimmed();
    const QString normalizedFolderId = folderId.trimmed();
    if (normalizedVideoId.isEmpty()) return false;
    if (executeQuery(QString("SELECT id FROM videos WHERE id = '%1' AND deleted_at IS NULL")
                         .arg(escapeSql(normalizedVideoId))).isEmpty()) return false;

    QString folderName;
    if (!normalizedFolderId.isEmpty()) {
        bool found = false;
        for (const QVariant &item : getVideoFolders()) {
            const QVariantMap folder = item.toMap();
            if (folder.value("id").toString() == normalizedFolderId) {
                folderName = folder.value("name").toString();
                found = !folderName.isEmpty();
                break;
            }
        }
        if (!found) return false;
    }

    const QString escapedVideoId = escapeSql(normalizedVideoId);
    const QString timestamp = currentTimestamp();
    if (normalizedFolderId.isEmpty()) {
        return executeSql(QString(
            "UPDATE videos SET collection_id = NULL, collection_name = NULL, updated_at = '%1' "
            "WHERE id = '%2' AND deleted_at IS NULL")
                .arg(timestamp, escapedVideoId));
    }

    return executeSql(QString(
        "UPDATE videos SET collection_id = '%1', collection_name = '%2', updated_at = '%3' "
        "WHERE id = '%4' AND deleted_at IS NULL")
            .arg(escapeSql(normalizedFolderId), escapeSql(folderName), timestamp, escapedVideoId));
}
