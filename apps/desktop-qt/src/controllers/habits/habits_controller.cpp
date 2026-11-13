#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRegularExpression>
#include <QtCore/QSet>

// Native habit and check-in persistence using prepared statements.

QVariantList SynapseDataController::getHabits() {
    return executeQuery(
        "SELECT id, title, color, icon, target_days_per_week, created_at "
        "FROM habits WHERE deleted_at IS NULL ORDER BY created_at ASC"
    ).toVariantList();
}

bool SynapseDataController::createHabit(const QString &title, const QString &color, const QString &icon, int targetDays) {
    if (title.trimmed().isEmpty()) return false;
    const QString id = generateUuid();
    const QString ts = currentTimestamp();
    const QString resolvedColor = color.trimmed().isEmpty() ? QStringLiteral("#10b981") : color.trimmed();
    const QString resolvedIcon = icon.trimmed().isEmpty() ? QStringLiteral("⭐") : icon.trimmed();
    const int resolvedTarget = (targetDays >= 1 && targetDays <= 7) ? targetDays : 7;

    const int rows = executeSqlPrepared(
        "INSERT INTO habits (id, title, color, icon, target_days_per_week, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        {id, title.trimmed(), resolvedColor, resolvedIcon, resolvedTarget, ts, ts});
    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::updateHabit(const QString &habitId, const QString &title, const QString &color, const QString &icon, int targetDays) {
    if (habitId.trimmed().isEmpty() || title.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();
    const QString resolvedColor = color.trimmed().isEmpty() ? QStringLiteral("#10b981") : color.trimmed();
    const QString resolvedIcon = icon.trimmed().isEmpty() ? QStringLiteral("⭐") : icon.trimmed();
    const int resolvedTarget = (targetDays >= 1 && targetDays <= 7) ? targetDays : 7;

    const int rows = executeSqlPrepared(
        "UPDATE habits SET title = ?, color = ?, icon = ?, target_days_per_week = ?, updated_at = ? "
        "WHERE id = ? AND deleted_at IS NULL",
        {title.trimmed(), resolvedColor, resolvedIcon, resolvedTarget, ts, habitId});
    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}

QVariantList SynapseDataController::getHabitLogs(const QString &dateStr) {
    if (dateStr.trimmed().isEmpty()) return QVariantList();
    return executeQueryPrepared(
        "SELECT habit_id, date, completed_at FROM habit_logs WHERE date = ? AND deleted_at IS NULL",
        {dateStr.trimmed()}
    ).toVariantList();
}

QVariantList SynapseDataController::getHabitLogsRange(const QString &startDate, const QString &endDate) {
    if (startDate.trimmed().isEmpty() || endDate.trimmed().isEmpty()) return QVariantList();
    return executeQueryPrepared(
        "SELECT habit_id, date, completed_at FROM habit_logs "
        "WHERE date >= ? AND date <= ? AND deleted_at IS NULL",
        {startDate.trimmed(), endDate.trimmed()}
    ).toVariantList();
}

bool SynapseDataController::toggleHabitCheckin(const QString &habitId, const QString &dateStr) {
    if (habitId.trimmed().isEmpty() || dateStr.trimmed().isEmpty()) return false;

    const QJsonArray arr = executeQueryPrepared(
        "SELECT id FROM habit_logs WHERE habit_id = ? AND date = ? AND deleted_at IS NULL",
        {habitId, dateStr});
    const QString ts = currentTimestamp();

    if (!arr.isEmpty()) {
        // Toggle OFF (soft delete)
        const QString logId = arr[0].toObject().value("id").toString();
        const int rows = executeSqlPrepared(
            "UPDATE habit_logs SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
            {ts, ts, logId});
        return rows == 1;
    } else {
        // Toggle ON (insert)
        const QString newId = generateUuid();
        const int rows = executeSqlPrepared(
            "INSERT INTO habit_logs (id, habit_id, date, completed_at, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            {newId, habitId, dateStr, ts, ts, ts});
        return rows == 1;
    }
}

bool SynapseDataController::deleteHabit(const QString &habitId) {
    if (habitId.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "UPDATE habits SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {ts, ts, habitId});
    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}
