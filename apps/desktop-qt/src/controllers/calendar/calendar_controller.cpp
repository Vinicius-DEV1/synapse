#include "synapse_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

// Native calendar event persistence delegated to synapse_calendar_* domain APIs.

QVariantList SynapseDataController::getCalendarEvents() {
    if (!m_db) return {};
    char *jsonStr = synapse_calendar_get_events(m_db);
    if (!jsonStr) return {};

    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);
    return doc.array().toVariantList();
}

bool SynapseDataController::createCalendarEvent(const QString &title, const QString &description,
                                                const QString &startDate, const QString &endDate,
                                                const QString &type, const QString &color,
                                                const QString &pageId, const QVariantList &reminders,
                                                const QString &recurrence) {
    if (!m_db || title.trimmed().isEmpty()) return false;

    const QByteArray titleBytes = title.trimmed().toUtf8();
    const QByteArray descBytes = description.trimmed().toUtf8();
    const QByteArray startBytes = startDate.trimmed().toUtf8();
    const QByteArray endBytes = endDate.trimmed().toUtf8();
    const QByteArray typeBytes = type.trimmed().toUtf8();
    const QByteArray colorBytes = color.trimmed().toUtf8();
    const QByteArray pageBytes = pageId.trimmed().toUtf8();
    const QByteArray recBytes = recurrence.trimmed().toUtf8();

    QJsonArray remindersArr;
    for (const QVariant &r : reminders) {
        remindersArr.append(r.toInt());
    }
    const QByteArray remindersBytes = QJsonDocument(remindersArr).toJson(QJsonDocument::Compact);

    const int ret = synapse_calendar_create_event_with_options(
        m_db,
        titleBytes.constData(),
        descBytes.isEmpty() ? nullptr : descBytes.constData(),
        startBytes.constData(),
        endBytes.constData(),
        typeBytes.isEmpty() ? nullptr : typeBytes.constData(),
        colorBytes.isEmpty() ? nullptr : colorBytes.constData(),
        pageBytes.isEmpty() ? nullptr : pageBytes.constData(),
        reminders.isEmpty() ? nullptr : remindersBytes.constData(),
        recBytes.isEmpty() ? nullptr : recBytes.constData()
    );

    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::updateCalendarEvent(const QString &eventId, const QString &title,
                                                const QString &description, const QString &startDate,
                                                const QString &endDate, const QString &color,
                                                const QString &type, const QString &pageId,
                                                const QVariantList &reminders) {
    if (!m_db || eventId.trimmed().isEmpty() || title.trimmed().isEmpty()) return false;

    const QByteArray idBytes = eventId.trimmed().toUtf8();
    const QByteArray titleBytes = title.trimmed().toUtf8();
    const QByteArray descBytes = description.trimmed().toUtf8();
    const QByteArray startBytes = startDate.trimmed().toUtf8();
    const QByteArray endBytes = endDate.trimmed().toUtf8();
    const QByteArray colorBytes = color.trimmed().toUtf8();
    const QByteArray typeBytes = type.trimmed().toUtf8();
    const QByteArray pageBytes = pageId.trimmed().toUtf8();

    QJsonArray remindersArr;
    for (const QVariant &r : reminders) {
        remindersArr.append(r.toInt());
    }
    const QByteArray remindersBytes = QJsonDocument(remindersArr).toJson(QJsonDocument::Compact);

    const int ret = synapse_calendar_update_event_with_options(
        m_db,
        idBytes.constData(),
        titleBytes.constData(),
        descBytes.isEmpty() ? nullptr : descBytes.constData(),
        startBytes.constData(),
        endBytes.constData(),
        colorBytes.constData(),
        typeBytes.isEmpty() ? nullptr : typeBytes.constData(),
        pageBytes.isEmpty() ? nullptr : pageBytes.constData(),
        reminders.isEmpty() ? nullptr : remindersBytes.constData()
    );

    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::toggleEventStatus(const QString &eventId) {
    if (!m_db || eventId.trimmed().isEmpty()) return false;
    const int ret = synapse_calendar_toggle_status(m_db, eventId.trimmed().toUtf8().constData());
    return ret == 1;
}

bool SynapseDataController::deleteCalendarEvent(const QString &eventId) {
    if (!m_db || eventId.trimmed().isEmpty()) return false;
    const int ret = synapse_calendar_delete_event(m_db, eventId.trimmed().toUtf8().constData());
    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::deleteCalendarEventSeries(const QString &eventId) {
    if (!m_db || eventId.trimmed().isEmpty()) return false;
    const int ret = synapse_calendar_delete_event_series(m_db, eventId.trimmed().toUtf8().constData());
    if (ret >= 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::markCalendarReminderNotified(const QString &eventId, int reminderMinutes) {
    if (!m_db || eventId.trimmed().isEmpty()) return false;
    const int ret = synapse_calendar_mark_reminder_notified(m_db, eventId.trimmed().toUtf8().constData(), reminderMinutes);
    return ret == 1;
}
