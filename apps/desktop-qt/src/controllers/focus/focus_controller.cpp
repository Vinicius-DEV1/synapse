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

// Native focus session and audio catalog persistence.


QVariantList SynapseDataController::getLofis() {
    QString sql = "SELECT id, title, original_name, duration, file_path, is_local FROM lofis WHERE deleted_at IS NULL ORDER BY title ASC";
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getFocusSessions() {
    QString sql = "SELECT id, tag, description, target_time_minutes, status, summary, created_at "
                  "FROM focus_sessions WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 50";
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::recordFocusSession(const QString &tag, int targetMinutes, const QString &status, const QString &summary) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString sql = QString("INSERT INTO focus_sessions (id, tag, description, target_time_minutes, status, summary, created_at, updated_at) "
                          "VALUES ('%1', '%2', '', %3, '%4', '%5', '%6', '%7')")
        .arg(id, escapeSql(tag)).arg(targetMinutes).arg(escapeSql(status), escapeSql(summary), ts, ts);
    return executeSql(sql);
}

bool SynapseDataController::deleteFocusSession(const QString &sessionId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE focus_sessions SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(sessionId));
    return executeSql(sql);
}

