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
    const QString now = currentTimestamp();
    bool ok = false;
    if (notificationId.isEmpty()) {
        ok = executeSqlPrepared("UPDATE notifications SET is_read = 1, updated_at = ? WHERE is_read = 0 AND deleted_at IS NULL",
                                {now});
    } else {
        ok = executeSqlPrepared("UPDATE notifications SET is_read = 1, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
                                {now, notificationId});
    }
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::deleteNotification(const QString &notificationId) {
    const QString now = currentTimestamp();
    const bool ok = executeSqlPrepared("UPDATE notifications SET deleted_at = ?, updated_at = ? WHERE id = ?",
                                       {now, now, notificationId});
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::clearAllNotifications() {
    const QString now = currentTimestamp();
    const bool ok = executeSqlPrepared("UPDATE notifications SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL",
                                       {now, now});
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::addNotification(const QString &title, const QString &message,
                                            const QString &type, const QString &targetPageId,
                                            const QString &eventId, const QString &scheduledFor) {
    const QString id = generateUuid();
    const QString now = currentTimestamp();
    const QVariant pageIdVal = targetPageId.isEmpty() ? QVariant(QMetaType::fromType<QString>()) : QVariant(targetPageId);
    const QVariant eventIdVal = eventId.isEmpty() ? QVariant(QMetaType::fromType<QString>()) : QVariant(eventId);
    const QVariant scheduledVal = scheduledFor.isEmpty() ? QVariant(QMetaType::fromType<QString>()) : QVariant(scheduledFor);

    const bool ok = executeSqlPrepared(
        "INSERT INTO notifications (id, title, message, type, target_page_id, event_id, scheduled_for, fired_at, is_read, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)",
        {id, title, message, type, pageIdVal, eventIdVal, scheduledVal, now, now}
    );
    if (ok) refreshStats();
    return ok;
}

