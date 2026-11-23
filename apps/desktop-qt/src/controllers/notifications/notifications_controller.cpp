#include "synapse_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

// Native notification persistence and actions delegated to synapse_notifications_* domain APIs.

QVariantList SynapseDataController::getNotifications() {
    if (!m_db) return {};
    char *jsonStr = synapse_notifications_get(m_db);
    if (!jsonStr) return {};

    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);
    return doc.array().toVariantList();
}

bool SynapseDataController::markNotificationRead(const QString &notificationId) {
    if (!m_db) return false;
    const QByteArray idBytes = notificationId.trimmed().toUtf8();
    const char *idPtr = idBytes.isEmpty() ? nullptr : idBytes.constData();

    const int ret = synapse_notifications_mark_read(m_db, idPtr);
    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::deleteNotification(const QString &notificationId) {
    if (!m_db || notificationId.trimmed().isEmpty()) return false;
    const int ret = synapse_notifications_delete(m_db, notificationId.trimmed().toUtf8().constData());
    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::clearAllNotifications() {
    if (!m_db) return false;
    const int ret = synapse_notifications_clear_all(m_db);
    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::addNotification(const QString &title, const QString &message,
                                            const QString &type, const QString &targetPageId,
                                            const QString &eventId, const QString &scheduledFor) {
    if (!m_db || title.trimmed().isEmpty()) return false;

    const QByteArray titleBytes = title.trimmed().toUtf8();
    const QByteArray msgBytes = message.trimmed().toUtf8();
    const QByteArray typeBytes = type.trimmed().toUtf8();
    const QByteArray pageBytes = targetPageId.trimmed().toUtf8();
    const QByteArray eventBytes = eventId.trimmed().toUtf8();
    const QByteArray schedBytes = scheduledFor.trimmed().toUtf8();

    const int ret = synapse_notifications_add(
        m_db,
        titleBytes.constData(),
        msgBytes.isEmpty() ? nullptr : msgBytes.constData(),
        typeBytes.isEmpty() ? nullptr : typeBytes.constData(),
        pageBytes.isEmpty() ? nullptr : pageBytes.constData(),
        eventBytes.isEmpty() ? nullptr : eventBytes.constData(),
        schedBytes.isEmpty() ? nullptr : schedBytes.constData()
    );

    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

QVariantList SynapseDataController::checkDueNotifications() {
    if (!m_db) return {};
    char *jsonStr = synapse_notifications_deliver_due(m_db);
    if (!jsonStr) return {};

    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);
    const QVariantList dueList = doc.array().toVariantList();
    if (!dueList.isEmpty()) {
        refreshStats();
    }
    return dueList;
}

bool SynapseDataController::snoozeNotification(const QString &notificationId, int delayMinutes, const QString &titleSuffix) {
    if (!m_db || notificationId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = notificationId.trimmed().toUtf8();
    const QByteArray suffixBytes = titleSuffix.trimmed().toUtf8();

    const int ret = synapse_notifications_snooze(
        m_db,
        idBytes.constData(),
        delayMinutes,
        suffixBytes.isEmpty() ? nullptr : suffixBytes.constData()
    );

    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}
