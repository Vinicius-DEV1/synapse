#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QSet>
#include <functional>

// ---------------------------------------------------------------------------
// 1. Notes and hierarchical pages
// ---------------------------------------------------------------------------

QVariantList SynapseDataController::getPages(const QString &filter) {
    QString sql = "SELECT id, title, icon, parent_id, updated_at, sort_order, is_pinned, pinned_order FROM pages WHERE deleted_at IS NULL ";
    if (!filter.trimmed().isEmpty()) sql += QString("AND title LIKE '%%1%' ").arg(escapeSql(filter));
    sql += "ORDER BY updated_at DESC LIMIT 150";
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getPinnedPages() {
    const QString sql = "SELECT id, parent_id, title, icon, is_pinned, pinned_order, updated_at FROM pages "
                        "WHERE deleted_at IS NULL AND is_pinned = 1 ORDER BY pinned_order ASC, updated_at DESC";
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getPageTree(const QString &filter) {
    QString sql = "SELECT id, parent_id, title, icon, is_pinned, pinned_order, sort_order, updated_at FROM pages WHERE deleted_at IS NULL ";
    if (!filter.trimmed().isEmpty()) sql += QString("AND title LIKE '%%1%' ").arg(escapeSql(filter));
    sql += "ORDER BY sort_order ASC, updated_at DESC";
    const QJsonArray rows = executeQuery(sql);

    QMap<QString, QList<QJsonObject>> parentToChildren;
    QList<QJsonObject> rootItems;
    QSet<QString> allIds;
    for (const QJsonValue &row : rows) allIds.insert(row.toObject().value("id").toString());

    for (const QJsonValue &row : rows) {
        const QJsonObject object = row.toObject();
        const QString parentId = object.value("parent_id").toString();
        if (parentId.isEmpty() || parentId == "null" || !allIds.contains(parentId)) rootItems.append(object);
        else parentToChildren[parentId].append(object);
    }

    QVariantList result;
    std::function<void(const QJsonObject &, int)> addNode = [&](const QJsonObject &node, int depth) {
        QJsonObject enriched = node;
        const QString nodeId = node.value("id").toString();
        const QList<QJsonObject> children = parentToChildren.value(nodeId);
        enriched["depth"] = depth;
        enriched["has_children"] = !children.isEmpty();
        enriched["children_count"] = children.size();
        result.append(enriched.toVariantMap());
        for (const QJsonObject &child : children) addNode(child, depth + 1);
    };
    for (const QJsonObject &root : rootItems) addNode(root, 0);
    return result;
}

QVariantMap SynapseDataController::getPage(const QString &pageId) {
    const QJsonArray rows = executeQueryPrepared(
        "SELECT id, title, content, encrypted_content, icon, parent_id, is_pinned, pinned_order, description, cover_image, updated_at, crdt_state "
        "FROM pages WHERE id = ?1 AND deleted_at IS NULL", {pageId});
    if (rows.isEmpty()) return {};
    QJsonObject object = rows.first().toObject();
    const QString encryptedContent = object.value("encrypted_content").toString();
    if (!encryptedContent.isEmpty()) {
        const QString notesKey = m_unlockedKeys.value("notes");
        if (m_isVaultConfigured && !m_isVaultUnlocked) {
            object["content"] = "🔒 [Encrypted note]";
        } else if (notesKey.isEmpty()) {
            object["content"] = QString();
            object["decryption_error"] = true;
        } else {
            const QString decrypted = decryptContent(notesKey, encryptedContent);
            if (decrypted.isNull()) {
                object["content"] = QString();
                object["decryption_error"] = true;
            } else {
                object["content"] = decrypted;
            }
        }
    }
    return object.toVariantMap();
}

bool SynapseDataController::savePage(const QString &pageId, const QString &title, const QString &content, const QString &icon, const QString &expectedUpdatedAt) {
    if (m_isVaultConfigured && !m_isVaultUnlocked) return false;
    const QString timestamp = currentTimestamp();
    const bool encryptAtRest = m_isVaultConfigured;
    const QString notesKey = m_unlockedKeys.value("notes");
    if (encryptAtRest && notesKey.isEmpty()) return false;
    QString encrypted;
    if (encryptAtRest) {
        encrypted = encryptContent(notesKey, content);
        if (encrypted.isNull()) return false;
    }

    const bool inserting = pageId.isEmpty();
    const QString targetId = inserting ? generateUuid() : pageId;

    if (!inserting) {
        const QJsonArray existingRows = executeQueryPrepared(
            "SELECT updated_at, content, encrypted_content FROM pages WHERE id = ?1 AND deleted_at IS NULL",
            {targetId});
        if (existingRows.isEmpty()) return false;

        const QJsonObject existingRow = existingRows.first().toObject();
        const QString currentUpdatedAt = existingRow.value("updated_at").toString();

        if (!expectedUpdatedAt.isEmpty() && currentUpdatedAt != expectedUpdatedAt) {
            QString existingContent = existingRow.value("content").toString();
            const QString existingEncrypted = existingRow.value("encrypted_content").toString();
            if (!existingEncrypted.isEmpty() && m_isVaultConfigured && m_isVaultUnlocked && !notesKey.isEmpty()) {
                existingContent = decryptContent(notesKey, existingEncrypted);
            }
            if (existingContent != content) {
                const QString historyId = generateUuid();
                const QString historyTimestamp = currentTimestamp();
                if (encryptAtRest) {
                    executeSqlPrepared(
                        "INSERT INTO page_history (id, page_id, content, encrypted_content, created_at) "
                        "VALUES (?1, ?2, '', ?3, ?4)", {historyId, targetId, encrypted, historyTimestamp});
                } else {
                    executeSqlPrepared(
                        "INSERT INTO page_history (id, page_id, content, encrypted_content, created_at) "
                        "VALUES (?1, ?2, ?3, NULL, ?4)", {historyId, targetId, content, historyTimestamp});
                }
                emit pageConflictDetected(targetId, existingContent);
                return false;
            }
        }
    }

    if (!executeSql("BEGIN IMMEDIATE;")) return false;
    const int pageRows = encryptAtRest
        ? (inserting
            ? executeSqlPrepared(
                  "INSERT INTO pages (id, title, content, encrypted_content, icon, created_at, updated_at, "
                  "sort_order, is_pinned, pinned_order, crdt_state) VALUES (?1, ?2, '', ?3, ?4, ?5, ?5, 0, 0, 0.0, NULL)",
                  {targetId, title, encrypted, icon, timestamp})
            : executeSqlPrepared(
                  "UPDATE pages SET title = ?1, content = '', encrypted_content = ?2, crdt_state = NULL, icon = ?3, updated_at = ?4 "
                  "WHERE id = ?5 AND deleted_at IS NULL", {title, encrypted, icon, timestamp, targetId}))
        : (inserting
            ? executeSqlPrepared(
                  "INSERT INTO pages (id, title, content, encrypted_content, icon, created_at, updated_at, "
                  "sort_order, is_pinned, pinned_order, crdt_state) VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?5, 0, 0, 0.0, NULL)",
                  {targetId, title, content, icon, timestamp})
            : executeSqlPrepared(
                  "UPDATE pages SET title = ?1, content = ?2, encrypted_content = NULL, crdt_state = NULL, icon = ?3, updated_at = ?4 "
                  "WHERE id = ?5 AND deleted_at IS NULL", {title, content, icon, timestamp, targetId}));
    if (pageRows != 1) {
        executeSql("ROLLBACK;");
        return false;
    }

    qint64 nextHistoryTime = 0;
    if (!pageId.isEmpty()) {
        const qint64 now = QDateTime::currentSecsSinceEpoch();
        if (!m_pageHistoryCooldown.contains(pageId) || now - m_pageHistoryCooldown.value(pageId) >= 60) {
            nextHistoryTime = now;
            const QString historyId = generateUuid();
            const int historyRows = encryptAtRest
                ? executeSqlPrepared(
                      "INSERT INTO page_history (id, page_id, content, encrypted_content, created_at) "
                      "VALUES (?1, ?2, '', ?3, ?4)", {historyId, pageId, encrypted, timestamp})
                : executeSqlPrepared(
                      "INSERT INTO page_history (id, page_id, content, encrypted_content, created_at) "
                      "VALUES (?1, ?2, ?3, NULL, ?4)", {historyId, pageId, content, timestamp});
            if (historyRows != 1) {
                executeSql("ROLLBACK;");
                return false;
            }
        }
    }
    if (!executeSql("COMMIT;")) {
        executeSql("ROLLBACK;");
        return false;
    }
    if (nextHistoryTime > 0) m_pageHistoryCooldown[pageId] = nextHistoryTime;
    refreshStats();
    return true;
}

QVariantList SynapseDataController::getPageHistory(const QString &pageId) {
    const QJsonArray rows = executeQueryPrepared(
        "SELECT id, page_id, content, encrypted_content, created_at FROM page_history "
        "WHERE page_id = ?1 ORDER BY created_at DESC", {pageId});
    QVariantList history;
    const QString notesKey = m_isVaultConfigured && m_isVaultUnlocked ? m_unlockedKeys.value("notes") : QString();
    for (const QJsonValue &row : rows) {
        QJsonObject revision = row.toObject();
        const QString encrypted = revision.value("encrypted_content").toString();
        if (!encrypted.isEmpty()) {
            const QString decrypted = decryptContent(notesKey, encrypted);
            if (decrypted.isNull()) {
                revision["content"] = QString();
                revision["decryption_error"] = true;
            } else {
                revision["content"] = decrypted;
            }
        }
        history.append(revision.toVariantMap());
    }
    return history;
}

bool SynapseDataController::restorePageRevision(const QString &pageId, const QString &revisionId) {
    const QJsonArray rows = executeQueryPrepared(
        "SELECT content, encrypted_content FROM page_history WHERE id = ?1 AND page_id = ?2",
        {revisionId, pageId});
    if (rows.isEmpty()) return false;
    const QJsonObject revision = rows.first().toObject();
    const QString encrypted = revision.value("encrypted_content").toString();
    QString content = revision.value("content").toString();
    if (!encrypted.isEmpty()) {
        if (!m_isVaultConfigured || !m_isVaultUnlocked || !m_unlockedKeys.contains("notes")) return false;
        content = decryptContent(m_unlockedKeys.value("notes"), encrypted);
        if (content.isNull()) return false;
    }
    const QVariantMap page = getPage(pageId);
    return savePage(pageId, page.value("title").toString(), content, page.value("icon").toString());
}

QString SynapseDataController::createSubPage(const QString &parentId, const QString &title, const QString &icon) {
    const QString id = generateUuid();
    const QString timestamp = currentTimestamp();
    const QString parentValue = parentId.trimmed().isEmpty() ? "NULL" : QString("'%1'").arg(escapeSql(parentId));
    const QString sql = QString("INSERT INTO pages (id, parent_id, title, content, icon, created_at, updated_at, sort_order, is_pinned, pinned_order) "
                                "VALUES ('%1', %2, '%3', '', '%4', '%5', '%6', 0, 0, 0.0)")
                            .arg(id, parentValue, escapeSql(title), escapeSql(icon), timestamp, timestamp);
    const bool saved = executeSql(sql);
    if (saved) refreshStats();
    return saved ? id : QString();
}

bool SynapseDataController::deletePage(const QString &pageId) {
    const QString timestamp = currentTimestamp();
    const QString subtreeCte =
        "WITH RECURSIVE note_subtree(id) AS ("
        "SELECT id FROM pages WHERE id = ?1 AND deleted_at IS NULL "
        "UNION "
        "SELECT child.id FROM pages AS child "
        "JOIN note_subtree AS parent ON child.parent_id = parent.id "
        "WHERE child.deleted_at IS NULL) ";

    if (!executeSql("BEGIN IMMEDIATE;")) return false;

    const QString updateEvents = subtreeCte +
        "UPDATE calendar_events SET deleted_at = ?2, updated_at = ?2 "
        "WHERE page_id IN (SELECT id FROM note_subtree)";
    if (executeSqlPrepared(updateEvents, {pageId, timestamp}) < 0) {
        executeSql("ROLLBACK;");
        return false;
    }

    const QString updatePages = subtreeCte +
        "UPDATE pages SET deleted_at = ?2, updated_at = ?2 "
        "WHERE id IN (SELECT id FROM note_subtree)";
    if (executeSqlPrepared(updatePages, {pageId, timestamp}) <= 0) {
        executeSql("ROLLBACK;");
        return false;
    }

    if (!executeSql("COMMIT;")) {
        executeSql("ROLLBACK;");
        return false;
    }

    refreshStats();
    return true;
}

bool SynapseDataController::togglePinPage(const QString &pageId) {
    const QJsonArray rows = executeQuery(QString("SELECT is_pinned FROM pages WHERE id = '%1'").arg(escapeSql(pageId)));
    if (rows.isEmpty()) return false;
    const int isPinned = rows.first().toObject().value("is_pinned").toInt();
    const int nextPinned = isPinned == 1 ? 0 : 1;
    const QString sql = QString("UPDATE pages SET is_pinned = %1, updated_at = '%2' WHERE id = '%3'")
                            .arg(nextPinned).arg(currentTimestamp(), escapeSql(pageId));
    return executeSql(sql);
}

bool SynapseDataController::renamePage(const QString &pageId, const QString &newTitle) {
    const QString sql = QString("UPDATE pages SET title = '%1', updated_at = '%2' WHERE id = '%3'")
                            .arg(escapeSql(newTitle), currentTimestamp(), escapeSql(pageId));
    return executeSql(sql);
}

bool SynapseDataController::updatePageIcon(const QString &pageId, const QString &newIcon) {
    const QString sql = QString("UPDATE pages SET icon = '%1', updated_at = '%2' WHERE id = '%3'")
                            .arg(escapeSql(newIcon), currentTimestamp(), escapeSql(pageId));
    return executeSql(sql);
}

bool SynapseDataController::updatePageDescription(const QString &pageId, const QString &description) {
    return executeSqlPrepared(
        "UPDATE pages SET description = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        {description, currentTimestamp(), pageId}) == 1;
}

bool SynapseDataController::updatePageCover(const QString &pageId, const QString &coverImage) {
    if (coverImage.trimmed().isEmpty()) {
        return executeSqlPrepared(
            "UPDATE pages SET cover_image = NULL, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
            {currentTimestamp(), pageId}) == 1;
    }
    return executeSqlPrepared(
        "UPDATE pages SET cover_image = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        {coverImage, currentTimestamp(), pageId}) == 1;
}

QString SynapseDataController::createRandomPageCoverUrl() const {
    const QString seed = QString::number(QRandomGenerator::global()->generate64(), 36);
    return QStringLiteral("https://picsum.photos/seed/%1/1600/400").arg(seed);
}
