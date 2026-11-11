#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QDir>
#include <QtCore/QFileInfo>
#include <QtCore/QStandardPaths>
#include <QtCore/QSysInfo>

// Native notification persistence and actions.

// ---------------------------------------------------------------------------
// 16. Native notification center
// ---------------------------------------------------------------------------

QVariantList SynapseDataController::getNotifications() {
    const QString sql = "SELECT id, title, message, type, target_page_id, event_id, scheduled_for, "
                        "fired_at, is_read, created_at FROM notifications "
                        "WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 100";
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::markNotificationRead(const QString &notificationId) {
    const QString where = notificationId.isEmpty()
        ? "is_read = 0 AND deleted_at IS NULL"
        : QString("id = '%1' AND deleted_at IS NULL").arg(escapeSql(notificationId));
    const bool ok = executeSql(QString("UPDATE notifications SET is_read = 1, updated_at = '%1' WHERE %2")
                               .arg(currentTimestamp(), where));
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::deleteNotification(const QString &notificationId) {
    const bool ok = executeSql(QString("UPDATE notifications SET deleted_at = '%1', updated_at = '%1' WHERE id = '%2'")
                               .arg(currentTimestamp(), escapeSql(notificationId)));
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::addNotification(const QString &title, const QString &message,
                                            const QString &type, const QString &targetPageId,
                                            const QString &eventId, const QString &scheduledFor) {
    const QString id = generateUuid();
    const QString now = currentTimestamp();
    const QString pageIdSql = targetPageId.isEmpty() ? "NULL" : QString("'%1'").arg(escapeSql(targetPageId));
    const QString eventIdSql = eventId.isEmpty() ? "NULL" : QString("'%1'").arg(escapeSql(eventId));
    const QString scheduledSql = scheduledFor.isEmpty() ? "NULL" : QString("'%1'").arg(escapeSql(scheduledFor));
    const QString sql = QString("INSERT INTO notifications (id, title, message, type, target_page_id, event_id, scheduled_for, fired_at, is_read, created_at) "
                                "VALUES ('%1', '%2', '%3', '%4', %5, %6, %7, '%8', 0, '%8')")
                            .arg(id, escapeSql(title), escapeSql(message), escapeSql(type),
                                 pageIdSql, eventIdSql, scheduledSql, now);
    const bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

