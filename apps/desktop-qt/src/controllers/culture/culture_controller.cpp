#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRandomGenerator>
#include <QtCore/QRegularExpression>
#include <QtCore/QSet>
#include <cmath>
#include <functional>

// Native culture catalog and progress persistence.


QVariantList SynapseDataController::getCultureItems(const QString &statusFilter) {
    QString sql = "SELECT id, title, type, synopsis, cover_image, status, progress, total_episodes "
                  "FROM culture_items WHERE deleted_at IS NULL ";
    if (!statusFilter.isEmpty()) {
        sql += QString("AND status = '%1' ").arg(escapeSql(statusFilter));
    }
    sql += "ORDER BY updated_at DESC LIMIT 100";
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::incrementCultureProgress(const QString &itemId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE culture_items SET progress = progress + 1, updated_at = '%1' WHERE id = '%2'")
        .arg(ts, escapeSql(itemId));
    return executeSql(sql);
}

bool SynapseDataController::updateCultureProgress(const QString &itemId, int progress) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE culture_items SET progress = %1, updated_at = '%2' WHERE id = '%3'")
        .arg(progress).arg(ts, escapeSql(itemId));
    return executeSql(sql);
}

bool SynapseDataController::updateCultureStatus(const QString &itemId, const QString &status) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE culture_items SET status = '%1', updated_at = '%2' WHERE id = '%3'")
        .arg(escapeSql(status), ts, escapeSql(itemId));
    return executeSql(sql);
}

bool SynapseDataController::createCultureItem(const QString &title, const QString &type, const QString &synopsis, int totalEpisodes, const QString &coverImage) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString sql = QString("INSERT INTO culture_items (id, title, type, synopsis, total_episodes, progress, status, cover_image, created_at, updated_at) "
                          "VALUES ('%1', '%2', '%3', '%4', %5, 0, 'backlog', '%6', '%7', '%7')")
                  .arg(id, escapeSql(title), escapeSql(type), escapeSql(synopsis)).arg(totalEpisodes).arg(escapeSql(coverImage), ts);
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::deleteCultureItem(const QString &itemId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE culture_items SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(itemId));
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

