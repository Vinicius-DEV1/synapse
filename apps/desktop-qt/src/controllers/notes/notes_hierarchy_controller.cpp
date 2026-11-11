#include "synapse_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QSet>
#include <QtCore/QStringList>

bool SynapseDataController::movePage(const QString &pageId, const QString &newParentId) {
    const QString normalizedPageId = pageId.trimmed();
    const QString normalizedParentId = newParentId.trimmed();
    if (normalizedPageId.isEmpty() || normalizedPageId == normalizedParentId || !executeSql("BEGIN IMMEDIATE;")) {
        return false;
    }

    const auto rollback = [this]() { executeSql("ROLLBACK;"); };
    if (executeQueryPrepared(
            "SELECT id FROM pages WHERE id = ?1 AND deleted_at IS NULL", {normalizedPageId}).isEmpty()) {
        rollback();
        return false;
    }
    if (!normalizedParentId.isEmpty() && executeQueryPrepared(
            "SELECT id FROM pages WHERE id = ?1 AND deleted_at IS NULL", {normalizedParentId}).isEmpty()) {
        rollback();
        return false;
    }
    if (!normalizedParentId.isEmpty() && !executeQueryPrepared(
            "WITH RECURSIVE descendants(id) AS ("
            "SELECT id FROM pages WHERE id = ?1 AND deleted_at IS NULL "
            "UNION SELECT child.id FROM pages AS child "
            "JOIN descendants AS parent ON child.parent_id = parent.id "
            "WHERE child.deleted_at IS NULL) "
            "SELECT id FROM descendants WHERE id = ?2",
            {normalizedPageId, normalizedParentId}).isEmpty()) {
        rollback();
        return false;
    }

    const QVariant parentValue = normalizedParentId.isEmpty() ? QVariant() : QVariant(normalizedParentId);
    const bool updated = executeSqlPrepared(
        "UPDATE pages SET parent_id = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        {parentValue, currentTimestamp(), normalizedPageId}) == 1;
    if (updated && executeSql("COMMIT;")) return true;
    rollback();
    return false;
}

bool SynapseDataController::reorderSubPages(const QString &parentId, const QVariantList &orderedPageIds) {
    const QString normalizedParentId = parentId.trimmed();
    if (!executeSql("BEGIN IMMEDIATE;")) return false;
    const auto rollback = [this]() { executeSql("ROLLBACK;"); };

    if (!normalizedParentId.isEmpty() && executeQueryPrepared(
            "SELECT id FROM pages WHERE id = ?1 AND deleted_at IS NULL", {normalizedParentId}).isEmpty()) {
        rollback();
        return false;
    }
    const QString siblingsSql = normalizedParentId.isEmpty()
        ? QStringLiteral("SELECT id FROM pages WHERE parent_id IS NULL AND deleted_at IS NULL")
        : QStringLiteral("SELECT id FROM pages WHERE parent_id = ?1 AND deleted_at IS NULL");
    const QJsonArray siblingRows = normalizedParentId.isEmpty()
        ? executeQueryPrepared(siblingsSql, {})
        : executeQueryPrepared(siblingsSql, {normalizedParentId});
    QSet<QString> siblingIds;
    for (const QJsonValue &row : siblingRows) siblingIds.insert(row.toObject().value(QStringLiteral("id")).toString());

    if (orderedPageIds.size() != siblingIds.size()) {
        rollback();
        return false;
    }
    QSet<QString> orderedIds;
    QStringList normalizedOrder;
    normalizedOrder.reserve(orderedPageIds.size());
    for (const QVariant &value : orderedPageIds) {
        const QString id = value.toString().trimmed();
        if (id.isEmpty() || !siblingIds.contains(id) || orderedIds.contains(id)) {
            rollback();
            return false;
        }
        orderedIds.insert(id);
        normalizedOrder.append(id);
    }

    const QString timestamp = currentTimestamp();
    for (qsizetype index = 0; index < normalizedOrder.size(); ++index) {
        const QString sql = normalizedParentId.isEmpty()
            ? QStringLiteral("UPDATE pages SET sort_order = ?1, updated_at = ?2 "
                             "WHERE id = ?3 AND parent_id IS NULL AND deleted_at IS NULL")
            : QStringLiteral("UPDATE pages SET sort_order = ?1, updated_at = ?2 "
                             "WHERE id = ?3 AND parent_id = ?4 AND deleted_at IS NULL");
        QVariantList parameters{static_cast<qint64>(index), timestamp, normalizedOrder.at(index)};
        if (!normalizedParentId.isEmpty()) parameters.append(normalizedParentId);
        if (executeSqlPrepared(sql, parameters) != 1) {
            rollback();
            return false;
        }
    }

    if (executeSql("COMMIT;")) return true;
    rollback();
    return false;
}
