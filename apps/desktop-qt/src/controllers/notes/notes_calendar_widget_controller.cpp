#include "synapse_controller.h"

#include <QtCore/QByteArray>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

QVariantMap SynapseDataController::createNoteCalendarEvent(
    const QString &title, const QString &description, const QString &startDate,
    const QString &endDate, const QString &type, const QString &color,
    const QString &pageId, const QVariantList &reminders, const QString &recurrence) {
    if (!m_db || title.trimmed().isEmpty() || startDate.trimmed().isEmpty() ||
        endDate.trimmed().isEmpty()) {
        return {};
    }

    const QByteArray titleBytes = title.trimmed().toUtf8();
    const QByteArray descriptionBytes = description.trimmed().toUtf8();
    const QByteArray startBytes = startDate.trimmed().toUtf8();
    const QByteArray endBytes = endDate.trimmed().toUtf8();
    const QByteArray typeBytes = type.trimmed().toUtf8();
    const QByteArray colorBytes = color.trimmed().toUtf8();
    const QByteArray pageBytes = pageId.trimmed().toUtf8();
    const QByteArray recurrenceBytes = recurrence.trimmed().toUtf8();

    QJsonArray reminderArray;
    for (const QVariant &reminder : reminders) {
        reminderArray.append(reminder.toInt());
    }
    const QByteArray reminderBytes = QJsonDocument(reminderArray).toJson(QJsonDocument::Compact);

    char *raw = synapse_calendar_create_event_with_options_result(
        m_db, titleBytes.constData(),
        descriptionBytes.isEmpty() ? nullptr : descriptionBytes.constData(),
        startBytes.constData(), endBytes.constData(),
        typeBytes.isEmpty() ? nullptr : typeBytes.constData(),
        colorBytes.isEmpty() ? nullptr : colorBytes.constData(),
        pageBytes.isEmpty() ? nullptr : pageBytes.constData(),
        reminders.isEmpty() ? nullptr : reminderBytes.constData(),
        recurrenceBytes.isEmpty() ? nullptr : recurrenceBytes.constData());
    if (!raw) return {};

    const QByteArray json(raw);
    synapse_free_string(raw);
    const QJsonDocument document = QJsonDocument::fromJson(json);
    if (!document.isObject()) return {};

    const QVariantMap event = document.object().toVariantMap();
    if (!event.value("id").toString().isEmpty()) {
        refreshStats();
        emit calendarEventsChanged();
    }
    return event;
}
