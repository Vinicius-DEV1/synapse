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

// Native habit and check-in persistence.


QVariantList SynapseDataController::getHabits() {
    QString sql = "SELECT id, title, color, icon, target_days_per_week FROM habits WHERE deleted_at IS NULL ORDER BY created_at ASC";
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::createHabit(const QString &title, const QString &color, const QString &icon, int targetDays) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString sql = QString("INSERT INTO habits (id, title, color, icon, target_days_per_week, created_at, updated_at) "
                          "VALUES ('%1', '%2', '%3', '%4', %5, '%6', '%7')")
        .arg(id, escapeSql(title), escapeSql(color), escapeSql(icon)).arg(targetDays).arg(ts, ts);
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

QVariantList SynapseDataController::getHabitLogs(const QString &dateStr) {
    QString sql = QString("SELECT habit_id, completed_at FROM habit_logs WHERE date = '%1' AND deleted_at IS NULL")
        .arg(escapeSql(dateStr));
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getHabitLogsRange(const QString &startDate, const QString &endDate) {
    QString sql = QString("SELECT habit_id, date, completed_at FROM habit_logs WHERE date >= '%1' AND date <= '%2' AND deleted_at IS NULL")
        .arg(escapeSql(startDate), escapeSql(endDate));
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::toggleHabitCheckin(const QString &habitId, const QString &dateStr) {
    QString checkSql = QString("SELECT id FROM habit_logs WHERE habit_id = '%1' AND date = '%2' AND deleted_at IS NULL")
        .arg(escapeSql(habitId), escapeSql(dateStr));
    QJsonArray arr = executeQuery(checkSql);
    QString ts = currentTimestamp();

    if (!arr.isEmpty()) {
        // Toggle OFF (soft delete)
        QString logId = arr[0].toObject().value("id").toString();
        QString delSql = QString("UPDATE habit_logs SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(logId));
        return executeSql(delSql);
    } else {
        // Toggle ON (insert)
        QString newId = generateUuid();
        QString insSql = QString("INSERT INTO habit_logs (id, habit_id, date, completed_at, created_at, updated_at) "
                                 "VALUES ('%1', '%2', '%3', '%4', '%5', '%6')")
            .arg(newId, escapeSql(habitId), escapeSql(dateStr), ts, ts, ts);
        return executeSql(insSql);
    }
}

bool SynapseDataController::deleteHabit(const QString &habitId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE habits SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(habitId));
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

