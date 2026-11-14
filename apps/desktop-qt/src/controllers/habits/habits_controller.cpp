#include "synapse_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

// Native habit and check-in presentation controller.
// Delegates persistence and habit logs to core/synapse-core via bridge-qt.

static QVariantList parseJsonArrayAndFree(char *rawJson) {
    if (!rawJson) return QVariantList();
    const QByteArray bytes(rawJson);
    synapse_free_string(rawJson);
    const QJsonDocument doc = QJsonDocument::fromJson(bytes);
    if (!doc.isArray()) return QVariantList();
    return doc.array().toVariantList();
}

QVariantList SynapseDataController::getHabits() {
    if (!m_db) return QVariantList();
    char *raw = synapse_habits_get_habits(m_db);
    return parseJsonArrayAndFree(raw);
}

bool SynapseDataController::createHabit(const QString &title, const QString &color, const QString &icon, int targetDays) {
    if (!m_db || title.trimmed().isEmpty()) return false;
    const QByteArray titleBytes = title.toUtf8();
    const QByteArray colorBytes = color.toUtf8();
    const QByteArray iconBytes = icon.toUtf8();

    const int res = synapse_habits_create_habit(
        m_db,
        titleBytes.constData(),
        color.trimmed().isEmpty() ? nullptr : colorBytes.constData(),
        icon.trimmed().isEmpty() ? nullptr : iconBytes.constData(),
        targetDays
    );
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::updateHabit(const QString &habitId, const QString &title, const QString &color, const QString &icon, int targetDays) {
    if (!m_db || habitId.trimmed().isEmpty() || title.trimmed().isEmpty()) return false;
    const QByteArray idBytes = habitId.toUtf8();
    const QByteArray titleBytes = title.toUtf8();
    const QByteArray colorBytes = color.toUtf8();
    const QByteArray iconBytes = icon.toUtf8();

    const int res = synapse_habits_update_habit(
        m_db,
        idBytes.constData(),
        titleBytes.constData(),
        color.trimmed().isEmpty() ? nullptr : colorBytes.constData(),
        icon.trimmed().isEmpty() ? nullptr : iconBytes.constData(),
        targetDays
    );
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}

QVariantList SynapseDataController::getHabitLogs(const QString &dateStr) {
    if (!m_db || dateStr.trimmed().isEmpty()) return QVariantList();
    const QByteArray dateBytes = dateStr.toUtf8();
    char *raw = synapse_habits_get_logs(m_db, dateBytes.constData());
    return parseJsonArrayAndFree(raw);
}

QVariantList SynapseDataController::getHabitLogsRange(const QString &startDate, const QString &endDate) {
    if (!m_db || startDate.trimmed().isEmpty() || endDate.trimmed().isEmpty()) return QVariantList();
    const QByteArray startBytes = startDate.toUtf8();
    const QByteArray endBytes = endDate.toUtf8();
    char *raw = synapse_habits_get_logs_range(m_db, startBytes.constData(), endBytes.constData());
    return parseJsonArrayAndFree(raw);
}

bool SynapseDataController::toggleHabitCheckin(const QString &habitId, const QString &dateStr) {
    if (!m_db || habitId.trimmed().isEmpty() || dateStr.trimmed().isEmpty()) return false;
    const QByteArray idBytes = habitId.toUtf8();
    const QByteArray dateBytes = dateStr.toUtf8();

    int outChecked = 0;
    const int res = synapse_habits_toggle_checkin(m_db, idBytes.constData(), dateBytes.constData(), &outChecked);
    return res == 0;
}

bool SynapseDataController::deleteHabit(const QString &habitId) {
    if (!m_db || habitId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = habitId.toUtf8();
    const int res = synapse_habits_delete_habit(m_db, idBytes.constData());
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}
