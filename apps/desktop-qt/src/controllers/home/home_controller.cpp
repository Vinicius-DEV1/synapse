#include "synapse_controller.h"

#include <QtCore/QDate>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>

// Native dashboard aggregation delegated to shared core domain APIs.

namespace {
QVariantList parseBridgeArray(char *jsonStr) {
    if (!jsonStr) return {};
    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);
    return doc.array().toVariantList();
}
}

QVariantMap SynapseDataController::getHomeDashboardData() {
    QVariantMap res;
    if (!m_db) return res;

    const QString today = QDate::currentDate().toString("yyyy-MM-dd");
    const QString tomorrow = QDate::currentDate().addDays(1).toString("yyyy-MM-dd");

    // Today's events
    char *todayRaw = synapse_calendar_get_events_for_date(m_db, today.toUtf8().constData(), 1, 10);
    res["today_events"] = parseBridgeArray(todayRaw);

    // Tomorrow's events
    char *tomorrowRaw = synapse_calendar_get_events_for_date(m_db, tomorrow.toUtf8().constData(), 0, 10);
    res["tomorrow_events"] = parseBridgeArray(tomorrowRaw);

    // Recent pages (last 5 edited)
    char *pagesRaw = synapse_notes_get_recent_pages(m_db, 5);
    res["recent_pages"] = parseBridgeArray(pagesRaw);

    // Pinned pages
    res["pinned_pages"] = getPinnedPages();

    // Financial summary
    res["financial_summary"] = getFinancialSummary();

    // Active habits
    res["habits"] = getHabits();

    // Due flashcards count
    res["due_cards_count"] = static_cast<int>(synapse_anki_get_due_cards_count(m_db));

    return res;
}
