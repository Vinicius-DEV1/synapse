#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QFileInfo>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

// Native focus session, ambient audio, and alarm persistence using prepared statements.

QVariantList SynapseDataController::getLofis() {
    return executeQueryPrepared(
        "SELECT id, title, original_name, duration, file_path "
        "FROM lofis WHERE deleted_at IS NULL ORDER BY title ASC",
        {}
    ).toVariantList();
}

bool SynapseDataController::addLofiTrack(const QString &title, const QString &filePath,
                                        double duration) {
    if (title.trimmed().isEmpty()) return false;

    const QString id = generateUuid();
    const QString ts = currentTimestamp();
    const QString origName = QFileInfo(filePath).fileName();

    const int rows = executeSqlPrepared(
        "INSERT INTO lofis (id, title, original_name, duration, file_path, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        {id, title.trimmed(), origName.isEmpty() ? title.trimmed() : origName,
         duration, filePath.trimmed(), ts}
    );

    return rows == 1;
}

bool SynapseDataController::deleteLofi(const QString &lofiId) {
    if (lofiId.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "UPDATE lofis SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {ts, ts, lofiId.trimmed()}
    );
    return rows == 1;
}

QVariantList SynapseDataController::getFocusSessions() {
    return executeQueryPrepared(
        "SELECT id, tag, description, target_time_minutes, status, summary, created_at "
        "FROM focus_sessions WHERE deleted_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 100",
        {}
    ).toVariantList();
}

bool SynapseDataController::recordFocusSession(const QString &tag, int targetMinutes,
                                              const QString &status, const QString &summary,
                                              const QString &description) {
    const QString resolvedTag = tag.trimmed().isEmpty() ? QStringLiteral("Estudo") : tag.trimmed();
    const QString resolvedStatus = status.trimmed().isEmpty() ? QStringLiteral("completed") : status.trimmed();
    const int resolvedMinutes = qMax(1, targetMinutes);
    const QString id = generateUuid();
    const QString ts = currentTimestamp();

    const int rows = executeSqlPrepared(
        "INSERT INTO focus_sessions (id, tag, description, target_time_minutes, status, summary, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        {id, resolvedTag, description.trimmed(), resolvedMinutes, resolvedStatus, summary.trimmed(), ts, ts}
    );

    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::deleteFocusSession(const QString &sessionId) {
    if (sessionId.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "UPDATE focus_sessions SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {ts, ts, sessionId.trimmed()}
    );
    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}

QVariantList SynapseDataController::getAlarms() {
    return executeQueryPrepared(
        "SELECT id, time, label, sound, enabled, days, created_at, updated_at "
        "FROM alarms WHERE deleted_at IS NULL ORDER BY time ASC",
        {}
    ).toVariantList();
}

bool SynapseDataController::createAlarm(const QString &time, const QString &label,
                                       const QString &sound, bool enabled,
                                       const QString &days) {
    if (time.trimmed().isEmpty()) return false;

    const QString id = generateUuid();
    const QString ts = currentTimestamp();
    const QString resolvedSound = sound.trimmed().isEmpty() ? QStringLiteral("bell") : sound.trimmed();
    const QString resolvedDays = days.trimmed().isEmpty() ? QStringLiteral("[]") : days.trimmed();

    const int rows = executeSqlPrepared(
        "INSERT INTO alarms (id, time, label, sound, enabled, days, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        {id, time.trimmed(), label.trimmed(), resolvedSound, enabled ? 1 : 0, resolvedDays, ts, ts}
    );

    return rows == 1;
}

bool SynapseDataController::updateAlarm(const QString &alarmId, const QString &time,
                                       const QString &label, const QString &sound,
                                       bool enabled, const QString &days) {
    if (alarmId.trimmed().isEmpty() || time.trimmed().isEmpty()) return false;

    const QString ts = currentTimestamp();
    const QString resolvedSound = sound.trimmed().isEmpty() ? QStringLiteral("bell") : sound.trimmed();
    const QString resolvedDays = days.trimmed().isEmpty() ? QStringLiteral("[]") : days.trimmed();

    const int rows = executeSqlPrepared(
        "UPDATE alarms SET time = ?, label = ?, sound = ?, enabled = ?, days = ?, updated_at = ? "
        "WHERE id = ? AND deleted_at IS NULL",
        {time.trimmed(), label.trimmed(), resolvedSound, enabled ? 1 : 0, resolvedDays, ts, alarmId.trimmed()}
    );

    return rows == 1;
}

bool SynapseDataController::toggleAlarm(const QString &alarmId) {
    if (alarmId.trimmed().isEmpty()) return false;

    const QJsonArray current = executeQueryPrepared(
        "SELECT enabled FROM alarms WHERE id = ? AND deleted_at IS NULL",
        {alarmId.trimmed()}
    );
    if (current.isEmpty()) return false;

    const bool currentlyEnabled = current.at(0).toObject().value(QStringLiteral("enabled")).toInt() != 0;
    const bool newEnabled = !currentlyEnabled;
    const QString ts = currentTimestamp();

    const int rows = executeSqlPrepared(
        "UPDATE alarms SET enabled = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {newEnabled ? 1 : 0, ts, alarmId.trimmed()}
    );

    return rows == 1;
}

bool SynapseDataController::deleteAlarm(const QString &alarmId) {
    if (alarmId.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "UPDATE alarms SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {ts, ts, alarmId.trimmed()}
    );
    return rows == 1;
}
