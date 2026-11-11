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

// Native calendar event persistence.


QVariantList SynapseDataController::getCalendarEvents() {
    QString sql = "SELECT id, title, description, start_date, end_date, type, status, color "
                  "FROM calendar_events WHERE deleted_at IS NULL ORDER BY start_date ASC LIMIT 100";
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::createCalendarEvent(const QString &title, const QString &description, const QString &startDate, const QString &endDate, const QString &type, const QString &color) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString sql = QString("INSERT INTO calendar_events (id, title, description, start_date, end_date, type, status, color, created_at, updated_at) "
                          "VALUES ('%1', '%2', '%3', '%4', '%5', '%6', 'pending', '%7', '%8', '%9')")
        .arg(id, escapeSql(title), escapeSql(description), escapeSql(startDate), escapeSql(endDate), escapeSql(type), escapeSql(color), ts, ts);
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::updateCalendarEvent(const QString &eventId, const QString &title,
                                                const QString &description, const QString &startDate,
                                                const QString &endDate, const QString &color) {
    static const QRegularExpression safeColor(QStringLiteral("^#[0-9A-Fa-f]{6}$"));
    const bool validStart = QDateTime::fromString(startDate, Qt::ISODate).isValid() ||
                            QDate::fromString(startDate, Qt::ISODate).isValid();
    const bool validEnd = QDateTime::fromString(endDate, Qt::ISODate).isValid() ||
                          QDate::fromString(endDate, Qt::ISODate).isValid();
    if (eventId.trimmed().isEmpty() || title.trimmed().isEmpty() ||
        !validStart || !validEnd ||
        !safeColor.match(color).hasMatch()) {
        return false;
    }

    const int updatedRows = executeSqlPrepared(
        "UPDATE calendar_events SET title = ?1, description = ?2, start_date = ?3, end_date = ?4, "
        "color = ?5, updated_at = ?6 WHERE id = ?7 AND deleted_at IS NULL",
        {title.trimmed(), description, startDate, endDate, color, currentTimestamp(), eventId});
    if (updatedRows != 1) return false;
    refreshStats();
    return true;
}

bool SynapseDataController::toggleEventStatus(const QString &eventId) {
    QString checkSql = QString("SELECT status FROM calendar_events WHERE id = '%1'").arg(escapeSql(eventId));
    QJsonArray arr = executeQuery(checkSql);
    if (arr.isEmpty()) return false;

    QString curStatus = arr[0].toObject().value("status").toString();
    QString newStatus = (curStatus == "completed") ? "pending" : "completed";
    QString ts = currentTimestamp();

    QString sql = QString("UPDATE calendar_events SET status = '%1', updated_at = '%2' WHERE id = '%3'")
        .arg(newStatus, ts, escapeSql(eventId));
    return executeSql(sql);
}

bool SynapseDataController::deleteCalendarEvent(const QString &eventId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE calendar_events SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(eventId));
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

