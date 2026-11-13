#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRegularExpression>
#include <QtCore/QSet>

// Native calendar event persistence using prepared statements.

QVariantList SynapseDataController::getCalendarEvents() {
    return executeQuery(
        "SELECT id, title, description, start_date, end_date, type, status, color, page_id "
        "FROM calendar_events WHERE deleted_at IS NULL ORDER BY start_date ASC LIMIT 300"
    ).toVariantList();
}

bool SynapseDataController::createCalendarEvent(const QString &title, const QString &description,
                                                const QString &startDate, const QString &endDate,
                                                const QString &type, const QString &color,
                                                const QString &pageId) {
    static const QRegularExpression safeColor(QStringLiteral("^#[0-9A-Fa-f]{6}$"));
    static const QSet<QString> validTypes = {"event", "task", "reminder"};

    if (title.trimmed().isEmpty()) return false;

    const bool validStart = QDateTime::fromString(startDate, Qt::ISODate).isValid() ||
                            QDate::fromString(startDate, Qt::ISODate).isValid();
    const bool validEnd = QDateTime::fromString(endDate, Qt::ISODate).isValid() ||
                          QDate::fromString(endDate, Qt::ISODate).isValid();
    if (!validStart || !validEnd) return false;

    const QString resolvedColor = safeColor.match(color).hasMatch() ? color : QStringLiteral("#3b82f6");
    const QString resolvedType = validTypes.contains(type) ? type : QStringLiteral("event");
    const QString id = generateUuid();
    const QString ts = currentTimestamp();

    const int rows = executeSqlPrepared(
        "INSERT INTO calendar_events (id, title, description, start_date, end_date, type, type_, status, color, page_id, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)",
        {id, title.trimmed(), description.trimmed(), startDate, endDate, resolvedType, resolvedType,
         resolvedColor, pageId.trimmed().isEmpty() ? QVariant() : pageId.trimmed(), ts, ts});
    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::updateCalendarEvent(const QString &eventId, const QString &title,
                                                const QString &description, const QString &startDate,
                                                const QString &endDate, const QString &color,
                                                const QString &type, const QString &pageId) {
    static const QRegularExpression safeColor(QStringLiteral("^#[0-9A-Fa-f]{6}$"));
    static const QSet<QString> validTypes = {"event", "task", "reminder"};

    const bool validStart = QDateTime::fromString(startDate, Qt::ISODate).isValid() ||
                            QDate::fromString(startDate, Qt::ISODate).isValid();
    const bool validEnd = QDateTime::fromString(endDate, Qt::ISODate).isValid() ||
                          QDate::fromString(endDate, Qt::ISODate).isValid();
    if (eventId.trimmed().isEmpty() || title.trimmed().isEmpty() ||
        !validStart || !validEnd ||
        !safeColor.match(color).hasMatch()) {
        return false;
    }

    const QString ts = currentTimestamp();
    int updatedRows = 0;

    if (type.trimmed().isEmpty()) {
        if (pageId.isEmpty()) {
            updatedRows = executeSqlPrepared(
                "UPDATE calendar_events SET title = ?1, description = ?2, start_date = ?3, end_date = ?4, "
                "color = ?5, updated_at = ?6 WHERE id = ?7 AND deleted_at IS NULL",
                {title.trimmed(), description, startDate, endDate, color, ts, eventId});
        } else {
            updatedRows = executeSqlPrepared(
                "UPDATE calendar_events SET title = ?1, description = ?2, start_date = ?3, end_date = ?4, "
                "color = ?5, page_id = ?6, updated_at = ?7 WHERE id = ?8 AND deleted_at IS NULL",
                {title.trimmed(), description, startDate, endDate, color, pageId.trimmed(), ts, eventId});
        }
    } else {
        const QString resolvedType = validTypes.contains(type) ? type : QStringLiteral("event");
        if (pageId.isEmpty()) {
            updatedRows = executeSqlPrepared(
                "UPDATE calendar_events SET title = ?1, description = ?2, start_date = ?3, end_date = ?4, "
                "color = ?5, type = ?6, type_ = ?7, updated_at = ?8 WHERE id = ?9 AND deleted_at IS NULL",
                {title.trimmed(), description, startDate, endDate, color, resolvedType, resolvedType, ts, eventId});
        } else {
            updatedRows = executeSqlPrepared(
                "UPDATE calendar_events SET title = ?1, description = ?2, start_date = ?3, end_date = ?4, "
                "color = ?5, type = ?6, type_ = ?7, page_id = ?8, updated_at = ?9 WHERE id = ?10 AND deleted_at IS NULL",
                {title.trimmed(), description, startDate, endDate, color, resolvedType, resolvedType, pageId.trimmed(), ts, eventId});
        }
    }

    if (updatedRows != 1) return false;
    refreshStats();
    return true;
}

bool SynapseDataController::toggleEventStatus(const QString &eventId) {
    if (eventId.trimmed().isEmpty()) return false;
    const QJsonArray arr = executeQueryPrepared(
        "SELECT status FROM calendar_events WHERE id = ? AND deleted_at IS NULL", {eventId});
    if (arr.isEmpty()) return false;

    const QString curStatus = arr[0].toObject().value("status").toString();
    const QString newStatus = (curStatus == "completed") ? "pending" : "completed";
    const QString ts = currentTimestamp();

    const int rows = executeSqlPrepared(
        "UPDATE calendar_events SET status = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {newStatus, ts, eventId});
    return rows == 1;
}

bool SynapseDataController::deleteCalendarEvent(const QString &eventId) {
    if (eventId.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "UPDATE calendar_events SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {ts, ts, eventId});
    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}
